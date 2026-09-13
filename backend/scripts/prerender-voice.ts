// backend/scripts/prerender-voice.ts
//
// Render every fixed line to an MP3 once, at build time.
//
// Run with:  npm run voice:prerender
//
// WHY. Measured against the live endpoint, the first audio byte for a short
// line arrives about 1.3 seconds after the request — and that 1.3s is the
// service waking up, not synthesis, so it does not shrink for a short line.
// The Welcome screen therefore opens with over a second of silence before
// Phronesis says anything, every single time, for a sentence that has never
// once been different.
//
// Rendering ahead of time makes those lines instant. It also takes the first
// thing a new user ever hears off a grey-area endpoint entirely: the greeting
// and the whole onboarding flow keep working with the backend down, offline,
// or not yet deployed.
//
// The output is committed. It is a few hundred kilobytes of audio that changes
// only when the words change, and having it in the repo is what makes the
// above true on a fresh clone.

import { createHash } from 'node:crypto'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

import { escapeXml, normaliseForSpeech } from '../src/services/speech-text.service'
import { ALL_FIXED_LINES } from '../../frontend/src/voice/lines'

const here = path.dirname(fileURLToPath(import.meta.url))
const AUDIO_DIR = path.resolve(here, '../../frontend/public/voice')
const MANIFEST = path.resolve(here, '../../frontend/src/voice/manifest.ts')

/**
 * Must match `edge.service.ts`. If these drift, a pre-rendered line will sound
 * different from the same line spoken live, which is a subtle and horrible
 * bug — the greeting in one voice and the reply in another.
 */
const VOICE = process.env.EDGE_TTS_VOICE ?? 'en-US-AndrewMultilingualNeural'
const RATE = process.env.EDGE_TTS_RATE ?? '0%'
const PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz'
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3

/** Short, stable, and changes when the words do. */
function nameFor(line: string): string {
  return `${createHash('sha1').update(`${VOICE}|${RATE}|${PITCH}|${line}`).digest('hex').slice(0, 12)}.mp3`
}

function render(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const { audioStream } = tts.toStream(text, { rate: RATE, pitch: PITCH })
    const timer = setTimeout(() => reject(new Error('timed out')), 20_000)
    audioStream.on('data', (c: Buffer) => chunks.push(c))
    audioStream.on('end', () => {
      clearTimeout(timer)
      const buf = Buffer.concat(chunks)
      if (buf.length) resolve(buf)
      else reject(new Error('no audio'))
    })
    audioStream.on('error', (e: Error) => {
      clearTimeout(timer)
      reject(e)
    })
  })
}

async function main(): Promise<void> {
  await mkdir(AUDIO_DIR, { recursive: true })

  const tts = new MsEdgeTTS()
  await tts.setMetadata(VOICE, FORMAT)

  const manifest = new Map<string, string>()
  let bytes = 0

  for (const line of ALL_FIXED_LINES) {
    const file = nameFor(line)
    // Rendered through exactly the pipeline the live route uses, escaping and
    // all, so the two cannot diverge in pronunciation.
    const audio = await render(tts, escapeXml(normaliseForSpeech(line)))
    await writeFile(path.join(AUDIO_DIR, file), audio)
    manifest.set(line, `/voice/${file}`)
    bytes += audio.length
    console.log(`  ${file}  ${(audio.length / 1024).toFixed(0)}kB  ${line.slice(0, 52)}…`)
  }

  // Drop renders of lines that no longer exist, or the folder only ever grows.
  const wanted = new Set([...manifest.values()].map((u) => path.basename(u)))
  for (const existing of await readdir(AUDIO_DIR)) {
    if (existing.endsWith('.mp3') && !wanted.has(existing)) {
      await unlink(path.join(AUDIO_DIR, existing))
      console.log(`  removed stale ${existing}`)
    }
  }

  const body = [...manifest]
    .map(([line, url]) => `  ${JSON.stringify(line)}: ${JSON.stringify(url)},`)
    .join('\n')

  await writeFile(
    MANIFEST,
    `// GENERATED FILE — do not edit by hand.
// Written by backend/scripts/prerender-voice.ts. Run \`npm run voice:prerender\`
// in backend/ after changing anything in voice/lines.ts.

/**
 * Fixed lines that already exist as audio, keyed by the exact text.
 *
 * A miss is not a failure — \`useSpeak\` falls through to the live endpoint, so
 * an out-of-date manifest costs latency and nothing else. That is deliberate:
 * a stale build should never make Phronesis mute.
 */
export const VOICE_MANIFEST: Readonly<Record<string, string>> = {
${body}
}
`,
    'utf8',
  )

  console.log(`\n${manifest.size} lines, ${(bytes / 1024).toFixed(0)}kB total`)
  console.log(`audio    -> ${AUDIO_DIR}`)
  console.log(`manifest -> ${MANIFEST}`)
}

main().catch((err) => {
  console.error('Pre-render failed:', err)
  process.exit(1)
})
