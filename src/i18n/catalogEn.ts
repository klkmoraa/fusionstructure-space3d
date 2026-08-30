import type { Catalog } from './catalogs';
import { enWorkspace } from './catalogs/en-workspace';
import { enAnalysis } from './catalogs/en-analysis';
import { enModeling } from './catalogs/en-modeling';
import { enResults } from './catalogs/en-results';
import { enInterchange } from './catalogs/en-interchange';

/**
 * El catálogo inglés es un límite de carga: sólo se importa cuando el proyecto
 * lo necesita. `catalogs.ts` conserva español como reserva síncrona.
 */
export const en: Catalog = {
  ...enWorkspace,
  ...enAnalysis,
  ...enModeling,
  ...enResults,
  ...enInterchange,
  // Local additions retained during the modular extraction.
  'canvas.keyboardEditAlternative': 'With an object selected, press F2 to edit it with numeric fields instead of dragging it',
  'canvas.structuralEditConnectedHelp': 'Incident members stay connected and follow their nodes.',
  'canvas.structuralEditDescription': 'Local preview · one confirmation and one undo',
  'generator.support.detail.fixed': 'Restrains Ux, Uy, and Rz at every candidate support node.',
  'generator.support.detail.none': 'It restrains no degrees of freedom. Complete supports before analysis.',
  'generator.support.detail.pin': 'Restrains Ux and Uy at every candidate support node.',
  'generator.support.detail.roller': 'Restrains normal displacement (Uy at a 90° angle) at every candidate support node.',
  'generator.support.hint': 'Optional and explicit: the generator does not invent supports. The preset applies exactly to this family’s support nodes.',
  'generator.support.label': 'Support preset',
  'inspector.loadCaseCategoryAccidental': 'Accidental',
  'inspector.loadCaseCategoryOther': 'Other',
  'inspector.loadCaseCategoryPermanent': 'Permanent',
  'inspector.loadCaseCategoryVariable': 'Variable',
  'palette.activeCommand': 'Active command: {label}.',
  'palette.resultCount': '{count} commands available.',
  'palette.reviewBody': 'This action may open a system dialog or download a file. Review it before continuing.',
  'palette.reviewCancel': 'Return to command palette',
  'palette.reviewConfirm': 'Continue',
  'palette.reviewTitle': 'Review action',
  'results.compactForTarget': 'Current case: {target}',
  'results.compactGoverning': 'Governing {symbol} {value} {unit} · {member}',
  'results.compactNoGoverning': 'Review the complete summary',
  'results.compactResolvedDetail': 'Solved · {target} · up to date · {reliability}',
  'results.compactUnresolved': 'The run needs correction',
  'results.compactWaiting': 'There are no calculated results yet',
  'results.criticalEnd': 'Endpoint',
  'results.criticalJump': 'Jump',
  'results.criticalMaximum': 'Maximum',
  'results.criticalMinimum': 'Minimum',
  'results.criticalPoints': 'Notable points',
  'results.criticalZero': 'Zero crossing',
  'results.pinCriticalPoint': 'Pin reading at {point}',
  'results.unpinCriticalPoint': 'Unpin reading at {point}',
  'space3d.bridgeCompleteNow': 'Complete now',
  'space3d.bridgeNextRequirement': 'Next requirement to analyse: {requirement}',
};
