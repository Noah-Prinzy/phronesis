// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getEdgeSpeech } from '../services/edge.service';
import { getGeminiSpeech } from '../services/tts.service';

export const ttsRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

/**
 * Phronesis' voice.
 *
 * Microsoft's neural speech first — measured at 0.43s a line, free, no key,
 * and it runs HERE rather than in the browser, so every device and every
 * browser gets the same voice by playing an MP3. Gemini sits behind it as a
 * second opinion, though its free tier is ten requests a day and it is really
 * only a courtesy. Behind both, the frontend falls back to the browser's own
 * synthesiser, which needs no network at all.
 *
 * A provider is SKIPPED when it is absent and MOVED PAST when it fails, and
 * those are two different tests. An earlier version of this route branched on
 * `if (API_KEY)` — whether a key existed, not whether the call worked — so
 * once that provider's quota was spent the key was still there, every request
 * took the dead path, and the working fallback beneath it could never run.
 * The voice went silent with a 502 while a good provider sat unused.
 */
interface Provider {
  name: string;
  usable: () => boolean;
  speak: (text: string) => Promise<Buffer>;
  mime: string;
}

const PROVIDERS: Provider[] = [
  { name: 'Edge', usable: () => true, speak: getEdgeSpeech, mime: 'audio/mpeg' },
  {
    name: 'Gemini',
    usable: () => Boolean(env.GEMINI_API_KEY),
    speak: getGeminiSpeech,
    mime: 'audio/wav',
  },
];

/** Permanent failures are reported once, not once per spoken line. */
const reported = new Set<string>();

ttsRouter.post('/tts', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  for (const provider of PROVIDERS.filter((p) => p.usable())) {
    try {
      const audio = await provider.speak(parsed.data.text);
      res.setHeader('Content-Type', provider.mime);
      res.send(audio);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const quota = message.includes('quota') || message.includes('RESOURCE_EXHAUSTED');
      const key = `${provider.name}:${quota ? 'quota' : 'error'}`;
      if (quota) {
        if (!reported.has(key)) {
          reported.add(key);
          console.warn(`${provider.name} is out of quota — skipping it for the rest of this run.`);
        }
      } else {
        console.error(`${provider.name} TTS failed, trying the next provider:`, message);
      }
    }
  }

  console.error('TTS failed on every provider.');
  res.status(502).json({ error: 'Failed to generate speech.' });
});
