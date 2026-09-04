import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { analyzeSpace3DProject } from './engine/solver';
import { buildSpaceFrameElement } from './engine/element';
import { buildMemberOrientation } from './engine/orientation';
import { axialCantilever } from './engine/fixtures';
import type { Space3DAnalysisResult } from './model/types';
import { parseSpace3DProject, serializeSpace3DProject, Space3DCodecError } from './data/codec';
import { loadSpace3DProject, saveSpace3DProject, space3dStorageKeys } from './data/storage';
import { handleSpace3DWorkerRequest, SPACE3D_PROTOCOL_VERSION } from './runtime/protocol';
import { installSpace3DWorker, type Space3DWorkerScope } from './runtime/space3d.worker';
import { Space3DAnalysisCancelledError, Space3DWorkerClient, type WorkerLike } from './runtime/workerClient';
import {
  availableSpace3DCorpus,
  evaluateSpace3DInvariant,
  inspectSpace3DFreeMemberRigidBodyModes,
  readSpace3DAssertion,
  serializeSpace3DResult,
  space3dCorpus,
  unsupportedSpace3DCapabilities,
  space3dCorpusAssertionMatches,
  SPACE3D_CORPUS_ALGORITHM_ID,
  SPACE3D_CORPUS_ENGINE_ID,
  SPACE3D_CORPUS_SCHEMA,
  SPACE3D_CORPUS_TOLERANCES,
  SPACE3D_RUNTIME_CONTRACT,
} from './compatibilityCorpus';

describe('direct Space3D compatibility corpus', () => {
  it('keeps post-baseline manifest and artifact digests stable', () => {
    const root = resolve(import.meta.dirname, '..', '..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'migration', 'space3d-compatibility-manifest.json'), 'utf8')) as { schemaVersion: number; corpusId: string; baseline: string; task2Cut: string; units: string; coordinateConvention: string; schema: string; engineId: string; algorithmId: string; tolerances: typeof SPACE3D_CORPUS_TOLERANCES; caseCount: number; availableCaseCount: number; unsupportedCaseCount: number; cases: Array<{ id: string; status: string; capability: string; oracle: string }>; runtimeContract: typeof SPACE3D_RUNTIME_CONTRACT; claims: { maturity: string; normativeOrCertificationClaim: boolean; solverAlgorithmModified: boolean; unsupportedCapabilitiesFaked: boolean }; artifacts: Array<{ path: string; sha256: string }> };
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.corpusId).toBe('fusionstructure-direct-space3d/v1');
    expect(manifest.baseline).toBe('5955722');
    expect(manifest.task2Cut).toBe('94aa5cb');
    expect(manifest.caseCount).toBe(space3dCorpus.length);
    expect(manifest.availableCaseCount).toBe(availableSpace3DCorpus.length);
    expect(manifest.unsupportedCaseCount).toBe(unsupportedSpace3DCapabilities.length);
    expect(manifest.units).toContain('kN-m');
    expect(manifest.coordinateConvention).toContain('[ux,uy,uz,rx,ry,rz]');
    expect(manifest.schema).toBe(SPACE3D_CORPUS_SCHEMA);
    expect(manifest.engineId).toBe(SPACE3D_CORPUS_ENGINE_ID);
    expect(manifest.algorithmId).toBe(SPACE3D_CORPUS_ALGORITHM_ID);
    expect(manifest.tolerances).toEqual(SPACE3D_CORPUS_TOLERANCES);
    expect(manifest.cases).toHaveLength(space3dCorpus.length);
    for (const fixture of space3dCorpus) {
      expect(manifest.cases.find((item) => item.id === fixture.id)).toEqual({ id: fixture.id, status: fixture.status, capability: fixture.capability, oracle: fixture.oracle });
    }
    expect(manifest.runtimeContract).toEqual(SPACE3D_RUNTIME_CONTRACT);
    expect(manifest.claims).toEqual({ maturity: 'experimental', normativeOrCertificationClaim: false, solverAlgorithmModified: false, unsupportedCapabilitiesFaked: false });
    for (const artifact of manifest.artifacts) {
      const digest = createHash('sha256').update(readFileSync(resolve(root, artifact.path))).digest('hex');
      expect(digest, artifact.path).toBe(artifact.sha256);
    }
  });

  it('executes every case against literal independent assertions and invariants', () => {
    expect(space3dCorpus.length).toBeGreaterThanOrEqual(9);
    for (const fixture of availableSpace3DCorpus) {
      const result = analyzeSpace3DProject(fixture.project(), fixture.targetId);
      for (const assertion of fixture.assertions) {
        const actual = readSpace3DAssertion(result, assertion.target);
        expect(space3dCorpusAssertionMatches(actual, assertion), `${fixture.id}/${assertion.id}`).toBe(true);
      }
      expect(fixture.invariants.length, `${fixture.id} invariants`).toBeGreaterThan(0);
      for (const invariant of fixture.invariants) {
        expect(evaluateSpace3DInvariant(fixture.project(), result, invariant), `${fixture.id}/${invariant.id}`).toBe(true);
      }
    }
  });

  it('does not advertise unsupported Space3D capabilities', () => {
    expect(unsupportedSpace3DCapabilities.map((item) => item.id)).toEqual([
      'releases', 'springs', 'member-loads', 'diaphragms', 'dynamics', 'stability', 'nonlinear',
    ]);
    for (const item of unsupportedSpace3DCapabilities) {
      expect(item.status).toBe('unsupported');
      expect(item.algorithmId).toBe('not-implemented');
      expect(item.assertions).toHaveLength(0);
    }
  });

  it('assembles the local twelve-DOF frame with independent stiffness coefficients', () => {
    const project = axialCantilever({ E: 200_000_000, G: 80_000_000, A: 0.01, Iy: 3e-5, Iz: 8e-5, J: 2e-5, L: 2 });
    const element = buildSpaceFrameElement(project.members[0], project.nodes[0], project.nodes[1]);
    expect(element.localStiffness[0][0]).toBe(1_000_000);
    expect(element.localStiffness[3][3]).toBeCloseTo(800, 10);
    expect(element.localStiffness[1][1]).toBeCloseTo(24_000, 10);
    expect(element.localStiffness[2][2]).toBeCloseTo(9_000, 10);
    expect(element.localStiffness[0][6]).toBe(-1_000_000);
  });

  it('builds a right-handed local basis and rejects a near-degenerate reference', () => {
    const basis = buildMemberOrientation([0, 0, 0], [1, 1, 0], { localYReferenceGlobal: [0, 0, 1], rollRadians: 0 });
    expect(basis.x[0]).toBeCloseTo(Math.SQRT1_2, 14);
    expect(basis.x[1]).toBeCloseTo(Math.SQRT1_2, 14);
    expect(basis.z[0]).toBeCloseTo(Math.SQRT1_2, 14);
    expect(basis.z[1]).toBeCloseTo(-Math.SQRT1_2, 14);
    expect(() => buildMemberOrientation([0, 0, 0], [1, 0, 0], { localYReferenceGlobal: [1, 1e-10, 0], rollRadians: 0 })).toThrow('orientation-reference-parallel');
  });

  it('round-trips strict codec data and rejects unknown fields', () => {
    const project = axialCantilever();
    const encoded = serializeSpace3DProject(project);
    expect(parseSpace3DProject(encoded)).toEqual(project);
    const raw = JSON.parse(encoded) as Record<string, unknown>;
    raw.unexpected = true;
    expect(() => parseSpace3DProject(JSON.stringify(raw))).toThrowError(Space3DCodecError);
    expect(() => parseSpace3DProject(JSON.stringify(raw))).toThrow('unknown-field');
  });

  it('fails closed on a pre-v1 payload instead of silently migrating semantics', () => {
    const raw = JSON.parse(serializeSpace3DProject(axialCantilever())) as Record<string, unknown>;
    raw.schemaVersion = 0;
    expect(() => parseSpace3DProject(JSON.stringify(raw))).toThrow('schema-version');
  });

  it('keeps a valid previous primary in backup and recovers after corruption', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const first = axialCantilever({ P: 10 });
    const second = axialCantilever({ P: 20 });
    expect(saveSpace3DProject(first, storage, 'corpus')).toBe(true);
    expect(saveSpace3DProject(second, storage, 'corpus')).toBe(true);
    const keys = space3dStorageKeys('corpus');
    values.set(keys.primary, '{corrupt');
    expect(loadSpace3DProject(storage, 'corpus')?.nodalLoads[0].fx).toBe(10);
  });

  it('keeps the worker-module protocol seam through an explicit scope harness identical to main-thread results', () => {
    const project = axialCantilever({ P: 10 });
    const direct = analyzeSpace3DProject(project, 'CO1');
    const posted: unknown[] = [];
    let receive: ((event: MessageEvent<unknown>) => void) | undefined;
    const scope: Space3DWorkerScope = { addEventListener: (_type, listener) => { receive = listener; }, postMessage: (message) => posted.push(structuredClone(message)) };
    installSpace3DWorker(scope);
    receive?.({ data: structuredClone({ protocolVersion: SPACE3D_PROTOCOL_VERSION, type: 'run', requestId: 7, project, targetId: 'CO1' }) } as MessageEvent<unknown>);
    const response = posted[0] as { type: string; result?: Space3DAnalysisResult };
    expect(response.type).toBe('success');
    if (response.type === 'success') expect(serializeSpace3DResult(response.result!)).toBe(serializeSpace3DResult(direct));
    expect(handleSpace3DWorkerRequest({ protocolVersion: 99, type: 'run', requestId: 8, project, targetId: 'CO1' })).toMatchObject({ type: 'error', code: 'PROTOCOL_MISMATCH', requestId: 8 });
  });

  it('auto-installs only a dedicated-worker global, never a window-like self, while the explicit installer remains usable', async () => {
    class DedicatedWorkerGlobalScopeShim {
      installs = 0;
      addEventListener(_type: 'message', _listener: (event: MessageEvent<unknown>) => void): void { this.installs += 1; }
      postMessage(_message: unknown): void {}
    }
    const windowLike = {
      installs: 0,
      document: {},
      addEventListener: (_type: 'message', _listener: (event: MessageEvent<unknown>) => void) => { windowLike.installs += 1; },
      postMessage: (_message: unknown) => {},
    };

    vi.resetModules();
    vi.stubGlobal('DedicatedWorkerGlobalScope', DedicatedWorkerGlobalScopeShim);
    vi.stubGlobal('self', windowLike);
    try {
      await import('./runtime/space3d.worker');
      expect(windowLike.installs).toBe(0);

      vi.resetModules();
      const dedicatedWorker = new DedicatedWorkerGlobalScopeShim();
      vi.stubGlobal('self', dedicatedWorker);
      const workerModule = await import('./runtime/space3d.worker');
      expect(dedicatedWorker.installs).toBe(1);

      let explicitScopeInstalled = false;
      const explicitScope: Space3DWorkerScope = {
        addEventListener: (_type, _listener) => { explicitScopeInstalled = true; },
        postMessage: (_message) => {},
      };
      workerModule.installSpace3DWorker(explicitScope);
      expect(explicitScopeInstalled).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('records the six literal global rigid-body modes against local element stiffness separately from the mechanism diagnostic', () => {
    const fixture = availableSpace3DCorpus.find((item) => item.id === 'free-structure')!;
    const project = fixture.project();
    const result = analyzeSpace3DProject(project, fixture.targetId);
    const invariant = fixture.invariants.find((item) => item.id === 'six-global-rigid-body-modes-annihilate-local-stiffness');
    expect(fixture.oracle).toBe('independent 12-DOF local-stiffness null-space check: three global translations and three infinitesimal global rotations about (0,0,0), transformed to local DOFs');
    expect(invariant).toMatchObject({
      kind: 'local-stiffness-rigid-body-null-modes',
      origin: [0, 0, 0],
      modeIds: ['translation-x', 'translation-y', 'translation-z', 'rotation-x', 'rotation-y', 'rotation-z'],
      maxResidual: 1e-8,
    });
    if (!invariant) return;
    const proofs = inspectSpace3DFreeMemberRigidBodyModes(project, [0, 0, 0]);
    expect(proofs).not.toBeNull();
    if (!proofs) return;
    expect(proofs.map(({ id, globalDisplacement }) => ({ id, globalDisplacement }))).toEqual([
      { id: 'translation-x', globalDisplacement: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] },
      { id: 'translation-y', globalDisplacement: [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
      { id: 'translation-z', globalDisplacement: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
      { id: 'rotation-x', globalDisplacement: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0] },
      { id: 'rotation-y', globalDisplacement: [0, 0, 0, 0, 1, 0, 0, 0, -2, 0, 1, 0] },
      { id: 'rotation-z', globalDisplacement: [0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 1] },
    ]);
    for (const proof of proofs) {
      expect(proof.maxResidual, proof.id).toBeLessThanOrEqual(1e-8);
      expect(proof.localResidual.every((value) => Math.abs(value) <= 1e-8), proof.id).toBe(true);
    }
    expect(evaluateSpace3DInvariant(project, result, invariant)).toBe(true);
    expect(result.issues.map((issue) => issue.code)).toEqual(['mechanism']);
  });

  it('cancels a pending run at the public client seam', async () => {
    const workers: Array<{ worker: WorkerLike; message?: (event: { data: unknown }) => void; terminated: boolean }> = [];
    const factory = () => {
      const record = { terminated: false, worker: undefined as unknown as WorkerLike, message: undefined as ((event: { data: unknown }) => void) | undefined };
      record.worker = { postMessage: () => {}, terminate: () => { record.terminated = true; }, addEventListener: (type, listener) => { if (type === 'message') record.message = listener; }, removeEventListener: () => {} };
      workers.push(record);
      return record.worker;
    };
    const client = new Space3DWorkerClient(factory);
    const pending = client.run(axialCantilever(), 'CO1');
    client.cancel();
    await expect(pending).rejects.toBeInstanceOf(Space3DAnalysisCancelledError);
    expect(workers[0].terminated).toBe(true);
    const next = client.run(axialCantilever({ P: 20 }), 'CO1');
    let settled = false;
    void next.then(() => { settled = true; });
    workers[1].message?.({ data: { requestId: 1, type: 'success', protocolVersion: 1, result: analyzeSpace3DProject(axialCantilever(), 'CO1') } });
    await Promise.resolve();
    expect(settled).toBe(false);
    workers[1].message?.({ data: { requestId: 2, type: 'success', protocolVersion: 1, result: analyzeSpace3DProject(axialCantilever({ P: 20 }), 'CO1') } });
    await expect(next).resolves.toMatchObject({ success: true });
  });

  it('uses near-zero tolerance and remains mutation-sensitive', () => {
    const assertion = availableSpace3DCorpus.find((item) => item.id === 'axial')!.assertions.find((item) => item.id === 'end-rotation')!;
    expect(space3dCorpusAssertionMatches(5e-11, assertion)).toBe(true);
    expect(space3dCorpusAssertionMatches(5e-9, assertion)).toBe(false);
    const original = analyzeSpace3DProject(axialCantilever({ P: 10 }), 'CO1');
    const mutated = axialCantilever({ P: 10 });
    (mutated.nodalLoads[0] as { fx: number }).fx = 11;
    expect(serializeSpace3DResult(original)).not.toBe(serializeSpace3DResult(analyzeSpace3DProject(mutated, 'CO1')));
  });
});
