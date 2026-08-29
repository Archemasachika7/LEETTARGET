/** Normalises a subject name into its join key. Subject creation is open —
 * anyone can type "PDSA", "pdsa", or "P.D.S.A." — so this is what a
 * `unique` constraint on `slug` actually enforces: same subject, same slug,
 * regardless of how the name was typed. Never returns leading/trailing/
 * doubled hyphens, so callers can safely check `slug.length > 0` before
 * treating a name as valid. */
export function slugifySubject(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Dots/apostrophes inside an abbreviation ("P.D.S.A.") drop out
    // entirely rather than becoming separators, so it collapses to "pdsa"
    // instead of "p-d-s-a".
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
