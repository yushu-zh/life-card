import { isOpportunitySelectable } from '../../src/engine/opportunity/checkOpportunityAvailability.ts';
import type { GameSessionSnapshot } from '../../src/shared/types/game-session.ts';
import type {
  OpportunityCategory,
  OpportunityEventConfig,
  OpportunityEventDefinition,
  StatDelta
} from '../../src/shared/types/opportunity.ts';
import type { EnergyRulesConfig, TurnOfferCard, TurnOfferSlotIndex } from '../../src/shared/types/turn.ts';
import type { SimulationStrategyDefinition } from '../types.ts';

// 类别并列时的默认优先级，与 turn-system 配置里的 categoryTieBreakOrder 保持一致。
const DEFAULT_CATEGORY_ORDER: OpportunityCategory[] = ['achievement', 'relationship', 'self'];

// 策略决策时需要的运行时上下文。
// 目前六种策略只依赖事件定义、事件配置和随机源；
// 保留 snapshot 是为了将来若出现需要读取当前属性的策略时不改这个入口。
export interface SimulationStrategyContext {
  strategy: SimulationStrategyDefinition;
  snapshot: GameSessionSnapshot;
  eventConfig: OpportunityEventConfig;
  energyRules: EnergyRulesConfig;
  random: () => number;
}

// 一张牌在策略评分视角下的只读分析结果。
interface CardAnalysis {
  slotIndex: TurnOfferSlotIndex;
  category: OpportunityCategory;
  successPositiveTotal: number;
  failureNegativeTotal: number;
}

// 统一策略决策入口：根据策略定义从当前三张牌中选出一张。
// 所有策略都归一到这里，避免每种策略各写一套选择逻辑。
export function selectTurnCard(
  offer: TurnOfferCard[],
  context: SimulationStrategyContext
): TurnOfferSlotIndex {
  const { strategy, snapshot, eventConfig, energyRules, random } = context;

  if (offer.length === 0) {
    throw new Error('Cannot select a turn card from an empty offer');
  }

  // 规则3/8：先过滤掉当前资源不允许选择的牌，再在剩余牌里按策略挑选。
  const selectableOffer = offer.filter((card) => {
    const definition = findEventDefinition(card.eventId, eventConfig);

    return isOpportunitySelectable(snapshot, definition, energyRules);
  });

  if (selectableOffer.length === 0) {
    throw new Error('No selectable turn card is available in the current offer');
  }

  const analyses = selectableOffer.map((card) => analyzeCard(card, eventConfig));

  // 完全随机策略：在可选择的牌组中等概率选一张。
  if (strategy.tieBreak === 'random') {
    return selectableOffer[Math.floor(random() * selectableOffer.length)].slotIndex;
  }

  // prefer-xxx 类策略：按 preferredCategories 的先后顺序，取第一个还有牌的类别。
  if (strategy.preferredCategories && strategy.preferredCategories.length > 0) {
    for (const category of strategy.preferredCategories) {
      const candidates = analyses.filter((analysis) => analysis.category === category);

      if (candidates.length > 0) {
        return pickBest(candidates, {
          primaryScore: (analysis) => analysis.successPositiveTotal,
          primaryDirection: 'desc',
          categoryOrder: strategy.preferredCategories
        }).slotIndex;
      }
    }

    throw new Error('No preferred category matched the current offer');
  }

  // 高收益 / 低风险策略：在整个牌组上按评分排序。
  const preferLowRisk = strategy.tieBreak === 'failure-negative-total';

  return pickBest(analyses, {
    primaryScore: preferLowRisk
      ? (analysis) => analysis.failureNegativeTotal
      : (analysis) => analysis.successPositiveTotal,
    primaryDirection: preferLowRisk ? 'asc' : 'desc',
    categoryOrder: strategy.categoryTieBreakOrder ?? DEFAULT_CATEGORY_ORDER
  }).slotIndex;
}

// 计算一张牌的成功正向值与失败负向值，供策略评分使用。
// 口径与正式结算 applyOpportunityResolution 对齐：
//   成功结果 = reward + fixedCost；失败结果 = risk + fixedCost。
function analyzeCard(card: TurnOfferCard, eventConfig: OpportunityEventConfig): CardAnalysis {
  const definition = findEventDefinition(card.eventId, eventConfig);

  return {
    slotIndex: card.slotIndex,
    category: definition.category,
    successPositiveTotal: sumPositiveAmounts([...definition.effects.reward, ...definition.effects.fixedCost]),
    failureNegativeTotal: sumNegativeMagnitudes([...definition.effects.risk, ...definition.effects.fixedCost])
  };
}

// 从事件配置里按 id 找到事件定义；找不到说明牌组与配置不一致，直接抛错让该局记为无效。
function findEventDefinition(eventId: string, eventConfig: OpportunityEventConfig): OpportunityEventDefinition {
  const definition = eventConfig.events.find((event) => event.id === eventId);

  if (!definition) {
    throw new Error(`Opportunity event ${eventId} was not found in the event config`);
  }

  return definition;
}

// 求和一组数值变化中所有正向变化的量。
function sumPositiveAmounts(deltas: StatDelta[]): number {
  return deltas.reduce((total, delta) => (delta.amount > 0 ? total + delta.amount : total), 0);
}

// 求和一组数值变化中所有负向变化的绝对值。
function sumNegativeMagnitudes(deltas: StatDelta[]): number {
  return deltas.reduce((total, delta) => (delta.amount < 0 ? total + Math.abs(delta.amount) : total), 0);
}

// 按“主评分 -> 类别优先级 -> 展示顺序”依次打破平局，返回排在第一位的牌。
function pickBest(
  candidates: CardAnalysis[],
  options: {
    primaryScore: (analysis: CardAnalysis) => number;
    primaryDirection: 'asc' | 'desc';
    categoryOrder: OpportunityCategory[];
  }
): CardAnalysis {
  return [...candidates].sort((left, right) => {
    const leftScore = options.primaryScore(left);
    const rightScore = options.primaryScore(right);

    if (leftScore !== rightScore) {
      return options.primaryDirection === 'desc' ? rightScore - leftScore : leftScore - rightScore;
    }

    const categoryDiff =
      options.categoryOrder.indexOf(left.category) - options.categoryOrder.indexOf(right.category);

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return left.slotIndex - right.slotIndex;
  })[0];
}
