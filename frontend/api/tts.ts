// frontend/api/tts.ts
//
// Vercel serverless function — deployed alongside the frontend as /api/tts,
// same origin as the app itself. Deployed counterpart of
// backend/src/routes/tts.ts + tts.service.ts — see chat.ts for why this
// file (not the standalone Express server) is what runs in production.
//
// Uses Gemini's own native TTS (gemini-3.1-flash-tts-preview) rather than
// self-hosting a model like Kokoro — free-tier within rate limits, same API
// key already used for chat, and since it's a hosted API call (not
// something running in-process) there's no RAM/timeout/cold-start risk to
// manage, unlike every self-hosting option explored before this.

import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

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

const ttsRequestSchema = z.object({
  text: z.string().min(1),
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: parsed.data.text,
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
    const wav = pcmToWav(Buffer.from(inlineData.data, 'base64'), sampleRate, channels, 16);

    res.setHeader('Content-Type', 'audio/wav');
    res.status(200).send(wav);
  } catch (err) {
    console.error('TTS request failed:', err);
    res.status(502).json({ error: 'Failed to generate speech.' });
  }
}
