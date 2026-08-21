import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { buildTurnCategoryPlan } from '../../engine/opportunity/buildTurnCategoryPlan.ts';
import { dealTurnOffer } from '../../engine/opportunity/dealTurnOffer.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { ActiveTurnState } from '../../shared/types/turn.ts';

// 获取当前回合的牌组；如果当前还没发牌，就立刻生成并持久化。
export async function getOrCreateCurrentTurnOffer(
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

  const existingActiveTurn = persistedSession.snapshot.turnState.activeTurn;

  if (existingActiveTurn) {
    return existingActiveTurn;
  }

  const categoryPlan = buildTurnCategoryPlan(persistedSession.snapshot, turnSystemConfig, {
    random: options?.random
  });
  const initialOffer = dealTurnOffer(persistedSession.snapshot, categoryPlan.slotCategories, opportunityConfig, {
    random: options?.random
  });
  const activeTurn: ActiveTurnState = {
    age: persistedSession.snapshot.progression.age,
    cycle: persistedSession.snapshot.progression.cycle,
    turn: persistedSession.snapshot.progression.turn,
    patternKind: categoryPlan.patternKind,
    slotCategories: [...categoryPlan.slotCategories],
    initialOffer,
    rerolledOffer: null,
    currentOffer: initialOffer,
    rerollCount: 0
  };
  const updatedSnapshot = structuredClone(persistedSession.snapshot);

  updatedSnapshot.turnState.activeTurn = activeTurn;

  await store.saveGameSession(updatedSnapshot);

  return activeTurn;
}

function assertTurnReadySnapshot(snapshot: GameSessionSnapshot): void {
  if (!snapshot.turnState || !('activeTurn' in snapshot.turnState)) {
    throw new Error('Game session snapshot is incompatible with the Phase 2 turn system');
  }
}
