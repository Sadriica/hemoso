import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { ICON_SIZES, IndicatorIcon, StatusIcon, TrendIcon, UtilityIcon, systemColor, systemOf } from './index';
import type { StatusKind, TrendKind, UtilityKind } from './index';

const IDS = ['hr_bpm', 'bp_sys_mmhg', 'bp_dia_mmhg', 'temp_core_c', 'sleep_h', 'mood_1_5', 'glucose_mgdl', 'nope'];
const KINDS: StatusKind[] = ['in_range', 'outside', 'review', 'no_data', 'warning'];
const UTILITIES: UtilityKind[] = ['check', 'chevron', 'info', 'motion', 'still'];

function markup(element: ReactElement): string {
  return render(element).container.querySelector('svg')!.innerHTML;
}

describe('icons', () => {
  it('maps indicators to systems and colours', () => {
    expect(systemOf('bp_dia_mmhg')).toBe('cardiovascular');
    expect(systemOf('mood_1_5')).toBe('neuro');
    expect(systemOf('toString')).toBeNull();
    expect(systemOf('x')).toBeNull();
    expect(systemColor('neuro')).toBe('var(--system-neuro)');
  });

  it('draws a different glyph for each indicator, and one for the unknown id', () => {
    const marks = IDS.map((id) => {
      const svg = render(<IndicatorIcon indicatorId={id} />).container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.getAttribute('width')).toBe('24');
      expect(svg.getAttribute('stroke-width')).toBe('1.75');
      return svg.innerHTML;
    });
    expect(new Set(marks).size).toBe(IDS.length);
  });

  it('gives the two blood pressures their own drawing', () => {
    const sys = markup(<IndicatorIcon indicatorId="bp_sys_mmhg" />);
    const dia = markup(<IndicatorIcon indicatorId="bp_dia_mmhg" />);
    expect(sys).not.toBe(dia);
    // The pair of readings has one gauge of its own.
    expect(markup(<IndicatorIcon indicatorId="bp" />)).not.toBe(sys);
  });

  it('colours only on request and honours size', () => {
    const a = render(<IndicatorIcon indicatorId="sleep_h" size={ICON_SIZES.hero} colored />).container.querySelector('svg')!;
    expect(a.style.color).toBe('var(--system-sleep)');
    expect(a.getAttribute('width')).toBe('40');
    const b = render(<IndicatorIcon indicatorId="sleep_h" />).container.querySelector('svg')!;
    expect(b.style.color).toBe('');
    const c = render(<IndicatorIcon indicatorId="nope" colored />).container.querySelector('svg')!;
    expect(c.style.color).toBe('');
  });

  it('renders distinct hidden markup for each status', () => {
    const marks = KINDS.map((kind) => {
      const svg = render(<StatusIcon kind={kind} size={16} />).container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('width')).toBe('16');
      return svg.innerHTML;
    });
    expect(new Set(marks).size).toBe(KINDS.length);
  });

  it('draws every utility glyph on the same grid', () => {
    const marks = UTILITIES.map((kind) => {
      const svg = render(<UtilityIcon kind={kind} />).container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke-width')).toBe('1.75');
      expect(svg.getAttribute('data-icon')).toBe(kind);
      return svg.innerHTML;
    });
    expect(new Set(marks).size).toBe(UTILITIES.length);
    const big = render(<UtilityIcon kind="check" size={ICON_SIZES.card} />).container.querySelector('svg')!;
    expect(big.getAttribute('width')).toBe('24');
  });

  it('renders distinct, hidden, uncoloured trend glyphs', () => {
    const kinds: TrendKind[] = ['up', 'down', 'steady', 'none'];
    const marks = kinds.map((kind) => {
      const svg = render(<TrendIcon kind={kind} />).container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('stroke-width')).toBe('1.75');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('style')).toBeNull();
      return svg.innerHTML;
    });
    expect(new Set(marks).size).toBe(kinds.length);
  });
});
