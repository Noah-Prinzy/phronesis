/**
 * Markdown, removed before anything says it out loud.
 *
 * **Why this exists on the client at all.** The server already does this, and
 * better — `backend/src/services/speech-text.ts` also fixes pronunciation for
 * money, distances, acronyms and fault codes. But the browser synthesiser is
 * the tier that runs *when the server cannot be reached*, so it is the one
 * place that cannot ask the server to prepare its text. Duplicating a little
 * is the price of a fallback that actually falls back.
 *
 * Kept deliberately smaller than the server's copy rather than kept in sync
 * with it. Only the language-neutral half is here — stripping syntax that is
 * never meant to be pronounced. The pronunciation table is English and is a
 * judgement call per voice, and a second copy of it drifting quietly out of
 * agreement with the first is worse than not having it in a fallback.
 *
 * Measured on the server voice, an unstripped heading is not cosmetic:
 * "## What it costs" came back with "#" and "#" as their own spoken tokens.
 */
const MARKDOWN: Array<[RegExp, string]> = [
  // Fenced blocks first, or their contents get read as prose.
  [/```[\s\S]*?```/g, ' '],
  [/`([^`]+)`/g, '$1'],
  // Headings — the hashes get pronounced.
  [/^\s{0,3}#{1,6}\s+/gm, ''],
  // Emphasis.
  [/(\*\*|__)(.*?)\1/g, '$2'],
  [/(\*|_)(?=\S)(.*?\S)\1/g, '$2'],
  // Links: the words, never the URL.
  [/!?\[([^\]]*)\]\([^)]*\)/g, '$1'],
  // Rules before bullets, or "---" is left as a lone dash.
  [/^\s*(?:[-*_]\s*){3,}$/gm, ''],
  [/^\s*[-*+]\s+/gm, ''],
  [/^\s*>\s?/gm, ''],
]

/**
 * Strip formatting that is meant for the eye.
 *
 * The text on screen keeps its markdown — this is only ever applied on the
 * way into a synthesiser.
 */
export function stripMarkdownForSpeech(text: string): string {
  const out = MARKDOWN.reduce((s, [pattern, replacement]) => s.replace(pattern, replacement), text)
  return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}
