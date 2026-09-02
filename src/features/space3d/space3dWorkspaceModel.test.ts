import { describe, expect, it } from 'vitest';
import {
  SPACE3D_WORKSPACE_MODES,
  getSpace3DModeAvailability,
  getSpace3DMoreCommands,
} from './space3dWorkspaceModel';

describe('space3d workspace command model', () => {
  it('keeps the six primary modes in a stable order', () => {
    expect(SPACE3D_WORKSPACE_MODES.map((mode) => mode.id)).toEqual([
      'select', 'node', 'member', 'support', 'load', 'results',
    ]);
  });

  it('exposes result modes only for a current successful analysis', () => {
    expect(getSpace3DModeAvailability('results', 'idle')).toEqual({ enabled: false, status: 'Disponible' });
    expect(getSpace3DModeAvailability('results', 'stale')).toEqual({ enabled: false, status: 'Disponible' });
    expect(getSpace3DModeAvailability('results', 'ready')).toEqual({ enabled: true, status: 'Disponible' });
  });

  it('labels future commands as planned and disables them', () => {
    const future = getSpace3DMoreCommands().filter((command) => command.status === 'Planeado');
    expect(future.map((command) => command.id)).toEqual(['section-library', 'distributed-loads', 'design-checks']);
    expect(future.every((command) => !command.enabled)).toBe(true);
  });
});
