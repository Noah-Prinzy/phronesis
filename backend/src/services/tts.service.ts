// backend/src/services/tts.service.ts

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

const TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE_NAME = 'Kore';

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
    contents: text,
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
