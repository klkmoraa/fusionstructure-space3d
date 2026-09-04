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

test('rejects archived Foundation and sibling-product dependencies outside test fixtures', () => {
  const root = fixtureRoot();
  const externalProductConfig = {
    schemaVersion: 1,
    rules: [{
      id: 'fixture-external-product-dependencies',
      scope: ['src'],
      forbiddenPackages: [
        '@fusionstructure/foundation',
        '@fusionstructure/fstructure',
        '@fusionstructure/web',
      ],
      packageJson: true,
      productionOnly: true,
      forbidOutsideRoot: true,
    }],
  };
  writeFileSync(resolve(root, 'migration.json'), JSON.stringify(externalProductConfig));
  writeFileSync(resolve(root, 'package.json'), JSON.stringify({
    dependencies: { '@fusionstructure/foundation': 'workspace:*' },
    devDependencies: { '@fusionstructure/fstructure': 'workspace:*' },
    optionalDependencies: { '@fusionstructure/web': 'workspace:*' },
  }));
  writeFileSync(resolve(root, 'src', 'space3d', 'foundation.ts'), "import '@fusionstructure/foundation/units';\n");
  writeFileSync(resolve(root, 'src', 'space3d', 'fstructure.tsx'), "import '@fusionstructure/fstructure/internal';\nexport const FStructure = () => null;\n");
  writeFileSync(resolve(root, 'src', 'space3d', 'web.ts'), "import '@fusionstructure/web/internal';\n");
  writeFileSync(resolve(root, 'src', 'space3d', 'external-product.fixture.test.ts'), "import '@fusionstructure/foundation/test-fixture';\n");
  mkdirSync(resolve(root, '..', 'fstructure', 'src'), { recursive: true });
  writeFileSync(resolve(root, '..', 'fstructure', 'src', 'internal.ts'), 'export const sibling = true;\n');
  writeFileSync(resolve(root, 'src', 'space3d', 'sibling.ts'), "import '../../../fstructure/src/internal';\n");

  const diagnostics = checkDependencyBoundaries({ root, configPath: resolve(root, 'migration.json') });

  assert.deepEqual(
    diagnostics.filter(({ code }) => code === 'FSDEP-004').map(({ dependency, section }) => `${section}:${dependency}`).sort(),
    [
      'dependencies:@fusionstructure/foundation',
      'devDependencies:@fusionstructure/fstructure',
      'optionalDependencies:@fusionstructure/web',
    ],
  );
  assert.deepEqual(
    diagnostics.filter(({ code }) => code === 'FSDEP-005').map(({ file, dependency }) => `${file}:${dependency}`).sort(),
    [
      'src/space3d/foundation.ts:@fusionstructure/foundation/units',
      'src/space3d/fstructure.tsx:@fusionstructure/fstructure/internal',
      'src/space3d/web.ts:@fusionstructure/web/internal',
    ],
  );
  assert.deepEqual(
    diagnostics.filter(({ code }) => code === 'FSDEP-006').map(({ file, dependency }) => `${file}:${dependency}`),
    ['src/space3d/sibling.ts:../../../fstructure/src/internal'],
  );
  assert.equal(diagnostics.some(({ file }) => file.endsWith('.fixture.test.ts')), false);
});

test('rejects npm, workspace, and file aliases to forbidden products in every dependency section', () => {
  const root = fixtureRoot();
  const externalProductConfig = {
    schemaVersion: 1,
    rules: [{
      id: 'fixture-external-product-dependencies',
      scope: ['src'],
      forbiddenPackages: [
        '@fusionstructure/foundation',
        '@fusionstructure/fstructure',
        '@fusionstructure/web',
      ],
      packageJson: true,
      productionOnly: true,
    }],
  };
  writeFileSync(resolve(root, 'migration.json'), JSON.stringify(externalProductConfig));
  writeFileSync(resolve(root, 'package.json'), JSON.stringify({
    dependencies: { foundationAlias: 'npm:@fusionstructure/foundation@^0.1.1' },
    devDependencies: { fstructureAlias: 'workspace:@fusionstructure/fstructure@*' },
    optionalDependencies: { webAlias: 'file:../fusionstructure-web' },
    peerDependencies: { foundationFileAlias: 'file:../foundation' },
  }));

  const diagnostics = checkDependencyBoundaries({ root, configPath: resolve(root, 'migration.json') });

  assert.deepEqual(
    diagnostics.filter(({ code }) => code === 'FSDEP-004').map(({ dependency, section, target }) => `${section}:${dependency}:${target}`).sort(),
    [
      'dependencies:foundationAlias:npm:@fusionstructure/foundation@^0.1.1',
      'devDependencies:fstructureAlias:workspace:@fusionstructure/fstructure@*',
      'optionalDependencies:webAlias:file:../fusionstructure-web',
      'peerDependencies:foundationFileAlias:file:../foundation',
    ],
  );
});
