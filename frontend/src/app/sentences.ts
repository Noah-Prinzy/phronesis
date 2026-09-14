/**
 * Cut a growing reply into pieces that are safe to speak before the rest of it
 * exists.
 *
 * The model streams tokens; the voice needs whole sentences. Hand a synthesiser
 * half a clause and it guesses the wrong intonation for it — a question that
 * has not reached its question mark yet gets read as a statement, and no later
 * chunk can undo that.
 *
 * So nothing is emitted until its terminal punctuation has actually arrived.
 */

/**
 * Don't send a two-word fragment on its own.
 *
 * Measured against the live endpoint, the first audio byte costs about 1.3s
 * almost regardless of length — that is the service waking up, not synthesis.
 * So a chunk has a fixed price, and "Right." as its own request buys a 1.3s
 * pause in exchange for nothing.
 *
 * The FIRST chunk is exempt: there, being short is the entire point, because
 * it is what he starts saying while the rest is still being written.
 */
const MIN_CHARS = 90

/** Ends a sentence — one or more of them, so "..." and "?!" stay together. */
const TERMINAL = /[.!?]+/

/**
 * A full stop that is not the end of a sentence.
 *
 * Decimals ("3.5 mm"), and the abbreviations that actually turn up in this
 * domain. Getting this wrong is not cosmetic: splitting mid-number makes him
 * say "three point" and then start a new sentence with "five millimetres".
 */
const NOT_TERMINAL = /(?:\d|\b(?:e\.g|i\.e|approx|no|vs|etc|Mr|Mrs|Dr|St)\.?)$/i

/**
 * Take every complete sentence off the front of `buffer`.
 *
 * Returns what can be spoken now and what has to wait. Call it again each time
 * more text arrives, passing the leftover back in.
 *
 * @param buffer   everything received so far that has not been spoken
 * @param first    true while nothing has been emitted yet, which relaxes the
 *                 minimum length — the opening chunk is the one whose whole
 *                 job is to arrive early
 * @param done     the stream has ended, so whatever is left is a final chunk
 *                 even without punctuation
 */
export function takeSentences(
  buffer: string,
  first: boolean,
  done: boolean,
): { chunks: string[]; rest: string } {
  const chunks: string[] = []
  let rest = buffer
  let pending = ''
  let isFirst = first

  for (;;) {
    const match = TERMINAL.exec(rest)
    if (!match) break

    const cut = match.index + match[0].length
    const head = rest.slice(0, cut)

    // A decimal point or an abbreviation, not the end of anything.
    if (NOT_TERMINAL.test(rest.slice(0, match.index + 1))) {
      // Keep looking after this one rather than emitting.
      const nextStart = cut
      const tail = rest.slice(nextStart)
      const further = TERMINAL.exec(tail)
      if (!further) break
      pending += rest.slice(0, nextStart + further.index + further[0].length)
      rest = tail.slice(further.index + further[0].length)
      if (pending.trim().length >= (isFirst ? 1 : MIN_CHARS)) {
        chunks.push(pending.trim())
        pending = ''
        isFirst = false
      }
      continue
    }

    pending += head
    rest = rest.slice(cut)

    // Only cut here if there is real whitespace after it, or nothing left —
    // otherwise this full stop is inside something, not after it.
    if (rest && !/^\s/.test(rest)) continue

    if (pending.trim().length >= (isFirst ? 1 : MIN_CHARS)) {
      chunks.push(pending.trim())
      pending = ''
      isFirst = false
    }
  }

  // Anything held back but not long enough yet goes back on the front.
  rest = pending + rest

  if (done) {
    const last = rest.trim()
    if (last) {
      chunks.push(last)
      rest = ''
    }
  }

  return { chunks, rest }
}
