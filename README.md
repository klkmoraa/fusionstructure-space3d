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
