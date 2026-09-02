import { describe, expect, it } from 'vitest';
import { analyzeSpace3DProject } from '../engine/solver';
import { axialCantilever, bendingCantilever } from '../engine/fixtures';
import { buildSpace3DSceneModel } from './sceneModel';

describe('Space 3D result scene', () => {
  it('maps current axial actions to each analytical member', () => {
    const project = axialCantilever({ P: 12 });
    const analysis = analyzeSpace3DProject(project, 'LC1');
    const scene = buildSpace3DSceneModel({
      project, analysis, analysisState: 'ready', selection: null, targetId: 'LC1', resultMode: 'axial',
    });

    expect(scene.members[0].result?.mode).toBe('axial');
    expect(scene.members[0].result?.magnitude).toBeCloseTo(12);
    expect(scene.members[0].result?.relative).toBe(1);
  });

  it('does not publish stale result color or reactions', () => {
    const project = bendingCantilever({ P: 9 });
    const analysis = analyzeSpace3DProject(project, 'LC1');
    const scene = buildSpace3DSceneModel({
      project, analysis, analysisState: 'stale', selection: null, targetId: 'LC1', resultMode: 'reactions',
    });

    expect(scene.members.every((member) => member.result === null)).toBe(true);
    expect(scene.reactions).toEqual([]);
  });
});
