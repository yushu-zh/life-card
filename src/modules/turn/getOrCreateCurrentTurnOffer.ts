import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { buildTurnCategoryPlan } from '../../engine/opportunity/buildTurnCategoryPlan.ts';
import { dealTurnOffer } from '../../engine/opportunity/dealTurnOffer.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import { buildForcedEventIds } from './buildForcedEventIds.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityCategory } from '../../shared/types/opportunity.ts';
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

  const snapshot = persistedSession.snapshot;
  const categoryPlan = buildTurnCategoryPlan(snapshot, turnSystemConfig, {
    random: options?.random
  });
  const random = options?.random ?? Math.random;

  // 资源不足时强制刷出兜底卡，并确保类别结构里有对应的槽位。
  const forcedEventIds = buildForcedEventIds(snapshot, opportunityConfig, turnSystemConfig, random);
  let slotCategories = [...categoryPlan.slotCategories];

  for (const eventId of forcedEventIds) {
    const event = opportunityConfig.events.find((definition) => definition.id === eventId);

    if (event) {
      slotCategories = ensureCategory(slotCategories, event.category);
    }
  }

  const initialOffer = dealTurnOffer(snapshot, slotCategories, opportunityConfig, {
    random,
    forcedEventIds
  });
  const activeTurn: ActiveTurnState = {
    age: snapshot.progression.age,
    cycle: snapshot.progression.cycle,
    turn: snapshot.progression.turn,
    patternKind: categoryPlan.patternKind,
    slotCategories,
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

// 确保类别结构里有一个指定类别的槽位，用于承载强制刷出的兜底卡。
function ensureCategory(slotCategories: OpportunityCategory[], category: OpportunityCategory): OpportunityCategory[] {
  if (slotCategories.includes(category)) {
    return [...slotCategories];
  }

  const next = [...slotCategories];
  next[2] = category;

  return next;
}
