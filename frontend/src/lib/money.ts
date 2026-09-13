/**
 * Money formatting, in one place.
 *
 * Currency and locale are still an open product question (see
 * design/01-page-element-map.md). Centralising it means the answer changes one
 * constant rather than thirty template strings — and until then, every figure
 * in the app is at least wrong in exactly the same way.
 */
const CURRENCY = 'UGX'
const LOCALE = 'en-UG'

/** Full precision: "UGX 280,000". For anything a user might act on. */
export function money(amount: number): string {
  return `${CURRENCY} ${amount.toLocaleString(LOCALE)}`
}

/**
 * Compact: "280k", "1.4M". For dense lists and comparison columns, where the
 * exact shilling is noise and the magnitude is the point.
 */
export function moneyShort(amount: number): string {
  if (amount >= 1_000_000) return `${oneDecimal(amount / 1_000_000)}M`
  if (amount >= 1_000) return `${oneDecimal(amount / 1_000)}k`
  return String(amount)
}

/**
 * One decimal place, and none at all when it would be a zero.
 *
 * The rounding has to happen BEFORE the is-it-whole test, which is the bug
 * this replaces: the old version asked `m % 1 === 0` of the raw quotient, so
 * anything that merely rounded to a whole number kept its decimal. UGX
 * 41,960,000 came out as "42.0M" rather than "42M" — a realistic price, and
 * the trailing zero is exactly what the check existed to prevent.
 */
function oneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
