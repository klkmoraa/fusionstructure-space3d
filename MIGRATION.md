# FusionStructure Space 3D

This repository is the first independently buildable product extracted from
`klkmoraa/FusionStructure`.

## Provenance

- Source repository: `https://github.com/klkmoraa/FusionStructure`
- Cutover tag: `monolith-cutover-20260904`
- Cutover commit: `700a0365352245a1db61f6938fd1bcd72f812fa7`
- Extraction tool: `git-filter-repo 2.47.0`
- Extraction model: path allowlist from the annotated cutover tag; no history
  rewrite was performed on the source repository.
- Status: experimental; this is not certified structural software.

The compatibility corpus remains in `src/space3d` and is executed by the
standalone gate. The product owns its model, solver, worker, persistence, and
Three.js surface. It has no import from the 2D application.

## Local Foundation ownership

`src/foundation/` is the local implementation for Space 3D units and linear
algebra. It is intentionally not a separately published package and must not
be replaced by the archived `@fusionstructure/foundation` dependency.

`migration/dependency-boundaries.json` keeps that ownership explicit: it
rejects archived Foundation and FStructure/Web product dependencies from
`package.json`, production `.ts`/`.tsx` imports, and relative imports that
leave this repository. Test files are excluded from this product-dependency
rule so its controlled fixtures cannot trigger their own gate.

For daily Foundation work, run `npm run architecture:check`,
`npm run architecture:test`, and the focused Foundation tests. Before a
review or release, run `npm run check`. The change needs only this repository's
tests and Pull Request; it does not require a Foundation package release or
validation in sibling products.

## Integration boundary

The monolith's 2D-to-3D adapter remains an integration concern. This product
accepts the versioned `Planar2DToSpace3DHandoffV1` shape in
`src/integrations/planar2dToSpace3d.ts`; the standalone build does not import
2D stores, models, commands, or solver internals. A host may serialize the
handoff and pass it at the application boundary in a later deployment.

## Local quality gate

```text
npm ci
npm run check
```

`npm run check` covers lint, TypeScript, the Space 3D corpus/tests, and the
standalone Vite build.
