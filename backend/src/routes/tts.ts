// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getElevenLabsSpeech } from '../services/elevenlabs.service';
import { getPiperSpeech, piperAvailable } from '../services/piper.service';
import { getGeminiSpeech } from '../services/tts.service';

export const ttsRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

interface Provider {
  name: string;
  /** Only tried when this is true, so a missing key is never an error. */
  usable: () => boolean;
  speak: (text: string) => Promise<Buffer>;
  mime: string;
}

/**
 * The provider chain, in the order it is tried.
 *
 * Piper is first because it is the only one that cannot run out. It runs
 * locally on the CPU with no key and no per-character cost, so it is the only
 * tier whose availability does not depend on a balance. The hosted providers
 * sit behind it as quality options for when they are funded, and the browser's
 * own synthesiser sits behind all of them in the frontend, for when the server
 * itself is unreachable.
 *
 * This used to be `if (ELEVENLABS_API_KEY) { ... } else { gemini }`, which had
 * a quiet bug worth remembering: it branched on whether a key EXISTED, not on
 * whether the call SUCCEEDED. A key that was present but out of quota took the
 * ElevenLabs path on every request and threw, so the working fallback directly
 * beneath it could never run and the voice went silent with a 502. A key that
 * is configured is not the same as a key that works, and only trying it can
 * tell the difference.
 */
const PROVIDERS: Provider[] = [
  {
    name: 'Piper',
    usable: piperAvailable,
    speak: getPiperSpeech,
    mime: 'audio/wav',
  },
  {
    name: 'ElevenLabs',
    usable: () => Boolean(env.ELEVENLABS_API_KEY),
    speak: getElevenLabsSpeech,
    mime: 'audio/mpeg',
  },
  {
    name: 'Gemini',
    usable: () => Boolean(env.GEMINI_API_KEY),
    speak: getGeminiSpeech,
    mime: 'audio/wav',
  },
];

/**
 * Some failures are permanent for the life of the process — an exhausted quota
 * does not recover on the next request. Reporting those once keeps a real
 * problem visible instead of burying it under a stack trace per spoken line.
 */
const reported = new Set<string>();

function reportOnce(key: string, message: string): void {
  if (reported.has(key)) return;
  reported.add(key);
  console.warn(message);
}

/** Phronesis' voice. */
ttsRouter.post('/tts', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const available = PROVIDERS.filter((p) => p.usable());
  if (available.length === 0) {
    res.status(503).json({
      error:
        'No text-to-speech provider is configured. Run `npm run setup:piper` in backend/ for a free local voice.',
    });
    return;
  }

  for (const provider of available) {
    try {
      const audio = await provider.speak(parsed.data.text);
      res.setHeader('Content-Type', provider.mime);
      res.send(audio);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('quota_exceeded')) {
        reportOnce(
          `${provider.name}:quota`,
          `${provider.name} quota is exhausted — skipping it for the rest of this run.`,
        );
      } else {
        console.error(`${provider.name} TTS failed, trying the next provider:`, message);
      }
    }
  }

  console.error('TTS failed on every configured provider.');
  res.status(502).json({ error: 'Failed to generate speech.' });
});
