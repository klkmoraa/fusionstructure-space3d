import { describe, expect, it } from 'vitest';

import { axialCantilever } from '../engine/fixtures';
import { parseSpace3DDraft, parseSpace3DProject, serializeSpace3DProject, Space3DCodecError } from './codec';
import type { Space3DProjectV1 } from '../model/types';

const withUnits = (units: Space3DProjectV1['units']): Space3DProjectV1 => ({
  ...axialCantilever(),
  units,
});

describe('Space3D unit persistence codec', () => {
  it('round-trips percent-encoded custom ids and historical special profiles exactly', () => {
    const persistedUnits = ['custom:Puente%20T%2FM:t:m', 'kip-ft'] as const;

    for (const units of persistedUnits) {
      const project = withUnits(units);
      const encoded = serializeSpace3DProject(project);

      expect(JSON.parse(encoded)).toMatchObject({ units });
      expect(parseSpace3DProject(encoded)).toEqual(project);
      expect(parseSpace3DDraft(encoded)).toEqual(project);
    }
  });

  it('fails closed instead of applying the runtime unit fallback to malformed persisted ids', () => {
    const invalidPersistedUnits = [
      'not-a-system',
      'custom:Puente%00T:t:m',
      'custom:%E0%A4%A:t:m',
      'custom:Puente:t:bogus',
      'custom::t:m',
    ];

    for (const units of invalidPersistedUnits) {
      const raw = JSON.parse(serializeSpace3DProject(axialCantilever())) as Record<string, unknown>;
      raw.units = units;
      const payload = JSON.stringify(raw);

      expect(() => parseSpace3DProject(payload), units).toThrowError(Space3DCodecError);
      expect(() => parseSpace3DDraft(payload), units).toThrowError(Space3DCodecError);
    }
  });
});
