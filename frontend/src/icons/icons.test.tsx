import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ICON_SIZES, IndicatorIcon, StatusIcon, systemColor, systemOf } from './index';
import type { StatusKind } from './index';

const IDS = ['hr_bpm', 'bp_sys_mmhg', 'temp_core_c', 'sleep_h', 'mood_1_5', 'glucose_mgdl', 'nope'];
const KINDS: StatusKind[] = ['in_range', 'outside', 'review', 'no_data', 'warning'];

describe('icons', () => {
  it('maps indicators to systems and colours', () => {
    expect(systemOf('bp_dia_mmhg')).toBe('cardiovascular');
    expect(systemOf('mood_1_5')).toBe('neuro');
    expect(systemOf('toString')).toBeNull();
    expect(systemOf('x')).toBeNull();
    expect(systemColor('neuro')).toBe('var(--system-neuro)');
  });

  it('renders distinct hidden markup for each indicator', () => {
    const marks = IDS.map((id) => {
      const { container } = render(<IndicatorIcon indicatorId={id} />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.getAttribute('width')).toBe('24');
      return svg.innerHTML;
    });
    const unique = new Set(marks.filter((_, i) => i !== 1));
    expect(unique.size).toBe(IDS.length - 1);
    const bp = render(<IndicatorIcon indicatorId="bp_dia_mmhg" />).container.querySelector('svg')!;
    expect(bp.innerHTML).toBe(marks[1]);
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
});
