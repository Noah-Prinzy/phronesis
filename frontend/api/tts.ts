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
 * Andrew. Chosen by ear from an audition of eleven candidates reading the same
 * line, kept in docs/voice-audition/.
 *
 * He is one of Microsoft's *Multilingual* voices, and that is why he wins
 * rather than the accent: they are a newer generation than the plain Neural
 * set, and Emily, Sonia and Libby are all the older model. Microsoft tags him
 * "Warm / Confident / Authentic / Honest", which is close to the job — most of
 * what Phronesis says is a fault explained to someone worried about the bill.
 *
 * MUST match backend/src/services/edge.service.ts. A user who hears the dev
 * server and the deployed app hears two different people otherwise.
 *
 * Runners-up: en-US-AvaMultilingualNeural, en-US-EmmaMultilingualNeural.
 * en-KE-AsiliaNeural and en-TZ-ImaniNeural are the East African options.
 */
const VOICE = process.env.EDGE_TTS_VOICE ?? 'en-US-AndrewMultilingualNeural';
const RATE = process.env.EDGE_TTS_RATE ?? '0%';
const PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz';
/**
 * 96kbps, not 48.
 *
 * Speech does need the bandwidth: at 48kbps a neural voice arrives thin and
 * slightly metallic, and the fault reads as the VOICE being bad rather than
 * the encoding. Half of "the voice sounds terrible" was this. Doubling it
 * roughly doubles the file — about 140kB for a long line instead of 70 —
 * which is a fair trade even on a Ugandan mobile connection, and repeated
 * lines are cached anyway.
 */
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

const GEMINI_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_VOICE = 'Sulafat';

/**
 * Rewrite text so a speech model says it the way a person would.
 *
 * Neural voices spell out anything that does not look like a word: "mic"
 * came out as "em eye see", which is the most jarring thing he can do
 * mid-sentence. This endpoint rejects SSML outright — <break>, <say-as> and
 * mstts:express-as were each tried against this voice and every one of them
 * closes the stream with no audio — so the text itself is the only lever.
 *
 * Applied ONLY to what is spoken. The words on screen keep their real
 * spelling, because "UGX 280,000" is what a price looks like and
 * "280,000 shillings" is what it sounds like.
 *
 * KEEP IN STEP with backend/src/services/speech-text.ts, which is the same
 * pipeline for the dev server. They are separate copies because this file
 * deploys on its own and cannot reach across into backend/.
 */

/**
 * Markdown is written to be seen, and his replies arrive as markdown because
 * that is what the screen wants. Spoken it is wrong, not merely useless:
 * "## What it costs" was pronounced WITH the hashes, which the word-boundary
 * metadata shows as two spoken tokens ("#", "#") before the sentence starts.
 */
const MARKDOWN: Array<[RegExp, string]> = [
  [/```[\s\S]*?```/g, ' '],
  [/`([^`]+)`/g, '$1'],
  [/^\s{0,3}#{1,6}\s+/gm, ''],
  [/(\*\*|__)(.*?)\1/g, '$2'],
  [/(\*|_)(?=\S)(.*?\S)\1/g, '$2'],
  [/!?\[([^\]]*)\]\([^)]*\)/g, '$1'],
  [/^\s*(?:[-*_]\s*){3,}$/gm, ''],
  [/^\s*[-*+]\s+/gm, ''],
  [/^\s*>\s?/gm, ''],
];

/** Digits, said one at a time. */
const DIGIT: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
};

/**
 * Fault codes, spelled out. "P0420" is a letter and four separate digits, and
 * it is the single most important string this app says — the one place a
 * wrong reading makes him sound like he does not know the subject.
 */
function spellCodes(text: string): string {
  return text.replace(
    /\b([PBCU])([0-3])([0-9A-F]{3})\b/g,
    (_whole, system: string, first: string, rest: string) =>
      [system, ...`${first}${rest}`].map((c) => DIGIT[c] ?? c).join(' '),
  );
}

const SPOKEN: Array<[RegExp, string]> = [
  /**
   * His own name, which he could not say. "Phronesis" is Greek and the model
   * has never met it — read literally it came out as roughly "e na unasis".
   * No <phoneme> available, so the lever is spelling: "ee" forces the long
   * stressed middle syllable. Target fro-NEE-sis; the screen keeps the real
   * spelling. Hyphens are worse — the engine reads them as pauses.
   */
  [/\bPhronesis\b/gi, 'Froneesis'],

  // The one that started this.
  [/\bmics\b/gi, 'mikes'],
  [/\bmic\b/gi, 'mike'],

  // Money — the thing people listen hardest to. "UGX" alone reads as three
  // letters, and the amount has to come first to sound like speech.
  [/\bUGX\s*([\d,]+(?:\.\d+)?)/gi, '$1 shillings'],
  [/\bUGX\b/gi, 'shillings'],

  // Units. "km" becomes "kay em" otherwise.
  [/\bkm\s*\/\s*[lL]\b/g, 'kilometres per litre'],
  [/\bkm\s*\/\s*h\b/gi, 'kilometres per hour'],
  [/\bkph\b/gi, 'kilometres per hour'],
  [/\b([\d,]+)\s*km\b/gi, '$1 kilometres'],
  [/\bkm\b/gi, 'kilometres'],

  // Car vocabulary that IS spoken as letters, but needs spacing or the model
  // runs the letters into a non-word.
  [/\bOBD\b/g, 'O B D'],
  [/\bDTC\b/g, 'D T C'],
  [/\bECU\b/g, 'E C U'],
  [/\bABS\b/g, 'A B S'],
  [/\bRPM\b/gi, 'R P M'],
  [/\bSUV\b/g, 'S U V'],
  [/\bA\/C\b/g, 'air conditioning'],
  [/\b4WD\b/g, 'four wheel drive'],
  [/\bAWD\b/g, 'all wheel drive'],

  // Number plates: "UAX 123B" is otherwise attempted as a word.
  [/\b([A-Z]{3})\s?(\d{3})([A-Z])\b/g, '$1 $2 $3'],

  /**
   * An ellipsis is written for a beat of hesitation and this voice barely
   * gives it one. Measured on the same sentence: no punctuation 1.68s, a
   * comma 2.11s, "…" 2.06s — so the character buys LESS pause than a comma,
   * the opposite of what it is for. Three full stops buy 2.83s.
   */
  [/\u2026/g, '...'],
];

/**
 * Make the text safe to put inside an XML document.
 *
 * NOT a nicety. msedge-tts interpolates this string straight into an SSML
 * template without escaping it (`_SSMLTemplate`), so one ampersand does not
 * mispronounce — it makes the document malformed and the service returns NO
 * AUDIO AT ALL. "Wear & tear on the pads" was measured producing zero bytes,
 * and the retry on a fresh socket fails identically. Escaped, the same line
 * speaks normally.
 */
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * What to SAY. Safe for any provider — no transport assumptions.
 *
 * Deliberately does not escape. Escaping belongs to the SSML transport alone,
 * and Gemini below takes plain text: hand it `&amp;` and it pronounces the
 * entity.
 */
function normaliseForSpeech(text: string): string {
  const stripped = MARKDOWN.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    text,
  );
  const said = SPOKEN.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    spellCodes(stripped),
  );
  return said.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const requestSchema = z.object({ text: z.string().min(1) });

/**
 * Module-level cache and connection, which on a serverless platform means
 * "per warm instance" rather than "per server". That is worth having anyway:
 * he repeats his greeting and his interruption apologies constantly, and a
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

/**
 * One socket carries one stream at a time, so requests through it are
 * SERIALISED.
 *
 * Two concurrent `toStream` calls on the same connection interleave their
 * audio: not an error, just two replies spliced into each other, which would
 * be a miserable bug to track down. This used to be close to theoretical here
 * because one reply meant one request. It is not any more — the client now
 * speaks a reply sentence by sentence and fires the whole set off at once to
 * prefetch them, so a single answer arrives as several overlapping requests,
 * and on a warm instance they meet on this socket.
 *
 * Matches `serialise` in backend/src/services/edge.service.ts.
 */
let queue: Promise<unknown> = Promise.resolve();

function serialise<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  // Swallow rejections on the CHAIN only — the caller still sees its own.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

  const mp3 = await serialise(async () => {
    try {
      return await streamOnce(await connection(), text);
    } catch {
      // A socket idle long enough gets closed at the far end and the failure
      // looks like any other. Drop it and try once on a fresh one — a
      // reconnect is far cheaper than a line of silence.
      shared = null;
      return streamOnce(await connection(), text);
    }
  });

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

  // Spoken form, not written form — see normaliseForSpeech().
  const text = normaliseForSpeech(parsed.data.text);

  try {
    // Escaped only here. Edge's transport drops this into an SSML document
    // unescaped, where a bare "&" produces no audio at all; Gemini below
    // takes plain text and would read the entity out.
    const mp3 = await edgeSpeech(escapeXml(text));
    res.setHeader('Content-Type', 'audio/mpeg');
    // His lines repeat, and an identical request should not cross the network
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
