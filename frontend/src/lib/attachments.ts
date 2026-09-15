/**
 * A photo of the car, or a recording of the noise it is making.
 *
 * Mirrors the shape the server validates — `kind`, media type, and base64
 * with no `data:` prefix — so nothing has to be translated between the two.
 */
export interface Attachment {
  kind: 'image' | 'audio'
  mime: string
  data: string
  /** For the chip on screen. Never sent. */
  label: string
  /**
   * An object URL for the preview. Never sent.
   *
   * Both kinds have one: a photo needs a thumbnail and a recording needs to
   * be playable, and both need to stay visible in the thread AFTER sending —
   * a message that shows only "Here is a photo." leaves you wondering
   * whether the photo actually went.
   *
   * The URL owns memory until it is revoked, so whoever holds the last
   * reference is responsible for `URL.revokeObjectURL`.
   */
  preview?: string
  /** How long the clip runs, in seconds. Only on recordings. */
  seconds?: number
}

/** Longest clip we will take. A rattle is recognisable in far less. */
export const MAX_CLIP_MS = 30_000

/** Widest edge of a photo after downscaling. */
const MAX_EDGE = 1280
/** JPEG quality. High enough for corrosion and cracks, low enough to send. */
const QUALITY = 0.82

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(new Error('Could not read that file.')))
    reader.addEventListener('load', () => {
      const result = String(reader.result)
      // `data:image/jpeg;base64,XXXX` — the server wants only the XXXX.
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    })
    reader.readAsDataURL(blob)
  })
}

/**
 * Shrink a photo before it is sent.
 *
 * A phone camera produces 4–12MB per frame and none of that resolution
 * survives being useful to a model — but all of it survives being uploaded on
 * Ugandan mobile data, which is who this is for. Re-encoded at 1280px it is
 * usually under 300kB and nothing diagnostic is lost: rust, a split hose and a
 * warning light all read perfectly well at that size.
 *
 * Drawing through a canvas also strips EXIF, which takes the GPS coordinates
 * of wherever the photo was taken out of the request. That is a privacy win we
 * get for free and would have had to do deliberately otherwise.
 */
export async function attachPhoto(file: File): Promise<Attachment> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare that photo.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) throw new Error('Could not prepare that photo.')

  return {
    kind: 'image',
    mime: 'image/jpeg',
    data: await toBase64(blob),
    label: 'Photo',
    preview: URL.createObjectURL(blob),
  }
}

/** The first container this browser will actually record in. */
function pickAudioType(): string {
  const wanted = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of wanted) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export interface Recorder {
  /** Resolves with the clip, or null if it was cancelled. */
  stop: () => Promise<Attachment | null>
  cancel: () => void
}

/**
 * Record the noise the car is making.
 *
 * The whole reason this exists: somebody standing beside a running engine
 * cannot describe a sound, and the words they reach for — "a knocking", "a
 * whine" — are the least reliable part of any symptom. Thirty seconds of the
 * actual noise is better evidence than any sentence about it.
 *
 * The media type is whatever this browser will give us rather than one we
 * insist on: Safari records mp4, Chrome webm/opus, and both are types the
 * server accepts.
 */
export async function startRecording(onLevel?: (level: number) => void): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = pickAudioType()
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  })
  recorder.start()
  const startedAt = Date.now()

  /**
   * Amplitude off the SAME stream being recorded.
   *
   * It has to be the same one. Opening a second `getUserMedia` for the
   * meter would ask for the microphone twice and draw a waveform of
   * something adjacent to, rather than identical to, the audio being
   * captured — so the picture would not be of the recording.
   *
   * RMS rather than peak, because peak sits pinned near the top on any
   * continuous noise and the bars stop telling you anything.
   */
  let audio: AudioContext | null = null
  let raf = 0
  if (onLevel) {
    audio = new AudioContext()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 1024
    audio.createMediaStreamSource(stream).connect(analyser)
    const buffer = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(buffer)
      let sum = 0
      for (const v of buffer) {
        const centred = (v - 128) / 128
        sum += centred * centred
      }
      // Rooted, then lifted: speech RMS sits low, and a bar chart that never
      // leaves the bottom eighth of its box reads as broken rather than quiet.
      onLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 3.2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  // Every track, always: leaving one open holds the microphone and, on a
  // phone, shows the recording indicator long after he has stopped listening.
  const release = () => {
    cancelAnimationFrame(raf)
    void audio?.close()
    audio = null
    for (const track of stream.getTracks()) track.stop()
  }

  let settled = false

  return {
    stop: () =>
      new Promise<Attachment | null>((resolve, reject) => {
        if (settled) return resolve(null)
        settled = true
        recorder.addEventListener('stop', () => {
          release()
          const type = recorder.mimeType || mime || 'audio/webm'
          const blob = new Blob(chunks, { type })
          if (blob.size === 0) return resolve(null)
          const seconds = Math.round((Date.now() - startedAt) / 1000)
          toBase64(blob).then(
            (data) =>
              resolve({
                // The parameters after the semicolon are ours, not the
                // server's — it matches on the bare type.
                kind: 'audio',
                mime: type.split(';')[0],
                data,
                label: seconds > 0 ? `${seconds}s recording` : 'Recording',
                preview: URL.createObjectURL(blob),
                seconds,
              }),
            reject,
          )
        })
        recorder.stop()
      }),
    cancel: () => {
      if (settled) return
      settled = true
      try {
        recorder.stop()
      } finally {
        release()
      }
    },
  }
}

/** Strip the fields the server has no use for. */
export function forWire(list: Attachment[]) {
  return list.map(({ kind, mime, data }) => ({ kind, mime, data }))
}
