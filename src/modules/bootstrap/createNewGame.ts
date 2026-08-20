import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import { createInitialSnapshot } from '../../engine/session/createInitialSnapshot.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';

export async function createNewGame(
  input: CreatePlayerInput,
  options?: {
    sessionId?: string;
    store?: ReturnType<typeof createGameSessionStore>;
  }
) {
  const config = loadInitialStateConfig();
  const sessionId = options?.sessionId ?? crypto.randomUUID();
  const snapshot = createInitialSnapshot(input, config, sessionId);
  const store = options?.store ?? createGameSessionStore();

  await store.saveGameSession(snapshot);

  return snapshot;
}
