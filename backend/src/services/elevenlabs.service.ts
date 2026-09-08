// backend/src/services/elevenlabs.service.ts

import { env } from '../config/env';

// Turbo: the fast model, good enough quality for a conversational assistant
// that needs replies read back with low latency, not narration recorded once.
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// "Rachel" — one of ElevenLabs' premade voices. Used whenever
// ELEVENLABS_VOICE_ID is left blank, so the feature works the moment only the
// API key is set.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/** Generates speech via ElevenLabs and returns a playable MP3 buffer. */
export async function getElevenLabsSpeech(text: string): Promise<Buffer> {
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
