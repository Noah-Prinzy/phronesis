import type { CarPart } from '../data/findings'
import type { DiagnosisReport } from '../lib/api'

/**
 * What he says while he is holding a part up.
 *
 * If a dynamic diagnosis report is provided, he voices the real diagnosis
 * finding and root cause computed by the model. Otherwise, he falls back to
 * clear anatomical descriptions of the focused component.
 */
const ANATOMY: Record<CarPart, string> = {
  'front-brakes': 'This is the disc from your front left. The pads close on it from either side, and it should be smooth the whole way to the edge.',
  'rear-brakes': 'This is a disc from the back axle. It does less of the work than the front pair, which is why the fronts nearly always wear out first.',
  engine: 'That is the engine, located in the engine bay.',
  battery: 'That is the battery, providing power to the vehicle electrical systems.',
  cabin: 'That is the cabin and body shell.',
}

/** Plain names, for the label above his hand and for the opening line. */
export const PART_NAME: Record<CarPart, string> = {
  'front-brakes': 'front brakes',
  'rear-brakes': 'rear brakes',
  engine: 'engine',
  battery: 'battery',
  cabin: 'body and cabin',
}

/**
 * The line he opens with, as he takes the middle.
 */
export function opener(part: CarPart | null, report?: DiagnosisReport | null): string {
  if (report) return 'Let me take you through what I found.'
  if (!part) return 'Let me take you through what I found.'
  return `I have found it, and it is your ${PART_NAME[part]}. Let me show you rather than tell you.`
}

/** The line he explains over, voicing the actual diagnosis finding when available. */
export function explain(part: CarPart | null, report?: DiagnosisReport | null): string {
  if (report) {
    const issue = report.issue?.trim()
    const cause = report.rootCause?.trim()
    if (issue && cause) {
      const sep = /[.!?]$/.test(issue) ? ' ' : '. '
      return `Here is what I found: ${issue}${sep}${cause}`
    }
    if (issue) return `Here is what I found: ${issue}.`
    if (cause) return `Here is what I found: ${cause}.`
  }
  return part ? ANATOMY[part] : ''
}
