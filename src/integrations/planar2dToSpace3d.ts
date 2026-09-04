/**
 * Puente explícito del dominio plano 2D al dominio espacial S3D-1.
 *
 * Es un adaptador de una sola dirección y sin estado: lee un `ProjectModel` y
 * devuelve un `Space3DProjectV1` nuevo. Los dos dominios siguen separados —
 * ningún store se acopla, ningún solver se vuelve híbrido— y el proyecto 2D
 * nunca se toca.
 *
 * La regla que gobierna todo el archivo: **lo que el modelo plano no dice, no
 * se inventa**. Un marco 2D no contiene el eje débil, la torsión ni ninguna
 * restricción fuera del plano; rellenarlos con «valores razonables» produciría
 * un análisis espacial creíble y falso. En su lugar:
 *
 *   · las propiedades que faltan quedan en `0`, que el validador rechaza y el
 *     editor pide completar;
 *   · lo que no es un número (una celosía, un muelle, un apoyo inclinado) se
 *     publica como nota **bloqueante** que el usuario debe reconocer.
 *
 * Hasta que no quede ninguna nota sin resolver, la superficie no analiza.
 */
import {
  SPACE3D_ANALYSIS_SPACE,
  SPACE3D_SCHEMA_VERSION,
  freeSpace3DRestraints,
  type Space3DEntityKind,
  type Space3DFrameMember,
  type Space3DLoadCombination,
  type Space3DNodalLoad,
  type Space3DNode,
  type Space3DProjectV1,
  type Space3DRestraints,
  type Space3DVector,
} from '../space3d/public';
import type { MemberModel, NodeModel, ProjectModel } from '../solver2d/public';

export const SPACE3D_DERIVED_ID_PREFIX = 'space3d-from-';

export const derivedSpace3DId = (sourceProjectId: string): string => `${SPACE3D_DERIVED_ID_PREFIX}${sourceProjectId}`;

export const PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION = 1 as const;

/**
 * Interruptor temporal de rollback para una sola release. Por defecto la
 * propuesta externa está activa; `false` abre Space3D sin entregar candidato.
 * Retirar junto con la siguiente release estable del handoff.
 */
export const EXTERNAL_2D_TO_3D_HANDOFF_FLAG = 'VITE_FUSION_EXTERNAL_2D_TO_3D_HANDOFF' as const;

export const isExternal2DTo3DHandoffEnabled = (
  value: string | undefined = import.meta.env[EXTERNAL_2D_TO_3D_HANDOFF_FLAG],
): boolean => value !== 'false';

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
  readonly hash: {
    readonly algorithm: 'fnv1a-32';
    readonly value: string;
  };
  readonly reference: string;
}

export interface Planar2DToSpace3DMapping {
  readonly id: string;
  readonly source: {
    readonly entityKind: Planar2DToSpace3DSourceEntityKind;
    readonly entityId: string;
  };
  readonly target: {
    readonly entityKind: Space3DEntityKind;
    readonly entityId: string;
  } | null;
  readonly disposition: 'preserved' | 'transformed' | 'omitted';
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
    readonly candidateSchemaVersion: typeof SPACE3D_SCHEMA_VERSION;
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

const canonicalValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(record[key])}`).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return JSON.stringify(String(value));
  if (typeof value === 'undefined') return 'undefined';
  return JSON.stringify(value);
};

const fnv1a32 = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const sourceReferenceOf = (source: ProjectModel): Planar2DSourceReference => {
  const hash = fnv1a32(canonicalValue(source));
  return {
    system: 'solver2d',
    projectId: source.id,
    schemaVersion: source.schemaVersion,
    hash: { algorithm: 'fnv1a-32', value: hash },
    reference: `solver2d:${source.id}:fnv1a-32:${hash}`,
  };
};

const preservedMapping = (
  sourceKind: Planar2DToSpace3DSourceEntityKind,
  sourceId: string,
  targetKind: Space3DEntityKind,
  targetId: string,
): Planar2DToSpace3DMapping => ({
  id: `${sourceKind}:${sourceId}->${targetKind}:${targetId}`,
  source: { entityKind: sourceKind, entityId: sourceId },
  target: { entityKind: targetKind, entityId: targetId },
  disposition: 'preserved',
});

const transformedMapping = (
  sourceKind: Planar2DToSpace3DSourceEntityKind,
  sourceId: string,
  targetKind: Space3DEntityKind,
  targetId: string,
): Planar2DToSpace3DMapping => ({
  ...preservedMapping(sourceKind, sourceId, targetKind, targetId),
  disposition: 'transformed',
});

const omittedMapping = (
  sourceKind: Planar2DToSpace3DSourceEntityKind,
  sourceId: string,
): Planar2DToSpace3DMapping => ({
  id: `${sourceKind}:${sourceId}->none`,
  source: { entityKind: sourceKind, entityId: sourceId },
  target: null,
  disposition: 'omitted',
});

const mappedEntities = (source: ProjectModel, candidate: Space3DProjectV1): readonly Planar2DToSpace3DMapping[] => [
  preservedMapping('project', source.id, 'project', candidate.id),
  ...source.nodes.map((node) => preservedMapping('node', node.id, 'node', node.id)),
  ...source.members.map((member) => transformedMapping('member', member.id, 'member', member.id)),
  ...source.nodalLoads.map((load) => preservedMapping('load', load.id, 'load', load.id)),
  ...source.loadCases.map((loadCase) => preservedMapping('case', loadCase.id, 'case', loadCase.id)),
  ...source.combinations.map((combination) => preservedMapping('combination', combination.id, 'combination', combination.id)),
  ...(source.memberLoads ?? []).map((load) => omittedMapping('load', load.id)),
  ...(source.prescribedDisplacements ?? []).map((item) => omittedMapping('prescribed-displacement', item.id)),
  ...(source.memberInitialEffects ?? []).map((item) => omittedMapping('initial-effect', item.id)),
  ...(source.nodeLinks ?? []).map((item) => omittedMapping('node-link', item.id)),
  ...(source.multiPointConstraints ?? []).map((item) => omittedMapping('multi-point-constraint', item.id)),
  ...(source.nodalMasses ?? []).map((item) => omittedMapping('nodal-mass', item.id)),
  ...(source.generatedLoadSources ?? []).map((item) => omittedMapping('generated-load-source', item.id)),
  ...(source.movingLoadCases ?? []).map((item) => omittedMapping('moving-load-case', item.id)),
];

/**
 * Prepara una propuesta determinista y sin efectos laterales. El candidato no
 * entra a ningún store hasta que la superficie confirme que desea abrirlo.
 */
export const preparePlanar2DToSpace3DHandoff = (source: ProjectModel): Planar2DToSpace3DHandoffV1 => {
  const bridge = deriveSpace3DFromPlanarProject(source);
  const sourceReference = sourceReferenceOf(source);
  return {
    kind: 'planar-2d-to-space3d-handoff',
    version: PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION,
    handoffId: `handoff:${sourceReference.reference}`,
    source: sourceReference,
    candidateModel: bridge.project,
    mapping: mappedEntities(source, bridge.project),
    provenance: {
      adapter: 'fusionstructure/integrations/planar2d-to-space3d',
      sourceReference: sourceReference.reference,
      candidateSchemaVersion: SPACE3D_SCHEMA_VERSION,
    },
    lossReport: {
      status: bridge.notes.length === 0 ? 'lossless' : 'review-required',
      entries: bridge.notes,
    },
  };
};

/** La cancelación deja una decisión serializable, sin persistir ni mutar el candidato. */
export const cancelPlanar2DToSpace3DHandoff = (
  handoff: Planar2DToSpace3DHandoffV1,
): Planar2DToSpace3DHandoffCancellationV1 => ({
  kind: 'planar-2d-to-space3d-handoff-cancellation',
  version: PLANAR_2D_TO_SPACE3D_HANDOFF_VERSION,
  status: 'cancelled',
  handoffId: handoff.handoffId,
  sourceReference: handoff.source.reference,
  reason: 'user-cancelled-before-open',
});

export type Space3DBridgeCode =
  /** Datos que S3D-1 necesita y el plano no puede aportar: se dejan a cero. */
  | 'pending-shear-modulus'
  | 'pending-weak-axis-inertia'
  | 'pending-torsion-constant'
  /** Semántica que S3D-1 no representa: se declara y el usuario la reconoce. */
  | 'out-of-plane-unrestrained'
  | 'truss-member-as-frame'
  | 'dropped-member-release'
  | 'dropped-internal-hinge'
  | 'dropped-semi-rigid-connection'
  | 'dropped-rigid-offset'
  | 'dropped-support-spring'
  | 'dropped-inclined-support'
  | 'dropped-prescribed-support-motion'
  | 'dropped-member-load'
  | 'dropped-prescribed-displacement'
  | 'dropped-initial-effect'
  | 'dropped-node-link'
  | 'dropped-multi-point-constraint'
  | 'dropped-nodal-mass'
  | 'dropped-generated-load-source'
  | 'dropped-moving-load-case';

export type Space3DLossClassification =
  | 'missing-required-property'
  | 'missing-required-configuration'
  | 'changed-semantics'
  | 'omitted-semantics';

export interface Space3DBridgeNote {
  /** Stable within a handoff version; safe for acknowledgement and UI keys. */
  readonly id: string;
  readonly code: Space3DBridgeCode;
  readonly classification: Space3DLossClassification;
  readonly source: {
    readonly entityKind: Planar2DToSpace3DSourceEntityKind;
    readonly entityId: string;
    readonly field: string;
  };
  readonly target: {
    readonly entityKind: Space3DEntityKind;
    readonly entityId: string;
    readonly field: string;
  } | null;
  /** Campos conservados para que el resolvedor de requisitos siga ser puro. */
  readonly entityKind: Planar2DToSpace3DSourceEntityKind;
  readonly entityId: string;
  readonly field: string;
  /** Una nota bloqueante impide analizar hasta que se resuelve o se reconoce. */
  readonly blocking: boolean;
}

export interface Space3DBridgeResult {
  readonly project: Space3DProjectV1;
  readonly notes: readonly Space3DBridgeNote[];
}

/** Notas cuya resolución es un número que el usuario escribe en el editor. */
const PROPERTY_NOTES: Record<string, keyof Pick<Space3DFrameMember, 'G' | 'Iy' | 'J'>> = {
  'pending-shear-modulus': 'G',
  'pending-weak-axis-inertia': 'Iy',
  'pending-torsion-constant': 'J',
};

const positive = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const restraintsOf = (node: NodeModel): Space3DRestraints => {
  const support = node.support;
  const base = freeSpace3DRestraints();
  switch (support.type) {
    case 'fixed': return { ...base, ux: true, uy: true, rz: true };
    case 'pin': return { ...base, ux: true, uy: true };
    case 'roller': return { ...base, uy: true };
    case 'custom': return {
      ...base,
      ux: support.restrainX === true,
      uy: support.restrainY === true,
      rz: support.restrainR === true,
    };
    default: return base;
  }
};

/**
 * Referencia del eje local `y` para un miembro contenido en el plano global XY.
 *
 * `[0, 1, 0]` —el valor por defecto de S3D-1— es paralelo a cualquier pilar
 * vertical y degeneraría su triada. La perpendicular dentro del plano,
 * `ẑ_global × x̂`, existe siempre para un miembro plano y hace que `Iz` gobierne
 * exactamente la misma flexión que gobernaba `I` en 2D.
 */
const planarLocalYReference = (start: NodeModel, end: NodeModel): Space3DVector => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length === 0) return [0, 1, 0];
  // ẑ × x̂ = (-x̂_y, x̂_x, 0)
  return [-dy / length, dx / length, 0];
};

export const deriveSpace3DFromPlanarProject = (source: ProjectModel): Space3DBridgeResult => {
  const notes: Space3DBridgeNote[] = [];
  const classificationFor = (code: Space3DBridgeCode): Space3DLossClassification => {
    if (code === 'pending-shear-modulus' || code === 'pending-weak-axis-inertia' || code === 'pending-torsion-constant') {
      return 'missing-required-property';
    }
    if (code === 'out-of-plane-unrestrained') return 'missing-required-configuration';
    if (code === 'truss-member-as-frame') return 'changed-semantics';
    return 'omitted-semantics';
  };
  const note = (
    code: Space3DBridgeCode,
    entityKind: Planar2DToSpace3DSourceEntityKind,
    entityId: string,
    field: string,
    blocking = true,
  ) => {
    const classification = classificationFor(code);
    const target = classification === 'omitted-semantics'
      ? null
      : {
        entityKind: entityKind as Space3DEntityKind,
        entityId: entityKind === 'project' ? derivedSpace3DId(source.id) : entityId,
        field,
      };
    notes.push({
      id: `${code}:${entityKind}:${entityId}:${field}`,
      code,
      classification,
      source: { entityKind, entityId, field },
      target,
      entityKind,
      entityId,
      field,
      blocking,
    });
  };

  const nodes: Space3DNode[] = source.nodes.map((node) => {
    const support = node.support;
    if (support.spring && Object.values(support.spring).some((value) => typeof value === 'number' && value !== 0)) {
      note('dropped-support-spring', 'node', node.id, 'support.spring');
    }
    if (typeof support.angleDeg === 'number' && support.angleDeg % 180 !== 0 && support.type !== 'none') {
      note('dropped-inclined-support', 'node', node.id, 'support.angleDeg');
    }
    if (support.prescribed && Object.values(support.prescribed).some((value) => typeof value === 'number' && value !== 0)) {
      note('dropped-prescribed-support-motion', 'node', node.id, 'support.prescribed');
    }
    if (node.internalHinge) note('dropped-internal-hinge', 'node', node.id, 'internalHinge');

    return { id: node.id, x: node.x, y: node.y, z: 0, restraints: restraintsOf(node) };
  });

  const nodeById = new Map(source.nodes.map((node) => [node.id, node]));

  const members: Space3DFrameMember[] = source.members.map((member: MemberModel) => {
    if (member.type === 'truss') note('truss-member-as-frame', 'member', member.id, 'type');
    if (member.releases?.iMoment || member.releases?.jMoment) note('dropped-member-release', 'member', member.id, 'releases');
    if (typeof member.rotationalSpringI === 'number' || typeof member.rotationalSpringJ === 'number') {
      note('dropped-semi-rigid-connection', 'member', member.id, 'rotationalSpring');
    }
    if (positive(member.rigidOffsetI) || positive(member.rigidOffsetJ)) {
      note('dropped-rigid-offset', 'member', member.id, 'rigidOffset');
    }

    // `G` sólo existe en modelos planos con teoría de Timoshenko. Sin ese dato
    // no hay forma autoritativa de deducirlo: haría falta el coeficiente de
    // Poisson, que el modelo 2D no guarda.
    const G = positive(member.G) ? member.G : 0;
    if (G === 0) note('pending-shear-modulus', 'member', member.id, 'G');
    note('pending-weak-axis-inertia', 'member', member.id, 'Iy');
    note('pending-torsion-constant', 'member', member.id, 'J');

    const start = nodeById.get(member.i);
    const end = nodeById.get(member.j);

    return {
      id: member.id,
      i: member.i,
      j: member.j,
      E: member.E,
      G,
      A: member.A,
      Iy: 0,
      Iz: member.I,
      J: 0,
      orientation: {
        localYReferenceGlobal: start && end ? planarLocalYReference(start, end) : [0, 1, 0],
        rollRadians: 0,
      },
    };
  });

  if (nodes.length > 0) note('out-of-plane-unrestrained', 'project', source.id, 'restraints');

  for (const load of source.memberLoads) note('dropped-member-load', 'load', load.id, 'memberLoads');
  for (const item of source.prescribedDisplacements ?? []) note('dropped-prescribed-displacement', 'prescribed-displacement', item.id, 'prescribedDisplacements');
  for (const item of source.memberInitialEffects ?? []) note('dropped-initial-effect', 'initial-effect', item.id, 'memberInitialEffects');
  for (const item of source.nodeLinks ?? []) note('dropped-node-link', 'node-link', item.id, 'nodeLinks');
  for (const item of source.multiPointConstraints ?? []) note('dropped-multi-point-constraint', 'multi-point-constraint', item.id, 'multiPointConstraints');
  for (const item of source.nodalMasses ?? []) note('dropped-nodal-mass', 'nodal-mass', item.id, 'nodalMasses');
  for (const item of source.generatedLoadSources ?? []) note('dropped-generated-load-source', 'generated-load-source', item.id, 'generatedLoadSources');
  for (const item of source.movingLoadCases ?? []) note('dropped-moving-load-case', 'moving-load-case', item.id, 'movingLoadCases');

  const nodalLoads: Space3DNodalLoad[] = source.nodalLoads
    .filter((load) => nodeById.has(load.nodeId))
    .map((load) => ({
      id: load.id,
      caseId: load.caseId,
      nodeId: load.nodeId,
      fx: load.fx,
      fy: load.fy,
      fz: 0,
      mx: 0,
      my: 0,
      // El momento plano gira alrededor del eje global Z, el mismo `mz` espacial.
      mz: load.mz,
    }));

  const loadCases = source.loadCases.map((item) => ({ id: item.id, name: item.name }));
  const caseIds = new Set(loadCases.map((item) => item.id));
  const loadCombinations: Space3DLoadCombination[] = source.combinations.map((combination) => ({
    id: combination.id,
    name: combination.name,
    terms: Object.entries(combination.factors)
      .filter(([caseId]) => caseIds.has(caseId))
      .map(([caseId, factor]) => ({ caseId, factor })),
  }));

  const project: Space3DProjectV1 = {
    analysisSpace: SPACE3D_ANALYSIS_SPACE,
    schemaVersion: SPACE3D_SCHEMA_VERSION,
    id: derivedSpace3DId(source.id),
    name: source.name,
    units: source.settings.units,
    nodes,
    members,
    nodalLoads,
    loadCases,
    loadCombinations,
  };

  return { project, notes };
};

/**
 * Notas todavía sin resolver contra el estado actual del proyecto espacial.
 *
 * Las de propiedad se resuelven solas en cuanto el valor deja de ser cero; la
 * de restricción fuera del plano, cuando algún nudo restringe `uz`, `rx` o `ry`.
 * Las demás describen una diferencia de comportamiento que ningún número
 * cancela, así que se resuelven por reconocimiento explícito del usuario.
 */
export const unresolvedSpace3DBridgeNotes = (
  notes: readonly Space3DBridgeNote[],
  project: Space3DProjectV1,
  acknowledged: ReadonlySet<string>,
): readonly Space3DBridgeNote[] => notes.filter((item) => {
  if (!item.blocking) return false;

  const property = PROPERTY_NOTES[item.code];
  if (property) {
    const member = project.members.find((candidate) => candidate.id === item.entityId);
    // Un miembro que ya no existe no deja nada pendiente.
    return member ? !positive(member[property]) : false;
  }

  if (item.code === 'out-of-plane-unrestrained') {
    if (project.nodes.length === 0) return false;
    return !project.nodes.some((node) => node.restraints.uz || node.restraints.rx || node.restraints.ry);
  }

  return !acknowledged.has(item.code);
});

/**
 * Comprueba el estado de trabajo contra el candidato entregado, no contra un
 * store ni una referencia viva 2D. Las entidades añadidas o completadas en 3D
 * son del usuario y no invalidan su procedencia.
 */
export const space3DMatchesPlanarHandoff = (
  project: Space3DProjectV1,
  handoff: Planar2DToSpace3DHandoffV1,
): boolean => {
  const candidate = handoff.candidateModel;
  if (project.id !== candidate.id) return false;

  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  for (const node of candidate.nodes) {
    const twin = nodeById.get(node.id);
    if (!twin || twin.x !== node.x || twin.y !== node.y || twin.z !== node.z) return false;
  }

  const memberById = new Map(project.members.map((member) => [member.id, member]));
  for (const member of candidate.members) {
    const twin = memberById.get(member.id);
    if (!twin || twin.i !== member.i || twin.j !== member.j) return false;
  }

  return true;
};
