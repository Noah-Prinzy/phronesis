// backend/scripts/setup-piper.mjs
//
// Downloads Piper and one voice into backend/vendor/piper/.
//
// Piper is a local neural text-to-speech engine: it runs on the CPU, faster
// than real time, with no API key, no per-character cost and no quota to
// exhaust. That is the whole reason it is here — ElevenLabs' free grant is
// ten thousand characters for the life of an account, which is about fifteen
// of Phronesis' replies, and every hosted provider has some version of that
// ceiling.
//
// The binary and the model are ~80MB together, so they are downloaded rather
// than committed, and vendor/ is ignored by git. Run `npm run setup:piper`.

import { createWriteStream } from 'node:fs';
import { mkdir, rm, stat, readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const vendor = join(here, '..', 'vendor', 'piper');

const PIPER_VERSION = '2023.11.14-2';

/** Piper ships one archive per platform; pick by what we are actually on. */
function releaseAsset() {
  const { platform, arch } = process;
  if (platform === 'win32') return { name: 'piper_windows_amd64.zip', zip: true };
  if (platform === 'darwin') {
    return { name: arch === 'arm64' ? 'piper_macos_aarch64.tar.gz' : 'piper_macos_x64.tar.gz', zip: false };
  }
  if (platform === 'linux') {
    return { name: arch === 'arm64' ? 'piper_linux_aarch64.tar.gz' : 'piper_linux_x86_64.tar.gz', zip: false };
  }
  throw new Error(`No Piper build for ${platform}/${arch}.`);
}

/**
 * en_GB-jenny_dioco-medium: a warm British female voice.
 *
 * British rather than American because it is the far more familiar register
 * for Ugandan users, and "medium" rather than "high" because the quality gap
 * is small while the model is a third of the size and noticeably quicker to
 * load on a cold start.
 */
const VOICE = 'en_GB-jenny_dioco-medium';
const VOICE_URL_BASE =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium';

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  process.stdout.write(`  fetching ${url.split('/').pop()} … `);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  await pipeline(res.body, createWriteStream(dest));
  const { size } = await stat(dest);
  console.log(`${(size / 1e6).toFixed(1)} MB`);
}

/** Unpack with whatever the platform already has, rather than adding a dep. */
function extract(archive, into, isZip) {
  return new Promise((resolve, reject) => {
    const [cmd, args] = isZip
      ? process.platform === 'win32'
        ? ['powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${into}' -Force`]]
        : ['unzip', ['-oq', archive, '-d', into]]
      : ['tar', ['-xzf', archive, '-C', into]];
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  await mkdir(vendor, { recursive: true });

  const binName = process.platform === 'win32' ? 'piper.exe' : 'piper';
  const binPath = join(vendor, binName);
  const modelPath = join(vendor, `${VOICE}.onnx`);

  if ((await exists(binPath)) && (await exists(modelPath))) {
    console.log('Piper is already set up. Delete backend/vendor/piper to redo it.');
    return;
  }

  console.log('Setting up Piper (local, unlimited text-to-speech):');

  if (!(await exists(binPath))) {
    const asset = releaseAsset();
    const archive = join(vendor, asset.name);
    await download(
      `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/${asset.name}`,
      archive,
    );
    process.stdout.write('  extracting … ');
    await extract(archive, vendor, asset.zip);
    await rm(archive, { force: true });

    // Every archive unpacks into a `piper/` folder; flatten it so the service
    // has one fixed path to look at rather than guessing at nesting.
    const nested = join(vendor, 'piper');
    if (await exists(join(nested, binName))) {
      for (const entry of await readdir(nested)) {
        await rename(join(nested, entry), join(vendor, entry)).catch(() => {});
      }
      await rm(nested, { recursive: true, force: true });
    }
    console.log('done');
  }

  if (!(await exists(modelPath))) {
    await download(`${VOICE_URL_BASE}/${VOICE}.onnx`, modelPath);
    await download(`${VOICE_URL_BASE}/${VOICE}.onnx.json`, `${modelPath}.json`);
  }

  console.log(`\nPiper is ready — voice ${VOICE}.`);
  console.log('It is now the first provider the /api/tts route tries.');
}

main().catch((err) => {
  console.error('\nPiper setup failed:', err.message);
  console.error('The app still works: TTS falls back to ElevenLabs, Gemini, then the browser voice.');
  process.exit(1);
});
