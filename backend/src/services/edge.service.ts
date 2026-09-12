// backend/src/services/edge.service.ts

import { createHash } from 'node:crypto';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { escapeXml, normaliseForSpeech } from './speech-text';

/**
 * Phronesis' voice: Microsoft's neural speech, the engine behind Edge's
 * Read Aloud.
 *
 * This is the fourth thing tried and the first that satisfies every
 * constraint at once, which is worth recording because each earlier attempt
 * failed for a different reason:
 *
 *   ElevenLabs  best voice, but 10,000 characters for the life of the account
 *   Piper       fast and free, but audibly synthesised
 *   Kokoro      better, but 82M parameters reads text rather than says it,
 *               needed WebGPU and a 350MB download, and fp16 corrupted output
 *   Gemini TTS  genuinely good and directable, but 9s per line and a free
 *               tier of TEN REQUESTS PER DAY
 *
 * Measured here on the same sentence: Emily and Sonia both around 0.45s,
 * against Gemini's 9.1s and Kokoro's 4.4s. No key, no account, no quota.
 *
 * It runs on the SERVER, which is the property that matters most for reach:
 * the browser receives an MP3 and plays it, so this works on every device and
 * every browser without WebGPU, without a model download, and without sounding
 * different on each machine — all of which Kokoro required.
 *
 * THE CAVEAT, AND IT IS A REAL ONE. This is the endpoint Edge's Read Aloud
 * uses, and it is not a documented public API. It is fine for building; for a
 * commercial release it is a grey area and should not be relied on. The clean
 * swap is Azure's official Speech service, which serves the IDENTICAL voices
 * (en-IE-EmilyNeural is the same voice) on a free tier of 500,000 characters a
 * month that does not expire. Same sound, supported transport, one key.
 */

/**
 * Andrew. Chosen by ear from an audition of eleven candidates reading the same
 * line — which is the only way this decision has ever gone well, because every
 * attempt to predict which model would sound human has been wrong.
 *
 * He is one of Microsoft's *Multilingual* voices, and that is the reason he
 * wins rather than the accent. Those are a newer generation than the plain
 * Neural set: Emily, Sonia and Libby are all the older model, and no amount of
 * choosing between them closes the gap to this one. Microsoft tags him
 * "Warm / Confident / Authentic / Honest", which is close to the job — most of
 * what Phronesis says is a fault explained to someone worried about the bill.
 *
 * Two things were wrong before, and only one of them was the voice: the output
 * was also encoded at 48kbps (see FORMAT below), which made every candidate
 * sound thin. Both were changed together.
 *
 * The audition is kept in docs/voice-audition/ so the comparison can be heard
 * again rather than argued about.
 *
 * A note on speed, since the older comment above quotes 0.45s: on the day
 * Andrew was chosen, five configurations measured 3.3-5.2s per uncached line
 * and the *slowest* of them was the previous setup, Emily at 48kbps. Voice and
 * bitrate did not separate at all. Whatever governs this is the service or the
 * link, not the choice — so do not pick a voice for speed on one afternoon's
 * numbers, and re-measure before believing any figure here. Runners-up: en-US-AvaMultilingualNeural and
 * en-US-EmmaMultilingualNeural; en-KE-AsiliaNeural and en-TZ-ImaniNeural are
 * the East African options, worth revisiting if a local accent turns out to
 * matter more to Ugandan users than polish does.
 */
const VOICE = process.env.EDGE_TTS_VOICE ?? 'en-US-AndrewMultilingualNeural';

/**
 * His own pace, unmodified. An earlier voice was slowed 6% on the theory that
 * explaining a fault to a worried owner should not be rushed; auditioned
 * against 0%, −12% and −18%, the untouched delivery won. The theory was fine
 * and the ear disagreed.
 */
const RATE = process.env.EDGE_TTS_RATE ?? '0%';
const PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz';

/**
 * 96kbps, not 48.
 *
 * The first version shipped at 48kbps on the reasoning that speech does not
 * need bandwidth. It does: at 48kbps a neural voice arrives thin and slightly
 * metallic, and the fault reads as the *voice* being bad rather than the
 * encoding. Doubling it roughly doubles the file — around 140kB for a long
 * line instead of 70 — which is a fair trade even on a Ugandan mobile
 * connection, and every repeated line is cached anyway.
 */
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

/**
 * He repeats himself constantly — the greeting, the apologies he uses when
 * interrupted — and a cache turns those from a network round trip into
 * nothing. Bounded, because this is audio on a long-running server.
 */
const CACHE_LIMIT = 128;
const cache = new Map<string, Buffer>();

function remember(key: string, mp3: Buffer): void {
  cache.set(key, mp3);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** A wedged socket must never hold a request open. */
const TIMEOUT_MS = 15_000;

/**
 * What he actually says, and how it is carried.
 *
 * Both live in `speech-text.ts` because Edge is not the only voice: Gemini
 * sits behind it in this route's provider chain and used to get none of this,
 * so a fallback line would read markdown aloud and mispronounce every fault
 * code. The escaping is applied HERE and only here — it is a property of the
 * SSML transport, not of speech, and a provider that took plain text would
 * pronounce the entities.
 */

/**
 * One socket, reused.
 *
 * Every request used to open its own connection to Microsoft, and the
 * handshake — not the synthesis — was most of the latency. Measured with two
 * seconds between calls, which is roughly how a conversation arrives:
 *
 *   fresh connection each time   2.89 / 2.14 / 4.15 / 4.24s
 *   one connection reused        2.39 / 1.20 / 1.44 / 2.11s
 *
 * Back-to-back in a tight loop the same calls take 0.44s, so the remaining
 * cost is the endpoint waking up rather than anything this code controls.
 *
 * The socket carries one stream at a time, so requests are SERIALISED through
 * a promise chain. Two concurrent `toStream` calls on one connection interleave
 * their audio, which would be a maddening bug to find: not an error, just two
 * replies spliced into each other.
 */
let shared: MsEdgeTTS | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function connection(): Promise<MsEdgeTTS> {
  if (shared) return shared;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, FORMAT);
  shared = tts;
  return tts;
}

/** Run `job` after everything already queued, whatever happened to those. */
function serialise<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  // Swallow rejections on the CHAIN only — the caller still sees its own.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

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

export async function getEdgeSpeech(input: string): Promise<Buffer> {
  const text = escapeXml(normaliseForSpeech(input));
  const key = createHash('sha1').update(`${VOICE}|${RATE}|${PITCH}|${text}`).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;

  const mp3 = await serialise(async () => {
    try {
      return await streamOnce(await connection(), text);
    } catch (err) {
      // A socket that has been idle long enough gets closed at the far end,
      // and the failure looks like any other. Drop it and try once more on a
      // fresh one before giving up — a reconnect is far cheaper than a line
      // of silence.
      shared = null;
      console.warn('Edge TTS connection failed, reconnecting once:', err instanceof Error ? err.message : err);
      return streamOnce(await connection(), text);
    }
  });

  remember(key, mp3);
  return mp3;
}
