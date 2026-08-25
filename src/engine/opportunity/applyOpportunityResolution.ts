import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type {
  AppliedLifeNodeChange,
  LifeNodeMutation,
  OpportunityEventDefinition,
  OpportunityResolutionSummary,
  OpportunityResultGrade,
  StatDelta
} from '../../shared/types/opportunity.ts';
import { combineStatDeltas } from '../../shared/utils/validation.ts';

// 根据结果等级，挑出这次真正要生效的数值变化。
export function buildAppliedDeltas(
  eventDefinition: OpportunityEventDefinition,
  resultGrade: OpportunityResultGrade | null
): StatDelta[] {
  if (resultGrade === null) {
    // 无需检定的事件：直接应用激励 + 固定代价。
    // 固定代价里允许放正负混合效果（例如金钱兜底卡「打工兼职」的金钱+1 精力-1）。
    return combineStatDeltas([...eventDefinition.effects.reward, ...eventDefinition.effects.fixedCost]);
  }

  if (resultGrade === 'criticalSuccess') {
    return combineStatDeltas([...eventDefinition.effects.reward, ...eventDefinition.effects.criticalBonus]);
  }

  if (resultGrade === 'success') {
    return combineStatDeltas([...eventDefinition.effects.reward, ...eventDefinition.effects.fixedCost]);
  }

  if (resultGrade === 'costlySuccess') {
    return combineStatDeltas([
      ...eventDefinition.effects.reward,
      ...eventDefinition.effects.risk,
      ...eventDefinition.effects.fixedCost
    ]);
  }

  return combineStatDeltas([...eventDefinition.effects.risk, ...eventDefinition.effects.fixedCost]);
}

// 把这次结算结果真正写回快照，并产出最终 summary。
export function applyOpportunityResolution(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  summaryBase: Omit<OpportunityResolutionSummary, 'resultGrade' | 'appliedDeltas' | 'lifeNodeChanges' | 'updatedSnapshot'>,
  resultGrade: OpportunityResultGrade | null
): OpportunityResolutionSummary {
  const updatedSnapshot: GameSessionSnapshot = structuredClone(snapshot);
  const appliedDeltas = buildAppliedDeltas(eventDefinition, resultGrade);

  for (const delta of appliedDeltas) {
    applyStatDelta(updatedSnapshot, delta);
  }

  updatedSnapshot.records.selectedEventIds.push(eventDefinition.id);
  updatedSnapshot.records.categoryPickCounts[eventDefinition.category] += 1;

  const lifeNodeChanges =
    resultGrade !== 'failure'
      ? applyLifeNodeMutations(updatedSnapshot, eventDefinition.onNonFailure ?? [])
      : [];

  return {
    ...summaryBase,
    resultGrade,
    appliedDeltas,
    lifeNodeChanges,
    updatedSnapshot
  };
}

// 把一条属性变化写进快照里。
function applyStatDelta(snapshot: GameSessionSnapshot, delta: StatDelta): void {
  switch (delta.key) {
    case 'cognition':
    case 'execution':
    case 'social':
    case 'creativity':
    case 'adaptability':
      snapshot.stats.abilities[delta.key] += delta.amount;
      return;
    case 'money':
    case 'energy':
      snapshot.stats.resources[delta.key] += delta.amount;
      return;
    case 'happiness':
    case 'freedom':
    case 'health':
    case 'experience':
    case 'influence':
      snapshot.stats.outcomes[delta.key] += delta.amount;
      return;
  }
}

// 更新人生节点，并把变化前后的值一起返回。
function applyLifeNodeMutations(
  snapshot: GameSessionSnapshot,
  mutations: LifeNodeMutation[]
): AppliedLifeNodeChange[] {
  return mutations.map((mutation) => {
    const previousValue = snapshot.records.lifeNodes[mutation.key];

    if (mutation.operation === 'increment') {
      snapshot.records.lifeNodes[mutation.key] += mutation.amount;
    } else {
      snapshot.records.lifeNodes[mutation.key] = mutation.value;
    }

    return {
      key: mutation.key,
      previousValue,
      nextValue: snapshot.records.lifeNodes[mutation.key]
    };
  });
}
