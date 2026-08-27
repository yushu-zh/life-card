import type { GameSessionSnapshot } from '../shared/types/game-session.ts';
import type { OpportunityEventDefinition, OpportunityResultGrade, StatDelta } from '../shared/types/opportunity.ts';
import type { TurnSystemConfig } from '../shared/types/turn.ts';
import type { CardNarrativeFacts, ResultNarrativeFacts } from '../shared/types/narrative.ts';
import { formatGrade } from './buildNarrativePrompts.ts';

// 把快照 + 事件骨架收拢成事件牌文案的 prompt 事实。
export function buildCardNarrativeFacts(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  turnSystemConfig: TurnSystemConfig
): CardNarrativeFacts {
  return {
    player: snapshot.player,
    age: snapshot.progression.age,
    cycle: snapshot.progression.cycle,
    turn: snapshot.progression.turn,
    stageLabel: resolveStageLabel(snapshot.progression.age, turnSystemConfig),
    category: eventDefinition.category,
    eventSkeleton: {
      id: eventDefinition.id,
      name: eventDefinition.name,
      checkAbilityKeys: eventDefinition.check.abilityKeys
    }
  };
}

// 把结算结果收拢成结果文案的 prompt 事实。
export function buildResultNarrativeFacts(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  resultGrade: OpportunityResultGrade | 'direct',
  appliedDeltas: StatDelta[],
  cardDescription: string
): ResultNarrativeFacts {
  return {
    player: snapshot.player,
    age: snapshot.progression.age,
    event: {
      id: eventDefinition.id,
      name: eventDefinition.name,
      category: eventDefinition.category
    },
    resultGrade,
    appliedDeltas,
    historySummary: buildHistorySummary(snapshot),
    cardDescription
  };
}

// 把最近若干回合压成一段紧凑的历史摘要，供 AI 贴合上下文。
// 这里只做叙事摘要，不替代结构化历史（结构化事实仍由 TurnHistoryEntry 承载）。
export function buildHistorySummary(snapshot: GameSessionSnapshot, limit = 5): string {
  const recent = snapshot.records.lifeHistory.slice(-limit);
  const parts = recent.map(
    (entry) => `${entry.context.age}岁选择「${entry.opportunity.event.name}」→${formatGrade(entry.opportunity.resultGrade)}`
  );

  const lifeNodes = snapshot.records.lifeNodes;
  const nodeParts: string[] = [];
  if (lifeNodes.romanceSuccessCount > 0) {
    nodeParts.push(`恋爱${lifeNodes.romanceSuccessCount}次`);
  }
  if (lifeNodes.marriageEstablished) {
    nodeParts.push('已婚');
  }
  if (lifeNodes.familyEstablished) {
    nodeParts.push('已组建家庭');
  }

  const summary = parts.length > 0 ? parts.join('；') : '暂无';
  return nodeParts.length > 0 ? `${summary}（${nodeParts.join('、')}）` : summary;
}

// 从年龄阶段规则推导一个可读阶段标签，如「20-34岁」。
function resolveStageLabel(age: number, config: TurnSystemConfig): string {
  const stage = config.stageRules.find((rule) => age >= rule.minAge && age < rule.maxExclusive);
  if (!stage) {
    return `${age}岁`;
  }

  return `${stage.minAge}-${stage.maxExclusive - 1}岁`;
}
