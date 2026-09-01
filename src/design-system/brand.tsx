import './brand.css';

/**
 * Identidad de marca de FusionStructure y de sus módulos.
 *
 * El brandbook describe la marca madre como cuatro piezas estructurales
 * abiertas alrededor de un núcleo común, y la familia de herramientas como ese
 * mismo marco con un glifo funcional y un color de colección. Aquí vive la
 * implementación: una sola geometría, dibujada con `currentColor` para que
 * siga al tema en lugar de duplicarse en un archivo por tema.
 *
 * Los SVG estáticos de `public/assets/brand/` existen para lo que no puede
 * renderizar React —favicon, manifiesto, Open Graph— y comparten estos mismos
 * trazados.
 */

/** Las cuatro piezas del marco compartido, en la retícula de 48. */
const FRAME_PIECES = [
  'M4 5h15v7h-7v7H4z',
  'M29 5h15v14h-8v-7h-7z',
  'M4 29h8v7h7v8H4z',
  'M29 36h7v-7h8v15H29z',
] as const;

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
    <g fill="currentColor">{FRAME_PIECES.map((d) => <path key={d} d={d} />)}</g>
    <circle className="fs-mark__register" cx="39" cy="10" r="2.25" />
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
    <g className="fs-mark__frame">{FRAME_PIECES.map((d) => <path key={d} d={d} />)}</g>
    <g className="fs-mark__glyph" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className="fs-mark__datum" d="M13 19h22" />
      <path className="fs-mark__response" d="M13 19c6.5 0 8 13 11 13s4.5-13 11-13" />
    </g>
    <circle className="fs-mark__node" cx="13" cy="19" r="2.1" />
    <circle className="fs-mark__node" cx="35" cy="19" r="2.1" />
  </svg>
);
