// frontend/api/tts-local.ts
//
// Local-language TTS via Sunbird AI (github.com/SunbirdAI) — Ugandan/East
// African languages only (Acholi, Ateso, Runyankole, Lugbara, Swahili,
// Luganda), no English. Nothing in the app calls this yet; scoped in ahead
// of need for when local-language support becomes a real feature. Get a
// key at https://sunbird.ai. Deployed counterpart of
// backend/src/routes/tts-local.ts + sunbird.service.ts — see chat.ts for
// why this file (not the standalone Express server) is what runs in
// production.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const SUNBIRD_TTS_URL = 'https://api.sunbird.ai/tasks/tts';

/** The only speaker_id values Sunbird's TTS endpoint currently accepts. */
const SUNBIRD_SPEAKER_IDS = [241, 242, 243, 245, 246, 248] as const;

const ttsRequestSchema = z.object({
  text: z.string().min(1),
  speakerId: z
    .number()
    .refine((id): id is (typeof SUNBIRD_SPEAKER_IDS)[number] => (SUNBIRD_SPEAKER_IDS as readonly number[]).includes(id), {
      message: `speakerId must be one of: ${SUNBIRD_SPEAKER_IDS.join(', ')}`,
    }),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = ttsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const apiKey = process.env.SUNBIRD_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'SUNBIRD_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const sunbirdResponse = await fetch(SUNBIRD_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: parsed.data.text, speaker_id: parsed.data.speakerId }),
    });

    if (!sunbirdResponse.ok) {
      throw new Error(`Sunbird TTS request failed: ${sunbirdResponse.status} ${await sunbirdResponse.text()}`);
    }

    const data = (await sunbirdResponse.json()) as { output: { audio_url: string; sample_rate: number } };
    res.status(200).json({ audioUrl: data.output.audio_url, sampleRate: data.output.sample_rate });
  } catch (err) {
    console.error('Sunbird TTS request failed:', err);
    res.status(502).json({ error: 'Failed to get speech audio from Sunbird.' });
  }
}
