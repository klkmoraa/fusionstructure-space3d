import type { Space3DAnalysisState } from '../../space3d/store/Space3DProjectContext';

export type Space3DWorkspaceMode = 'select' | 'node' | 'member' | 'support' | 'load' | 'results';
export type Space3DProductStatus = 'Disponible' | 'Experimental' | 'Planeado' | 'No comprometido';

export interface Space3DWorkspaceModeDefinition {
  readonly id: Space3DWorkspaceMode;
  readonly label: string;
  readonly shortcut: string;
  readonly status: Space3DProductStatus;
}

export const SPACE3D_WORKSPACE_MODES: readonly Space3DWorkspaceModeDefinition[] = Object.freeze([
  { id: 'select', label: 'Seleccionar', shortcut: 'V', status: 'Disponible' },
  { id: 'node', label: 'Nudo', shortcut: 'N', status: 'Disponible' },
  { id: 'member', label: 'Barra', shortcut: 'B', status: 'Disponible' },
  { id: 'support', label: 'Apoyo', shortcut: 'A', status: 'Disponible' },
  { id: 'load', label: 'Carga', shortcut: 'C', status: 'Disponible' },
  { id: 'results', label: 'Resultados', shortcut: 'R', status: 'Disponible' },
]);

export const getSpace3DModeAvailability = (
  mode: Space3DWorkspaceMode,
  analysisState: Space3DAnalysisState,
): { readonly enabled: boolean; readonly status: Space3DProductStatus } => ({
  enabled: mode !== 'results' || analysisState === 'ready',
  status: SPACE3D_WORKSPACE_MODES.find((item) => item.id === mode)?.status ?? 'No comprometido',
});

export interface Space3DMoreCommand {
  readonly id: string;
  readonly label: string;
  readonly status: Space3DProductStatus;
  readonly enabled: boolean;
}

export const getSpace3DMoreCommands = (): readonly Space3DMoreCommand[] => Object.freeze([
  { id: 'section-library', label: 'Biblioteca de secciones', status: 'Planeado', enabled: false },
  { id: 'distributed-loads', label: 'Cargas distribuidas', status: 'Planeado', enabled: false },
  { id: 'design-checks', label: 'Comprobaciones de diseño', status: 'Planeado', enabled: false },
]);
