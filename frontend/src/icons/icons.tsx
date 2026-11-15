import type { ReactNode } from 'react';

import { ICON_SIZES, systemColor, systemOf } from './meta';
import type { StatusKind } from './meta';

const P = (d: string, key: string) => <path key={key} d={d} />;
const paths = (...ds: string[]) => ds.map((d, i) => P(d, String(i)));

// Every glyph is drawn on one 24 px grid with a 1.75 px stroke and round caps,
// so an indicator icon, a state icon and a utility glyph read as one set
// (DESIGN.md 10).

const BP_DIAL = 'M4.5 18a8.5 8.5 0 1 1 15 0';
const BP_NEEDLE = 'M12 15l3.4-4.2';

const SHAPES: Record<string, () => ReactNode> = {
  hr_bpm: () => paths('M12 20.5C5 15.5 3 11.5 3 8.5a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c0 3-2 7-9 12z', 'M6 12h3l1.5-3 2 6 1.5-3h3'),
  // Blood pressure: the pair of readings is one gauge. The systolic reading is
  // a hill under a ceiling bar (the peak of each beat) and the diastolic one is
  // its mirror, a trough over a floor bar (the rest between beats), so the two
  // differ by silhouette and not by a small mark in a corner.
  bp: () => [...paths(BP_DIAL, BP_NEEDLE), <circle key="c" cx="12" cy="15" r="1" />],
  bp_sys_mmhg: () => [
    ...paths('M4 4h16', 'M3 20.5c4 0 4.5-12.5 9-12.5s5 12.5 9 12.5'),
    <circle key="c" cx="12" cy="8.5" r="1.4" fill="currentColor" />,
  ],
  bp_dia_mmhg: () => [
    ...paths('M4 20h16', 'M3 3.5c4 0 4.5 12.5 9 12.5s5-12.5 9-12.5'),
    <circle key="c" cx="12" cy="15.5" r="1.4" fill="currentColor" />,
  ],
  temp_core_c: () => paths('M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z', 'M12 10v6'),
  sleep_h: () => paths('M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z', 'M17 3v3M15.5 4.5h3', 'M21 9v2M20 10h2'),
  mood_1_5: () => [<circle key="c" cx="12" cy="12" r="9" />, ...paths('M9 9.5v1M15 9.5v1', 'M8.5 14.5q3.5 3 7 0')],
  glucose_mgdl: () => paths('M12 3C8 8.5 6 11.5 6 15a6 6 0 0 0 12 0c0-3.5-2-6.5-6-12z'),
  // The reaction check (T-71): a stopwatch for the median time, three ticks
  // with one short for the lapses.
  reaction_median_ms: () => [
    <circle key="c" cx="12" cy="13.5" r="7.5" />,
    ...paths('M12 13.5V9', 'M9.5 2.5h5', 'M18.5 6.5l1.5 1.5'),
  ],
  reaction_lapses: () => paths('M6 5v14', 'M12 5v14', 'M18 5v6'),
};

const STATUS: Record<StatusKind, () => ReactNode> = {
  in_range: () => [<circle key="c" cx="12" cy="12" r="9" />, P('M8 12.5l3 3 5-6', 'p')],
  outside: () => [<circle key="c" cx="12" cy="12" r="9" />, <circle key="d" cx="15.5" cy="12" r="1.8" fill="currentColor" />],
  review: () => paths('M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.5h.01'),
  no_data: () => [<circle key="c" cx="12" cy="12" r="9" strokeDasharray="3 3" />],
  warning: () => paths('M12 2.5l9.5 9.5-9.5 9.5L2.5 12z', 'M12 8v5', 'M12 16h.01'),
};

/** The glyphs that are not a state or an indicator: controls and the way on. */
export type UtilityKind =
  | 'check' // a step already walked
  | 'chevron' // a disclosure is closed
  | 'info' // something to read, nothing to fix
  | 'wifi' // the browser is online
  | 'wifi-off' // the browser is offline
  | 'motion' // motion is running
  | 'still'; // motion is off

const UTILITY: Record<UtilityKind, () => ReactNode> = {
  check: () => paths('M5 12.5l4.6 4.5L19 6.5'),
  chevron: () => paths('M9.5 5.5l6.5 6.5-6.5 6.5'),
  info: () => [
    <circle key="c" cx="12" cy="12" r="9.25" />,
    P('M12 11v5.5', 'p'),
    <circle key="d" cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />,
  ],
  wifi: () => [...paths('M5.8 11.6a9 9 0 0 1 12.4 0', 'M8.6 14.9a5.2 5.2 0 0 1 6.8 0'), <circle key="d" cx="12" cy="18.4" r="1.1" fill="currentColor" stroke="none" />],
  'wifi-off': () => [...paths('M5.8 11.6a9 9 0 0 1 12.4 0', 'M8.6 14.9a5.2 5.2 0 0 1 6.8 0', 'M4.5 4.5l15 15'), <circle key="d" cx="12" cy="18.4" r="1.1" fill="currentColor" stroke="none" />],
  motion: () => paths('M3.5 13.5c2.4 0 2.4-5 4.6-5s2.4 8 4.6 8 2.4-6.5 4.6-6.5 1.6 2.2 3.2 2.2', 'M14.5 5.5l4 2-3 2.6'),
  still: () => paths('M9 6.5v11', 'M15 6.5v11'),
};

function Svg({ size, style, kind, children }: { size: number; style?: React.CSSProperties; kind: string; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={kind}
      style={style}
    >
      {children}
    </svg>
  );
}

/**
 * Indicator icon. `indicatorId` picks the drawing (unknown id: neutral ring),
 * `size` is in px (default 24), `colored` applies the body-system colour.
 */
export function IndicatorIcon({ indicatorId, size = ICON_SIZES.card, colored = false }: { indicatorId: string; size?: number; colored?: boolean }) {
  const system = systemOf(indicatorId);
  const draw = Object.hasOwn(SHAPES, indicatorId) ? SHAPES[indicatorId] : undefined;
  return (
    <Svg size={size} kind={draw ? indicatorId : 'unknown'} style={colored && system ? { color: systemColor(system) } : undefined}>
      {draw ? draw() : <circle cx="12" cy="12" r="8" />}
    </Svg>
  );
}

/** State icon. `kind` is one of the five states, `size` in px (default 24). Colour comes from the caller. */
export function StatusIcon({ kind, size = ICON_SIZES.card }: { kind: StatusKind; size?: number }) {
  return <Svg size={size} kind={kind}>{STATUS[kind]()}</Svg>;
}

/** Control and navigation glyph, on the same grid as every other icon. */
export function UtilityIcon({ kind, size = ICON_SIZES.inline }: { kind: UtilityKind; size?: number }) {
  return <Svg size={size} kind={kind}>{UTILITY[kind]()}</Svg>;
}

/** Trend of a reading over its last entries: up, down, steady (two bars), or none when there is no trend yet. */
export type TrendKind = 'up' | 'down' | 'steady' | 'none';

const TREND: Record<TrendKind, string[]> = {
  up: ['M12 19V5M6 11l6-6 6 6'],
  down: ['M12 5v14M6 13l6 6 6-6'],
  steady: ['M5 9h14M5 15h14'],
  none: ['M8 12h8'],
};

/** Trend glyph for the card trend row: shape only, no colour of its own. `size` in px (default 16). */
export function TrendIcon({ kind, size = ICON_SIZES.inline }: { kind: TrendKind; size?: number }) {
  return <Svg size={size} kind={`trend-${kind}`}>{paths(...TREND[kind])}</Svg>;
}
