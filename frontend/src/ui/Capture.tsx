import { useCallback, useEffect, useRef, useState } from 'react'
import { IconButton } from './Button'
import { RecordBar } from './RecordBar'
import { IconAudio, IconCamera, IconClose, IconWave } from './icons'
import { attachPhoto, MAX_CLIP_MS, startRecording } from '../lib/attachments'
import type { Attachment, Recorder } from '../lib/attachments'

/**
 * Showing him, rather than describing.
 *
 * Two things somebody standing beside a broken car can offer that a sentence
 * cannot: a photo of what they are looking at, and the noise itself. The words
 * people reach for — "a knocking", "a whine" — are the least reliable part of
 * any symptom, and a leak is obvious in one frame and hard to write down.
 *
 * Both attach to the turn they are about to send, so they travel INTO the
 * conversation rather than being a separate upload step. That is also why this
 * lives beside the composer and not on its own screen.
 */

export interface CaptureProps {
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
  /** Told when something goes wrong, so the page can say so in its own voice. */
  onError: (message: string) => void
  /**
   * Told while the microphone is open.
   *
   * The composer hides everything else in response. Overlaying the strip on
   * top would leave the input and the send button still there underneath —
   * focusable by keyboard, readable by a screen reader, and offering to send
   * a message nobody is writing.
   */
  onRecording?: (recording: boolean) => void
  disabled?: boolean
}

export function Capture({ attachments, onChange, onError, onRecording, disabled }: CaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const recorder = useRef<Recorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  /**
   * Amplitude, one sample per frame of the meter.
   *
   * State rather than a ref, unlike the orb's level: this drives a list of
   * DOM bars that must actually re-render, and the meter is sampled a few
   * times a second rather than sixty.
   */
  const [levels, setLevels] = useState<number[]>([])

  /* The mic is a device, not a variable: a recorder left running holds it
     open and keeps the phone's recording indicator lit long after he has
     stopped listening. */
  useEffect(() => () => recorder.current?.cancel(), [])

  useEffect(() => {
    onRecording?.(recording)
    // Only the flag matters; a caller passing a fresh closure each render
    // should not re-announce the same state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const finish = useCallback(async () => {
    const active = recorder.current
    if (!active) return
    recorder.current = null
    setRecording(false)
    setLevels([])
    try {
      const clip = await active.stop()
      if (clip) onChange([...attachments, clip])
    } catch {
      onError('That recording would not save. Try it again.')
    }
  }, [attachments, onChange, onError])

  /** Counts up, and stops itself at the cap rather than recording forever. */
  useEffect(() => {
    if (!recording) {
      setElapsed(0)
      return
    }
    const started = Date.now()
    const id = window.setInterval(() => {
      const ms = Date.now() - started
      setElapsed(ms)
      if (ms >= MAX_CLIP_MS) void finish()
    }, 200)
    return () => window.clearInterval(id)
  }, [recording, finish])

  /** Thrown away rather than kept. Nothing reaches the conversation. */
  const abandon = useCallback(() => {
    recorder.current?.cancel()
    recorder.current = null
    setRecording(false)
    setLevels([])
  }, [])

  /* Sampled on a timer rather than on every animation frame. The meter is
     driving DOM nodes, and sixty re-renders a second of fifty-six elements
     is a great deal of work to show a bar that moved two pixels. */
  const latest = useRef(0)

  const record = useCallback(async () => {
    if (recording) return
    try {
      recorder.current = await startRecording((level) => {
        latest.current = level
      })
      setLevels([])
      setRecording(true)
    } catch {
      onError('I could not reach the microphone. Check the permission and try again.')
    }
  }, [recording, onError])

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => {
      setLevels((prev) => [...prev, latest.current])
    }, 90)
    return () => window.clearInterval(id)
  }, [recording])

  const pick = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        onChange([...attachments, await attachPhoto(file)])
      } catch {
        onError('I could not read that photo. Try another one.')
      }
    },
    [attachments, onChange, onError],
  )

  const drop = useCallback(
    (index: number) => {
      const going = attachments[index]
      if (going?.preview) URL.revokeObjectURL(going.preview)
      onChange(attachments.filter((_, i) => i !== index))
    },
    [attachments, onChange],
  )

  const seconds = Math.floor(elapsed / 1000)

  return (
    <>
      {attachments.length > 0 ? (
        <ul className="cap__list">
          {attachments.map((a, i) => (
            <li key={`${a.kind}-${i}`} className="cap__chip">
              {/* A photo shows itself; a recording cannot, so it gets an icon
                  that says "sound" rather than a picture of nothing. */}
              {a.kind === 'image' && a.preview ? (
                <img className="cap__thumb" src={a.preview} alt="" />
              ) : (
                <span className="cap__thumb cap__thumb--audio" aria-hidden="true">
                  <IconAudio size={15} />
                </span>
              )}
              <span className="cap__name">{a.label}</span>
              <button
                type="button"
                className="cap__drop"
                onClick={() => drop(i)}
                aria-label={`Remove this ${a.label.toLowerCase()}`}
              >
                <IconClose size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        /* Opens the camera straight away on a phone and a file picker on a
           desktop, which is the right thing in both cases and costs nothing. */
        capture="environment"
        className="cap__file"
        onChange={(e) => {
          void pick(e.currentTarget.files?.[0])
          // Cleared so choosing the same file twice still fires a change.
          e.currentTarget.value = ''
        }}
      />

      {recording ? (
        <RecordBar
          levels={levels}
          seconds={seconds}
          onCancel={abandon}
          onKeep={() => void finish()}
        />
      ) : (
        <>
          <IconButton
            label="Show him a photo"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <IconCamera />
          </IconButton>

          {/* A waveform, not a second microphone. The mic beside this one is
              already "speak instead of typing"; two mics would be two
              controls that look like the same control doing different
              things. */}
          <IconButton
            label="Record the noise it is making"
            disabled={disabled}
            onClick={() => void record()}
          >
            <IconWave />
          </IconButton>
        </>
      )}
    </>
  )
}

/**
 * What you sent, still visible after you sent it.
 *
 * Without this a photo disappears at the moment of sending and the bubble
 * reads "Here is a photo." — which leaves you wondering whether the photo
 * actually went anywhere. Seeing the thing you attached sitting in your own
 * message is the confirmation, and it is the same confirmation every
 * messaging app gives you.
 *
 * A recording gets a real player rather than an icon: a thirty-second clip of
 * a noise is worth checking before you trust an answer built on it.
 */
export function SentMedia({ items }: { items: Attachment[] }) {
  if (items.length === 0) return null
  return (
    <div className="sent">
      {items.map((a, i) =>
        a.kind === 'image' && a.preview ? (
          <a
            key={i}
            className="sent__shot"
            href={a.preview}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the photo you sent"
          >
            <img src={a.preview} alt="The photo you sent" />
          </a>
        ) : a.preview ? (
          <audio key={i} className="sent__clip" src={a.preview} controls preload="metadata">
            {a.label}
          </audio>
        ) : (
          <span key={i} className="sent__missing">
            {a.label}
          </span>
        ),
      )}
    </div>
  )
}
