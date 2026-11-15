import type { Source } from '../domain/types'
import { useId } from 'react'
import { strings } from '../strings'
import { sourceLabel } from './sourceLabel'
import './sources-phone.css'

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
