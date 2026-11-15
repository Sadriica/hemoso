import type { ReactNode } from 'react';

import { ICON_SIZES, systemColor, systemOf } from './meta';
import type { StatusKind } from './meta';

const P = (d: string, key: string) => <path key={key} d={d} />;
const paths = (...ds: string[]) => ds.map((d, i) => P(d, String(i)));

const SHAPES: Record<string, () => ReactNode> = {
  hr_bpm: () => paths('M12 20.5C5 15.5 3 11.5 3 8.5a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c0 3-2 7-9 12z', 'M6 12h3l1.5-3 2 6 1.5-3h3'),
  bp: () => [...paths('M4.5 18a8.5 8.5 0 1 1 15 0', 'M12 15l4-5'), <circle key="c" cx="12" cy="15" r="1" />],
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
SHAPES.bp_sys_mmhg = SHAPES.bp;
SHAPES.bp_dia_mmhg = SHAPES.bp;

const STATUS: Record<StatusKind, () => ReactNode> = {
  in_range: () => [<circle key="c" cx="12" cy="12" r="9" />, P('M8 12.5l3 3 5-6', 'p')],
  outside: () => [<circle key="c" cx="12" cy="12" r="9" />, <circle key="d" cx="15.5" cy="12" r="1.8" fill="currentColor" />],
  review: () => paths('M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.5h.01'),
  no_data: () => [<circle key="c" cx="12" cy="12" r="9" strokeDasharray="3 3" />],
  warning: () => paths('M12 2.5l9.5 9.5-9.5 9.5L2.5 12z', 'M12 8v5', 'M12 16h.01'),
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
