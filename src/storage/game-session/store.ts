import { GAME_SESSION_SCHEMA_VERSION } from '../../shared/constants/schema.ts';
import type { GameSessionSnapshot, PersistedGameSession } from '../../shared/types/game-session.ts';

type IndexedDBLike = {
  open(name: string, version?: number): {
    result: {
      objectStoreNames: { contains(name: string): boolean };
      createObjectStore(name: string, options: { keyPath: string }): unknown;
      transaction(name: string, mode: 'readonly' | 'readwrite'): {
        objectStore(name: string): {
          put(value: PersistedGameSession): {
            result: unknown;
            error: Error | null;
            onsuccess: ((event: Event) => void) | null;
            onerror: ((event: Event) => void) | null;
          };
          get(key: string): {
            result: PersistedGameSession | undefined;
            error: Error | null;
            onsuccess: ((event: Event) => void) | null;
            onerror: ((event: Event) => void) | null;
          };
        };
      };
      close(): void;
    };
    error: Error | null;
    onsuccess: ((event: Event) => void) | null;
    onerror: ((event: Event) => void) | null;
    onupgradeneeded?: ((event: Event) => void) | null;
  };
};

const DATABASE_NAME = 'life-simulator';
const DATABASE_VERSION = 1;
const STORE_NAME = 'game-sessions';

export function createGameSessionStore(options?: { indexedDB?: IndexedDBLike }) {
  const indexedDBLike = options?.indexedDB ?? getGlobalIndexedDB();

  return {
    async saveGameSession(snapshot: GameSessionSnapshot): Promise<void> {
      const database = await openDatabase(indexedDBLike);
      const persisted: PersistedGameSession = {
        sessionId: snapshot.meta.sessionId,
        schemaVersion: GAME_SESSION_SCHEMA_VERSION,
        snapshot
      };

      try {
        const request = database
          .transaction(STORE_NAME, 'readwrite')
          .objectStore(STORE_NAME)
          .put(persisted);

        await waitForRequest(request);
      } finally {
        database.close();
      }
    },

    async getGameSession(sessionId: string): Promise<PersistedGameSession | null> {
      const database = await openDatabase(indexedDBLike);

      try {
        const request = database
          .transaction(STORE_NAME, 'readonly')
          .objectStore(STORE_NAME)
          .get(sessionId);

        return (await waitForRequest(request)) ?? null;
      } finally {
        database.close();
      }
    }
  };
}

function getGlobalIndexedDB(): IndexedDBLike {
  const candidate = globalThis.indexedDB as IndexedDBLike | undefined;

  if (!candidate) {
    throw new Error('IndexedDB is not available in the current runtime');
  }

  return candidate;
}

async function openDatabase(indexedDBLike: IndexedDBLike) {
  const request = indexedDBLike.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = () => {
    const database = request.result;

    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
    }
  };

  return waitForRequest(request);
}

function waitForRequest<TResult>(request: {
  result: TResult;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}
