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
  /**
   * The conversation this turn belongs to. Pass back what `onChatId` last
   * gave you; omit it to start a new one.
   */
  chatId?: string | null
  /** The session id, once the server has written the turn. */
  onChatId?: (chatId: string) => void
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
  chatId,
  onChatId,
  signal,
}: StreamChatOptions): Promise<void> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, journey: toApiJourney(journey), ...(chatId ? { chatId } : {}) }),
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
        const parsed = JSON.parse(payload) as { delta?: string; error?: string; chatId?: string }
        // An error can arrive *mid-stream*, after a 200 and after some deltas
        // have already been rendered.
        if (parsed.error) throw new ApiError(parsed.error)
        if (parsed.delta) onDelta(parsed.delta)
        if (parsed.chatId) onChatId?.(parsed.chatId)
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

// ---------------------------------------------------------------- account

/** What Phronesis knows about the car. Every field optional but the identity. */
export interface CarProfile {
  make: string
  model: string
  year: number
  mileage?: number
  /** The odometer reading at the last service. Service reminders are
      measured from this, because the setting promises mileage rather than
      a calendar — and without it there is no interval to measure. */
  lastServiceKm?: number
  plate?: string
  fuelType?: string
  transmission?: string
}

export interface Preferences {
  faultAlerts: boolean
  serviceReminders: boolean
}

/**
 * Every account call needs the signed-in user's token, and there is no useful
 * behaviour without one — an unauthenticated read would just be a 401. So the
 * token is a required argument rather than something fetched in here, which
 * keeps this module free of a dependency on the auth context.
 */
async function authed<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

export function getCar(token: string, signal?: AbortSignal): Promise<CarProfile | null> {
  return authed<CarProfile | null>('/car-profile', token, { signal })
}

export function saveCar(token: string, car: CarProfile): Promise<unknown> {
  return authed('/car-profile', token, { method: 'POST', body: JSON.stringify(car) })
}

export function getPreferences(token: string, signal?: AbortSignal): Promise<Preferences> {
  return authed<Preferences>('/preferences', token, { signal })
}

export function savePreferences(token: string, patch: Partial<Preferences>): Promise<Preferences> {
  return authed<Preferences>('/preferences', token, { method: 'PATCH', body: JSON.stringify(patch) })
}

/**
 * Downloads the export as a file.
 *
 * Not `authed`, because this one is deliberately not JSON-parsed: the point is
 * to hand the user a file, so the response becomes a blob and a synthetic
 * click. Revoking the object URL matters — a few megabytes of conversation
 * history would otherwise sit in memory for the life of the tab.
 */
export async function downloadMyData(token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/account/export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not prepare your data.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `phronesis-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function deleteAccount(token: string): Promise<{ deleted: boolean }> {
  return authed<{ deleted: boolean }>('/account', token, { method: 'DELETE' })
}

// -------------------------------------------------------------- diagnosis

export interface DiagnosisSolution {
  option: string
  costLow: number
  costHigh: number
  /** The split, when he gave one. Optional because an older saved report
      predates it, and a model may omit it — the page shows totals instead
      rather than inventing a breakdown. */
  partsLow?: number
  partsHigh?: number
  labourLow?: number
  labourHigh?: number
}

export interface DiagnosisReport {
  issue: string
  rootCause: string
  category: string
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  costEstimateLow: number
  costEstimateHigh: number
  timeline: string
  solutions: DiagnosisSolution[]
  detectedCodes?: string[]
}

/**
 * Ask him to work out what is wrong.
 *
 * The token is optional and deliberately so: someone who has not signed in
 * still gets a diagnosis, it simply is not written to their history. Gating
 * the core of the product behind an account would be the wrong trade for a
 * driver standing beside a car that is making a noise.
 */
export async function runDiagnosis(
  symptomText: string,
  car: CarProfile | null,
  token: string | null,
  signal?: AbortSignal,
): Promise<DiagnosisReport> {
  const res = await fetch(`${BASE}/api/diagnosis`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      symptomText,
      carProfile: car
        ? { make: car.make, model: car.model, year: car.year, mileage: car.mileage }
        : undefined,
    }),
  })
  if (!res.ok) throw new Error(`Diagnosis failed (${res.status})`)
  const body = (await res.json()) as { report: DiagnosisReport }
  return body.report
}

/* ---------------------------------------------------------------- history */

export interface ChatSession {
  id: string
  journey?: 'pre-car' | 'post-car'
  messages: ChatMessage[]
  updatedAt: string
}

/**
 * The conversations this user has had, most recent first.
 *
 * Home restores the top one on arrival, which is the whole of "conversation
 * continuity" from the plan: the backend has been writing these since the
 * first chat shipped and nothing ever read them back, so every reload quietly
 * threw the conversation away.
 *
 * Returns an empty list rather than throwing when there is nothing to show or
 * the call fails. A history that cannot be fetched should cost you the
 * history, not the page — Home still works perfectly well starting fresh.
 */
export async function fetchChats(token: string, signal?: AbortSignal): Promise<ChatSession[]> {
  try {
    const res = await fetch(`${BASE}/api/chats`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    if (!res.ok) return []

    const body = (await res.json()) as { chats?: unknown }
    if (!Array.isArray(body.chats)) return []

    return body.chats.flatMap((raw): ChatSession[] => {
      const c = raw as Partial<ChatSession> & { messages?: unknown }
      if (typeof c.id !== 'string' || !Array.isArray(c.messages)) return []

      // Firestore documents are not typed, and one malformed turn should not
      // take the whole conversation down with it.
      const messages = c.messages.filter(
        (m): m is ChatMessage =>
          typeof m === 'object' &&
          m !== null &&
          (('role' in m && (m as ChatMessage).role === 'user') ||
            (m as ChatMessage).role === 'assistant') &&
          typeof (m as ChatMessage).content === 'string' &&
          (m as ChatMessage).content.trim() !== '',
      )
      if (messages.length === 0) return []

      return [
        {
          id: c.id,
          journey: c.journey,
          messages,
          updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : '',
        },
      ]
    })
  } catch {
    // Aborted, offline, or the endpoint is down. Start fresh.
    return []
  }
}
