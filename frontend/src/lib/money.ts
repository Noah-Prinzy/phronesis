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
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return String(amount)
}
