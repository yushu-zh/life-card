import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityCategory } from '../../shared/types/opportunity.ts';
import type { TurnCategoryPlan, TurnPatternKind, TurnStageRule, TurnSystemConfig } from '../../shared/types/turn.ts';
import { sumNumbers } from '../../shared/utils/validation.ts';

const BALANCED_CATEGORIES: OpportunityCategory[] = ['achievement', 'relationship', 'self'];

// 根据当前年龄、回合和类别累计点数，决定本回合的类别结构。
export function buildTurnCategoryPlan(
  snapshot: GameSessionSnapshot,
  config: TurnSystemConfig,
  options?: {
    random?: () => number;
  }
): TurnCategoryPlan {
  const stageRule = findStageRuleForAge(snapshot.progression.age, config.stageRules);
  const turnRule = stageRule.turnRules[snapshot.progression.turn - 1];

  if (!turnRule) {
    throw new Error(
      `Turn ${snapshot.progression.turn} is out of range for age ${snapshot.progression.age} stage rule`
    );
  }

  if (turnRule === 'balanced') {
    return {
      patternKind: 'balanced',
      slotCategories: [...BALANCED_CATEGORIES]
    };
  }

  return buildWeightedCategoryPlan(snapshot, config, options?.random ?? Math.random);
}

function buildWeightedCategoryPlan(
  snapshot: GameSessionSnapshot,
  config: TurnSystemConfig,
  random: () => number
): TurnCategoryPlan {
  const categoryCounts = snapshot.records.categoryPickCounts;
  const totalCount = sumNumbers(Object.values(categoryCounts));

  if (totalCount === 0) {
    return {
      patternKind: 'weighted-by-pick-counts',
      slotCategories: [...BALANCED_CATEGORIES]
    };
  }

  const sortedCategories = [...config.categoryTieBreakOrder].sort((left, right) => {
    const countDiff = categoryCounts[right] - categoryCounts[left];

    if (countDiff !== 0) {
      return countDiff;
    }

    return config.categoryTieBreakOrder.indexOf(left) - config.categoryTieBreakOrder.indexOf(right);
  });
  const topCategory = sortedCategories[0];
  const secondCategory = sortedCategories[1];
  const weightedProbability = categoryCounts[topCategory] / totalCount;

  if (drawRandom(random) >= weightedProbability) {
    return {
      patternKind: 'weighted-by-pick-counts',
      slotCategories: [...BALANCED_CATEGORIES]
    };
  }

  return {
    patternKind: 'weighted-by-pick-counts',
    slotCategories: [topCategory, topCategory, secondCategory]
  };
}

function findStageRuleForAge(age: number, stageRules: TurnStageRule[]): TurnStageRule {
  const matchedStageRule = stageRules.find((stageRule) => age >= stageRule.minAge && age < stageRule.maxExclusive);

  if (!matchedStageRule) {
    throw new Error(`No turn stage rule matches age ${age}`);
  }

  return matchedStageRule;
}

function drawRandom(random: () => number): number {
  const value = random();

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a number between 0 and 1');
  }

  return value;
}
