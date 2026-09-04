/**
 * Entrada pública mínima del dominio Space3D para adaptadores externos.
 *
 * Mantiene los contratos espaciales detrás de un punto de entrada explícito;
 * los adaptadores no alcanzan su modelo ni sus stores por rutas internas.
 */
export {
  SPACE3D_ANALYSIS_SPACE,
  SPACE3D_SCHEMA_VERSION,
  freeSpace3DRestraints,
} from './model/types';

export type {
  Space3DEntityKind,
  Space3DFrameMember,
  Space3DLoadCombination,
  Space3DNodalLoad,
  Space3DNode,
  Space3DProjectV1,
  Space3DRestraints,
  Space3DVector,
} from './model/types';
