/** Minimal ambient declaration keeps the worker seam typed without enabling
 * the full WebWorker lib alongside the DOM lib used by the React surface. */
declare class DedicatedWorkerGlobalScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: unknown): void;
}
