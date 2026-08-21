import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { dealTurnOffer } from '../../engine/opportunity/dealTurnOffer.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { ActiveTurnState } from '../../shared/types/turn.ts';

// 在当前回合内执行一次换牌，只刷新内容，不改变类别结构。
export async function rerollCurrentTurnOffer(
  input: {
    sessionId: string;
  },
  options?: {
    store?: ReturnType<typeof createGameSessionStore>;
    random?: () => number;
  }
): Promise<ActiveTurnState> {
  const turnSystemConfig = loadTurnSystemConfig();
  const opportunityConfig = loadOpportunityEventConfig();
  const store = options?.store ?? createGameSessionStore();
  const persistedSession = await store.getGameSession(input.sessionId);

  if (!persistedSession) {
    throw new Error(`Game session ${input.sessionId} was not found`);
  }

  assertTurnReadySnapshot(persistedSession.snapshot);

  if (persistedSession.snapshot.lifecycle.isEnded) {
    throw new Error(`Game session ${input.sessionId} has already ended`);
  }

  const activeTurn = persistedSession.snapshot.turnState.activeTurn;

  if (!activeTurn) {
    throw new Error(`Game session ${input.sessionId} does not have an active turn offer`);
  }

  if (activeTurn.rerollCount >= turnSystemConfig.redrawLimitPerTurn) {
    throw new Error(`Game session ${input.sessionId} cannot reroll more than ${turnSystemConfig.redrawLimitPerTurn} time(s) in one turn`);
  }

  const rerolledOffer = dealTurnOffer(persistedSession.snapshot, activeTurn.slotCategories, opportunityConfig, {
    random: options?.random
  });
  const nextActiveTurn: ActiveTurnState = {
    ...activeTurn,
    rerolledOffer,
    currentOffer: rerolledOffer,
    rerollCount: activeTurn.rerollCount + 1
  };
  const updatedSnapshot = structuredClone(persistedSession.snapshot);

  updatedSnapshot.turnState.activeTurn = nextActiveTurn;

  await store.saveGameSession(updatedSnapshot);

  return nextActiveTurn;
}

function assertTurnReadySnapshot(snapshot: GameSessionSnapshot): void {
  if (!snapshot.turnState || !('activeTurn' in snapshot.turnState)) {
    throw new Error('Game session snapshot is incompatible with the Phase 2 turn system');
  }
}
