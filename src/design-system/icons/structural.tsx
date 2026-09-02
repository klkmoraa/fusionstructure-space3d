/**
 * Shared structural glyphs used by the production tool surface.
 * Generic interface icons come from lucide-react.
 */
import type { SVGProps } from 'react';

export interface StructuralGlyphProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const base = (size: number | undefined, rest: SVGProps<SVGSVGElement>) => ({
  width: size ?? 22,
  height: size ?? 22,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  ...strokeProps,
  ...rest,
});

export const NodeGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <circle cx="12" cy="12" r="5.2" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

/* Los nudos de estos glifos se rellenaban con `var(--surface)`, el papel del
   panel. En la tecla elegida del riel, que invierte a tinta, ese relleno se
   quedaba con el color de FUERA y dejaba dos agujeros claros dentro de una
   pieza oscura —o al revés en Noche—. `--sc-color-surface-inverse` sigue a la
   tecla: es el papel del plano sobre el que el glifo se está dibujando. */
export const MemberGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M5.5 17.5 18.5 6.5" />
    <circle cx="5.5" cy="17.5" r="2.2" fill="var(--sc-glyph-hole, var(--sc-color-surface-1))" />
    <circle cx="18.5" cy="6.5" r="2.2" fill="var(--sc-glyph-hole, var(--sc-color-surface-1))" />
  </svg>
);

export const SupportGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <circle cx="12" cy="5.2" r="2" fill="var(--sc-glyph-hole, var(--sc-color-surface-1))" />
    <path d="m12 7.3-6.1 8.1h12.2L12 7.3Z" />
    <path d="M4.7 18.2h14.6M6.5 20.8l2-2.6m3 2.6 2-2.6m3 2.6 2-2.6" />
  </svg>
);

export const SplitMemberGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M4 17.6 10.2 12M13.8 12 20 6.4" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <path d="M12 5.4v2.4M12 16.2v2.4" strokeDasharray="2 2.4" />
  </svg>
);

export const SectionCutGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M3.6 14.6h6.8M13.6 14.6h6.8" />
    <path d="M13 4.6 9.6 19.4" strokeDasharray="3 2.6" />
    <path d="m6.2 11.2-1.8 3.4 1.8 3.2M17.8 11.2l1.8 3.4-1.8 3.2" />
  </svg>
);

export const DimensionGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M4 6.2v11.6m16-11.6v11.6M5.2 12h13.6" />
    <path d="m8 9.3-2.8 2.8L8 14.8m8-5.5 2.8 2.8-2.8 2.7" />
  </svg>
);

export const PointLoadGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M12 3.5v12.2" />
    <path d="m8.5 12.2 3.5 3.5 3.5-3.5" />
    <path d="M5 20.2h14" />
  </svg>
);

export const DistributedLoadGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M4 5.2h16M5.8 5.2v10.2m6.2-10.2v10.2m6.2-10.2v10.2" />
    <path d="m3.8 12.8 2 2.6 2-2.6m2.2 0 2 2.6 2-2.6m2.2 0 2 2.6 2-2.6" />
    <path d="M3.2 19.6h17.6" />
  </svg>
);

export const MomentLoadGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M17.8 7.1A7 7 0 1 0 18.9 15" />
    <path d="m18.1 3.8-.3 3.3-3.3-.3" />
  </svg>
);

/**
 * Entrada por coordenadas: los dos ejes del lienzo, las dos proyecciones
 * punteadas y el punto que definen. Es un glifo propio y no uno genérico de
 * lucide porque nombra una acción que sólo existe aquí —escribir un punto en
 * vez de picarlo—, y tiene que distinguirse de la mira del lector de
 * coordenadas, que informa y no hace nada.
 */
export const CoordinateEntryGlyph = ({ size, ...rest }: StructuralGlyphProps) => (
  <svg {...base(size, rest)}>
    <path d="M4.6 4.6v14.8h14.8" />
    <path d="M15.4 19.4v-6.8h-6.8" strokeDasharray="2 2.2" />
    <circle cx="15.4" cy="12.6" r="2.1" fill="currentColor" stroke="none" />
    <path d="M8.6 4.6h2.2M8.6 8.2h2.2" />
  </svg>
);
