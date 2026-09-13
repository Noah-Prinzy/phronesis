import { describe, expect, it } from 'vitest'
import { money, moneyShort } from './money'

/**
 * Prices, which are the figures users look at hardest.
 *
 * `moneyShort` is the one with edges: it is used in comparison columns and
 * card corners where a stray decimal or a wrong order of magnitude reads as a
 * different car.
 */

describe('money', () => {
  it('writes the currency and groups the digits', () => {
    expect(money(280_000)).toBe('UGX 280,000')
    expect(money(42_500_000)).toBe('UGX 42,500,000')
  })

  it('handles zero rather than printing something odd', () => {
    expect(money(0)).toBe('UGX 0')
  })
})

describe('moneyShort', () => {
  it('drops a trailing .0 rather than writing "42.0M"', () => {
    expect(moneyShort(42_000_000)).toBe('42M')
    expect(moneyShort(1_000_000)).toBe('1M')
  })

  it('keeps one decimal where it carries information', () => {
    expect(moneyShort(42_500_000)).toBe('42.5M')
  })

  it('switches to thousands below a million', () => {
    expect(moneyShort(280_000)).toBe('280k')
    expect(moneyShort(1_000)).toBe('1k')
  })

  it('leaves small amounts alone', () => {
    expect(moneyShort(999)).toBe('999')
    expect(moneyShort(0)).toBe('0')
  })

  it('drops the decimal on a value that ROUNDS to whole', () => {
    // The regression: the is-it-whole test used to run on the unrounded
    // quotient, so 41.96 rendered as "42.0M" instead of "42M".
    expect(moneyShort(41_960_000)).toBe('42M')
    expect(moneyShort(1_999_999)).toBe('2M')
    expect(moneyShort(999_999)).toBe('1000k')
  })

  it('is monotonic across the range used on the pre-car pages', () => {
    // Every price band on Compare depends on bigger numbers rendering as
    // bigger strings in the same unit.
    const amounts = [18_000_000, 24_600_000, 42_500_000, 46_200_000, 92_000_000]
    const rendered = amounts.map(moneyShort)
    const asNumbers = rendered.map((s) => Number.parseFloat(s))

    expect(rendered.every((s) => s.endsWith('M'))).toBe(true)
    for (let i = 1; i < asNumbers.length; i += 1) {
      expect(asNumbers[i]).toBeGreaterThan(asNumbers[i - 1])
    }
  })
})
