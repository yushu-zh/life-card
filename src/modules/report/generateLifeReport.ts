import { buildLifeReportFacts } from '../../ai/buildNarrativeFacts.ts';
import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../config/loaders/loadPhase4PresentationConfig.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { LifeReportFacts, LifeReportNarrative } from '../../shared/types/narrative.ts';

// 生成并持久化一局人生报告。已生成过则直接返回，不重复调 AI；
// 传入 force 时忽略幂等，强制重新生成（供报告页「重新生成」按钮使用）。
// AI 失败（返回 null）时 finalReportText 保持 null，UI 走 fallback。
export async function generateLifeReport(
  input: { sessionId: string },
  options?: {
    store?: ReturnType<typeof createGameSessionStore>;
    generateReportNarrative?: (facts: LifeReportFacts) => Promise<LifeReportNarrative | null>;
    force?: boolean;
  }
): Promise<GameSessionSnapshot> {
  const store = options?.store ?? createGameSessionStore();
  const persistedSession = await store.getGameSession(input.sessionId);

  if (!persistedSession) {
    throw new Error(`Game session ${input.sessionId} was not found`);
  }

  const snapshot = persistedSession.snapshot;

  // PRD 3.1：只有本局结束后才能生成完整人生报告。
  if (!snapshot.lifecycle.isEnded) {
    throw new Error(`Game session ${input.sessionId} has not ended yet`);
  }

  // 幂等：已经生成过报告就不再调用 AI；force 时跳过，允许重新生成。
  if (!options?.force && snapshot.lifecycle.finalReportText) {
    return snapshot;
  }

  const generateReportNarrative = options?.generateReportNarrative;

  // 未注入 AI 能力时（如无 AI 场景）不生成报告，保持 finalReportText 为 null。
  if (!generateReportNarrative) {
    return snapshot;
  }

  const opportunityConfig = loadOpportunityEventConfig();
  const presentation = loadPhase4PresentationConfig();
  const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

  const narrative = await generateReportNarrative(facts);

  // AI 失败返回 null，不写报告文本，UI 走 fallback。
  if (!narrative) {
    return snapshot;
  }

  // 报告文本只落这一个字段，不动任何数值或历史。
  const updatedSnapshot = structuredClone(snapshot);
  updatedSnapshot.lifecycle.finalReportText = narrative.paragraphs.join('\n\n');

  await store.saveGameSession(updatedSnapshot);

  return updatedSnapshot;
}
