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

// IndexedDB 数据库名保持稳定，避免后续读档时落到不同库。
const DATABASE_NAME = 'life-simulator';
// 当前本地存档结构版本；只有真正需要迁移时才应递增。
const DATABASE_VERSION = 1;
// 游戏存档统一落在这个对象仓库里。
const STORE_NAME = 'game-sessions';

// 创建游戏存档的读写对象。
export function createGameSessionStore(options?: { indexedDB?: IndexedDBLike }) {
  const indexedDBLike = options?.indexedDB ?? getGlobalIndexedDB();

  return {
    // 把一份最新快照保存到 IndexedDB。
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

    // 按 sessionId 读取一份已经保存的快照。
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

// 从当前运行环境里拿到 IndexedDB 对象。
function getGlobalIndexedDB(): IndexedDBLike {
  const candidate = globalThis.indexedDB as IndexedDBLike | undefined;

  if (!candidate) {
    throw new Error('IndexedDB is not available in the current runtime');
  }

  return candidate;
}

// 打开数据库；如果是第一次打开，就顺手把存档表建好。
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

// 把 IndexedDB 的 request 包成 Promise，方便在 async/await 里使用。
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
