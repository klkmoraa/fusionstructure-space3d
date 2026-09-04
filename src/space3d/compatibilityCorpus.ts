/**
 * Corpus directo de compatibilidad de Space 3D.
 *
 * Las entradas son casos ejecutables, no snapshots generados por el solver.
 * Las magnitudes esperadas son literales derivadas de las ecuaciones de barra
 * y voladizo Euler-Bernoulli indicadas en `oracle`; el corpus no llama a ningún
 * helper numérico del motor para construir sus expectativas.
 */
import { analyzeSpace3DProject } from './engine/solver';
import { axialCantilever, bendingCantilever, freeFloatingMember, torsionCantilever } from './engine/fixtures';
import type { Space3DAnalysisResult, Space3DProjectV1 } from './model/types';

export const SPACE3D_CORPUS_SCHEMA = 'fusionstructure-space3d-result/v1' as const;
export const SPACE3D_CORPUS_ENGINE_ID = 'fusionstructure-space3d' as const;
export const SPACE3D_CORPUS_ALGORITHM_ID = 'space-frame-euler-bernoulli-linear-v1' as const;

export interface Space3DCorpusAssertion {
  readonly id: string;
  readonly target: string;
  readonly expected: number | boolean | string;
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly nearZeroTolerance: number;
}

export type Space3DCorpusInvariant =
  | { readonly id: string; readonly kind: 'equilibrium'; readonly max: number }
  | { readonly id: string; readonly kind: 'success'; readonly expected: boolean }
  | { readonly id: string; readonly kind: 'deterministic-issues' };

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

const TOLERANCES = Object.freeze({ absoluteTolerance: 1e-9, relativeTolerance: 1e-8, nearZeroTolerance: 1e-10 });
const assertion = (id: string, target: string, expected: number | boolean | string): Space3DCorpusAssertion => ({ ...TOLERANCES, id, target, expected });
const equilibrium = { id: '6d-equilibrium', kind: 'equilibrium' as const, max: 1e-7 };
const success = { id: 'analysis-success', kind: 'success' as const, expected: true };

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
  available({ id: 'free-structure', capability: 'free structure mechanism', units: 'kN-m', coordinateAssumptions: 'same member with all six DOFs free at both nodes', oracle: 'independent rigid-body stability check: six unconstrained modes', targetId: 'CO1', project: () => freeFloatingMember({ P: 10 }), assertions: [assertion('analysis-fails', 'success', false), assertion('mechanism-code', 'issues.0.code', 'mechanism')], invariants: [{ id: 'analysis-fails-invariant', kind: 'success', expected: false }, { id: 'deterministic-diagnostics', kind: 'deterministic-issues' }] }),
  available({ id: 'near-degenerate-orientation', capability: 'near-degenerate orientation rejection', units: 'kN-m', coordinateAssumptions: 'reference [1,1e-10,0] is nearly parallel to member X', oracle: 'independent geometric perpendicularity ratio below 1e-8 threshold', targetId: 'CO1', project: makeNearDegenerate, assertions: [assertion('analysis-fails', 'success', false), assertion('orientation-code', 'issues.0.code', 'degenerate-orientation')], invariants: [{ id: 'analysis-fails-invariant', kind: 'success', expected: false }, { id: 'deterministic-diagnostics', kind: 'deterministic-issues' }] }),
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
  return JSON.stringify(result.issues) === JSON.stringify(analyzeSpace3DProject(project, result.targetId).issues);
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
