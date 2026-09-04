/**
 * Numeric presentation owned by the Space 3D surface.
 *
 * Space 3D is extracted independently from the 2D application, so its UI
 * cannot import the 2D `utils/numberFormat` module.  This small adapter keeps
 * the existing table policy (six significant digits, scientific notation at
 * the same thresholds and an em dash for unavailable values) while the
 * neutral presentation package is published in a later migration phase.
 */

export interface Space3DNumberFormatOptions {
  readonly significantDigits?: number;
  readonly notAvailable?: string;
}

const DEFAULT_SIGNIFICANT_DIGITS = 6;
const SCIENTIFIC_BELOW = 1e-4;
const SCIENTIFIC_AT_OR_ABOVE = 1e7;

const clampSignificantDigits = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_SIGNIFICANT_DIGITS;
  return Math.min(21, Math.max(1, Math.trunc(value)));
};

const stripTrailingFractionZeros = (text: string): string => {
  if (!text.includes('.')) return text;
  return text.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
};

const scientificText = (value: number, significantDigits: number): string => {
  const [mantissa, rawExponent] = value.toExponential(significantDigits - 1).split('e');
  const exponent = Number(rawExponent);
  return `${stripTrailingFractionZeros(mantissa)}e${exponent >= 0 ? '+' : ''}${exponent}`;
};

export const formatSpace3DNumber = (
  value: number | undefined | null,
  options: Space3DNumberFormatOptions = {},
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return options.notAvailable ?? '—';
  if (value === 0) return '0';

  const significantDigits = clampSignificantDigits(options.significantDigits);
  const magnitude = Math.abs(value);
  if (magnitude < SCIENTIFIC_BELOW || magnitude >= SCIENTIFIC_AT_OR_ABOVE) {
    return scientificText(value, significantDigits);
  }

  const rounded = Number(value.toPrecision(significantDigits));
  const normalized = stripTrailingFractionZeros(String(rounded));
  return normalized === '-0' ? '0' : normalized;
};
