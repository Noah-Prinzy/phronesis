// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getGeminiSpeech } from '../services/tts.service';

export const ttsRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

ttsRouter.post('/tts', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const wav = await getGeminiSpeech(parsed.data.text);
    res.setHeader('Content-Type', 'audio/wav');
    res.send(wav);
  } catch (err) {
    console.error('TTS request failed:', err);
    res.status(502).json({ error: 'Failed to generate speech.' });
  }
});
