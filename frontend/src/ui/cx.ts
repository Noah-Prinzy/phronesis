/**
 * The whole of our class-name handling. A dependency would be larger than
 * the problem.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
