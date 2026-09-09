// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getGeminiSpeech } from '../services/tts.service';

export const ttsRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

/**
 * The server's voice, which is now the FALLBACK rather than the voice.
 *
 * Phronesis speaks with Kokoro-82M, running in the user's own browser on their
 * GPU — see frontend/src/app/kokoro.ts. Nothing about her voice touches this
 * server in the normal case: no quota, no per-character cost, no request to be
 * rate limited, and it keeps working when this process is down.
 *
 * This endpoint covers the browsers that cannot do that: no WebGPU, or a
 * metered connection where downloading a model would be spending someone's
 * data on their behalf. It is deliberately the only hosted tier left. Behind
 * it, the frontend falls back once more to the browser's own synthesiser.
 *
 * A note kept from what was here before, because the bug is easy to rewrite.
 * This route used to read `if (SOME_API_KEY) { ... } else { fallback }`, which
 * tests whether a key EXISTS, not whether the call SUCCEEDS. When that
 * provider's quota was spent the key was still present, so every request took
 * the dead path and threw, and the working fallback directly beneath it could
 * never run — the voice went silent with a 502 while a good provider sat
 * configured and unused. Absent and broken are different states, and only
 * trying tells them apart.
 */
ttsRouter.post('/tts', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!env.GEMINI_API_KEY) {
    // Not an error worth alarming about: most users never reach this endpoint,
    // and the frontend has its own fallback below this one.
    res.status(503).json({ error: 'No server-side text-to-speech is configured.' });
    return;
  }

  try {
    const wav = await getGeminiSpeech(parsed.data.text);
    res.setHeader('Content-Type', 'audio/wav');
    res.send(wav);
  } catch (err) {
    console.error('Server TTS failed:', err);
    res.status(502).json({ error: 'Failed to generate speech.' });
  }
});
