import type { PersistedGameSession } from '../../src/shared/types/game-session.ts';

export interface IndexedDBLike {
  open(name: string, version?: number): IndexedDBRequestLike<InMemoryDatabase>;
}

export interface IndexedDBRequestLike<TResult> {
  result: TResult;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onupgradeneeded?: ((event: Event) => void) | null;
}

type StoreState = {
  keyPath: string;
  records: Map<string, unknown>;
};

type DatabaseState = {
  version: number;
  stores: Map<string, StoreState>;
};

class InMemoryObjectStore {
  private readonly storeState: StoreState;

  constructor(storeState: StoreState) {
    this.storeState = storeState;
  }

  put(value: object) {
    return createRequest<IDBValidKey>((request) => {
      const record = value as Record<string, unknown>;
      const key = record[this.storeState.keyPath];

      if (typeof key !== 'string' || key.length === 0) {
        throw new Error(`Record key ${this.storeState.keyPath} must be a non-empty string`);
      }

      this.storeState.records.set(key, structuredClone(record));
      request.result = key;
    });
  }

  get(key: string) {
    return createRequest<PersistedGameSession | undefined>((request) => {
      request.result = structuredClone(this.storeState.records.get(key)) as
        | PersistedGameSession
        | undefined;
    });
  }
}

class InMemoryTransaction {
  private readonly stores: Map<string, StoreState>;

  constructor(stores: Map<string, StoreState>) {
    this.stores = stores;
  }

  objectStore(name: string) {
    const storeState = this.stores.get(name);

    if (!storeState) {
      throw new Error(`Object store ${name} does not exist`);
    }

    return new InMemoryObjectStore(storeState);
  }
}

class InMemoryObjectStoreNames {
  private readonly stores: Map<string, StoreState>;

  constructor(stores: Map<string, StoreState>) {
    this.stores = stores;
  }

  contains(name: string) {
    return this.stores.has(name);
  }
}

export class InMemoryDatabase {
  public readonly objectStoreNames: InMemoryObjectStoreNames;
  private readonly state: DatabaseState;

  constructor(state: DatabaseState) {
    this.state = state;
    this.objectStoreNames = new InMemoryObjectStoreNames(state.stores);
  }

  createObjectStore(name: string, options: { keyPath: string }) {
    if (!this.state.stores.has(name)) {
      this.state.stores.set(name, {
        keyPath: options.keyPath,
        records: new Map<string, unknown>()
      });
    }

    return new InMemoryObjectStore(this.state.stores.get(name)!);
  }

  transaction(name: string, _mode: 'readonly' | 'readwrite') {
    return new InMemoryTransaction(this.state.stores);
  }

  close() {}
}

export function createInMemoryIndexedDB(): IndexedDBLike {
  const databases = new Map<string, DatabaseState>();

  return {
    open(name: string, version = 1) {
      const request = createRequest<InMemoryDatabase>((innerRequest) => {
        const existing = databases.get(name);
        const isNew = !existing;
        const needsUpgrade = isNew || version > existing.version;
        const state = existing ?? {
          version,
          stores: new Map<string, StoreState>()
        };

        if (needsUpgrade) {
          state.version = version;
        }

        databases.set(name, state);

        innerRequest.result = new InMemoryDatabase(state);

        if (needsUpgrade) {
          innerRequest.onupgradeneeded?.(new Event('upgradeneeded'));
        }
      });

      return request;
    }
  };
}

function createRequest<TResult>(executor: (request: IndexedDBRequestLike<TResult>) => void): IndexedDBRequestLike<TResult> {
  const request: IndexedDBRequestLike<TResult> = {
    result: undefined as TResult,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  };

  queueMicrotask(() => {
    try {
      executor(request);
      request.onsuccess?.(new Event('success'));
    } catch (error) {
      request.error = error instanceof Error ? error : new Error(String(error));
      request.onerror?.(new Event('error'));
    }
  });

  return request;
}
