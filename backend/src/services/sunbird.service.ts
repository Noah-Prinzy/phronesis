// backend/src/services/sunbird.service.ts
//
// Sunbird AI's TTS (github.com/SunbirdAI) — Ugandan/East African local
// languages only (Acholi, Ateso, Runyankole, Lugbara, Swahili, Luganda), no
// English. Nothing in the app calls this yet; scoped in ahead of need for
// when local-language support becomes a real feature. Get a key at
// https://sunbird.ai.

import { env } from '../config/env';

const SUNBIRD_TTS_URL = 'https://api.sunbird.ai/tasks/tts';

/** The only speaker_id values Sunbird's TTS endpoint currently accepts. */
export const SUNBIRD_SPEAKER_IDS = [241, 242, 243, 245, 246, 248] as const;
export type SunbirdSpeakerId = (typeof SUNBIRD_SPEAKER_IDS)[number];

export interface SunbirdTtsResult {
  audioUrl: string;
  sampleRate: number;
}

/**
 * Requests speech audio from Sunbird's TTS API. Returns a signed, time-
 * limited (~30 min) URL the client can play directly — we don't proxy the
 * audio bytes ourselves, just the URL.
 */
export async function getSunbirdSpeech(text: string, speakerId: SunbirdSpeakerId): Promise<SunbirdTtsResult> {
  const response = await fetch(SUNBIRD_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUNBIRD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, speaker_id: speakerId }),
  });

  if (!response.ok) {
    throw new Error(`Sunbird TTS request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { output: { audio_url: string; sample_rate: number } };
  return { audioUrl: data.output.audio_url, sampleRate: data.output.sample_rate };
}
