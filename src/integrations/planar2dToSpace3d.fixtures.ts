import type { ProjectModel } from '../solver2d/public';

const settings = (): ProjectModel['settings'] => ({
  units: 'kN-m',
  language: 'es',
  gridSize: 1,
  snap: true,
  showGrid: true,
  showNodeLabels: true,
  showMemberLabels: false,
  showLocalAxes: false,
  showLoads: true,
  showDimensions: true,
  showResultValues: true,
  diagramScale: 1,
  deformedScale: 1,
  diagramSide: 'positive',
});

const baseProject = (id: string, name: string): ProjectModel => ({
  schemaVersion: 7,
  id,
  name,
  nodes: [],
  members: [],
  loadCases: [],
  combinations: [],
  nodalLoads: [],
  prescribedDisplacements: [],
  memberLoads: [],
  memberInitialEffects: [],
  nodeLinks: [],
  multiPointConstraints: [],
  nodalMasses: [],
  generatedLoadSources: [],
  movingLoadCases: [],
  settings: settings(),
});

/** A semantically empty 2D source has no information to lose on handoff. */
export const createLosslessPlanar2DFixture = (): ProjectModel => baseProject(
  'fixture-planar-lossless',
  'Fuente 2D sin entidades',
);

/** Exercises the explicit loss report with only supported 2D source fields. */
export const createLossyPlanar2DFixture = (): ProjectModel => ({
  ...baseProject('fixture-planar-lossy', 'Fuente 2D con revisión'),
  nodes: [
    {
      id: 'N1', x: 0, y: 0, internalHinge: true,
      support: {
        type: 'custom', restrainX: true, restrainY: true, restrainR: true,
        angleDeg: 30, spring: { kx: 12 }, prescribed: { ux: 0.002 },
      },
    },
    { id: 'N2', x: 4, y: 0, support: { type: 'none' } },
  ],
  members: [
    {
      id: 'M1', i: 'N1', j: 'N2', type: 'truss',
      materialId: 'steel-s355', materialOrigin: 'catalog', sectionId: 'ipe-200', sectionOrigin: 'catalog',
      E: 200_000_000, A: 0.01, I: 8e-5, beamTheory: 'timoshenko', shearArea: 0.008,
      releases: { iMoment: true }, rotationalSpringI: 0, rigidOffsetI: 0.2,
      axialBehavior: 'tension-only', density: 7850,
    },
  ],
  loadCases: [{ id: 'LC1', name: 'Servicio', category: 'variable', active: true, selfWeightFactor: 1 }],
  combinations: [{ id: 'CO1', name: 'Servicio', factors: { LC1: 1 }, source: 'Fixture', edition: '2026' }],
  nodalLoads: [{ id: 'NL1', caseId: 'LC1', nodeId: 'N2', fx: 0, fy: -10, mz: 0 }],
  prescribedDisplacements: [{ id: 'PD1', caseId: 'LC1', nodeId: 'N1', component: 'ux', value: 0.002 }],
  memberLoads: [{
    id: 'ML1', memberId: 'M1', caseId: 'LC1', type: 'distributed', coordinateSystem: 'global', lengthBasis: 'real',
    start: 0, end: 1, qyStart: -4, qyEnd: -4,
  }],
  memberInitialEffects: [{ id: 'IE1', memberId: 'M1', caseId: 'LC1', type: 'temperature', alpha: 0.000012, deltaT: 20 }],
  nodeLinks: [{ id: 'LINK1', nodeI: 'N1', behavior: 'linear', stiffness: 100 }],
  multiPointConstraints: [{ id: 'MPC1', terms: [{ nodeId: 'N1', component: 'ux', coefficient: 1 }] }],
  nodalMasses: [{ id: 'NM1', nodeId: 'N2', mass: 10 }],
  generatedLoadSources: [{ id: 'GL1', kind: 'prestress', caseId: 'LC1', memberIds: ['M1'], force: 30 }],
  movingLoadCases: [{
    id: 'MV1', name: 'Tren', memberIds: ['M1'], targetMemberId: 'M1', targetPosition: 0.5, quantity: 'M',
    axles: [{ id: 'A1', P: 10, offset: 0 }],
  }],
});
