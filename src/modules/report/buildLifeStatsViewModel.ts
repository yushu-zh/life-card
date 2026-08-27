import { classifyOpportunityResult } from '../../engine/opportunity/classifyOpportunityResult.ts';
import type { AbilityKey } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type {
  OpportunityCategory,
  OpportunityEventConfig,
  OpportunityResultGrade,
  StatDelta,
  StatKey
} from '../../shared/types/opportunity.ts';
import type { TurnHistoryEntry, TurnSystemConfig } from '../../shared/types/turn.ts';
import type { LifeStatsViewModel, OutcomeKey, Phase4PresentationConfig } from '../../shared/types/ui.ts';

// 三大类的固定顺序与中文标签（与 AI 事实组装处的口径一致）。
const CATEGORY_ORDER: OpportunityCategory[] = ['achievement', 'relationship', 'self'];
const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  achievement: '成就',
  relationship: '关系',
  self: '自我'
};

// 结果等级的可比较排序，用于「实际结果」与「全 7 平均运气」的高低对比。
const GRADE_RANK: Record<OpportunityResultGrade, number> = {
  failure: 0,
  costlySuccess: 1,
  success: 2,
  criticalSuccess: 3
};

// 人生危机类状态 id（专业成就 / 社会地位是正面状态，不计入危机）。
const CRISIS_STATUS_IDS = new Set(['economic-crisis', 'health-crisis', 'energy-crisis', 'life-crisis']);

// 2d6 的理论平均点。
const EXPECTED_DICE_SUM = 7;

// 从终局快照与整回合历史派生人生报告第一页的全部数据统计。
// 纯函数、不依赖 AI：所有指标都由 lifeHistory 遍历重建，进入报告页即可立即展示。
export function buildLifeStatsViewModel(
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  turnSystemConfig: TurnSystemConfig,
  presentation: Phase4PresentationConfig
): LifeStatsViewModel {
  const history = snapshot.records.lifeHistory;
  const startAge = turnSystemConfig.cycleStartAges[0] ?? history[0]?.context.age ?? snapshot.progression.age;
  const endAge = snapshot.progression.age;

  return {
    header: buildHeader(snapshot, history, startAge, endAge),
    finalOutcomes: buildFinalOutcomes(snapshot, presentation),
    categoryBalance: buildCategoryBalance(history),
    unchosen: buildUnchosen(history, opportunityConfig),
    trajectory: buildTrajectory(history, startAge, endAge),
    abilities: buildAbilities(snapshot, history, presentation, startAge, endAge),
    dice: buildDice(history, opportunityConfig),
    resources: buildResources(snapshot, history, startAge, endAge),
    radar: buildRadar(snapshot, presentation)
  };
}

// ===== 头部计数 =====

function buildHeader(
  snapshot: GameSessionSnapshot,
  history: TurnHistoryEntry[],
  startAge: number,
  endAge: number
): LifeStatsViewModel['header'] {
  let criticalSuccessCount = 0;
  let failureCount = 0;
  let rerollCount = 0;
  let fateEventCount = 0;
  let opportunityCount = 0;
  const crisisIds = new Set<string>();

  for (const entry of history) {
    opportunityCount += entry.offer.final.length;
    if (entry.offer.rerollUsed) rerollCount += 1;
    if (entry.opportunity.resultGrade === 'criticalSuccess') criticalSuccessCount += 1;
    if (entry.opportunity.resultGrade === 'failure') failureCount += 1;
    if (entry.fate?.triggered) fateEventCount += 1;
    for (const status of entry.statuses) {
      if (CRISIS_STATUS_IDS.has(status.id)) crisisIds.add(status.id);
    }
  }

  return {
    nickname: snapshot.player.nickname || '匿名玩家',
    startAge,
    endAge,
    choiceCount: history.length,
    opportunityCount,
    criticalSuccessCount,
    failureCount,
    rerollCount,
    crisisCount: crisisIds.size,
    fateEventCount
  };
}

// ===== 最终五维 =====

function buildFinalOutcomes(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeStatsViewModel['finalOutcomes'] {
  return presentation.statOrder.outcomes.map((key) => ({
    key,
    label: presentation.statLabels[key] ?? key,
    value: snapshot.stats.outcomes[key]
  }));
}

// ===== 「机会」与「选择」分开统计 =====

function buildCategoryBalance(history: TurnHistoryEntry[]): LifeStatsViewModel['categoryBalance'] {
  const appeared: Record<OpportunityCategory, number> = { achievement: 0, relationship: 0, self: 0 };
  const chosen: Record<OpportunityCategory, number> = { achievement: 0, relationship: 0, self: 0 };
  let appearedTotal = 0;
  let chosenTotal = 0;

  // 「出现在面前」只统计最终供选的一手牌：换牌前的初始牌并未真正参与抉择。
  for (const entry of history) {
    for (const card of entry.offer.final) {
      appeared[card.category] += 1;
      appearedTotal += 1;
    }
    chosen[entry.selectedCard.category] += 1;
    chosenTotal += 1;
  }

  const items = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    appearedCount: appeared[key],
    appearedRatio: appearedTotal > 0 ? appeared[key] / appearedTotal : 0,
    chosenCount: chosen[key],
    chosenRatio: chosenTotal > 0 ? chosen[key] / chosenTotal : 0
  }));

  // 模板洞察：出现占比明显高于选择占比（差距 >= 10 个百分点且出现过至少 1/4）的类别，
  // 说明玩家一次又一次与它擦肩而过——这与「它本就没怎么出现」是两种完全不同的人生。
  let insight: string | null = null;
  for (const item of items) {
    const gap = item.appearedRatio - item.chosenRatio;
    if (item.appearedRatio >= 0.25 && gap >= 0.1) {
      const appearedPercent = Math.round(item.appearedRatio * 100);
      const chosenPercent = Math.round(item.chosenRatio * 100);
      insight = `「${item.label}」的机会其实出现过很多次（${appearedPercent}%），但你一次又一次没有选择它（最终只占 ${chosenPercent}%）。`;
      break;
    }
  }

  return { items, insight };
}

// ===== 那些没有选择的人生 =====

function buildUnchosen(
  history: TurnHistoryEntry[],
  opportunityConfig: OpportunityEventConfig
): LifeStatsViewModel['unchosen'] {
  const nameById = new Map(opportunityConfig.events.map((event) => [event.id, event.name]));
  const byCategoryCount: Record<OpportunityCategory, number> = { achievement: 0, relationship: 0, self: 0 };
  // 按事件统计出现 / 选择次数，用于找出「最常错过的机会」。
  const eventStats = new Map<string, { category: OpportunityCategory; appeared: number; chosen: number }>();

  const ensure = (eventId: string, category: OpportunityCategory) => {
    let stat = eventStats.get(eventId);
    if (!stat) {
      stat = { category, appeared: 0, chosen: 0 };
      eventStats.set(eventId, stat);
    }
    return stat;
  };

  for (const entry of history) {
    for (const card of entry.offer.final) {
      ensure(card.eventId, card.category).appeared += 1;
    }
    ensure(entry.selectedCard.eventId, entry.selectedCard.category).chosen += 1;
    for (const card of entry.discardedCards) {
      byCategoryCount[card.category] += 1;
    }
  }

  const mostMissed = [...eventStats.entries()]
    .map(([eventId, stat]) => ({
      eventId,
      name: nameById.get(eventId) ?? eventId,
      appearedCount: stat.appeared,
      chosenCount: stat.chosen,
      missedCount: stat.appeared - stat.chosen
    }))
    .filter((item) => item.missedCount > 0)
    // 错过次数优先，其次出现次数：越是反复出现却越不被选择的牌越靠前。
    .sort((a, b) => b.missedCount - a.missedCount || b.appearedCount - a.appearedCount)
    .slice(0, 5)
    .map(({ eventId, name, appearedCount, chosenCount }) => ({ eventId, name, appearedCount, chosenCount }));

  // 纯模板生成的数据描述（非 AI）：客观陈述出现与选择的次数。
  let missedSentence: string | null = null;
  const top = mostMissed[0];
  if (top) {
    missedSentence =
      top.chosenCount === 0
        ? `「${top.name}」曾 ${top.appearedCount} 次出现在你的人生中，你一次也没有选择它。`
        : `「${top.name}」曾 ${top.appearedCount} 次出现在你的人生中，你只选择了 ${top.chosenCount} 次。`;
  }

  return {
    totalCount: history.reduce((sum, entry) => sum + entry.discardedCards.length, 0),
    byCategory: CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      count: byCategoryCount[key]
    })),
    mostMissed,
    missedSentence
  };
}

// ===== 一生的选择轨迹（累计选择比例） =====

function buildTrajectory(
  history: TurnHistoryEntry[],
  startAge: number,
  endAge: number
): LifeStatsViewModel['trajectory'] {
  const cumulative: Record<OpportunityCategory, number> = { achievement: 0, relationship: 0, self: 0 };
  const pointsByCategory: Record<OpportunityCategory, Array<{ age: number; ratio: number }>> = {
    achievement: [],
    relationship: [],
    self: []
  };

  // 每个回合结束后记录一次累计占比，玩家能直观看到「路径是怎样形成的」。
  history.forEach((entry, index) => {
    cumulative[entry.selectedCard.category] += 1;
    const total = index + 1;
    for (const key of CATEGORY_ORDER) {
      pointsByCategory[key].push({ age: entry.context.age, ratio: cumulative[key] / total });
    }
  });

  return {
    startAge,
    endAge,
    series: CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      points: pointsByCategory[key]
    }))
  };
}

// ===== 能力成长：20 岁的你 → 终局的你 + 成长发生的阶段 =====

function buildAbilities(
  snapshot: GameSessionSnapshot,
  history: TurnHistoryEntry[],
  presentation: Phase4PresentationConfig,
  startAge: number,
  endAge: number
): LifeStatsViewModel['abilities'] {
  const abilityKeys = presentation.statOrder.abilities;
  const abilityKeySet = new Set<StatKey>(abilityKeys);

  // 每回合的能力增量合计（机会 + 命运 + 状态三条来源），用于反推初始值与定位成长阶段。
  const totalDelta = new Map<AbilityKey, number>(abilityKeys.map((key) => [key, 0]));
  const growthAgesByKey = new Map<AbilityKey, number[]>(abilityKeys.map((key) => [key, []]));

  for (const entry of history) {
    const turnDelta = new Map<AbilityKey, number>(abilityKeys.map((key) => [key, 0]));
    for (const delta of collectTurnDeltas(entry)) {
      if (!abilityKeySet.has(delta.key)) continue;
      const key = delta.key as AbilityKey;
      turnDelta.set(key, (turnDelta.get(key) ?? 0) + delta.amount);
      totalDelta.set(key, (totalDelta.get(key) ?? 0) + delta.amount);
    }
    for (const key of abilityKeys) {
      if ((turnDelta.get(key) ?? 0) > 0) {
        growthAgesByKey.get(key)!.push(entry.context.age);
      }
    }
  }

  const items = abilityKeys.map((key) => {
    const endValue = snapshot.stats.abilities[key];
    const startValue = endValue - (totalDelta.get(key) ?? 0);
    return {
      key,
      label: presentation.statLabels[key] ?? key,
      startValue,
      endValue,
      delta: endValue - startValue
    };
  });

  // 时间轴年龄刻度：每 5 岁一列，覆盖起点到终点。
  const ageMarks: number[] = [];
  for (let age = startAge; age <= endAge; age += 5) {
    ageMarks.push(age);
  }

  return {
    startAge,
    endAge,
    items,
    timeline: {
      ageMarks,
      rows: abilityKeys.map((key) => ({
        key,
        label: presentation.statLabels[key] ?? key,
        growthAges: growthAgesByKey.get(key) ?? []
      }))
    }
  };
}

// ===== 一生的骰运：分布、平均点与「全 7 反事实」 =====

function buildDice(
  history: TurnHistoryEntry[],
  opportunityConfig: OpportunityEventConfig
): LifeStatsViewModel['dice'] {
  const checked = history.filter(
    (entry) => entry.opportunity.resolutionKind === 'checked' && entry.opportunity.formula && entry.opportunity.resultGrade
  );
  if (checked.length === 0) return null;

  const histogram = new Map<number, number>();
  for (let sum = 2; sum <= 12; sum += 1) histogram.set(sum, 0);

  let totalSum = 0;
  let betterCount = 0;
  let sameCount = 0;
  let worseCount = 0;

  for (const entry of checked) {
    const formula = entry.opportunity.formula!;
    const actualGrade = entry.opportunity.resultGrade!;
    const diceSum = formula.dice.first + formula.dice.second;
    histogram.set(diceSum, (histogram.get(diceSum) ?? 0) + 1);
    totalSum += diceSum;

    // 反事实：把本次骰点替换为理论平均 7，能力值保持当时水平，重新判定结果等级。
    // 由此把「运气」与「能力」拆开，看骰子究竟帮了忙还是拖了后腿。
    const abilitySum = formula.abilities.reduce((sum, ability) => sum + ability.value, 0);
    const counterGrade = classifyOpportunityResult(EXPECTED_DICE_SUM + abilitySum, opportunityConfig.scoreBands);
    const diff = GRADE_RANK[actualGrade] - GRADE_RANK[counterGrade];
    if (diff > 0) betterCount += 1;
    else if (diff < 0) worseCount += 1;
    else sameCount += 1;
  }

  return {
    rollCount: checked.length,
    averageSum: totalSum / checked.length,
    expectedSum: EXPECTED_DICE_SUM,
    histogram: [...histogram.entries()].map(([sum, count]) => ({ sum, count })),
    betterCount,
    sameCount,
    worseCount
  };
}

// ===== 金钱与精力：一生的起伏 =====

function buildResources(
  snapshot: GameSessionSnapshot,
  history: TurnHistoryEntry[],
  startAge: number,
  endAge: number
): LifeStatsViewModel['resources'] {
  if (history.length === 0) return null;

  // 初始值 = 终值 - 全程增量合计（机会 / 命运 / 状态三条来源都纳入）。
  let moneyDelta = 0;
  let energyDelta = 0;
  for (const entry of history) {
    for (const delta of collectTurnDeltas(entry)) {
      if (delta.key === 'money') moneyDelta += delta.amount;
      if (delta.key === 'energy') energyDelta += delta.amount;
    }
  }

  const buildSeries = (key: 'money' | 'energy', initialValue: number) => ({
    startValue: initialValue,
    endValue: snapshot.stats.resources[key],
    points: [
      { age: startAge, value: initialValue },
      // 回合结算后的快照即该年龄节点的真实取值。
      ...history.map((entry) => ({
        age: entry.progressionAfterTurn.age,
        value: entry.snapshotAfterTurn.stats.resources[key]
      }))
    ]
  });

  return {
    startAge,
    endAge,
    money: buildSeries('money', snapshot.stats.resources.money - moneyDelta),
    energy: buildSeries('energy', snapshot.stats.resources.energy - energyDelta)
  };
}

// ===== 最终五维雷达图 =====

function buildRadar(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeStatsViewModel['radar'] {
  const axes = presentation.statOrder.outcomes.map((key: OutcomeKey) => ({
    key,
    label: presentation.statLabels[key] ?? key,
    value: snapshot.stats.outcomes[key]
  }));
  // 刻度上限取 10 与实际最大值中的较大者，避免小数值顶满全图或大数值溢出。
  const scaleMax = Math.max(10, ...axes.map((axis) => axis.value));
  return { scaleMax, axes };
}

// 汇合一回合内所有来源的数值变化：机会结算 + 命运事件 + 各状态结算。
function collectTurnDeltas(entry: TurnHistoryEntry): StatDelta[] {
  const deltas: StatDelta[] = [...entry.opportunity.appliedDeltas];
  if (entry.fate) deltas.push(...entry.fate.appliedDeltas);
  for (const status of entry.statuses) {
    // 死亡风险类状态没有 appliedDeltas 字段，需要按 kind 区分。
    if (status.kind !== 'death-risk') deltas.push(...status.appliedDeltas);
  }
  return deltas;
}
