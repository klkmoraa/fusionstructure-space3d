import type { Space3DBridgeNote, Planar2DSourceSnapshot } from './planar2dToSpace3d';
import type { Space3DProjectV1 } from '../space3d/model/types';

const candidate = (): Space3DProjectV1 => ({
  analysisSpace: 'space-3d', schemaVersion: 1, id: 'fixture-planar-lossy', name: 'Fuente 2D con revisión', units: 'kN-m',
  nodes: [
    { id: 'N1', x: 0, y: 0, z: 0, restraints: { ux: true, uy: true, uz: false, rx: false, ry: false, rz: true } },
    { id: 'N2', x: 4, y: 0, z: 0, restraints: { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false } },
  ],
  members: [{ id: 'M1', i: 'N1', j: 'N2', E: 200_000_000, G: 0, A: 0.01, Iy: 0, Iz: 8e-5, J: 0, orientation: { localYReferenceGlobal: [0, 1, 0], rollRadians: 0 } }],
  nodalLoads: [], loadCases: [], loadCombinations: [],
});

const note: Space3DBridgeNote = {
  id: 'dropped-member-load:load:ML1:memberLoads', code: 'dropped-member-load', classification: 'omitted-semantics',
  source: { entityKind: 'load', entityId: 'ML1', field: 'memberLoads' }, target: null,
  entityKind: 'load', entityId: 'ML1', field: 'memberLoads', blocking: true,
};

export const createLossyPlanar2DFixture = (): Planar2DSourceSnapshot => ({
  id: 'fixture-planar-lossy', name: 'Fuente 2D con revisión', candidateModel: candidate(),
  lossReport: { status: 'review-required', entries: [note] },
});
