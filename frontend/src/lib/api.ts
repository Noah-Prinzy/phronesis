import type { Journey } from '../app/journey'

/**
 * The client for the Express backend in `backend/`.
 *
 * One module, so the base URL, the auth header and the wire format each exist
 * in exactly one place.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * The backend's vocabulary, not ours. It says `pre-car` / `post-car`; the app
 * says `buyer` / `owner`. Translating in one function keeps the backend's
 * naming from leaking into every component that touches a journey.
 */
export function toApiJourney(journey: Journey | null): 'pre-car' | 'post-car' | null {
  if (journey === 'buyer') return 'pre-car'
  if (journey === 'owner') return 'post-car'
  return null
}

export class ApiError extends Error {
  // A plain field, not a parameter property: `erasableSyntaxOnly` requires
  // every construct to vanish with the types.
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  journey: Journey | null
  /** Firebase ID token. Optional — the endpoint uses `optionalAuth`, and only
      saves history when a token is present. */
  token?: string | null
  /** Called for each delta as it arrives. */
  onDelta: (delta: string) => void
  signal?: AbortSignal
}

/**
 * Streams a reply from `POST /api/chat`.
 *
 * The endpoint speaks Server-Sent Events over a POST, so `EventSource` is out
 * — it only does GET. This reads the body stream directly and parses the
 * frames, which means handling the thing every hand-rolled SSE reader gets
 * wrong: **a chunk boundary can fall anywhere**, including mid-frame and
 * mid-UTF-8-character. Hence the buffer, and `decode(..., {stream: true})`.
 */
export async function streamChat({
  messages,
  journey,
  token,
  onDelta,
  signal,
}: StreamChatOptions): Promise<void> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, journey: toApiJourney(journey) }),
    signal,
  })

  if (!res.ok) {
    // Errors before the stream opens are plain JSON.
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      /* keep the status-code message */
    }
    throw new ApiError(detail, res.status)
  }

  if (!res.body) throw new ApiError('The server sent no response body.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Frames are separated by a blank line. Keep the trailing partial.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return

      try {
        const parsed = JSON.parse(payload) as { delta?: string; error?: string }
        // An error can arrive *mid-stream*, after a 200 and after some deltas
        // have already been rendered.
        if (parsed.error) throw new ApiError(parsed.error)
        if (parsed.delta) onDelta(parsed.delta)
      } catch (err) {
        if (err instanceof ApiError) throw err
        // A malformed frame is not worth killing a live reply over.
        console.warn('Unparseable SSE frame:', payload)
      }
    }
  }
}

/** Reads text aloud via `POST /api/tts`, returning a playable audio blob. */
export async function textToSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      /* keep the status-code message */
    }
    throw new ApiError(detail, res.status)
  }

  return res.blob()
}

/** Liveness check, used to tell "backend down" from "backend said no". */
export async function health(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal })
    return res.ok
  } catch {
    return false
  }
}
