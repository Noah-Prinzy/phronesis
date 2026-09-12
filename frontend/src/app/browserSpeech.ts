/**
 * Phronesis' voice of last resort: the browser's own speech synthesiser.
 *
 * Piper already gives him a voice that cannot run out of credit, but it runs
 * on the server, and a server can be unreachable, asleep or not yet deployed.
 * `speechSynthesis` ships with the browser: no key, no quota, no network, no
 * backend at all. It is the only tier that keeps working when nothing else
 * is reachable.
 *
 * What it costs is consistency. The voice is whatever the device has, so he
 * sounds different on a Windows laptop and an Android phone. That is the
 * trade: a recognisable voice that sometimes stops, or an unrecognisable one
 * that never does. This is the floor beneath the other two, not a replacement.
 *
 * What it buys, besides never failing, is a BETTER on-screen reveal. Playing
 * an audio file we can only estimate progress as `currentTime / duration`, a
 * straight line that drifts from the words. `speechSynthesis` fires a
 * `boundary` event at each word, so the text can be revealed on the actual
 * word being spoken rather than on a guess about it.
 */

/** Does this browser have a usable synthesiser at all? */
export function browserSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/**
 * Voices load asynchronously, and on a cold page the list is empty until
 * `voiceschanged` fires — asking too early is the usual reason a browser
 * speaks in a robot voice when a good one was installed all along.
 */
function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  const now = window.speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)

  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', done)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    // Some browsers never fire the event when the list is already final.
    window.setTimeout(done, 1000)
  })
}

/**
 * Pick the least synthetic English voice available.
 *
 * The ordering is deliberate. "Natural" and "Neural" are Microsoft's modern
 * voices and are far better than anything else on Windows; Google's are the
 * best on Android and in Chrome. Everything else is the decades-old formant
 * synthesiser, which is intelligible but sounds like a machine reading a
 * receipt — and Phronesis is meant to sound like a person who knows cars.
 */
function rank(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase()
  if (!v.lang.toLowerCase().startsWith('en')) return -1
  // Novelty voices (Albert, Bad News, Bells…) are English and terrible.
  if (/albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox/.test(n)) {
    return 0
  }
  let score = 1
  if (n.includes('natural') || n.includes('neural')) score += 8
  if (n.includes('google')) score += 6
  if (n.includes('microsoft')) score += 3
  if (v.localService) score += 1 // no network round-trip, so no stall
  if (v.default) score += 1
  return score
}

let cached: SpeechSynthesisVoice | null | undefined

async function bestVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cached !== undefined) return cached
  const voices = await voicesReady()
  const usable = voices.filter((v) => rank(v) > 0)
  usable.sort((a, b) => rank(b) - rank(a))
  cached = usable[0] ?? null
  return cached
}

export interface BrowserSpeechHandle {
  /** Stops immediately and fires nothing further. */
  cancel: () => void
}

export interface BrowserSpeechOptions {
  /** 0–1, driven by real word boundaries where the browser reports them. */
  onProgress: (p: number) => void
  /** Fires exactly once, whether the line finished, failed or was cut off. */
  onDone: () => void
  /** Fires when audio actually begins, so the avatar can start talking. */
  onStart?: () => void
}

/**
 * Chrome stops speaking after roughly fifteen seconds unless the queue is
 * nudged. Pausing and resuming on a timer is the long-standing workaround;
 * without it his longer replies stop mid-sentence for no visible reason.
 */
const KEEPALIVE_MS = 9000

/** Rough speaking pace, used only until the first real boundary event. */
const WORDS_PER_SECOND = 2.9

export function speakInBrowser(text: string, opts: BrowserSpeechOptions): BrowserSpeechHandle {
  const synth = window.speechSynthesis
  const words = text.trim().split(/\s+/)
  const total = words.length || 1

  let cancelled = false
  let done = false
  let keepalive = 0
  let estimator = 0
  /** Once the browser reports a real word, stop guessing. */
  let sawBoundary = false

  const finish = () => {
    if (done) return
    done = true
    window.clearInterval(keepalive)
    window.clearInterval(estimator)
    if (!cancelled) {
      opts.onProgress(1)
      opts.onDone()
    }
  }

  const cancel = () => {
    if (done) {
      window.clearInterval(keepalive)
      window.clearInterval(estimator)
      return
    }
    cancelled = true
    done = true
    window.clearInterval(keepalive)
    window.clearInterval(estimator)
    try {
      synth.cancel()
    } catch {
      // Cancelling a queue that has already drained is not an error.
    }
  }

  void (async () => {
    const voice = await bestVoice()
    if (cancelled) return

    // A queued utterance from a previous line would otherwise play first.
    try {
      synth.cancel()
    } catch {
      /* nothing queued */
    }

    const u = new SpeechSynthesisUtterance(text)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'en-US'
    u.rate = 1
    u.pitch = 1

    u.addEventListener('start', () => {
      if (cancelled) return
      opts.onStart?.()

      // Safari does not fire `boundary` at all, and some Android voices only
      // fire it for sentences. Run a time-based estimate from the start and
      // let real boundaries override it the moment one arrives — otherwise
      // the text would sit frozen at zero while he is clearly talking.
      const started = Date.now()
      const estimatedMs = (total / WORDS_PER_SECOND) * 1000
      estimator = window.setInterval(() => {
        if (sawBoundary || done) {
          window.clearInterval(estimator)
          return
        }
        opts.onProgress(Math.min(0.98, (Date.now() - started) / estimatedMs))
      }, 90)
    })

    u.addEventListener('boundary', (e) => {
      if (cancelled || done) return
      if (e.name && e.name !== 'word') return
      sawBoundary = true
      window.clearInterval(estimator)
      // charIndex is where the word STARTS, so everything before it is spoken.
      const spoken = text.slice(0, e.charIndex).trim()
      const n = spoken ? spoken.split(/\s+/).length : 0
      opts.onProgress(Math.min(1, n / total))
    })

    u.addEventListener('end', finish)
    u.addEventListener('error', finish)

    synth.speak(u)
    keepalive = window.setInterval(() => {
      if (done) {
        window.clearInterval(keepalive)
        return
      }
      // Only nudge while it is genuinely mid-utterance.
      if (synth.speaking && !synth.paused) {
        synth.pause()
        synth.resume()
      }
    }, KEEPALIVE_MS)
  })()

  return { cancel }
}
