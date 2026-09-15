import type { Journey } from './journey'

/**
 * Which half of the product somebody is actually in, read off what they say.
 *
 * **Why this is not a single-message test.** Switching journey is not like
 * aiming the hologram: it takes two pages out of the navigation. Somebody
 * mid-diagnosis who mentions that their brother is shopping for a Vitz has
 * not stopped owning a car, and a match on that one sentence would cost them
 * Diagnose and Fix for saying something in passing.
 *
 * So the unit of evidence is the CONVERSATION, not the message. One mention
 * is a mention; the same direction two turns running is where somebody
 * actually is. That is also why this reads the user's own words rather than
 * his replies — it is their journey, and their stated intent should decide
 * it rather than his paraphrase of it.
 */

/**
 * How many turns pointing the same way it takes to move somebody.
 *
 * The one number to tune here. At two, a conversation that has genuinely
 * turned moves within a turn of you noticing it has; a stray sentence never
 * does. Raising it makes him more stubborn, lowering it makes him twitchy.
 */
const TURNS_TO_SWITCH = 2

/**
 * How far back the evidence is read.
 *
 * Bounded so a conversation that changed direction twenty messages ago is not
 * still voting. Six user turns is roughly the last few minutes of talking.
 */
const WINDOW = 6

/**
 * Buying language — and deliberately first-person or imperative.
 *
 * "should I buy", "looking for a car", "what's a good" — someone placing
 * themselves in the market. A bare "buy" is not here on purpose: "where can I
 * buy brake pads" is an owner with a fault, and it is the exact sentence a
 * looser pattern would take them out of Diagnose for.
 */
const BUYING =
  /\b(?:i(?:'m| am)? ?(?:want|looking|thinking|planning|hoping|keen)[a-z]* to (?:buy|get|import|purchase)|should i buy|want to buy|looking (?:for|at) (?:a |an |another )?(?:car|vehicle|ride)|shopping for|in the market|which car should|what car should|best car (?:for|under)|recommend (?:me )?a car|cars? under|import a car|second car|first car)\b/i

/**
 * Fault language, likewise first-person and about a car they have.
 *
 * "my car", "it's making", "check engine" — the vocabulary of somebody
 * standing next to something that is wrong.
 */
const FAULT =
  /\b(?:my (?:car|engine|brakes?|gearbox|clutch|battery|vehicle)|check engine|engine light|warning light|dashboard light|(?:it|car)(?:'s| is) (?:making|leaking|smoking|overheating|pulling|shaking|stalling|misfiring)|won'?t start|not starting|strange (?:noise|sound|smell)|grinding|knocking|rattl(?:e|ing)|squeal|overheat|breakdown|broke down|service due|needs? (?:a )?service)\b/i

/** Which journey one message points at, if any. */
export function journeySignal(text: string): Journey | null {
  const buying = BUYING.test(text)
  const fault = FAULT.test(text)
  // Both at once is somebody comparing a repair against replacing the car,
  // which is a real thing to say and not a reason to move them anywhere.
  if (buying === fault) return null
  return buying ? 'buyer' : 'owner'
}

/**
 * Where the conversation has settled, or null to stay put.
 *
 * Reads the recent user turns rather than keeping a counter, which means it
 * cannot drift out of step with the thread it is describing and can be
 * recomputed from scratch at any point.
 *
 * @param userTexts every user message so far, oldest first
 * @param current   the journey they are in now
 */
export function journeyFromConversation(
  userTexts: string[],
  current: Journey | null,
): Journey | null {
  const recent = userTexts.slice(-WINDOW)

  let buyer = 0
  let owner = 0
  for (const text of recent) {
    const signal = journeySignal(text)
    if (signal === 'buyer') buyer += 1
    else if (signal === 'owner') owner += 1
  }

  const other: Journey = current === 'buyer' ? 'owner' : 'buyer'
  const forOther = other === 'buyer' ? buyer : owner
  const forCurrent = other === 'buyer' ? owner : buyer

  /* Enough evidence, AND more than for where they already are. The second
     test is what stops a conversation that mentions both ping-ponging: to
     move somebody, the other direction has to be winning, not merely
     present. */
  if (forOther >= TURNS_TO_SWITCH && forOther > forCurrent) return other
  return null
}
