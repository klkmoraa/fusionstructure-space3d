import { useRef } from 'react';
import { ArrowRight, FlaskConical, Undo2, X } from 'lucide-react';
import { useModalFocus } from '../../design-system/components/modalFocus';
import type { Planar2DToSpace3DHandoffV1 } from '../../integrations/planar2dToSpace3d';
import './space3dEntry.css';

export type Space3DEntryOrigin = 'workspace' | 'standalone';

interface Space3DEntryDialogProps {
  readonly language: 'es' | 'en';
  readonly origin: Space3DEntryOrigin;
  readonly projectName: string;
  /** Snapshot proposal; no live 2D store crosses the Space3D entry boundary. */
  readonly handoff?: Planar2DToSpace3DHandoffV1 | null;
  readonly onCancel: () => void;
  readonly onProceed: () => void;
}

const copy = {
  es: {
    title: 'Abrir Space 3D experimental', badge: 'Experimental', close: 'Cerrar orientación de Space 3D',
    intro: 'Revisa el alcance antes de iniciar: Space 3D es un entorno separado del editor 2D.',
    workspaceOrigin: 'Se derivará una copia espacial de «{name}»; tu proyecto 2D original no se sobrescribe.',
    standaloneOrigin: 'Abrirás un proyecto espacial independiente; tu proyecto 2D actual no se modifica.',
    bridge: 'Los datos 2D sin equivalente se señalarán antes de permitir el análisis; no se inventarán valores.',
    return: 'Puedes volver al Editor 2D en cualquier momento sin sustituir su modelo.',
    matrixTitle: 'Qué se conserva y qué requiere revisión',
    mappedLabel: 'Se conserva', mapped: 'Nudos XY como z=0, barras de pórtico, E/A/Iz y cargas nodales del plano.',
    completeLabel: 'Debes completar', complete: 'G, Iy, J y restricciones uz/rx/ry fuera del plano.',
    acknowledgeLabel: 'Debes revisar', acknowledge: 'Cargas en barra, liberaciones y apoyos sin equivalente se señalarán para su reconocimiento.',
    lossTitle: 'Pérdidas de la transferencia', lossIntro: 'Revisa estas diferencias antes de abrir el candidato 3D:',
    cancel: 'Seguir en editor 2D', proceed: 'Abrir Space 3D',
  },
  en: {
    title: 'Open experimental Space 3D', badge: 'Experimental', close: 'Close Space 3D orientation',
    intro: 'Review the scope before starting: Space 3D is separate from the 2D editor.',
    workspaceOrigin: 'A spatial copy of “{name}” will be derived; your original 2D project is not overwritten.',
    standaloneOrigin: 'You will open an independent spatial project; your current 2D project is not changed.',
    bridge: '2D data without an equivalent will be identified before analysis is allowed; no values will be invented.',
    return: 'You can return to the 2D editor at any time without replacing its model.',
    matrixTitle: 'What carries over and what needs review',
    mappedLabel: 'Preserved', mapped: 'XY nodes as z=0, frame members, E/A/Iz, and planar nodal loads.',
    completeLabel: 'You must complete', complete: 'G, Iy, J, and uz/rx/ry out-of-plane restraints.',
    acknowledgeLabel: 'You must review', acknowledge: 'Member loads, releases, and supports without an equivalent are listed for acknowledgement.',
    lossTitle: 'Transfer losses', lossIntro: 'Review these differences before opening the 3D candidate:',
    cancel: 'Stay in 2D editor', proceed: 'Open Space 3D',
  },
} as const;

/**
 * A pre-entry orientation, not a technical warning after work has begun. It
 * makes the 2D-to-3D boundary explicit while leaving the final choice with the
 * user and without mutating either project.
 */
export const Space3DEntryDialog = ({ language, origin, projectName, handoff, onCancel, onProceed }: Space3DEntryDialogProps) => {
  const text = copy[language];
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useModalFocus({ open: true, containerRef: dialogRef, onEscape: onCancel, initialFocus: () => cancelRef.current });
  const originText = origin === 'workspace'
    ? text.workspaceOrigin.replace('{name}', projectName)
    : text.standaloneOrigin;
  const losses = handoff?.lossReport.entries ?? [];

  // El diálogo se apoya en un fondo propio: sin él quedaba en el flujo del
  // documento, debajo de la pantalla que lo abrió, y en un teléfono no llegaba
  // a verse. El fondo también es la salida por descarte, igual que en el resto
  // de superficies modales del producto.
  return <div className="space3d-entry-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section ref={dialogRef} className="space3d-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="space3d-entry-title" tabIndex={-1}>
      <button type="button" className="space3d-entry-dialog__close" aria-label={text.close} onClick={onCancel}><X size={18} /></button>
      <span className="space3d-entry-dialog__badge"><FlaskConical size={15} />{text.badge}</span>
      <h2 id="space3d-entry-title">{text.title}</h2>
      <p>{text.intro}</p>
      <ul>
        <li>{originText}</li>
        <li>{text.bridge}</li>
        <li>{text.return}</li>
      </ul>
      <section className="space3d-entry-dialog__matrix" aria-labelledby="space3d-entry-matrix-title">
        <h3 id="space3d-entry-matrix-title">{text.matrixTitle}</h3>
        <dl>
          <div><dt>{text.mappedLabel}</dt><dd>{text.mapped}</dd></div>
          <div><dt>{text.completeLabel}</dt><dd>{text.complete}</dd></div>
          <div><dt>{text.acknowledgeLabel}</dt><dd>{text.acknowledge}</dd></div>
        </dl>
      </section>
      {losses.length > 0 ? <section className="space3d-entry-dialog__losses" aria-label={text.lossTitle}>
        <h3>{text.lossTitle}</h3>
        <p>{text.lossIntro}</p>
        <ul>{losses.map((loss) => <li key={loss.id}><code>{loss.code}</code>{loss.source.entityId ? ` · ${loss.source.entityId}` : ''}</li>)}</ul>
      </section> : null}
      <footer>
        <button ref={cancelRef} type="button" onClick={onCancel}><Undo2 size={16} />{text.cancel}</button>
        <button type="button" className="space3d-entry-dialog__proceed" onClick={onProceed}>{text.proceed}<ArrowRight size={16} /></button>
      </footer>
    </section>
  </div>;
};
