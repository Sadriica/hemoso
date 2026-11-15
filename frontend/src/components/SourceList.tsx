import type { Source } from '../domain/types'
import { strings } from '../strings'

// The sources a reading rests on, or the word Assumption when the team has no
// link yet (STANDARDS.md section 6). The list is shown inside the Details panel
// of a card.
export default function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="sources__empty">{strings.sources.empty}</p>
  }

  return (
    <ul className="sources__list">
      {sources.map((source) => (
        <li key={source === 'Assumption' ? 'Assumption' : source.url}>
          {source === 'Assumption' ? (
            <span>{strings.sources.assumption}</span>
          ) : (
            <a href={source.url} rel="noreferrer">
              {source.title}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
