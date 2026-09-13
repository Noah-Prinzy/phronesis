/**
 * How Phronesis opens, when there is no conversation to pick back up.
 *
 * **The problem this solves is not variety for its own sake.** The old opener
 * was one fixed string per journey, so every visit and every refresh got the
 * identical sentence — including "Tap my orb or the mic whenever you want to
 * talk", which is genuinely useful the first time and faintly insulting the
 * twentieth. A person tells you where the buttons are once. Repeating it is
 * the single most robotic thing the app did.
 *
 * So there are two different openings, not one with the words shuffled:
 *
 *   the first time   orient them — say how to talk to him, then ask
 *   every time after just ask, and ask a different way than last time
 *
 * On top of that, the hour of the day. "Morning" at eight and "Evening" at
 * nine are not decoration: they are the cheapest possible signal that
 * something on the other side noticed when you turned up.
 */

import {
  OPENER_BUYER_FIRST,
  OPENER_BUYER_AGAIN,
  OPENER_OWNER_FIRST,
  OPENER_OWNER_AGAIN,
} from './lines'

/** Where the "we have met" flag and the last line used are kept. */
const SEEN_KEY = 'ph.greeted'
const LAST_KEY = 'ph.lastOpener'

export interface OpenerChoice {
  /** The whole line, greeting and all. */
  line: string
  /** Index into the returning pool, or -1 for the first-visit line. */
  index: number
}

/**
 * Morning, afternoon or evening — or nothing at all.
 *
 * Deliberately absent overnight. "Good evening" at two in the morning is
 * worse than no greeting, and anybody using a car app at that hour has a
 * problem rather than a routine.
 */
export function timeGreeting(hour: number): string | null {
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 22) return 'Evening'
  return null
}

/**
 * Pick the line. Pure, so the behaviour above is actually testable.
 *
 * @param lastIndex which returning line was used last time, to avoid it
 */
export function chooseOpener({
  owner,
  firstName,
  hour,
  firstVisit,
  lastIndex,
}: {
  owner: boolean
  firstName: string | null
  hour: number
  firstVisit: boolean
  lastIndex: number
}): OpenerChoice {
  // The first visit is the one place the instructions belong, so it is never
  // dressed up with a time of day — it has a job to do.
  if (firstVisit) {
    const line = owner ? OPENER_OWNER_FIRST : OPENER_BUYER_FIRST
    return { line: firstName ? `Hey ${firstName}. ${line}` : line, index: -1 }
  }

  const pool = owner ? OPENER_OWNER_AGAIN : OPENER_BUYER_AGAIN

  /**
   * Anything but the one he used last time.
   *
   * Random with no memory repeats immediately about a fifth of the time with
   * a pool this size, and hearing the same question twice in a row is exactly
   * the impression this whole change exists to remove — worse, arguably, than
   * a line that never varies at all, because it looks like it tried.
   */
  const choices = pool.map((_, i) => i).filter((i) => i !== lastIndex)
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0
  const question = pool[index]

  const greeting = timeGreeting(hour)
  if (!greeting) return { line: firstName ? `${firstName}. ${question}` : question, index }

  return {
    line: firstName ? `${greeting}, ${firstName}. ${question}` : `${greeting}. ${question}`,
    index,
  }
}

/**
 * Read the two remembered values and pick a line, then record what was used.
 *
 * Per device rather than per account, and localStorage rather than the
 * profile, for the same reason the speak-aloud setting lives there: "we have
 * met" is about this browser, and every read is wrapped because a private
 * window throws on access rather than returning nothing.
 */
export function nextOpener(
  owner: boolean,
  firstName: string | null,
  now = new Date(),
): string {
  let firstVisit = true
  let lastIndex = -1

  try {
    firstVisit = localStorage.getItem(SEEN_KEY) === null
    lastIndex = Number.parseInt(localStorage.getItem(LAST_KEY) ?? '', 10)
    if (Number.isNaN(lastIndex)) lastIndex = -1
  } catch {
    // Private window, or site data blocked. Treating that as a first visit is
    // the right failure: a stranger gets oriented, which is never wrong.
  }

  const { line, index } = chooseOpener({
    owner,
    firstName,
    hour: now.getHours(),
    firstVisit,
    lastIndex,
  })

  try {
    localStorage.setItem(SEEN_KEY, '1')
    if (index >= 0) localStorage.setItem(LAST_KEY, String(index))
  } catch {
    // Nothing to do. He repeats himself occasionally instead, which is the
    // behaviour this whole module improves on rather than depends on.
  }

  return line
}
