// backend/src/services/tts.service.ts

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { normaliseForSpeech } from './speech-text';

const TTS_MODEL = 'gemini-3.1-flash-tts-preview';

/**
 * Sulafat, described by Google as the warm one. Phronesis is usually
 * explaining a fault to someone who is worried about money, so warmth is the
 * job — Kore, the previous pick, is the firm voice and read as brisk.
 * Override with GEMINI_TTS_VOICE to audition another without a code change.
 */
const VOICE_NAME = process.env.GEMINI_TTS_VOICE ?? 'Sulafat';

/**
 * Gemini's TTS takes a plain-English direction before the line, and this is
 * the whole reason it is worth using over a small local model. Kokoro and
 * Piper have no equivalent: their delivery is fixed in the weights, which is
 * why they sound like something reading rather than someone talking. Here the
 * accent, the pace and the attitude are all instructions.
 *
 * The direction is deliberately about ATTITUDE rather than performance —
 * "unhurried", "reassuring" — because asking a TTS model to emote tends to
 * produce something theatrical, which is worse than flat.
 */
const STYLE =
  process.env.GEMINI_TTS_STYLE ??
  'Speak in a warm, natural British accent, unhurried and reassuring, like a ' +
    'knowledgeable friend explaining a car problem to someone who is worried ' +
    'about what it will cost. Use natural sentence phrasing and let questions ' +
    'genuinely rise at the end. Do not sound like an announcer.';

/** Gemini's TTS returns headerless raw PCM (confirmed live: `audio/l16; rate=24000; channels=1`) — browsers can't play that directly via an <audio> element, so it needs a real WAV header wrapped around it. */
function pcmToWav(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/** Gemini's audio mimeType encodes the format as e.g. "audio/l16; rate=24000; channels=1" rather than fixed fields. */
function parseAudioMimeType(mimeType: string): { sampleRate: number; channels: number } {
  const rateMatch = mimeType.match(/rate=(\d+)/);
  const channelsMatch = mimeType.match(/channels=(\d+)/);
  return {
    sampleRate: rateMatch ? parseInt(rateMatch[1], 10) : 24000,
    channels: channelsMatch ? parseInt(channelsMatch[1], 10) : 1,
  };
}

/** Generates speech via Gemini's native TTS and returns a playable WAV buffer. */
export async function getGeminiSpeech(text: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    // The direction and the line, which is the shape Gemini's TTS expects.
    // Normalised exactly as Edge's is. This is a fallback, and one that reads
    // markdown aloud sounds broken at precisely the wrong moment. No XML
    // escaping though: this takes plain text, so entities would be spoken.
    contents: `${STYLE}

${normaliseForSpeech(text)}`,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
      },
    },
  });

  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    throw new Error('Gemini TTS returned no audio data.');
  }

  const { sampleRate, channels } = parseAudioMimeType(inlineData.mimeType ?? '');
  return pcmToWav(Buffer.from(inlineData.data, 'base64'), sampleRate, channels, 16);
}
