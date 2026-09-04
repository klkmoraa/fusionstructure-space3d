/**
 * Serialized integration contract consumed by the standalone Space 3D app.
 *
 * The adapter that creates this snapshot lives in the FusionStructure
 * governance/host repository. Keeping the consumer contract here means the
 * extracted product never imports the 2D model or store.
 */
import type { Space3DEntityKind, Space3DProjectV1 } from '../space3d/public';

export const PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION = 1 as const;

export type Planar2DToSpace3DSourceEntityKind =
  | Space3DEntityKind
  | 'member-load'
  | 'prescribed-displacement'
  | 'initial-effect'
  | 'node-link'
  | 'multi-point-constraint'
  | 'nodal-mass'
  | 'generated-load-source'
  | 'moving-load-case';

export interface Planar2DSourceReference {
  readonly system: 'solver2d';
  readonly projectId: string;
  readonly schemaVersion: number;
  readonly hash: { readonly algorithm: 'fnv1a-32'; readonly value: string };
  readonly reference: string;
}

export interface Planar2DToSpace3DMapping {
  readonly id: string;
  readonly source: { readonly entityKind: Planar2DToSpace3DSourceEntityKind; readonly entityId: string };
  readonly target: { readonly entityKind: Space3DEntityKind; readonly entityId: string } | null;
  readonly disposition: 'preserved' | 'transformed' | 'omitted';
}

export type Space3DBridgeCode =
  | 'pending-shear-modulus' | 'pending-weak-axis-inertia' | 'pending-torsion-constant'
  | 'out-of-plane-unrestrained' | 'truss-member-as-frame' | 'dropped-member-release'
  | 'dropped-internal-hinge' | 'dropped-semi-rigid-connection' | 'dropped-rigid-offset'
  | 'dropped-support-spring' | 'dropped-inclined-support' | 'dropped-prescribed-support-motion'
  | 'dropped-member-load' | 'dropped-prescribed-displacement' | 'dropped-initial-effect'
  | 'dropped-node-link' | 'dropped-multi-point-constraint' | 'dropped-nodal-mass'
  | 'dropped-generated-load-source' | 'dropped-moving-load-case';

export type Space3DLossClassification = 'missing-required-property' | 'missing-required-configuration' | 'changed-semantics' | 'omitted-semantics';

export interface Space3DBridgeNote {
  readonly id: string;
  readonly code: Space3DBridgeCode;
  readonly classification: Space3DLossClassification;
  readonly source: { readonly entityKind: Planar2DToSpace3DSourceEntityKind; readonly entityId: string; readonly field: string };
  readonly target: { readonly entityKind: Space3DEntityKind; readonly entityId: string; readonly field: string } | null;
  readonly entityKind: Planar2DToSpace3DSourceEntityKind;
  readonly entityId: string;
  readonly field: string;
  readonly blocking: boolean;
}

export interface Planar2DToSpace3DLossReport {
  readonly status: 'lossless' | 'review-required';
  readonly entries: readonly Space3DBridgeNote[];
}

export interface Planar2DToSpace3DHandoffV1 {
  readonly kind: 'planar-2d-to-space3d-handoff';
  readonly version: typeof PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION;
  readonly handoffId: string;
  readonly source: Planar2DSourceReference;
  readonly candidateModel: Space3DProjectV1;
  readonly mapping: readonly Planar2DToSpace3DMapping[];
  readonly provenance: {
    readonly adapter: 'fusionstructure/integrations/planar2d-to-space3d';
    readonly sourceReference: string;
    readonly candidateSchemaVersion: number;
  };
  readonly lossReport: Planar2DToSpace3DLossReport;
}

export interface Planar2DToSpace3DHandoffCancellationV1 {
  readonly kind: 'planar-2d-to-space3d-handoff-cancellation';
  readonly version: typeof PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION;
  readonly status: 'cancelled';
  readonly handoffId: string;
  readonly sourceReference: string;
  readonly reason: 'user-cancelled-before-open';
}

export interface Planar2DSourceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly candidateModel: Space3DProjectV1;
  readonly lossReport: Planar2DToSpace3DLossReport;
}

export const preparePlanar2DToSpace3DHandoff = (source: Planar2DSourceSnapshot): Planar2DToSpace3DHandoffV1 => {
  const reference = `solver2d:${source.id}:snapshot`;
  return {
    kind: 'planar-2d-to-space3d-handoff',
    version: PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION,
    handoffId: `handoff:${reference}`,
    source: { system: 'solver2d', projectId: source.id, schemaVersion: 7, hash: { algorithm: 'fnv1a-32', value: 'fixture' }, reference },
    candidateModel: source.candidateModel,
    mapping: [],
    provenance: { adapter: 'fusionstructure/integrations/planar2d-to-space3d', sourceReference: reference, candidateSchemaVersion: source.candidateModel.schemaVersion },
    lossReport: source.lossReport,
  };
};

export const cancelPlanar2DToSpace3DHandoff = (handoff: Planar2DToSpace3DHandoffV1): Planar2DToSpace3DHandoffCancellationV1 => ({
  kind: 'planar-2d-to-space3d-handoff-cancellation',
  version: PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION,
  status: 'cancelled',
  handoffId: handoff.handoffId,
  sourceReference: handoff.source.reference,
  reason: 'user-cancelled-before-open',
});

const PROPERTY_NOTES: Partial<Record<Space3DBridgeCode, 'G' | 'Iy' | 'J'>> = {
  'pending-shear-modulus': 'G',
  'pending-weak-axis-inertia': 'Iy',
  'pending-torsion-constant': 'J',
};

const positive = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export const unresolvedSpace3DBridgeNotes = (
  notes: readonly Space3DBridgeNote[],
  project: Space3DProjectV1,
  acknowledged: ReadonlySet<string>,
): readonly Space3DBridgeNote[] => notes.filter((item) => {
  if (!item.blocking) return false;
  const property = PROPERTY_NOTES[item.code];
  if (property) {
    const member = project.members.find((candidate) => candidate.id === item.entityId);
    return member ? !positive(member[property]) : false;
  }
  if (item.code === 'out-of-plane-unrestrained') {
    return project.nodes.length > 0 && !project.nodes.some((node) => node.restraints.uz || node.restraints.rx || node.restraints.ry);
  }
  return !acknowledged.has(item.code);
});

export const space3DMatchesPlanarHandoff = (project: Space3DProjectV1, handoff: Planar2DToSpace3DHandoffV1): boolean => {
  const candidate = handoff.candidateModel;
  if (project.id !== candidate.id) return false;
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  const members = new Map(project.members.map((member) => [member.id, member]));
  return candidate.nodes.every((node) => {
    const twin = nodes.get(node.id);
    return Boolean(twin && twin.x === node.x && twin.y === node.y && twin.z === node.z);
  }) && candidate.members.every((member) => {
    const twin = members.get(member.id);
    return Boolean(twin && twin.i === member.i && twin.j === member.j);
  });
};
