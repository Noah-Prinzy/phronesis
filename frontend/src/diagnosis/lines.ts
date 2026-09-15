import type { CarPart } from '../data/findings'

/**
 * What he says while he is holding a part up.
 *
 * **Everything here is anatomy, and that is deliberate.** The diagnosis
 * itself — what is wrong, why, how sure he is, what it costs — is on the card
 * beside him, written by the model that actually worked it out. He does not
 * read that out: partly because narrating text somebody is already looking at
 * is the fastest way to sound like a machine, and partly because anything
 * fault-specific written HERE would be a sentence this file invented about
 * somebody's real car.
 *
 * So these lines say only what the object in his hand is and where it sits,
 * which is true of every car of that shape and adds the one thing the card
 * cannot: you are looking at the thing being talked about.
 */
const ANATOMY: Record<CarPart, string> = {
  'front-brakes': 'This is the disc from your front left. The pads close on it from either side, and it should be smooth the whole way to the edge.',
  'rear-brakes': 'This is a disc from the back axle. It does less of the work than the front pair, which is why the fronts nearly always wear out first.',
  engine: 'That is the engine. It sits across the car rather than along it, which is why your bonnet is as short as it is.',
  battery: 'That is the battery, tucked in beside the engine. It is the first thing anybody offers to replace, so it is worth knowing what one looks like.',
  cabin: 'That is the shell — the part you sit inside. Very little actually fails here; what does is usually something routed through it.',
}

/** Plain names, for the label above his hand and for the opening line. */
export const PART_NAME: Record<CarPart, string> = {
  'front-brakes': 'front brakes',
  'rear-brakes': 'rear brakes',
  engine: 'engine',
  battery: 'battery',
  cabin: 'cabin',
}

/**
 * The line he opens with, as he takes the middle.
 *
 * It names the place and promises the showing — and says nothing about the
 * finding, because the finding is on screen. "Let me show you rather than
 * tell you" is the honest version of what happens next.
 */
export function opener(part: CarPart | null): string {
  if (!part) return 'Let me take you through what I found.'
  return `I have found it, and it is your ${PART_NAME[part]}. Let me show you rather than tell you.`
}

/** The line he explains over, once the part is in his hand. */
export function explain(part: CarPart | null): string {
  return part ? ANATOMY[part] : ''
}
