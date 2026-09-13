import { describe, expect, it } from 'vitest'
import { chooseOpener, timeGreeting } from './greeting'
import {
  OPENER_BUYER_AGAIN,
  OPENER_BUYER_FIRST,
  OPENER_OWNER_AGAIN,
  OPENER_OWNER_FIRST,
} from './lines'

/**
 * How he says hello.
 *
 * The rules here are behavioural rather than computational, which is exactly
 * why they need tests: nothing type-checks the claim that he stops explaining
 * the interface after the first visit, and a no-repeat rule that quietly
 * stops working looks identical to one that is working until you sit and
 * watch it.
 */

describe('timeGreeting', () => {
  it('follows the clock', () => {
    expect(timeGreeting(8)).toBe('Morning')
    expect(timeGreeting(13)).toBe('Afternoon')
    expect(timeGreeting(19)).toBe('Evening')
  })

  it('says nothing in the middle of the night', () => {
    // "Good evening" at 3am is worse than no greeting at all.
    expect(timeGreeting(2)).toBeNull()
    expect(timeGreeting(23)).toBeNull()
    expect(timeGreeting(4)).toBeNull()
  })

  it('changes exactly on the hour boundaries', () => {
    expect(timeGreeting(11)).toBe('Morning')
    expect(timeGreeting(12)).toBe('Afternoon')
    expect(timeGreeting(16)).toBe('Afternoon')
    expect(timeGreeting(17)).toBe('Evening')
  })
})

describe('chooseOpener', () => {
  const base = { owner: true, firstName: null, hour: 10, firstVisit: false, lastIndex: -1 }

  describe('the first visit', () => {
    it('explains how to talk to him', () => {
      const { line } = chooseOpener({ ...base, firstVisit: true })
      expect(line).toBe(OPENER_OWNER_FIRST)
      expect(line).toContain('mic')
    })

    it('uses the buyer line on the buyer journey', () => {
      const { line } = chooseOpener({ ...base, firstVisit: true, owner: false })
      expect(line).toBe(OPENER_BUYER_FIRST)
    })

    it('greets by name without a time of day', () => {
      // The orienting line has a job; dressing it up gets in the way.
      const { line } = chooseOpener({ ...base, firstVisit: true, firstName: 'Noah', hour: 19 })
      expect(line.startsWith('Hey Noah. ')).toBe(true)
      expect(line).not.toContain('Evening')
    })
  })

  describe('every visit after', () => {
    it('NEVER explains the interface again', () => {
      // The whole point. Ten runs, because the pool is picked at random.
      for (let i = 0; i < 10; i += 1) {
        const { line } = chooseOpener(base)
        expect(line).not.toContain('mic')
        expect(line).not.toContain('orb')
      }
    })

    it('asks one of the short questions', () => {
      const { line, index } = chooseOpener(base)
      expect(OPENER_OWNER_AGAIN.some((q) => line.endsWith(q))).toBe(true)
      expect(index).toBeGreaterThanOrEqual(0)
    })

    it('never repeats the line it used last time', () => {
      // Run every starting point many times over: the returned index must
      // never be the one just used.
      for (let last = 0; last < OPENER_OWNER_AGAIN.length; last += 1) {
        for (let i = 0; i < 40; i += 1) {
          expect(chooseOpener({ ...base, lastIndex: last }).index).not.toBe(last)
        }
      }
    })

    it('can still reach every line in the pool', () => {
      // A no-repeat rule that accidentally narrows to one alternative would
      // pass the test above and still sound robotic.
      const seen = new Set<number>()
      for (let i = 0; i < 200; i += 1) seen.add(chooseOpener(base).index)
      expect(seen.size).toBe(OPENER_OWNER_AGAIN.length)
    })

    it('leads with the time of day', () => {
      expect(chooseOpener({ ...base, hour: 8 }).line.startsWith('Morning. ')).toBe(true)
      expect(chooseOpener({ ...base, hour: 19 }).line.startsWith('Evening. ')).toBe(true)
    })

    it('puts the name after the time of day', () => {
      const { line } = chooseOpener({ ...base, hour: 8, firstName: 'Noah' })
      expect(line.startsWith('Morning, Noah. ')).toBe(true)
    })

    it('drops the greeting overnight but keeps the name', () => {
      const { line } = chooseOpener({ ...base, hour: 3, firstName: 'Noah' })
      expect(line.startsWith('Noah. ')).toBe(true)
      expect(line).not.toContain('Morning')
    })

    it('uses the buyer pool on the buyer journey', () => {
      // Hour 3 so there is no greeting in front of it to strip.
      const { line } = chooseOpener({ ...base, owner: false, hour: 3 })
      expect(OPENER_BUYER_AGAIN).toContain(line)
    })

    it('always ends on the question mark', () => {
      // TTS takes its intonation from where the sentence lands, so a trailing
      // fragment after the question makes him sound like he is announcing.
      for (const q of [...OPENER_OWNER_AGAIN, ...OPENER_BUYER_AGAIN]) {
        expect(q.endsWith('?')).toBe(true)
      }
    })
  })
})
