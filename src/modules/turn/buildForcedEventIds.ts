import { isOpportunitySelectable } from '../../engine/opportunity/checkOpportunityAvailability.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityEventConfig } from '../../shared/types/opportunity.ts';
import type { TurnSystemConfig } from '../../shared/types/turn.ts';

// 根据当前资源状态计算本回合需要强制刷出的兜底卡 id 列表。
// 精力 <= 阈值 -> 休养身心；金钱 <= 阈值 -> 一张当前可选的赚钱卡。
export function buildForcedEventIds(
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  turnSystemConfig: TurnSystemConfig,
  random: () => number
): string[] {
  const forcedEventIds: string[] = [];

  if (snapshot.stats.resources.energy <= turnSystemConfig.energyRules.forceRestMaxEnergy) {
    forcedEventIds.push(turnSystemConfig.energyRules.restCardId);
  }

  if (snapshot.stats.resources.money <= turnSystemConfig.moneyRules.forceIncomeMaxMoney) {
    const incomeCardId = pickForcedIncomeCardId(snapshot, opportunityConfig, turnSystemConfig, random);

    if (incomeCardId) {
      forcedEventIds.push(incomeCardId);
    }
  }

  return forcedEventIds;
}

// 从赚钱卡池里挑一张当前资源允许选择的卡，保证刷出来的兜底卡一定可选。
function pickForcedIncomeCardId(
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  turnSystemConfig: TurnSystemConfig,
  random: () => number
): string | undefined {
  const { incomeCardIds } = turnSystemConfig.moneyRules;
  const selectableIds = incomeCardIds.filter((eventId) => {
    const event = opportunityConfig.events.find((definition) => definition.id === eventId);

    return event !== undefined && isOpportunitySelectable(snapshot, event, turnSystemConfig.energyRules);
  });

  if (selectableIds.length === 0) {
    return undefined;
  }

  return selectableIds[Math.floor(random() * selectableIds.length)];
}
