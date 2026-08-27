/** Joins class names, dropping falsy entries — lets components express
 * conditional classes inline without a `clsx` dependency for what is a
 * four-line function. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
