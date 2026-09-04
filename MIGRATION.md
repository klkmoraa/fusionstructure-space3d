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
