/**
 * Carril vertical de herramientas de Space 3D.
 *
 * Traduce el carril de mesa del historic visual spec a las acciones reales de la
 * superficie: no hay «Medir» porque el dominio espacial no tiene medición
 * todavía, y «Apoyo» edita las restricciones de un nudo existente en vez de
 * crear una entidad nueva, porque en S3D-1 el apoyo es un atributo del nudo.
 */
import {
  BarChart3, CircleDot, Ellipsis, MousePointer2, Spline, Triangle, Weight,
} from 'lucide-react';
import type { TranslationKey } from '../../i18n/catalogs';

export type Space3DActiveTool = 'select' | 'node' | 'member' | 'support' | 'load' | 'results';

export interface Space3DConsoleToolsProps {
  readonly t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
  readonly activeTool: Space3DActiveTool;
  readonly onSelectTool: () => void;
  readonly onNewNode: () => void;
  readonly onNewMember: () => void;
  readonly onNewLoad: () => void;
  readonly onEditSupport: () => void;
  readonly canNewMember: boolean;
  readonly canNewLoad: boolean;
  readonly canEditSupport: boolean;
  readonly canShowResults: boolean;
  readonly onShowResults: () => void;
  readonly onMore: () => void;
  readonly moreOpen: boolean;
}

export const Space3DConsoleTools = ({
  t, activeTool, onSelectTool, onNewNode, onNewMember, onNewLoad, onEditSupport,
  canNewMember, canNewLoad, canEditSupport, canShowResults, onShowResults, onMore, moreOpen,
}: Space3DConsoleToolsProps) => <nav className="space3d-console-tools space3d-rail-vertical" aria-label={t('space3d.toolRailLabel')}>
  <div className="space3d-rail-vertical-group" role="group" aria-label={t('space3d.toolRailLabel')}>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'select'}
      onClick={onSelectTool}
      title={t('space3d.toolSelect')}
    >
      <MousePointer2 size={19} aria-hidden="true" />
      <span>{t('space3d.toolSelect')}</span>
    </button>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'node'}
      onClick={onNewNode}
      aria-label={t('space3d.newNode')}
      title={t('space3d.newNode')}
    >
      <CircleDot size={19} aria-hidden="true" />
      <span aria-hidden="true">{t('space3d.node')}</span>
    </button>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'member'}
      onClick={onNewMember}
      disabled={!canNewMember}
      aria-label={t('space3d.newMember')}
      title={t('space3d.newMember')}
    >
      <Spline size={19} aria-hidden="true" />
      <span aria-hidden="true">{t('space3d.member')}</span>
    </button>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'load'}
      onClick={onNewLoad}
      disabled={!canNewLoad}
      aria-label={t('space3d.newLoad')}
      title={t('space3d.newLoad')}
    >
      <Weight size={19} aria-hidden="true" />
      <span aria-hidden="true">{t('space3d.load')}</span>
    </button>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'support'}
      onClick={onEditSupport}
      disabled={!canEditSupport}
      aria-label={t('space3d.newSupport')}
      title={canEditSupport ? t('space3d.newSupport') : t('space3d.newSupportHint')}
    >
      <Triangle size={19} aria-hidden="true" />
      <span aria-hidden="true">{t('space3d.supports')}</span>
    </button>
    <button
      type="button"
      className="space3d-rail-button"
      aria-pressed={activeTool === 'results'}
      onClick={onShowResults}
      disabled={!canShowResults}
      title={t('space3d.tabResults')}
    >
      <BarChart3 size={19} aria-hidden="true" />
      <span>{t('space3d.tabResults')}</span>
    </button>
  </div>

  <div className="space3d-rail-vertical-group space3d-rail-vertical-group--history" role="group" aria-label={t('space3d.toolbarProject')}>
    <button type="button" className="space3d-rail-button" aria-expanded={moreOpen} onClick={onMore} title="Más">
      <Ellipsis size={20} aria-hidden="true" />
      <span>Más</span>
    </button>
  </div>
</nav>;
