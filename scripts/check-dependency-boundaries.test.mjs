import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { checkDependencyBoundaries } from './check-dependency-boundaries.mjs';

const config = {
  schemaVersion: 1,
  rules: [{ id: 'fixture', scope: ['src/space3d'], forbidden: ['src/types.ts'], exceptions: [] }],
};

const fixtureRoot = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'fusionstructure-boundary-'));
  mkdirSync(resolve(root, 'src', 'space3d'), { recursive: true });
  mkdirSync(resolve(root, 'src'), { recursive: true });
  writeFileSync(resolve(root, 'src', 'types.ts'), 'export type ProjectModel = unknown;\n');
  writeFileSync(resolve(root, 'migration.json'), JSON.stringify(config));
  return root;
};

test('passes the committed Space3D and external handoff boundary configuration', () => {
  assert.deepEqual(checkDependencyBoundaries(), []);
});

test('reports a forbidden local import with a stable diagnostic code', () => {
  const root = fixtureRoot();
  writeFileSync(resolve(root, 'src', 'space3d', 'bad.ts'), "import type { ProjectModel } from '../types';\n");
  const diagnostics = checkDependencyBoundaries({ root, configPath: resolve(root, 'migration.json') });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'FSDEP-002');
  assert.equal(diagnostics[0].target, 'src/types.ts');
});

test('fails closed for non-literal dynamic imports', () => {
  const root = fixtureRoot();
  writeFileSync(resolve(root, 'src', 'space3d', 'dynamic.ts'), "const name = './types'; void import(name);\n");
  const diagnostics = checkDependencyBoundaries({ root, configPath: resolve(root, 'migration.json') });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'FSDEP-001');
});
