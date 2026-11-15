// The Report rows sit in two columns on a wide screen. Scale rows span the
// line. Any other row is half a line, and a half row left without a partner
// before a scale row (or at the end) spans the line too, so no line is half
// empty. Presentation only: the order of the rows does not change.
export function wideRowKeys(
  rows: ReadonlyArray<{ key: string; scale?: boolean }>,
): Set<string> {
  const wide = new Set<string>()
  let open: string | null = null
  for (const row of rows) {
    if (row.scale) {
      if (open !== null) wide.add(open)
      open = null
    } else if (open === null) {
      open = row.key
    } else {
      open = null
    }
  }
  if (open !== null) wide.add(open)
  return wide
}
