/**
 * Entrada aislada del Web Worker de Space 3D.
 *
 * Sólo reenvía al handler puro del protocolo: toda la lógica vive en
 * `protocol.ts` para que la ruta en worker y la ruta en hilo sean el mismo
 * código y las pruebas no necesiten un Worker real.
 */
import { handleSpace3DWorkerRequest, type Space3DWorkerResponse } from './protocol';

export interface Space3DWorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: Space3DWorkerResponse): void;
}

/** Installs the production message seam; exported for a structured-clone harness. */
export const installSpace3DWorker = (workerScope: Space3DWorkerScope): void => {
  workerScope.addEventListener('message', (event) => {
    workerScope.postMessage(handleSpace3DWorkerRequest(event.data));
  });
};

/** `self` also exists in a Window; only a dedicated Worker owns this module seam. */
const isDedicatedWorkerGlobalScope = (scope: unknown): scope is Space3DWorkerScope =>
  typeof DedicatedWorkerGlobalScope !== 'undefined' && scope instanceof DedicatedWorkerGlobalScope;

const currentGlobalScope = typeof self === 'undefined' ? undefined : self;
if (isDedicatedWorkerGlobalScope(currentGlobalScope)) installSpace3DWorker(currentGlobalScope);
