import { useMemo } from 'react'
import { cx } from './cx'

export interface SpokenTextProps {
  /** The line being said. */
  text: string
  /**
   * How far through it the voice is, 0–1. From `useSpeak().progress`.
   *
   * Omit it for `live` text, where the string itself grows as the words are
   * recognised and there is nothing to reveal.
   */
  progress?: number
  /**
   * The text is arriving word by word on its own — live dictation rather
   * than a finished line being read out. Every word is shown as soon as it
   * exists, and animates in as it mounts.
   */
  live?: boolean
  className?: string
}

/**
 * Text that arrives as Phronesis says it.
 *
 * The point is not decoration. A paragraph already sitting on screen makes him
 * sound like he is reading it out; the same words materialising in time with
 * his voice read as a transcript of someone talking. Same sentence, opposite
 * impression.
 *
 * Two deliberate details:
 *
 * - Unrevealed words are transparent rather than absent, so the block occupies
 *   its full height from the start and nothing below it reflows word by word.
 * - They stay in the DOM, so a screen reader gets the whole line at once
 *   instead of a sentence that dribbles out — opacity does not hide content
 *   from assistive tech, which is exactly what is wanted here.
 */
export function SpokenText({ text, progress = 0, live = false, className }: SpokenTextProps) {
  const words = useMemo(() => text.split(/(\s+)/), [text])

  // Count real words, not the whitespace tokens kept for spacing.
  const total = useMemo(() => words.filter((w) => w.trim()).length, [words])
  // A word of look-ahead: text landing a beat before the voice reads as
  // keeping up, whereas text a beat behind reads as lag.
  const shown = live ? total : Math.ceil(Math.min(1, Math.max(0, progress)) * total) + 1

  let seen = 0
  return (
    <p className={cx('spoken', live && 'spoken--live', className)}>
      {words.map((w, i) => {
        if (!w.trim()) return <span key={i}>{w}</span>
        seen += 1
        return (
          <span key={i} className="spoken__w" data-lit={seen <= shown}>
            {w}
          </span>
        )
      })}
    </p>
  )
}
