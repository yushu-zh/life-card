import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { settleOpportunityEvent } from '../../engine/opportunity/settleOpportunityEvent.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { Dice2D6, OpportunityResolutionSummary } from '../../shared/types/opportunity.ts';

// 读取一局游戏，结算一个事件，再把结果保存回去。
export async function settleSingleOpportunityEvent(
  input: {
    sessionId: string;
    eventId: string;
    dice?: Dice2D6;
  },
  options?: {
    store?: ReturnType<typeof createGameSessionStore>;
  }
): Promise<OpportunityResolutionSummary> {
  const config = loadOpportunityEventConfig();
  const store = options?.store ?? createGameSessionStore();
  const persistedSession = await store.getGameSession(input.sessionId);

  if (!persistedSession) {
    throw new Error(`Game session ${input.sessionId} was not found`);
  }

  const eventDefinition = config.events.find((event) => event.id === input.eventId);

  if (!eventDefinition) {
    throw new Error(`Opportunity event ${input.eventId} was not found`);
  }

  const summary = settleOpportunityEvent(persistedSession.snapshot, eventDefinition, { dice: input.dice }, config);

  await store.saveGameSession(summary.updatedSnapshot);

  return summary;
}
