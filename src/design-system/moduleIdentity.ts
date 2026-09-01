/**
 * Identidad del solver 2D.
 *
 * Vive fuera de `brand.tsx` para que la hoja de marcas exporte sólo
 * componentes: es lo que necesita copy, título de documento y metadatos, y
 * cambiarlo aquí lo cambia en todas partes.
 *
 * El identificador nombra el SLOT (`SOLVER_2D`), no la marca. Renombrar el
 * módulo es editar estos cuatro valores; el resto del código no se entera.
 */

/** Identidad del módulo, para copy, títulos de documento y metadatos. */
export const SOLVER_2D = {
  /** Nombre propio del módulo. Nunca se traduce. */
  name: 'FStructure',
  /** Procedencia: la plataforma a la que pertenece. */
  product: 'FusionStructure',
  /** Rol dentro de la familia de herramientas del brandbook. */
  role: 'Solver 2D',
  /** Bloque completo para un título de ventana o un encabezado de documento. */
  lockup: 'FStructure · Solver 2D',
} as const;
