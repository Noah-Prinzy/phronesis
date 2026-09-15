import { useCallback, useRef, useState } from 'react'
import { IconButton } from '../ui'
import { IconSend } from '../ui/icons'
import { useAuth } from '../app/auth'
import { useJourney } from '../app/journey'
import { streamChat } from '../lib/api'
import { partFromText } from './partFromText'
import type { CarPart } from '../data/findings'

/**
 * Asking him something about what he has just shown you.
 *
 * **It appears afterwards, and that is the whole design.** This page is his:
 * you arrive in the middle of a conversation he is already having, he takes
 * the middle and explains, and only when he has finished does a way to answer
 * back appear. A composer sitting at the top would make it a form you fill
 * in — which is what the page used to be, and the reason it read as a
 * different app from Home.
 *
 * It continues the SAME server-side conversation rather than opening a second
 * one. The chat id travelled here with the hand-off, so what you ask has
 * everything you already told him behind it — and his answer can move the
 * hologram, because a question about the engine is a request to see it.
 */

export interface FollowUpProps {
  /** The conversation this belongs to. Absent starts a fresh one. */
  chatId?: string
  /** What he has already worked out, given to him as context, never shown. */
  context: string
  /** He named a part in his answer: show it. */
  onPart: (part: CarPart) => void
  /** His reply, streamed, so the stage can speak and reveal it. */
  onReply: (text: string, done: boolean) => void
}

export function FollowUp({ chatId, context, onPart, onReply }: FollowUpProps) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()
  const { journey } = useJourney()
  const abort = useRef<AbortController | null>(null)

  const ask = useCallback(async () => {
    const body = draft.trim()
    if (!body || busy) return
    setDraft('')
    setBusy(true)
    setError(null)

    const controller = new AbortController()
    abort.current = controller
    let full = ''

    try {
      const token = await getToken().catch(() => null)
      await streamChat({
        /* The diagnosis goes in as the first turn rather than as a system
           note, because the chat endpoint takes messages and nothing else.
           He is being reminded what is on the screen in front of you — which
           is also why he is told not to read it back. */
        messages: [
          { role: 'assistant', content: context },
          { role: 'user', content: body },
        ],
        journey,
        token,
        chatId,
        signal: controller.signal,
        onDelta: (delta) => {
          full += delta
          onReply(full, false)
        },
      })
      onReply(full, true)
      const part = partFromText(full)
      if (part) onPart(part)
    } catch {
      if (!controller.signal.aborted) {
        setError('I could not reach him just then. Try that again in a moment.')
        setDraft(body)
      }
    } finally {
      setBusy(false)
      abort.current = null
    }
  }, [draft, busy, getToken, journey, chatId, context, onPart, onReply])

  return (
    <div className="fup">
      <label className="fup__label" htmlFor="followup">
        Anything you want to ask about this?
      </label>
      <div className="fup__row">
        <input
          id="followup"
          className="fup__input"
          value={draft}
          placeholder="What does the engine look like?"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask()
          }}
        />
        <IconButton
          label="Ask"
          onClick={() => void ask()}
          disabled={!draft.trim() || busy}
        >
          <IconSend />
        </IconButton>
      </div>
      {error ? <p className="dg__error">{error}</p> : null}
    </div>
  )
}
