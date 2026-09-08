// backend/src/routes/tts.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getElevenLabsSpeech } from '../services/elevenlabs.service';
import { getGeminiSpeech } from '../services/tts.service';

export const ttsRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

/**
 * Phronesis' voice. ElevenLabs is preferred — it's the intended voice for the
 * product — with Gemini's native TTS as a fallback so the feature still works
 * before an ElevenLabs key is added.
 */
ttsRouter.post('/tts', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!env.ELEVENLABS_API_KEY && !env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'No text-to-speech provider is configured on the server yet.' });
    return;
  }

  try {
    if (env.ELEVENLABS_API_KEY) {
      const mp3 = await getElevenLabsSpeech(parsed.data.text);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(mp3);
      return;
    }
    const wav = await getGeminiSpeech(parsed.data.text);
    res.setHeader('Content-Type', 'audio/wav');
    res.send(wav);
  } catch (err) {
    console.error('TTS request failed:', err);
    res.status(502).json({ error: 'Failed to generate speech.' });
  }
});
