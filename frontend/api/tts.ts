// frontend/api/tts.ts
//
// Vercel serverless function — deployed as /api/tts, same origin as the app.
// THIS is what runs in production, not backend/src/routes/tts.ts. The two are
// separate copies and it is easy to improve one and ship the other: this file
// sat on Gemini's "Kore" voice for a whole day of voice work that only ever
// landed in backend/.
//
// Phronesis speaks through Microsoft's neural voices (msedge-tts), which need
// no API key, have no quota, and run server-side so every device and browser
// gets the same voice by playing an MP3. Gemini stays behind it as a fallback
// for the case where the endpoint is unreachable — though its free tier is ten
// requests a DAY, so it is a courtesy rather than a safety net.
//
// A provider is SKIPPED when it is absent and MOVED PAST when it fails, and
// those are two different tests. An earlier version of this route branched on
// `if (API_KEY)` — whether a key existed, not whether the call worked — so
// once a quota was spent the key was still there, every request took the dead
// path, and the working fallback beneath it could never run.
//
// THE CAVEAT, RECORDED WHERE IT SHIPS: this is the endpoint behind Edge's Read
// Aloud, not a documented public API. Fine while building; a grey area for a
// commercial release. The clean swap is Azure's official Speech service, which
// serves the IDENTICAL voices (en-IE-EmilyNeural is the same voice) on a free
// tier of 500,000 characters a month. Same sound, supported transport, one key.

import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { z } from 'zod';

/**
 * Emily, Irish. Picked by ear from an audition of all seven British and Irish
 * voices — the only way this decision ever went well, since every attempt to
 * predict which model would sound human was wrong.
 *
 * Alternatives: en-GB-SoniaNeural, LibbyNeural, MaisieNeural; the male voices
 * are RyanNeural, ThomasNeural and en-IE-ConnorNeural.
 */
const VOICE = process.env.EDGE_TTS_VOICE ?? 'en-IE-EmilyNeural';
const RATE = process.env.EDGE_TTS_RATE ?? '0%';
const PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz';
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;

const GEMINI_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_VOICE = 'Sulafat';

const requestSchema = z.object({ text: z.string().min(1) });

/**
 * Module-level cache and connection, which on a serverless platform means
 * "per warm instance" rather than "per server". That is worth having anyway:
 * she repeats her greeting and her interruption apologies constantly, and a
 * warm instance turns those from a network round trip into nothing. A cold
 * start simply pays full price, which is the normal cost of this shape.
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, Buffer>();

let shared: MsEdgeTTS | null = null;

async function connection(): Promise<MsEdgeTTS> {
  if (shared) return shared;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, FORMAT);
  shared = tts;
  return tts;
}

const TIMEOUT_MS = 15_000;

function streamOnce(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Edge TTS timed out after ${TIMEOUT_MS}ms.`));
    }, TIMEOUT_MS);

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) return reject(err);
      const buf = Buffer.concat(chunks);
      if (buf.length === 0) return reject(new Error('Edge TTS returned no audio.'));
      resolve(buf);
    };

    try {
      const { audioStream } = tts.toStream(text, { rate: RATE, pitch: PITCH });
      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => finish());
      audioStream.on('error', (e: Error) => finish(e));
    } catch (e) {
      finish(e as Error);
    }
  });
}

async function edgeSpeech(text: string): Promise<Buffer> {
  const key = `${VOICE}|${RATE}|${PITCH}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let mp3: Buffer;
  try {
    mp3 = await streamOnce(await connection(), text);
  } catch {
    // A socket idle long enough gets closed at the far end and the failure
    // looks like any other. Drop it and try once on a fresh one — a reconnect
    // is far cheaper than a line of silence.
    shared = null;
    mp3 = await streamOnce(await connection(), text);
  }

  cache.set(key, mp3);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return mp3;
}

/* ------------------------------------------------------------- gemini ---- */

/** Gemini returns headerless PCM; an <audio> element cannot play that. */
function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bits: number): Buffer {
  const byteRate = sampleRate * channels * (bits / 8);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * (bits / 8), 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function geminiSpeech(text: string, apiKey: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } },
    },
  });

  const inline = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline?.data) throw new Error('Gemini TTS returned no audio data.');

  const mime = inline.mimeType ?? '';
  const rate = Number(mime.match(/rate=(\d+)/)?.[1] ?? 24000);
  const channels = Number(mime.match(/channels=(\d+)/)?.[1] ?? 1);
  return pcmToWav(Buffer.from(inline.data, 'base64'), rate, channels, 16);
}

/* ------------------------------------------------------------- handler --- */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const text = parsed.data.text;

  try {
    const mp3 = await edgeSpeech(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    // Her lines repeat, and an identical request should not cross the network
    // twice. Immutable because the body is a pure function of the text.
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).send(mp3);
    return;
  } catch (err) {
    console.error('Edge TTS failed, trying Gemini:', err instanceof Error ? err.message : err);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Not an error worth alarming about: the frontend falls back to the
    // browser's own synthesiser below this.
    res.status(503).json({ error: 'No text-to-speech provider is reachable.' });
    return;
  }

  try {
    const wav = await geminiSpeech(text, apiKey);
    res.setHeader('Content-Type', 'audio/wav');
    res.status(200).send(wav);
  } catch (err) {
    console.error('TTS failed on every provider:', err);
    res.status(502).json({ error: 'Failed to generate speech.' });
  }
}
