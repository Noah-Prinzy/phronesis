// backend/src/routes/tts-local.ts
//
// Local-language TTS via Sunbird AI — not wired up to any UI yet (see
// sunbird.service.ts for why). Scoped in ahead of need.

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getSunbirdSpeech, SUNBIRD_SPEAKER_IDS } from '../services/sunbird.service';

export const ttsLocalRouter = Router();

const ttsRequestSchema = z.object({
  text: z.string().min(1),
  speakerId: z
    .number()
    .refine((id): id is (typeof SUNBIRD_SPEAKER_IDS)[number] => (SUNBIRD_SPEAKER_IDS as readonly number[]).includes(id), {
      message: `speakerId must be one of: ${SUNBIRD_SPEAKER_IDS.join(', ')}`,
    }),
});

ttsLocalRouter.post('/tts-local', async (req, res) => {
  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!env.SUNBIRD_API_KEY) {
    res.status(503).json({ error: 'SUNBIRD_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const result = await getSunbirdSpeech(parsed.data.text, parsed.data.speakerId);
    res.json({ audioUrl: result.audioUrl, sampleRate: result.sampleRate });
  } catch (err) {
    console.error('Sunbird TTS request failed:', err);
    res.status(502).json({ error: 'Failed to get speech audio from Sunbird.' });
  }
});
