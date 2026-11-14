import type { Source } from './types'

// Reads one source cell from a CSV row: the word `Assumption` or a bare link.
// Returns null when the cell is neither, so the caller can report it.
export function parseSource(cell: string): Source | null {
  const value = cell.trim()
  if (value === 'Assumption') return 'Assumption'
  if (/^https?:\/\/\S+$/.test(value)) return { title: value, url: value }
  return null
}
