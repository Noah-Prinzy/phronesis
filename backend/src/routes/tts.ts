// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
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
 * Piper IS the voice. It runs locally on the CPU with no key, no quota and no
 * per-character cost, which makes it the only tier whose availability does not
 * depend on a balance somewhere. Gemini sits behind it for the case where the
 * model has not been downloaded yet, and the browser's own synthesiser sits
 * behind that in the frontend, for when the server itself is unreachable.
 *
 * A hosted voice was tried first and removed. The lesson worth keeping is in
 * how it failed: the route branched on `if (API_KEY)`, which tests whether a
 * key EXISTS, not whether the call SUCCEEDS. Once the quota was spent the key
 * was still there, so every request took that path and threw, and the working
 * fallback directly beneath it could never run — the voice went silent with a
 * 502 while a perfectly good provider sat configured and unused. Hence the
 * shape below: a provider is skipped when it is ABSENT and moved past when it
 * FAILS, and those are two different tests.
 */
const PROVIDERS: Provider[] = [
  {
    name: 'Piper',
    usable: piperAvailable,
    speak: getPiperSpeech,
    mime: 'audio/wav',
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
