// A username is the person_id of the API contract: lowercase snake_case,
// starting with a letter, 64 characters at most. People type their name the
// way they write it ("Wambi", "Juan Pérez", "ana-maria"), so the form turns
// that into the id before it checks it, and shows the id it will use.

/** The shape the API accepts for a person id. */
export const USERNAME = /^[a-z][a-z0-9_]{0,63}$/

/**
 * What a typed name becomes: accents dropped, capitals lowered, the ends
 * trimmed, and each run of spaces or hyphens turned into one underscore.
 * Anything else is left as typed, so a name that still cannot work (a symbol,
 * a leading digit) is told to the person instead of being changed silently.
 */
export function normaliseUsername(typed: string): string {
  return typed
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** True when the normalised name is an id the API accepts. */
export function isUsername(name: string): boolean {
  return USERNAME.test(name)
}
