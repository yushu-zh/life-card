import type { GameSessionSnapshot } from '../shared/types/game-session.ts';
import type { OpportunityEventConfig, OpportunityEventDefinition, OpportunityResultGrade, StatDelta } from '../shared/types/opportunity.ts';
import type { FateResolutionSummary } from '../shared/types/fate.ts';
import type { StatusResult } from '../shared/types/status.ts';
import type { TurnSystemConfig } from '../shared/types/turn.ts';
import type { Phase4PresentationConfig } from '../shared/types/ui.ts';
import type { CardNarrativeFacts, FateNarrativeFacts, LifeReportFacts, ResultNarrativeFacts, StatusNarrativeFacts } from '../shared/types/narrative.ts';
import { formatCategory, formatGrade } from './buildNarrativePrompts.ts';

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
    coreMemory: buildCoreMemory(snapshot),
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
    coreMemory: buildCoreMemory(snapshot),
    cardDescription
  };
}

// 把命运结算结果收拢成命运文案的 prompt 事实。
export function buildFateNarrativeFacts(
  snapshot: GameSessionSnapshot,
  fateSummary: FateResolutionSummary
): FateNarrativeFacts {
  return {
    player: snapshot.player,
    age: snapshot.progression.age,
    coreMemory: buildCoreMemory(snapshot),
    eventName: fateSummary.event?.name ?? '',
    appliedDeltas: fateSummary.appliedDeltas,
    mitigatedDelta: fateSummary.mitigatedDelta
  };
}

// 把状态结算结果收拢成状态文案的 prompt 事实。
export function buildStatusNarrativeFacts(
  snapshot: GameSessionSnapshot,
  statusResult: StatusResult
): StatusNarrativeFacts {
  return {
    player: snapshot.player,
    age: snapshot.progression.age,
    coreMemory: buildCoreMemory(snapshot),
    statusName: statusResult.name,
    kind: statusResult.kind,
    conditions: statusResult.conditions,
    // 死亡风险状态没有数值变化字段，这里按需兜底为空数组。
    appliedDeltas: 'appliedDeltas' in statusResult ? statusResult.appliedDeltas : [],
    died: statusResult.kind === 'death-risk' ? statusResult.died : false
  };
}

// 把最近若干回合压成一段紧凑的历史摘要，供 AI 贴合上下文。
// 这里只做叙事摘要，不替代结构化历史（结构化事实仍由 TurnHistoryEntry 承载）。
export function buildHistorySummary(snapshot: GameSessionSnapshot, limit = 5): string {
  const recent = snapshot.records.lifeHistory.slice(-limit);
  const parts = recent.map(
    (entry) => `${entry.context.age}岁选择「${entry.opportunity.event.name}」→${formatGrade(entry.opportunity.resultGrade)}`
  );

  const nodeParts = buildLifeNodeParts(snapshot.records.lifeNodes);
  const summary = parts.length > 0 ? parts.join('；') : '暂无';
  return nodeParts.length > 0 ? `${summary}（${nodeParts.join('、')}）` : summary;
}

// 汇总本局已发生、不可被后续叙述推翻的核心记忆，注入各类叙事 prompt 防 AI 瞎编矛盾。
// 由两部分拼成，都是「设定」而非「故事」：
// 1. 结构化人生节点（已婚、恋爱次数等，代码可证为真）；
// 2. 被选中牌面落盘的 AI 记忆条目（只保留最近若干条，控制 token 体积）。
export function buildCoreMemory(snapshot: GameSessionSnapshot, limit = 8): string {
  const lines: string[] = [];

  const nodeParts = buildLifeNodeParts(snapshot.records.lifeNodes);
  if (nodeParts.length > 0) {
    lines.push(`人生现状：${nodeParts.join('、')}`);
  }

  // 从历史条目里收集被选中牌面的记忆；弃牌的文案从未落盘，不会被误记。
  // 旧存档没有 memory 字段，访问到 undefined 时自然跳过。
  const memories: string[] = [];
  for (const entry of snapshot.records.lifeHistory) {
    const memory = entry.narrative?.card?.memory;
    if (typeof memory === 'string' && memory.length > 0) {
      memories.push(`${entry.context.age}岁·${memory}`);
    }
  }
  if (memories.length > 0) {
    lines.push(`你人生中已留下的印记：${memories.slice(-limit).join('；')}`);
  }

  return lines.length > 0 ? lines.join('\n') : '暂无';
}

// 把人生节点压成短句数组；没有已成立的节点时为空数组。
function buildLifeNodeParts(lifeNodes: GameSessionSnapshot['records']['lifeNodes']): string[] {
  const parts: string[] = [];
  if (lifeNodes.romanceSuccessCount > 0) {
    parts.push(`恋爱${lifeNodes.romanceSuccessCount}次`);
  }
  if (lifeNodes.marriageEstablished) {
    parts.push('已婚');
  }
  if (lifeNodes.familyEstablished) {
    parts.push('已组建家庭');
  }

  return parts;
}

// 从年龄阶段规则推导一个可读阶段标签，如「20-34岁」。
function resolveStageLabel(age: number, config: TurnSystemConfig): string {
  const stage = config.stageRules.find((rule) => age >= rule.minAge && age < rule.maxExclusive);
  if (!stage) {
    return `${age}岁`;
  }

  return `${stage.minAge}-${stage.maxExclusive - 1}岁`;
}

// 把终局快照收拢成人生报告的 prompt 事实，覆盖 PRD 3.2 要求的最低事实集合。
// 这里完成所有「结构化 -> 可读文本」的转换，让 prompt 组装层只做占位符拼接。
export function buildLifeReportFacts(
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  presentation: Phase4PresentationConfig
): LifeReportFacts {
  const { player, progression, lifecycle, records, stats } = snapshot;

  const endReason = lifecycle.endReason ?? 'age-limit';
  const endReasonLabel = presentation.reportFallback.endReasonLabels[endReason] ?? '人生已结束';

  // 建立 eventId -> 事件名映射，供被放弃事件（历史里只有 eventId）还原可读名称。
  const eventNameById = new Map(
    opportunityConfig.events.map((event) => [event.id, event.name] as const)
  );

  const choices: LifeReportFacts['choices'] = [];
  const discardedEvents: LifeReportFacts['discardedEvents'] = [];
  const fateEvents: LifeReportFacts['fateEvents'] = [];
  const statusEvents: LifeReportFacts['statusEvents'] = [];
  const stageAges = new Set<number>();
  let successCount = 0;
  let failureCount = 0;

  for (const entry of records.lifeHistory) {
    stageAges.add(entry.context.age);

    // 成功/失败只统计明确的两种结果，代价成功不计入任一边。
    const grade = entry.opportunity.resultGrade;
    if (grade === 'success' || grade === 'criticalSuccess') {
      successCount += 1;
    } else if (grade === 'failure') {
      failureCount += 1;
    }

    choices.push({
      age: entry.context.age,
      eventName: entry.opportunity.event.name,
      categoryLabel: formatCategory(entry.opportunity.event.category),
      gradeLabel: formatGrade(grade),
      // 带上 Phase 6 生成的叙事文案，让报告能引用每一段选择的具象故事。
      cardDescription: entry.narrative?.card?.description ?? null,
      resultDescription: entry.narrative?.result?.description ?? null
    });

    // 被放弃的事件：本回合换牌掉 + 未选中的牌都算，保留时间脉络、不合并。
    for (const card of entry.discardedCards) {
      const name = eventNameById.get(card.eventId);
      if (name) {
        discardedEvents.push({ age: entry.context.age, eventName: name });
      }
    }

    if (entry.fate?.triggered && entry.fate.event) {
      fateEvents.push({
        age: entry.context.age,
        eventName: entry.fate.event.name,
        // 带上 Phase 6 生成的命运变故文案，让报告能引用这一段具象变故。
        description: entry.narrative?.fate?.description ?? null
      });
    }

    for (const status of entry.statuses) {
      statusEvents.push({
        age: entry.context.age,
        statusName: status.name,
        kind: status.kind,
        died: status.kind === 'death-risk' ? status.died : false,
        // 带上 Phase 6 生成的状态文案，让报告能引用这一段具体境遇。
        description: entry.narrative?.statuses[status.id]?.description ?? null
      });
    }
  }

  const stageLabels = Array.from(stageAges)
    .sort((a, b) => a - b)
    .map((age) => `${age}岁`);

  return {
    player,
    finalAge: progression.age,
    endReason,
    endReasonLabel,
    isPrematureDeath: endReason !== 'age-limit',
    stageLabels,
    choices,
    discardedEvents,
    fateEvents,
    statusEvents,
    finalStats: buildReadableFinalStats(stats, presentation),
    lifeNodes: buildReadableLifeNodes(records.lifeNodes),
    categoryPickCounts: buildReadableCategoryPickCounts(records.categoryPickCounts),
    successCount,
    failureCount
  };
}

// 把最终数值按展示顺序拼成「中文标签 + 数值」的可读列表，顺序来自展示配置。
function buildReadableFinalStats(
  stats: GameSessionSnapshot['stats'],
  presentation: Phase4PresentationConfig
): LifeReportFacts['finalStats'] {
  return [
    ...presentation.statOrder.abilities.map((key) => ({
      label: presentation.statLabels[key],
      value: stats.abilities[key]
    })),
    ...presentation.statOrder.resources.map((key) => ({
      label: presentation.statLabels[key],
      value: stats.resources[key]
    })),
    ...presentation.statOrder.outcomes.map((key) => ({
      label: presentation.statLabels[key],
      value: stats.outcomes[key]
    }))
  ];
}

// 把人生节点压成一句可读描述；空节点给一个兜底文案。
function buildReadableLifeNodes(lifeNodes: GameSessionSnapshot['records']['lifeNodes']): string {
  const parts = buildLifeNodeParts(lifeNodes);
  return parts.length > 0 ? parts.join('、') : '暂无关键人生节点';
}

// 把三类事件累计压成一句可读描述，用于体现长期选择倾向。
function buildReadableCategoryPickCounts(
  counts: GameSessionSnapshot['records']['categoryPickCounts']
): string {
  return `成就机会${counts.achievement}次、关系机会${counts.relationship}次、自我机会${counts.self}次`;
}
