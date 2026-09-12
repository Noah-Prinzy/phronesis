// backend/src/services/speech-text.ts

/**
 * Rewrite text so a speech model says it the way a person would.
 *
 * This lives on its own because there is more than one voice. Edge is the one
 * anybody actually hears, but Gemini sits behind it in the provider chain and
 * Sunbird is scoped in for local languages — and until this was extracted,
 * only Edge got any of it. A fallback that reads "## What it costs" aloud with
 * the hashes is a fallback that sounds broken, and it fires at exactly the
 * moment things are already going wrong.
 *
 * Split in two on purpose:
 *
 *   `normaliseForSpeech`  what to SAY. Every provider wants this.
 *   `escapeXml`           how to CARRY it. Only the SSML transport wants this,
 *                         and applying it anywhere else would have him
 *                         pronouncing "&amp;".
 *
 * Applied ONLY to what is spoken. The words on screen keep their real
 * spelling, because "UGX 280,000" is what a price looks like and
 * "280,000 shillings" is what it sounds like.
 */

/**
 * Markdown is written to be seen, and his replies arrive as markdown because
 * that is what the screen wants. Spoken, it ranges from meaningless to
 * actively wrong: "## What it costs" was being pronounced with the hashes,
 * which the word-boundary metadata shows as two spoken tokens ("#", "#")
 * before the sentence begins. Five seconds of audio for four words.
 *
 * The persona already forbids markdown, so this is a net rather than a
 * policy — but a model that drifts once should not make him sound illiterate.
 */
const MARKDOWN: Array<[RegExp, string]> = [
  // Fenced blocks first, or their contents get processed as prose.
  [/```[\s\S]*?```/g, ' '],
  [/`([^`]+)`/g, '$1'],
  // Headings — the hashes were being read aloud.
  [/^\s{0,3}#{1,6}\s+/gm, ''],
  // Emphasis. The engine already ignores stray asterisks, but nothing should
  // depend on that staying true.
  [/(\*\*|__)(.*?)\1/g, '$2'],
  [/(\*|_)(?=\S)(.*?\S)\1/g, '$2'],
  // Links: the words, never the URL.
  [/!?\[([^\]]*)\]\([^)]*\)/g, '$1'],
  // Horizontal rules, before bullets — otherwise "---" becomes a lone dash.
  [/^\s*(?:[-*_]\s*){3,}$/gm, ''],
  // List bullets and quote markers.
  [/^\s*[-*+]\s+/gm, ''],
  [/^\s*>\s?/gm, ''],
]

/** Digits, said one at a time. */
const DIGIT: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
}

/**
 * Fault codes, spelled out.
 *
 * "P0420" is a letter and four separate digits. Left alone the model runs the
 * number together — it is the single most important string this app says, and
 * the one place a wrong reading makes him sound like he does not know the
 * subject. There is no SSML `<say-as interpret-as="digits">` available here
 * (it kills the stream), so the digits are written as words instead.
 */
function spellCodes(text: string): string {
  return text.replace(
    /\b([PBCU])([0-3])([0-9A-F]{3})\b/g,
    (_whole, system: string, first: string, rest: string) =>
      [system, ...`${first}${rest}`].map((c) => DIGIT[c] ?? c).join(' '),
  )
}

const SPOKEN: Array<[RegExp, string]> = [
  /**
   * His own name, which he could not say.
   *
   * "Phronesis" is Greek — φρόνησις, practical wisdom — and the model has
   * never met it. Read literally it came out as roughly "e na unasis": the
   * "Phr" collapses and the stress lands nowhere. The single worst word in
   * the product to get wrong, and it is in the first line of the first
   * screen.
   *
   * There is no `<phoneme>` to reach for — SSML is rejected outright by this
   * endpoint — so the only lever is spelling it the way it sounds. "ee" is
   * what forces the long stressed middle syllable; "Fronesis" leaves the
   * model free to say "FRON-uh-sis" instead. Hyphens were tried and are
   * worse: "fro-nee-sis" measured 2.62s against 2.02s for the plain word,
   * because the engine reads the breaks as pauses and spells it out.
   *
   * Target: fro-NEE-sis. The screen keeps the real spelling.
   */
  [/\bPhronesis\b/gi, 'Froneesis'],

  // The one that started this.
  [/\bmics\b/gi, 'mikes'],
  [/\bmic\b/gi, 'mike'],

  // Money — the thing people listen hardest to. "UGX" alone reads as three
  // letters, and the amount has to come first to sound like speech.
  [/\bUGX\s*([\d,]+(?:\.\d+)?)/gi, '$1 shillings'],
  [/\bUGX\b/gi, 'shillings'],

  // Units. "km" becomes "kay em" otherwise.
  [/\bkm\s*\/\s*[lL]\b/g, 'kilometres per litre'],
  [/\bkm\s*\/\s*h\b/gi, 'kilometres per hour'],
  [/\bkph\b/gi, 'kilometres per hour'],
  [/\b([\d,]+)\s*km\b/gi, '$1 kilometres'],
  [/\bkm\b/gi, 'kilometres'],

  // Car vocabulary that IS spoken as letters, but needs spacing or the model
  // runs the letters into a non-word.
  [/\bOBD\b/g, 'O B D'],
  [/\bDTC\b/g, 'D T C'],
  [/\bECU\b/g, 'E C U'],
  [/\bABS\b/g, 'A B S'],
  [/\bRPM\b/gi, 'R P M'],
  [/\bSUV\b/g, 'S U V'],
  [/\bA\/C\b/g, 'air conditioning'],
  [/\b4WD\b/g, 'four wheel drive'],
  [/\bAWD\b/g, 'all wheel drive'],

  // Number plates: "UAX 123B" is otherwise attempted as a word.
  [/\b([A-Z]{3})\s?(\d{3})([A-Z])\b/g, '$1 $2 $3'],

  /**
   * An ellipsis is written for a beat of hesitation and this voice barely
   * gives it one. Measured against the same sentence: no punctuation 1.68s,
   * a comma 2.11s, "…" 2.06s — so the character buys LESS pause than a
   * comma, which is the opposite of what it is for. Three full stops buy
   * 2.83s. Same mark on screen, an actual pause in the ear.
   */
  [/…/g, '...'],
]

/**
 * What to say. Safe for any provider — no transport assumptions.
 */
export function normaliseForSpeech(text: string): string {
  const stripped = MARKDOWN.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    text,
  )
  const said = SPOKEN.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    spellCodes(stripped),
  )
  // Stripping markdown leaves the gaps its syntax used to fill.
  return said.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Make the text safe to put inside an XML document. SSML transports only.
 *
 * This is not a nicety. msedge-tts interpolates the string straight into an
 * SSML template without escaping it (`_SSMLTemplate`), so a single ampersand
 * does not mispronounce — it makes the document malformed and the service
 * returns NO AUDIO AT ALL. "Wear & tear on the pads" was measured producing
 * zero bytes; the retry on a fresh socket fails the same way, and he drops
 * to the browser's own voice in the middle of a conversation. Escaped, the
 * identical line speaks normally.
 *
 * His replies are model output about cars and prices, so "&" is a question of
 * when, not whether.
 */
export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
