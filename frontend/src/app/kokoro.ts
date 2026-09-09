/**
 * Phronesis' voice: Kokoro-82M, running in the browser on the user's own GPU.
 *
 * Why here rather than on the server. Kokoro sounds markedly better than the
 * small local models, but on the server's CPU it was measured at a real-time
 * factor of 1.3 — eight seconds of work for six seconds of speech, which is
 * slower than talking. Even sentence-by-sentence streaming cannot rescue that,
 * because generation falls behind playback and never catches up. On WebGPU it
 * runs on hardware that is actually suited to it, and the work moves off the
 * server entirely: no quota, no per-character cost, no request to be rate
 * limited, and it keeps working with the backend switched off.
 *
 * What it costs is a one-time model download. That is not free for the people
 * this app is for — Ugandan drivers, frequently on metered mobile data — so
 * the download is gated rather than automatic. See `shouldAutoLoad`.
 *
 * Licence: Kokoro-82M is Apache-2.0, which is cleaner than any of the Piper
 * voices it replaces — one of those was CC BY-NC-SA (non-commercial, unusable
 * in a product) and the one that shipped stated its licence only as "See URL",
 * which is not a grant at all.
 */

/** Weights are cached by the browser after the first load, keyed by this id. */
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'

/**
 * British, because that is the register these users expect, and female to
 * match the voice the app has always had. Kokoro ships four: emma, isabella,
 * alice and lily.
 */
export const VOICE = 'bf_emma'

/**
 * The weights, and roughly what the user is agreeing to download.
 *
 * fp16 rather than fp32: half the size (163MB against 326MB) and WebGPU
 * handles half precision natively, so it is usually the faster of the two on a
 * GPU as well as the cheaper to fetch. The int8 builds are smaller still but
 * were measured far slower — q8 ran at a real-time factor of 3.0 against
 * fp32's 1.3 on CPU — because integer kernels fall back to slow paths.
 *
 * The weights are not the whole bill. onnxruntime's WebGPU build is another
 * 21.6MB of wasm (5.2MB over the wire), so a first load is about 170MB all
 * told. Both are cached by the browser afterwards, and neither is fetched at
 * all on a connection that says not to — see `shouldAutoLoad`.
 */
const DTYPE = 'fp16' as const
export const MODEL_MB = 170

type KokoroModule = typeof import('kokoro-js')
type KokoroInstance = Awaited<ReturnType<KokoroModule['KokoroTTS']['from_pretrained']>>

export type KokoroStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'failed'

let instance: KokoroInstance | null = null
let loading: Promise<KokoroInstance | null> | null = null
let status: KokoroStatus = 'idle'

export function kokoroStatus(): KokoroStatus {
  return status
}

/** Is there a GPU we can actually run on? */
export async function webgpuAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
  if (!gpu) return false
  try {
    return (await gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}

interface NetworkInformation {
  effectiveType?: string
  saveData?: boolean
}

/**
 * Whether to fetch ~92MB without being asked.
 *
 * Never on a metered or slow connection, and never when the user has asked
 * their browser to save data — Data Saver is an explicit request not to do
 * exactly this, and honouring it matters more here than a nicer voice does.
 * The answer being false is not a failure: it means we ask first, or fall
 * back, rather than spending someone's bundle on their behalf.
 */
export function shouldAutoLoad(): boolean {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (!conn) return true // No information: assume unmetered rather than block the feature.
  if (conn.saveData) return false
  const slow = ['slow-2g', '2g', '3g']
  return !slow.includes(conn.effectiveType ?? '')
}

/**
 * Load the model, once. Concurrent callers share the same in-flight promise
 * rather than each starting a download of their own.
 *
 * `onProgress` reports 0–1 across the whole download so a first load can show
 * something honest instead of a spinner over ninety megabytes.
 */
export function loadKokoro(onProgress?: (p: number) => void): Promise<KokoroInstance | null> {
  if (instance) return Promise.resolve(instance)
  if (loading) return loading

  status = 'loading'
  loading = (async () => {
    try {
      if (!(await webgpuAvailable())) {
        status = 'unsupported'
        return null
      }

      // Dynamic, so ~90MB of runtime is a separate chunk that pages without a
      // voice never pay for.
      const { KokoroTTS } = await import('kokoro-js')

      const totals = new Map<string, { loaded: number; total: number }>()
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
        device: 'webgpu',
        // transformers.js emits several shapes down this callback; only the
        // per-file download progress carries the numbers we need.
        progress_callback: (p) => {
          if (!onProgress || p.status !== 'progress') return
          const info = p as { file?: string; loaded?: number; total?: number }
          if (!info.file || !info.total) return
          totals.set(info.file, { loaded: info.loaded ?? 0, total: info.total })
          let done = 0
          let all = 0
          for (const t of totals.values()) {
            done += t.loaded
            all += t.total
          }
          if (all > 0) onProgress(Math.min(1, done / all))
        },
      })

      /**
       * Burn the first generation here rather than on her first reply.
       *
       * Measured on this machine: run 1 took 21.4s, runs 2 and 3 took 4.4s.
       * The difference is WebGPU compiling shaders on first use, and it is
       * paid once per page load whatever the text is. Spending it now, while
       * the user is still reading the welcome screen, is the whole difference
       * between a voice that feels broken the first time and one that does
       * not. A failure here is not fatal — it only means the cost lands on
       * the first real line instead.
       */
      try {
        await tts.generate('Ready.', { voice: VOICE })
      } catch (err) {
        console.warn('Kokoro warm-up failed; the first line will be slower:', err)
      }

      instance = tts
      status = 'ready'
      return tts
    } catch (err) {
      console.warn('Kokoro could not load; falling back to the server voice:', err)
      status = 'failed'
      return null
    } finally {
      loading = null
    }
  })()

  return loading
}

export interface KokoroAudio {
  /** A playable WAV, ready for an <audio> element. */
  blob: Blob
  /** Seconds, known exactly — which the server never told us. */
  duration: number
}

/** Synthesise one line. Returns null if Kokoro is not available here. */
export async function speakWithKokoro(text: string): Promise<KokoroAudio | null> {
  const tts = instance ?? (await loadKokoro())
  if (!tts) return null

  const audio = await tts.generate(text, { voice: VOICE })
  const blob = audio.toBlob()
  return { blob, duration: audio.audio.length / audio.sampling_rate }
}
