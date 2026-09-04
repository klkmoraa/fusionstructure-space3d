/**
 * Corpus directo de compatibilidad de Space 3D.
 *
 * Las entradas son casos ejecutables, no snapshots generados por el solver.
 * Las magnitudes esperadas son literales derivadas de las ecuaciones de barra
 * y voladizo Euler-Bernoulli indicadas en `oracle`; el corpus no llama a ningún
 * helper numérico del motor para construir sus expectativas.
 */
import { axialCantilever, bendingCantilever, freeFloatingMember, torsionCantilever } from './engine/fixtures';
import { buildSpaceFrameElement } from './engine/element';
import type { Space3DAnalysisResult, Space3DProjectV1, Space3DVector } from './model/types';
import { SPACE3D_PROTOCOL_VERSION } from './runtime/protocol';

export const SPACE3D_CORPUS_SCHEMA = 'fusionstructure-space3d-result/v1' as const;
export const SPACE3D_CORPUS_ENGINE_ID = 'fusionstructure-space3d' as const;
export const SPACE3D_CORPUS_ALGORITHM_ID = 'space-frame-euler-bernoulli-linear-v1' as const;
export const SPACE3D_CORPUS_TOLERANCES = Object.freeze({ absolute: 1e-9, relative: 1e-8, nearZero: 1e-10, equilibriumNormalized: 1e-7 });
export const SPACE3D_RUNTIME_CONTRACT = Object.freeze({
  workerProtocolVersion: SPACE3D_PROTOCOL_VERSION,
  supported: ['run', 'structured errors', 'requestId stale-response rejection', 'worker-module message seam through explicit scope harness', 'DedicatedWorkerGlobalScope-only production auto-install', 'real terminate cancellation', 'inline fallback message delivery'] as const,
  unsupported: ['progress events', 'cooperative cancellation inside a numerical loop', 'automatic pre-v1 storage migration; pre-v1 payloads are rejected fail-closed', 'browser DedicatedWorkerGlobalScope execution in Vitest'] as const,
});

export interface Space3DCorpusAssertion {
  readonly id: string;
  readonly target: string;
  readonly expected: number | boolean | string;
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly nearZeroTolerance: number;
}

export type Space3DRigidBodyModeId =
  | 'translation-x'
  | 'translation-y'
  | 'translation-z'
  | 'rotation-x'
  | 'rotation-y'
  | 'rotation-z';

export interface Space3DRigidBodyModeProof {
  readonly id: Space3DRigidBodyModeId;
  /** Vector global de 12 GDL, `[u_i, r_i, u_j, r_j]`. */
  readonly globalDisplacement: readonly number[];
  /** Residual local `K_local · (T · r_global)`. */
  readonly localResidual: readonly number[];
  readonly maxResidual: number;
}

export type Space3DCorpusInvariant =
  | { readonly id: string; readonly kind: 'equilibrium'; readonly max: number }
  | { readonly id: string; readonly kind: 'success'; readonly expected: boolean }
  | { readonly id: string; readonly kind: 'deterministic-issues'; readonly expectedCodes: readonly string[] }
  | {
    readonly id: string;
    readonly kind: 'local-stiffness-rigid-body-null-modes';
    readonly origin: Space3DVector;
    readonly modeIds: readonly Space3DRigidBodyModeId[];
    readonly maxResidual: number;
  };

export interface Space3DCorpusCase {
  readonly id: string;
  readonly status: 'available' | 'unsupported';
  readonly capability: string;
  readonly units: 'kN-m';
  readonly coordinateAssumptions: string;
  readonly schema: typeof SPACE3D_CORPUS_SCHEMA;
  readonly engineId: typeof SPACE3D_CORPUS_ENGINE_ID;
  readonly algorithmId: typeof SPACE3D_CORPUS_ALGORITHM_ID | 'not-implemented';
  readonly oracle: string;
  readonly targetId: string;
  readonly project: () => Space3DProjectV1;
  readonly assertions: readonly Space3DCorpusAssertion[];
  readonly invariants: readonly Space3DCorpusInvariant[];
}

const TOLERANCES = Object.freeze({ absoluteTolerance: SPACE3D_CORPUS_TOLERANCES.absolute, relativeTolerance: SPACE3D_CORPUS_TOLERANCES.relative, nearZeroTolerance: SPACE3D_CORPUS_TOLERANCES.nearZero });
const assertion = (id: string, target: string, expected: number | boolean | string): Space3DCorpusAssertion => ({ ...TOLERANCES, id, target, expected });
const equilibrium = { id: '6d-equilibrium', kind: 'equilibrium' as const, max: 1e-7 };
const success = { id: 'analysis-success', kind: 'success' as const, expected: true };

interface RigidBodyModeDefinition {
  readonly id: Space3DRigidBodyModeId;
  readonly translation: Space3DVector;
  readonly rotation: Space3DVector;
}

/**
 * Seis movimientos de cuerpo rígido independientes en ejes globales. Las
 * rotaciones son infinitesimales: `u(p) = t + ω × (p - origin)` y `r(p) = ω`.
 */
const rigidBodyModeDefinitions: readonly RigidBodyModeDefinition[] = Object.freeze([
  Object.freeze({ id: 'translation-x', translation: [1, 0, 0] as Space3DVector, rotation: [0, 0, 0] as Space3DVector }),
  Object.freeze({ id: 'translation-y', translation: [0, 1, 0] as Space3DVector, rotation: [0, 0, 0] as Space3DVector }),
  Object.freeze({ id: 'translation-z', translation: [0, 0, 1] as Space3DVector, rotation: [0, 0, 0] as Space3DVector }),
  Object.freeze({ id: 'rotation-x', translation: [0, 0, 0] as Space3DVector, rotation: [1, 0, 0] as Space3DVector }),
  Object.freeze({ id: 'rotation-y', translation: [0, 0, 0] as Space3DVector, rotation: [0, 1, 0] as Space3DVector }),
  Object.freeze({ id: 'rotation-z', translation: [0, 0, 0] as Space3DVector, rotation: [0, 0, 1] as Space3DVector }),
]);

const cross = (left: Space3DVector, right: Space3DVector): Space3DVector => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];

const matrixVectorProduct = (matrix: readonly (readonly number[])[], vector: readonly number[]): readonly number[] =>
  matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));

const globalNodeRigidBodyDofs = (
  node: Space3DProjectV1['nodes'][number],
  origin: Space3DVector,
  mode: RigidBodyModeDefinition,
): readonly number[] => {
  const relativePosition: Space3DVector = [node.x - origin[0], node.y - origin[1], node.z - origin[2]];
  const rotationDisplacement = cross(mode.rotation, relativePosition);
  return Object.freeze([
    mode.translation[0] + rotationDisplacement[0],
    mode.translation[1] + rotationDisplacement[1],
    mode.translation[2] + rotationDisplacement[2],
    mode.rotation[0], mode.rotation[1], mode.rotation[2],
  ]);
};

/**
 * Evidencia directa para un miembro libre aislado, sin resolver cargas ni
 * volver a llamar al solver: transforma cada modo global y calcula
 * `K_local · u_local` sobre los 12 GDL del elemento.
 */
export const inspectSpace3DFreeMemberRigidBodyModes = (
  project: Space3DProjectV1,
  origin: Space3DVector,
): readonly Space3DRigidBodyModeProof[] | null => {
  if (project.nodes.length !== 2 || project.members.length !== 1) return null;
  if (!project.nodes.every((node) => Object.values(node.restraints).every((restrained) => restrained === false))) return null;
  const member = project.members[0];
  const nodeI = project.nodes.find((node) => node.id === member.i);
  const nodeJ = project.nodes.find((node) => node.id === member.j);
  if (!nodeI || !nodeJ || nodeI.id === nodeJ.id) return null;

  const element = buildSpaceFrameElement(member, nodeI, nodeJ);
  return Object.freeze(rigidBodyModeDefinitions.map((mode) => {
    const globalDisplacement = Object.freeze([
      ...globalNodeRigidBodyDofs(nodeI, origin, mode),
      ...globalNodeRigidBodyDofs(nodeJ, origin, mode),
    ]);
    const localDisplacement = matrixVectorProduct(element.transformation, globalDisplacement);
    const localResidual = Object.freeze([...matrixVectorProduct(element.localStiffness, localDisplacement)]);
    return Object.freeze({
      id: mode.id,
      globalDisplacement,
      localResidual,
      maxResidual: Math.max(...localResidual.map(Math.abs)),
    });
  }));
};

const makeOblique = (): Space3DProjectV1 => {
  const base = axialCantilever({ P: 10 });
  return {
    ...base,
    id: 'space3d-oblique',
    nodes: [base.nodes[0], { ...base.nodes[1], x: Math.SQRT2, y: Math.SQRT2 }],
    members: [{ ...base.members[0], orientation: { localYReferenceGlobal: [0, 0, 1], rollRadians: 0 } }],
    nodalLoads: [{ ...base.nodalLoads[0], fx: 10 / Math.SQRT2, fy: 10 / Math.SQRT2 }],
  };
};

const makeRigidRotation = (): Space3DProjectV1 => {
  const base = axialCantilever({ P: 10 });
  return {
    ...base,
    id: 'space3d-rigid-rotation',
    nodes: [base.nodes[0], { ...base.nodes[1], x: 0, y: 2 }],
    members: [{ ...base.members[0], orientation: { localYReferenceGlobal: [0, 0, 1], rollRadians: 0 } }],
    nodalLoads: [{ ...base.nodalLoads[0], fx: 0, fy: 10 }],
  };
};

const makeCombination = (): Space3DProjectV1 => {
  const base = axialCantilever({ P: 10 });
  return {
    ...base,
    id: 'space3d-combination',
    nodalLoads: [
      { ...base.nodalLoads[0], id: 'L1', caseId: 'LC1', fx: 10 },
      { ...base.nodalLoads[0], id: 'L2', caseId: 'LC2', fx: 4 },
    ],
    loadCases: [{ id: 'LC1', name: 'LC1' }, { id: 'LC2', name: 'LC2' }],
    loadCombinations: [{ id: 'CO1', name: '0.5 LC1 + 2 LC2', terms: [{ caseId: 'LC1', factor: 0.5 }, { caseId: 'LC2', factor: 2 }] }],
  };
};

const makeNearDegenerate = (): Space3DProjectV1 => {
  const base = axialCantilever({ P: 10 });
  return { ...base, id: 'space3d-near-degenerate-orientation', members: [{ ...base.members[0], orientation: { localYReferenceGlobal: [1, 1e-10, 0], rollRadians: 0 } }] };
};

const available = (entry: Omit<Space3DCorpusCase, 'status' | 'schema' | 'engineId' | 'algorithmId'>): Space3DCorpusCase => ({
  ...entry, status: 'available', schema: SPACE3D_CORPUS_SCHEMA, engineId: SPACE3D_CORPUS_ENGINE_ID, algorithmId: SPACE3D_CORPUS_ALGORITHM_ID,
});

export const availableSpace3DCorpus: readonly Space3DCorpusCase[] = Object.freeze([
  available({ id: 'axial', capability: 'axial member', units: 'kN-m', coordinateAssumptions: 'global X is member axis; positive fx tensions J', oracle: 'closed form ux=P L/(E A), reactions and N from static equilibrium', targetId: 'CO1', project: () => axialCantilever({ P: 10 }), assertions: [assertion('end-axial-displacement', 'node.J.displacement.ux', 1e-5), assertion('support-axial-reaction', 'node.I.reaction.ux', -10), assertion('end-axial-force', 'member.M1.end.N', 10), assertion('end-rotation', 'node.J.displacement.rz', 0)], invariants: [success, equilibrium] }),
  available({ id: 'torsion', capability: 'torsion', units: 'kN-m', coordinateAssumptions: 'global X is member axis; positive mx is positive local torsion', oracle: 'closed form rx=T L/(G J) and moment equilibrium', targetId: 'CO1', project: () => torsionCantilever({ T: 10 }), assertions: [assertion('end-twist', 'node.J.displacement.rx', 0.0125), assertion('support-torsion-reaction', 'node.I.reaction.rx', -10), assertion('end-torsion', 'member.M1.end.T', 10)], invariants: [success, equilibrium] }),
  available({ id: 'local-y-bending', capability: 'local Y bending (v-rz, Iz)', units: 'kN-m', coordinateAssumptions: 'member X axis, local Y equals global Y; positive fy and rz', oracle: 'closed form v=P L^3/(3 E Iz), rz=P L^2/(2 E Iz), fixed-end equilibrium', targetId: 'CO1', project: () => bendingCantilever({ axis: 'y', P: 10 }), assertions: [assertion('tip-v', 'node.J.displacement.uy', 1 / 600), assertion('tip-rz', 'node.J.displacement.rz', 0.00125), assertion('fixed-v-reaction', 'node.I.reaction.uy', -10), assertion('fixed-moment', 'node.I.reaction.rz', -20)], invariants: [success, equilibrium] }),
  available({ id: 'local-z-bending', capability: 'local Z bending (w-ry, Iy)', units: 'kN-m', coordinateAssumptions: 'member X axis, local Z equals global Z; positive fz induces negative ry', oracle: 'closed form w=P L^3/(3 E Iy), ry=-P L^2/(2 E Iy), fixed-end equilibrium', targetId: 'CO1', project: () => bendingCantilever({ axis: 'z', P: 10 }), assertions: [assertion('tip-w', 'node.J.displacement.uz', 0.004444444444444444), assertion('tip-ry', 'node.J.displacement.ry', -0.0033333333333333335), assertion('fixed-z-reaction', 'node.I.reaction.uz', -10), assertion('fixed-my-reaction', 'node.I.reaction.ry', 20)], invariants: [success, equilibrium] }),
  available({ id: 'oblique-member', capability: 'oblique member', units: 'kN-m', coordinateAssumptions: 'J=(sqrt(2),sqrt(2),0) m; load is axial P along member', oracle: 'rotate axial closed form into global components; N and strain are invariant', targetId: 'CO1', project: makeOblique, assertions: [assertion('global-ux', 'node.J.displacement.ux', 7.071067811865476e-6), assertion('global-uy', 'node.J.displacement.uy', 7.071067811865476e-6), assertion('axial-force', 'member.M1.end.N', 10)], invariants: [success, equilibrium] }),
  available({ id: 'rigid-coordinate-rotation', capability: 'rigid coordinate rotation', units: 'kN-m', coordinateAssumptions: 'base axial case rotated +90 degrees about global Z; orientation and load rotate together', oracle: 'rigid-body invariance of axial displacement magnitude and force', targetId: 'CO1', project: makeRigidRotation, assertions: [assertion('rotated-displacement', 'node.J.displacement.uy', 1e-5), assertion('rotated-reaction', 'node.I.reaction.uy', -10), assertion('rotated-axial-force', 'member.M1.end.N', 10)], invariants: [success, equilibrium] }),
  available({ id: 'combination', capability: 'load combination superposition', units: 'kN-m', coordinateAssumptions: 'same axial geometry; CO1 = 0.5 LC1 + 2 LC2', oracle: 'linear superposition: P=0.5(10)+2(4)=13 kN then axial closed form', targetId: 'CO1', project: makeCombination, assertions: [assertion('combined-displacement', 'node.J.displacement.ux', 1.3e-5), assertion('combined-reaction', 'node.I.reaction.ux', -13), assertion('combined-force', 'member.M1.end.N', 13)], invariants: [success, equilibrium] }),
  available({ id: 'free-structure', capability: 'free structure mechanism', units: 'kN-m', coordinateAssumptions: 'same member with all six DOFs free at both nodes', oracle: 'independent 12-DOF local-stiffness null-space check: three global translations and three infinitesimal global rotations about (0,0,0), transformed to local DOFs', targetId: 'CO1', project: () => freeFloatingMember({ P: 10 }), assertions: [assertion('analysis-fails', 'success', false), assertion('mechanism-code', 'issues.0.code', 'mechanism')], invariants: [
    { id: 'analysis-fails-invariant', kind: 'success', expected: false },
    { id: 'literal-diagnostic-sequence', kind: 'deterministic-issues', expectedCodes: ['mechanism'] },
    {
      id: 'six-global-rigid-body-modes-annihilate-local-stiffness',
      kind: 'local-stiffness-rigid-body-null-modes',
      origin: [0, 0, 0] as const,
      modeIds: ['translation-x', 'translation-y', 'translation-z', 'rotation-x', 'rotation-y', 'rotation-z'] as const,
      maxResidual: 1e-8,
    },
  ] }),
  available({ id: 'near-degenerate-orientation', capability: 'near-degenerate orientation rejection', units: 'kN-m', coordinateAssumptions: 'reference [1,1e-10,0] is nearly parallel to member X', oracle: 'independent geometric perpendicularity ratio below 1e-8 threshold', targetId: 'CO1', project: makeNearDegenerate, assertions: [assertion('analysis-fails', 'success', false), assertion('orientation-code', 'issues.0.code', 'degenerate-orientation')], invariants: [{ id: 'analysis-fails-invariant', kind: 'success', expected: false }, { id: 'literal-diagnostic-sequence', kind: 'deterministic-issues', expectedCodes: ['degenerate-orientation'] }] }),
]);

const unsupported = (id: string, capability: string): Space3DCorpusCase => ({ id, capability, status: 'unsupported', units: 'kN-m', coordinateAssumptions: 'not applicable', schema: SPACE3D_CORPUS_SCHEMA, engineId: SPACE3D_CORPUS_ENGINE_ID, algorithmId: 'not-implemented', oracle: 'none: no executable implementation or independent result contract', targetId: '', project: () => axialCantilever(), assertions: [], invariants: [] });
export const unsupportedSpace3DCapabilities: readonly Space3DCorpusCase[] = Object.freeze([
  unsupported('releases', 'member releases'), unsupported('springs', 'springs'), unsupported('member-loads', 'member loads'), unsupported('diaphragms', 'diaphragms'), unsupported('dynamics', 'dynamics'), unsupported('stability', 'stability/buckling'), unsupported('nonlinear', 'nonlinear analysis'),
]);
export const space3dCorpus: readonly Space3DCorpusCase[] = Object.freeze([...availableSpace3DCorpus, ...unsupportedSpace3DCapabilities]);

const valueAt = (source: unknown, target: string): unknown => target.split('.').reduce<unknown>((value, key, index, parts) => {
  if (index === 0 && key === 'node' && parts[1] && typeof value === 'object' && value !== null) {
    const node = (value as Space3DAnalysisResult).nodeResults.find((item) => item.nodeId === parts[1]);
    return node;
  }
  if (index === 0 && key === 'member' && parts[1] && typeof value === 'object' && value !== null) {
    const member = (value as Space3DAnalysisResult).memberResults.find((item) => item.memberId === parts[1]);
    return member;
  }
  if ((parts[0] === 'node' || parts[0] === 'member') && index === 1) return value;
  if (Array.isArray(value)) return value[Number(key)];
  if (typeof value === 'object' && value !== null) return (value as Record<string, unknown>)[key];
  return undefined;
}, source);

export const readSpace3DAssertion = (result: Space3DAnalysisResult, target: string): unknown => valueAt(result, target);

export const space3dCorpusAssertionMatches = (actual: unknown, expected: Space3DCorpusAssertion): boolean => {
  if (typeof expected.expected !== 'number') return actual === expected.expected;
  if (typeof actual !== 'number' || !Number.isFinite(actual)) return false;
  const difference = Math.abs(actual - expected.expected);
  if (difference <= expected.nearZeroTolerance && Math.abs(expected.expected) <= expected.nearZeroTolerance) return true;
  return difference <= expected.absoluteTolerance || difference <= expected.relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected.expected));
};

export const evaluateSpace3DInvariant = (project: Space3DProjectV1, result: Space3DAnalysisResult, invariant: Space3DCorpusInvariant): boolean => {
  if (invariant.kind === 'equilibrium') return result.success && result.diagnostics.equilibrium.normalized <= invariant.max;
  if (invariant.kind === 'success') return result.success === invariant.expected;
  if (invariant.kind === 'deterministic-issues') return result.issues.map((item) => item.code).join('|') === invariant.expectedCodes.join('|') && result.nodeResults.length === 0 && result.memberResults.length === 0;
  const proofs = inspectSpace3DFreeMemberRigidBodyModes(project, invariant.origin);
  return proofs !== null
    && proofs.length === invariant.modeIds.length
    && proofs.every((proof, index) => proof.id === invariant.modeIds[index] && proof.maxResidual <= invariant.maxResidual);
};

const canonicalize = (value: unknown): unknown => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Math.abs(value) <= 1e-12) return 0;
    return Number(value.toPrecision(12));
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  return value;
};

export const serializeSpace3DResult = (result: Space3DAnalysisResult): string => JSON.stringify(canonicalize(result));
