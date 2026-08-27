import { buildCardNarrativeFacts } from '../../ai/buildNarrativeFacts.ts';
import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { CardNarrativeFacts, EventCardNarrative } from '../../shared/types/narrative.ts';

// 为当前回合的三张机会牌生成 AI 事件牌文案，返回 eventId -> 文案 的映射。
// 生成失败的牌不入映射（UI 走既有 fallback）；结果只存内存态，不写进快照。
export async function generateTurnCardNarratives(
  input: { sessionId: string },
  options?: {
    generateCardNarrative?: (facts: CardNarrativeFacts) => Promise<EventCardNarrative | null>;
    store?: ReturnType<typeof createGameSessionStore>;
  }
): Promise<Record<string, EventCardNarrative>> {
  const store = options?.store ?? createGameSessionStore();
  const persistedSession = await store.getGameSession(input.sessionId);

  if (!persistedSession) {
    throw new Error(`Game session ${input.sessionId} was not found`);
  }

  const activeTurn = persistedSession.snapshot.turnState.activeTurn;

  if (!activeTurn) {
    throw new Error(`Game session ${input.sessionId} does not have an active turn offer`);
  }

  const generateCardNarrative = options?.generateCardNarrative;

  // 未注入 AI 能力时（如自动模拟或无 AI 场景）直接返回空映射。
  if (!generateCardNarrative) {
    return {};
  }

  const turnSystemConfig = loadTurnSystemConfig();
  const opportunityConfig = loadOpportunityEventConfig();
  const snapshot = persistedSession.snapshot;
  const result: Record<string, EventCardNarrative> = {};

  // 三张牌的文案互不依赖，并行生成以降低发牌后的总等待时间。
  const tasks = activeTurn.currentOffer.map(async (card) => {
    const eventDefinition = opportunityConfig.events.find((event) => event.id === card.eventId);
    if (!eventDefinition) {
      return { eventId: card.eventId, narrative: null };
    }

    const facts = buildCardNarrativeFacts(snapshot, eventDefinition, turnSystemConfig);
    const narrative = await generateCardNarrative(facts);
    return { eventId: card.eventId, narrative };
  });

  const narratives = await Promise.all(tasks);
  for (const { eventId, narrative } of narratives) {
    if (narrative) {
      result[eventId] = narrative;
    }
  }

  return result;
}
