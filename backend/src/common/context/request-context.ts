import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestActor {
  id: string;
  email: string;
}

export interface RequestContextStore {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  actor?: RequestActor;
  hasExplicitAudit: boolean;
  auditBefore?: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export const requestContext = {
  run: <T>(store: RequestContextStore, callback: () => T): T => storage.run(store, callback),
  get: (): RequestContextStore | undefined => storage.getStore(),
  setActor(actor: RequestActor): void {
    const store = storage.getStore();
    if (store) store.actor = actor;
  },
};
