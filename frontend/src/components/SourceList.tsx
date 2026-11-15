import type { Source } from '../domain/types'
import { useId } from 'react'
import { strings } from '../strings'

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

// The sources a reading rests on, or the word Assumption when the team has no
// link yet (STANDARDS.md section 6). The list is shown inside the Details panel
// of a card.
export default function SourceList({ sources }: { sources: Source[] }) {
  // The new-tab hint is the description of each link, so its name stays the
  // label of the source.
  const hintId = useId()
  if (sources.length === 0) {
    return <p className="sources__empty">{strings.sources.empty}</p>
  }

  return (
    <>
      <span id={hintId} className="sr-only">
        {strings.sources.opensNewTab}
      </span>
      <ul className="sources__list">
        {sources.map((source) => (
          <li key={source === 'Assumption' ? 'Assumption' : source.url}>
            {source === 'Assumption' ? (
              <span className="sources__assumption">
                {strings.sources.assumption}
              </span>
            ) : (
              <a
                className="sources__link"
                href={source.url}
                title={source.url}
                aria-describedby={hintId}
                target="_blank"
                rel="noreferrer noopener"
              >
                {sourceLabel(source)}
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
