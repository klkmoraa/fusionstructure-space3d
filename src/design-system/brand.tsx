import './brand.css';

/**
 * Identidad de marca de FusionStructure y de sus módulos.
 *
 * El brandbook describe la marca madre como una ménsula: un miembro vertical y
 * dos voladizos cuyo peralte decrece de 9u a 5u hacia la punta, la forma que
 * toma una sección dimensionada por el momento que recibe. Aquí vive la
 * implementación: una sola geometría, dibujada con `currentColor` para que siga
 * al tema en lugar de duplicarse en un archivo por tema.
 *
 * Un módulo no repite la marca madre: usa su glifo funcional dentro del mismo
 * contenedor, con el color de la colección.
 *
 * Los SVG estáticos de `public/assets/brand/` existen para lo que no puede
 * renderizar React —favicon, manifiesto, Open Graph— y salen del mismo origen,
 * `brandbook-site/scripts/glyph-library.mjs`.
 */

/** La ménsula, en la retícula de 48. */
const MARK_BODY = 'M8 5h9v38H8z M17 5h24v5.5L17 14z';

/** El voladizo medio: la única pieza que puede tomar el color de señal. */
const MARK_ARM = 'M17 21h17v5L17 30z';

export interface MarkProps {
  /** Lado en píxeles. La marca es cuadrada por construcción. */
  size?: number;
  /** Cuando la marca es el nombre accesible de algo, deja de ser decorativa. */
  label?: string;
  className?: string;
}

/**
 * Marca madre. El punto de registro es la única pieza con color propio: marca
 * la esquina desde la que se lee el conjunto.
 */
export const FusionMark = ({ size = 24, label, className }: MarkProps) => (
  <svg
    className={`fs-mark${className ? ` ${className}` : ''}`}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    <path fill="currentColor" d={MARK_BODY} />
    <path className="fs-mark__register" d={MARK_ARM} />
  </svg>
);

/**
 * Marca de FStructure, el solver 2D.
 *
 * El marco de familia queda en el color de la colección; dentro, el glifo dice
 * lo que hace el módulo con una sola figura: una barra recta —la geometría que
 * entras— y su deformada —la respuesta que devuelve—. Es la frase del brandbook
 * dibujada: *make complexity legible*.
 */
export const Solver2DMark = ({ size = 24, label, className }: MarkProps) => (
  <svg
    className={`fs-mark fs-mark--solver2d${className ? ` ${className}` : ''}`}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    focusable="false"
  >
    <rect className="fs-mark__frame" x="2" y="2" width="44" height="44" rx="11" />
    <g className="fs-mark__glyph" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className="fs-mark__datum" d="M13 19h22" />
      <path className="fs-mark__response" d="M13 19c6.5 0 8 13 11 13s4.5-13 11-13" />
    </g>
    <circle className="fs-mark__node" cx="13" cy="19" r="2.1" />
    <circle className="fs-mark__node" cx="35" cy="19" r="2.1" />
  </svg>
);
