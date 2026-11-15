const MAX_LABEL = 48

// A readable label for a source that has no title of its own: the host and the
// last path segment of its own address. Nothing is invented; the full address
// stays in href and title.
export function sourceLabel(source: { title: string; url: string }): string {
  if (source.title !== source.url) return source.title
  try {
    const url = new URL(source.url)
    const host = url.hostname.replace(/^www\./, '')
    const segments = url.pathname.split('/').filter((part) => part !== '')
    const last = segments[segments.length - 1]
    const label =
      last === undefined ? host : `${host} \u00b7 ${decodeURIComponent(last)}`
    return label.length > MAX_LABEL
      ? `${label.slice(0, MAX_LABEL - 1)}\u2026`
      : label
  } catch {
    return source.title
  }
}
