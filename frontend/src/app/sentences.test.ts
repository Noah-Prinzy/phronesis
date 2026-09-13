import { describe, expect, it } from 'vitest'
import { takeSentences } from './sentences'

/**
 * The splitter that decides when Phronesis can start talking.
 *
 * Two ways it can be wrong, and both are audible. Cut too early and a
 * synthesiser gets half a clause and guesses the wrong intonation — a
 * question read as a statement, which no later chunk can undo. Cut in the
 * wrong place and "3.5 mm" becomes "three point" followed by a new sentence
 * beginning "five millimetres".
 *
 * The load-bearing property is that it is LOSSLESS: everything in, everything
 * out, in order. A dropped clause is a sentence he never says.
 */

/** Feed text through in small bursts, the way tokens actually arrive. */
function stream(reply: string, burst = 7): string[] {
  const out: string[] = []
  let rest = ''
  let first = true

  for (let i = 0; i < reply.length; i += burst) {
    const r = takeSentences(rest + reply.slice(i, i + burst), first, false)
    for (const c of r.chunks) {
      out.push(c)
      first = false
    }
    rest = r.rest
  }
  out.push(...takeSentences(rest, first, true).chunks)
  return out
}

const normalise = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('takeSentences', () => {
  it('loses nothing, whatever the burst size', () => {
    const reply =
      'Right, that sounds like the pads. A rattle only under braking usually means they are ' +
      'worn to the wear indicator. Has it started pulling to one side at all?'

    for (const burst of [1, 3, 7, 20, 500]) {
      expect(normalise(stream(reply, burst).join(' '))).toBe(normalise(reply))
    }
  })

  it('lets the first chunk be short, because arriving early is its job', () => {
    const chunks = stream('Right. That is almost certainly the front brake pads wearing down.')
    expect(chunks[0]).toBe('Right.')
  })

  it('does not split a decimal', () => {
    const chunks = stream('Pads should be replaced under 3.5 mm. Yours are at 2.1 mm.')
    expect(chunks.some((c) => c.includes('3.5 mm'))).toBe(true)
    expect(chunks.some((c) => /\b3\.$/.test(c))).toBe(false)
  })

  it('does not split on a thousands separator followed by a full stop', () => {
    const chunks = stream('It should cost about UGX 180,000. Shall I find someone?')
    expect(chunks.some((c) => c.includes('UGX 180,000.'))).toBe(true)
  })

  it('does not split a fault code off its sentence', () => {
    const chunks = stream('The code is P0420. That is the catalytic converter.')
    expect(chunks[0]).toBe('The code is P0420.')
  })

  it('keeps an ellipsis together instead of making three sentences', () => {
    // Splitting after the first dot would leave ".." as its own utterance.
    const chunks = stream('Well... it depends on the mileage.')
    expect(chunks[0]).toBe('Well...')
    expect(chunks.every((c) => /[a-z]/i.test(c))).toBe(true)
  })

  it('keeps "?!" together', () => {
    const chunks = stream('Really?! That is unusual for a Premio.')
    expect(chunks[0]).toBe('Really?!')
  })

  it('holds a sentence back until its punctuation actually arrives', () => {
    // Mid-stream, with no terminal mark yet, nothing may be emitted — this is
    // the case that makes a question get read as a statement.
    const { chunks, rest } = takeSentences('Has it started pulling to one side', true, false)
    expect(chunks).toEqual([])
    expect(rest).toContain('pulling')
  })

  it('flushes whatever is left when the model stops mid-sentence', () => {
    // A truncated reply must still be spoken; silence is worse than a
    // half-finished line.
    const { chunks } = takeSentences('The pads are worn and', true, true)
    expect(chunks).toEqual(['The pads are worn and'])
  })

  it('emits nothing at all for empty input', () => {
    expect(takeSentences('', true, false).chunks).toEqual([])
    expect(takeSentences('', true, true).chunks).toEqual([])
    expect(takeSentences('   ', true, true).chunks).toEqual([])
  })

  it('groups later sentences rather than sending each one on its own', () => {
    // Every request costs a fixed ~1.3s of wake-up, so a two-word second
    // chunk buys a pause and nothing else.
    const reply =
      'Right. It could be the pads. It could be a stone. It could be the disc. ' +
      'Has it changed at all recently?'
    const chunks = stream(reply)
    expect(chunks[0]).toBe('Right.')
    // The remaining four sentences must not come through as four chunks.
    expect(chunks.length).toBeLessThan(5)
  })
})
