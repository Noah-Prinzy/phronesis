/**
 * Everything Phronesis says that is written rather than generated.
 *
 * They were scattered across the four pages that speak them, which was fine
 * until they needed to be *rendered ahead of time*. A build step cannot find
 * a string that only exists inside a component, so they live here and the
 * pages import them — one source of truth for both the screen and the
 * pre-render script.
 *
 * **Keep these exact.** `scripts/prerender-voice.ts` renders each one to an
 * MP3 and keys the manifest on the string itself. Edit a line and the key
 * stops matching, which is not a breakage — it just falls back to the live
 * endpoint until the render is run again. Silent, but slower.
 *
 * Anything with a name or a number in it belongs in the component, not here.
 * Only lines that are the same for every user can be rendered once.
 */

/**
 * The first thing anyone ever hears.
 *
 * He introduces himself by name and in full — "my name is Phronesis", not
 * "I'm Phronesis" — because this is the one line whose job is to teach the
 * name, and a contraction hurries past it.
 *
 * **"Hello", not "Hi".** The voice would not say the H in "Hi": measured on
 * the rendered audio, the opening went from silence to full amplitude in
 * 15ms, which is a bare vowel onset with no aspiration in front of it, and
 * it landed on the ear as "eye". "Hello" is articulated properly. It is a
 * greeting either way, so the writing lost nothing.
 *
 * On screen the name is spelled properly. The VOICE gets "Froneesis",
 * substituted in `speech-text.ts`, because the model has never met the Greek
 * and read it as something closer to "e na unasis". Same rule as prices:
 * "UGX 280,000" is what a price looks like, "280,000 shillings" is what it
 * sounds like.
 */
export const WELCOME =
  "Hello. My name is Phronesis. Think of me as the friend who actually knows cars, the one you'd call before you call a mechanic. Shall we get you set up?"

/** Onboarding, step one: which journey they are on. */
export const JOURNEY_ASK =
  'So before anything else — have you already got a car, or are you still shopping for one?'

/** Onboarding, step two: the OBD reader, if this device could reach one. */
export const READER_SUPPORTED =
  "If you have an OBD reader, plug it in under the dash and I'll connect to it. If you haven't, that's fine — you can just tell me what the car is doing."

/** The same step, on a device that has no way to talk to a reader at all. */
export const READER_UNSUPPORTED =
  "This device can't talk to a Bluetooth reader, so just tell me what the car is doing and I'll work from that."

/** Onboarding, last step: the account, asked as a question not a form. */
export const ACCOUNT_OWNER =
  "Last thing, then we're done. Make an account and I'll remember your car and everything we work out together. What should I call you?"

export const ACCOUNT_BUYER =
  "Last thing, then we're done. Make an account and I'll remember your budget and what you've already ruled out. What should I call you?"

/**
 * The first thing he says on Home, ever.
 *
 * This is the ONLY line that explains the interface, and that is the whole
 * point of separating it: "tap my orb or the mic" earns its place once and
 * grates every time after. See `app/greeting.ts` for the choosing.
 */
export const OPENER_OWNER_FIRST =
  "Tap my orb or the mic whenever you want to talk. So, what's your car been doing — a noise, a warning light, something that just feels off?"

export const OPENER_BUYER_FIRST =
  'Tap my orb or the mic whenever you want to talk. So, what are you looking for — a budget, a make you like, something for work?'

/**
 * Every visit after the first. No instructions, and never the same one twice
 * running.
 *
 * Short on purpose. A returning user is here because something is happening
 * with their car, and a paragraph between them and saying so is friction
 * wearing a friendly hat. Each is one question, which is also what the
 * persona asks for everywhere else.
 */
export const OPENER_OWNER_AGAIN = [
  'How has the car been?',
  'What is it doing today?',
  'Anything playing up?',
  'What can I look at for you?',
  'How are things with the car?',
]

export const OPENER_BUYER_AGAIN = [
  'How is the search going?',
  'Found anything you like?',
  'What are we looking at today?',
  'Seen anything worth a second look?',
  'Where did we get to?',
]

/**
 * What he says when the user talks over him.
 *
 * Short on purpose: an apology that takes two seconds defeats the point of
 * interrupting. Pre-rendered matters more here than anywhere — this line has
 * to land immediately or the microphone opens into an awkward gap.
 */
export const RESUME_LINES = ['Sorry — go on.', 'Sorry, you were saying?', "Go on, I'm listening."]

/**
 * Every fixed line, for the pre-render script to walk.
 *
 * A plain array rather than a clever export scan, so that adding a line is a
 * deliberate act and nothing is rendered by accident.
 */
export const ALL_FIXED_LINES: readonly string[] = [
  WELCOME,
  JOURNEY_ASK,
  READER_SUPPORTED,
  READER_UNSUPPORTED,
  ACCOUNT_OWNER,
  ACCOUNT_BUYER,
  OPENER_OWNER_FIRST,
  OPENER_BUYER_FIRST,
  ...RESUME_LINES,

  /**
   * The returning openers, bare and with each time of day in front.
   *
   * Four renders per question rather than one, because the greeting is part
   * of the sentence the voice says and "Morning. How has the car been?" is
   * not the same audio as the question alone. Ten questions across the two
   * journeys comes to forty short files — a few hundred kilobytes for the
   * line a returning user hears every single time, which is the one most
   * worth having instant.
   *
   * Only the nameless forms. "Morning, Noah" is one recording per user and
   * can only ever come from the live endpoint.
   */
  ...[...OPENER_OWNER_AGAIN, ...OPENER_BUYER_AGAIN].flatMap((q) => [
    q,
    `Morning. ${q}`,
    `Afternoon. ${q}`,
    `Evening. ${q}`,
  ]),
]
