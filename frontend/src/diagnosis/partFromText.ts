import type { CarPart } from '../data/findings'

/**
 * Which car part a line of his was about, guessed from its own words.
 *
 * The chat backend carries no structured metadata alongside the text, so this
 * is a text match rather than a real classification. It is good enough for
 * what it drives — aiming the hologram — and wrong far less often than it is
 * silent.
 *
 * **It lives here because two screens need the same answer.** Home reads it to
 * decide whether he is routing you to Diagnosis at all, and Diagnosis reads it
 * again on every follow-up so that asking about the engine puts the engine in
 * his hand. Two copies of a regex table is two things that must agree and
 * nothing making them.
 */
export function partFromText(text: string): CarPart | null {
  if (/\brear\b.{0,12}\bbrake|\bbrake.{0,12}\brear\b/i.test(text)) return 'rear-brakes'
  if (/\bbrake/i.test(text)) return 'front-brakes'
  if (/\bengine\b/i.test(text)) return 'engine'
  if (/\bcabin\b|\bair filter\b|\bhvac\b/i.test(text)) return 'cabin'
  if (/\bbattery\b/i.test(text)) return 'battery'
  return null
}
