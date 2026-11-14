import type { Source } from './types'

const LINK = /^https?:\/\/\S+$/

// Reads one source cell from a CSV row (STANDARDS.md section 6): the word
// `Assumption` alone, or one or more bare links separated by spaces. Every
// link becomes its own Source, with the link as the title. Returns null when
// the cell is empty or holds any other token, so the caller can report it.
export function parseSources(cell: string): Source[] | null {
  const tokens = cell.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  if (tokens.length === 1 && tokens[0] === 'Assumption') return ['Assumption']
  if (!tokens.every((token) => LINK.test(token))) return null
  return tokens.map((token) => ({ title: token, url: token }))
}
