import './body.css'

import { BODY_ZONES, type BodySystem } from './zones'

/** Shape, then the leader line and end mark that point to the label, per zone. */
const SHAPES: Record<BodySystem, { d: string; line: string; fill?: boolean }> = {
  cardiovascular: { d: 'M40 62C28 54 30 42 36 42C39 42 40 45 40 46C40 45 41 42 44 42C50 42 52 54 40 62Z', line: 'M49 50H72', fill: true },
  thermoregulation: { d: 'M28 40H52V92H28Z', line: 'M52 66H72', fill: true },
  sleep: { d: 'M43 8A8 8 0 1 0 49 21A7 7 0 0 1 43 8Z', line: 'M52 20H72' },
  neuro: { d: 'M31 14A9 7 0 0 1 49 14A9 5 0 0 1 31 14Z', line: 'M49 11H72', fill: true },
  metabolic: { d: 'M30 72H50V90H30Z', line: 'M50 82H72', fill: true },
}

const OUTLINE =
  'M40 4A12 12 0 1 0 40 28A12 12 0 1 0 40 4ZM35 28V34L20 38L14 82M45 28V34L60 38L66 82M20 38L28 100L30 168M60 38L52 100L50 168M28 100H52'

/**
 * Front-view body outline that lights the zone of one system.
 * `system`: which zone to light, or null for none.
 * `label`: plain-words name of that system, shown under the figure.
 * `zoneLabel`: optional extra words for the accessible name only.
 */
export default function BodySilhouette({
  system,
  label,
  zoneLabel,
}: {
  system: BodySystem | null
  label: string
  zoneLabel?: string
}) {
  const name = zoneLabel ? `${label}: ${zoneLabel}` : label
  return (
    <figure className="body-silhouette" style={{ margin: 0 }}>
      <svg
        className="body-silhouette__svg"
        viewBox="0 0 80 176"
        role="img"
        aria-label={name}
        data-system={system ?? 'none'}
      >
        <g className="body-silhouette__outline" data-layer="outline">
          <path d={OUTLINE} />
        </g>
        {BODY_ZONES.map((z) => {
          const s = SHAPES[z]
          return (
            <g
              key={z}
              className="body-silhouette__zone"
              data-zone={z}
              data-lit={system === z ? 'true' : 'false'}
              aria-hidden="true"
            >
              <path d={s.d} className={s.fill ? 'body-silhouette__fill' : undefined} />
              <path d={s.line} />
              <circle cx="73" cy={s.line.split(/[MH ]/)[2]} r="2" className="body-silhouette__dot" />
            </g>
          )
        })}
      </svg>
      <figcaption className="body-silhouette__label">{label}</figcaption>
    </figure>
  )
}
