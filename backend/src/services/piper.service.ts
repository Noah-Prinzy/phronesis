// backend/src/services/piper.service.ts

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Phronesis' voice, generated locally by Piper.
 *
 * Piper is a neural text-to-speech engine that runs on the CPU with no API
 * key, no per-character billing and no quota. That is the entire reason it is
 * the voice rather than a fallback. The hosted service used before it granted
 * ten thousand characters for the life of the account — roughly fifteen of her
 * replies — and every hosted alternative has some version of the same ceiling.
 * A voice that stops working when a counter runs out is not a voice you can
 * build a product on.
 *
 * The binary and the model are not in git (~80MB). `npm run setup:piper`
 * fetches them into vendor/piper; if they are absent this service reports
 * itself unavailable and the route falls through to Gemini, so a fresh clone
 * still speaks before anyone has run setup.
 */

const VENDOR = path.resolve(__dirname, '..', '..', 'vendor', 'piper');
const BIN = path.join(VENDOR, process.platform === 'win32' ? 'piper.exe' : 'piper');
const MODEL = path.join(VENDOR, 'en_GB-jenny_dioco-medium.onnx');

/**
 * Piper writes raw headerless PCM to stdout with --output-raw. The sample rate
 * is a property of the model rather than a constant, so it is read from the
 * model's own config instead of hard-coded — a different voice would produce
 * audio at the wrong speed under a guessed rate, and it would sound like a
 * fault in the voice rather than a wrong number here.
 */
function modelSampleRate(): number {
  try {
    const cfg = JSON.parse(readFileSync(`${MODEL}.json`, 'utf-8')) as {
      audio?: { sample_rate?: number };
    };
    return cfg.audio?.sample_rate ?? 22050;
  } catch {
    return 22050;
  }
}

/** Browsers cannot play headerless PCM through an <audio> element. */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer {
  const byteRate = sampleRate * channels * (bits / 8);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * (bits / 8), 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Is Piper actually installed on this machine? */
export function piperAvailable(): boolean {
  return existsSync(BIN) && existsSync(MODEL);
}

/**
 * Synthesis costs about 1.5s per line, almost all of it loading the model into
 * a fresh process. Phronesis repeats herself constantly — the greeting, the
 * apologies she uses when interrupted — so those lines are worth keeping.
 *
 * Bounded, because this is audio and it would otherwise grow without limit
 * across a long-running server.
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, Buffer>();

function remember(key: string, wav: Buffer): void {
  cache.set(key, wav);
  if (cache.size > CACHE_LIMIT) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** Piper is fast, but a wedged process must never hold a request open. */
const TIMEOUT_MS = 20_000;

export async function getPiperSpeech(text: string): Promise<Buffer> {
  if (!piperAvailable()) {
    throw new Error('Piper is not installed. Run `npm run setup:piper` in backend/.');
  }

  const key = createHash('sha1').update(text).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;

  const wav = await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(BIN, ['--model', MODEL, '--output-raw'], {
      // espeak-ng-data and the bundled DLLs are resolved relative to the
      // binary, so it has to run from its own directory.
      cwd: VENDOR,
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      reject(new Error(`Piper timed out after ${TIMEOUT_MS}ms.`));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (d: Buffer) => chunks.push(d));
    // Piper logs progress to stderr on success, so this is not an error signal
    // on its own — it is only worth reporting when the exit code is non-zero.
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Piper exited ${code}: ${stderr.trim().slice(0, 300)}`));
        return;
      }
      const pcm = Buffer.concat(chunks);
      if (pcm.length === 0) {
        reject(new Error('Piper produced no audio.'));
        return;
      }
      resolve(pcmToWav(pcm, modelSampleRate()));
    });

    proc.stdin.end(`${text}\n`);
  });

  remember(key, wav);
  return wav;
}
