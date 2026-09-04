import { describe, expect, it } from 'vitest';

import { formatSpace3DNumber } from './space3dNumberFormat';

describe('Space 3D numeric presentation boundary', () => {
  it('keeps finite table values readable without importing the 2D formatter', () => {
    expect(formatSpace3DNumber(12.3456789)).toBe('12.3457');
    expect(formatSpace3DNumber(0)).toBe('0');
    expect(formatSpace3DNumber(-0)).toBe('0');
    expect(formatSpace3DNumber(1e-5)).toBe('1e-5');
    expect(formatSpace3DNumber(1e7)).toBe('1e+7');
  });

  it('does not turn unavailable solver values into a numeric claim', () => {
    expect(formatSpace3DNumber(Number.NaN)).toBe('—');
    expect(formatSpace3DNumber(Number.POSITIVE_INFINITY, { notAvailable: 'n/d' })).toBe('n/d');
    expect(formatSpace3DNumber(null)).toBe('—');
  });

  it('allows the workspace to request a narrower significant-digit reading', () => {
    expect(formatSpace3DNumber(123.456, { significantDigits: 4 })).toBe('123.5');
  });
});
