// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { preparePlanar2DToSpace3DHandoff } from '../../integrations/planar2dToSpace3d';
import { createLossyPlanar2DFixture } from '../../integrations/planar2dToSpace3d.fixtures';
import { Space3DEntryDialog } from './Space3DEntryDialog';

afterEach(cleanup);

describe('Space3DEntryDialog handoff review', () => {
  it('shows the actual structured loss report before the person can open a lossy candidate', () => {
    const handoff = preparePlanar2DToSpace3DHandoff(createLossyPlanar2DFixture());

    render(<Space3DEntryDialog
      language="es"
      origin="workspace"
      projectName="Fuente 2D con revisión"
      handoff={handoff}
      onCancel={vi.fn()}
      onProceed={vi.fn()}
    />);

    const lossReview = screen.queryByRole('region', { name: 'Pérdidas de la transferencia' });
    expect(lossReview).toBeTruthy();
    if (!lossReview) return;
    expect(lossReview.textContent).toContain('dropped-member-load');
    expect(lossReview.textContent).toContain('ML1');
  });
});
