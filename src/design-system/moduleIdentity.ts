/**
 * Identidad del módulo Plano.
 *
 * Vive fuera de `brand.tsx` para que la hoja de marcas exporte sólo
 * componentes: es lo que necesita copy, título de documento y metadatos, y
 * cambiarlo aquí lo cambia en todas partes.
 */
/** Identidad del módulo, para copy, títulos de documento y metadatos. */
export const PLANO = {
  /** Nombre propio del módulo. Nunca se traduce. */
  name: 'Plano',
  /** Procedencia: la plataforma a la que pertenece. */
  product: 'FusionStructure',
  /** Rol dentro de la familia de herramientas del brandbook. */
  role: 'Solver 2D',
  /** Bloque completo para un título de ventana o un encabezado de documento. */
  lockup: 'FusionStructure Plano',
} as const;
