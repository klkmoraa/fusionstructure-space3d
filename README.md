# FusionStructure Space 3D

Experimental standalone spatial frame editor and solver. Space 3D owns its
model, worker, persistence, viewport, and compatibility corpus; it does not
depend on the 2D application.

## Status

`Experimental`: the available cases are covered by the committed compatibility
corpus, while releases are not normative or certified for construction.

## Development

```text
npm ci
npm run check
npm run dev
```

See [MIGRATION.md](MIGRATION.md) for the cutover tag, path allowlist, and the
serialized 2D-to-3D integration boundary.

## Local Foundation and fast flow

`src/foundation/` is owned by Space 3D only. Its units and linear algebra stay
in this repository; do not restore the archived `@fusionstructure/foundation`
package or import FStructure/Web internals.

For a daily local Foundation change, run the focused checks first:

```text
npm run architecture:check
npm run architecture:test
npm run test -- src/foundation/units.test.ts src/foundation/linearAlgebra.test.ts
```

Before requesting review or a release, run the complete gate:

```text
npm run check
```

The complete gate includes the manifest and production-source boundary checks.
Foundation remains local: its change needs only this repository's tests and
Pull Request.
