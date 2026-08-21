import type { FateConfig, FateEventDefinition } from '../../shared/types/fate.ts';
import type { OpportunityCategory, StatDelta, StatKey } from '../../shared/types/opportunity.ts';
import type { TurnRuleName, TurnStageRule, TurnSystemConfig } from '../../shared/types/turn.ts';
import { isIntegerInRange, isNonNegativeInteger } from '../../shared/utils/validation.ts';

const CATEGORY_VALUES = ['achievement', 'relationship', 'self'] as const satisfies OpportunityCategory[];
const TURN_RULE_VALUES = ['balanced', 'weighted-by-pick-counts'] as const satisfies TurnRuleName[];
const STAT_KEYS = [
  'cognition',
  'execution',
  'social',
  'creativity',
  'adaptability',
  'money',
  'energy',
  'happiness',
  'freedom',
  'health',
  'experience',
  'influence'
] as const satisfies StatKey[];

// 校验并返回 Phase 2 的完整回合系统配置。
export function validateTurnSystemConfig(value: unknown): TurnSystemConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Turn system config must be an object');
  }

  const config = value as Record<string, unknown>;

  if (!Array.isArray(config.cycleStartAges)) {
    throw new Error('Turn system config field cycleStartAges must be an array');
  }

  if (!isNonNegativeInteger(config.endAgeExclusive)) {
    throw new Error('Turn system config field endAgeExclusive must be a non-negative integer');
  }

  if (!isNonNegativeInteger(config.redrawLimitPerTurn)) {
    throw new Error('Turn system config field redrawLimitPerTurn must be a non-negative integer');
  }

  if (!Array.isArray(config.categoryTieBreakOrder)) {
    throw new Error('Turn system config field categoryTieBreakOrder must be an array');
  }

  if (!Array.isArray(config.stageRules)) {
    throw new Error('Turn system config field stageRules must be an array');
  }

  if (!config.fate || typeof config.fate !== 'object') {
    throw new Error('Turn system config field fate must be an object');
  }

  const cycleStartAges = validateCycleStartAges(config.cycleStartAges);
  const categoryTieBreakOrder = validateCategoryTieBreakOrder(config.categoryTieBreakOrder);
  const stageRules = (config.stageRules as unknown[]).map((stageRule, index) => validateStageRule(stageRule, index));
  const fate = validateFateConfig(config.fate as Record<string, unknown>);
  const endAgeExclusive = config.endAgeExclusive as number;
  const redrawLimitPerTurn = config.redrawLimitPerTurn as number;

  validateStageCoverage(stageRules, cycleStartAges, endAgeExclusive);

  return {
    cycleStartAges,
    endAgeExclusive,
    redrawLimitPerTurn,
    categoryTieBreakOrder,
    stageRules,
    fate
  };
}

function validateCycleStartAges(value: unknown[]): number[] {
  const ages = value.map((age, index) => {
    if (!isNonNegativeInteger(age)) {
      throw new Error(`Turn system config cycleStartAges[${index}] must be a non-negative integer`);
    }

    return age;
  });

  if (ages.length === 0) {
    throw new Error('Turn system config cycleStartAges must not be empty');
  }

  for (let index = 1; index < ages.length; index += 1) {
    if (ages[index] <= ages[index - 1]) {
      throw new Error('Turn system config cycleStartAges must be strictly increasing');
    }
  }

  return ages;
}

function validateCategoryTieBreakOrder(value: unknown[]): OpportunityCategory[] {
  const categories = value.map((category, index) => {
    if (!isOneOf(category, CATEGORY_VALUES)) {
      throw new Error(`Turn system config categoryTieBreakOrder[${index}] is invalid`);
    }

    return category;
  });

  if (new Set(categories).size !== CATEGORY_VALUES.length) {
    throw new Error('Turn system config categoryTieBreakOrder must contain each category exactly once');
  }

  return categories;
}

function validateStageRule(value: unknown, index: number): TurnStageRule {
  if (!value || typeof value !== 'object') {
    throw new Error(`Turn system stage rule at index ${index} must be an object`);
  }

  const stageRule = value as Record<string, unknown>;

  if (!isNonNegativeInteger(stageRule.minAge)) {
    throw new Error(`Turn system stage rule at index ${index} field minAge must be a non-negative integer`);
  }

  if (!isNonNegativeInteger(stageRule.maxExclusive)) {
    throw new Error(`Turn system stage rule at index ${index} field maxExclusive must be a non-negative integer`);
  }

  if ((stageRule.minAge as number) >= (stageRule.maxExclusive as number)) {
    throw new Error(`Turn system stage rule at index ${index} must have minAge < maxExclusive`);
  }

  if (!isIntegerInRange(stageRule.turnsPerCycle, 1, Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Turn system stage rule at index ${index} field turnsPerCycle must be a positive integer`);
  }

  if (!Array.isArray(stageRule.turnRules)) {
    throw new Error(`Turn system stage rule at index ${index} field turnRules must be an array`);
  }

  const turnRules = stageRule.turnRules.map((turnRule, turnRuleIndex) => {
    if (!isOneOf(turnRule, TURN_RULE_VALUES)) {
      throw new Error(`Turn system stage rule at index ${index} turnRules[${turnRuleIndex}] is invalid`);
    }

    return turnRule;
  });

  if (turnRules.length !== stageRule.turnsPerCycle) {
    throw new Error(`Turn system stage rule at index ${index} turnRules length must match turnsPerCycle`);
  }

  return {
    minAge: stageRule.minAge as number,
    maxExclusive: stageRule.maxExclusive as number,
    turnsPerCycle: stageRule.turnsPerCycle as number,
    turnRules
  };
}

function validateStageCoverage(stageRules: TurnStageRule[], cycleStartAges: number[], endAgeExclusive: number): void {
  if (stageRules.length === 0) {
    throw new Error('Turn system config stageRules must not be empty');
  }

  const sortedStageRules = [...stageRules].sort((left, right) => left.minAge - right.minAge);

  if (sortedStageRules[0].minAge !== cycleStartAges[0]) {
    throw new Error('Turn system stage rules must start from the first cycle start age');
  }

  for (let index = 1; index < sortedStageRules.length; index += 1) {
    if (sortedStageRules[index - 1].maxExclusive !== sortedStageRules[index].minAge) {
      throw new Error('Turn system stage rules must be continuous and non-overlapping');
    }
  }

  if (sortedStageRules.at(-1)?.maxExclusive !== endAgeExclusive) {
    throw new Error('Turn system stage rules must end at endAgeExclusive');
  }

  for (const age of cycleStartAges) {
    const matches = sortedStageRules.filter((stageRule) => age >= stageRule.minAge && age < stageRule.maxExclusive);

    if (matches.length !== 1) {
      throw new Error(`Turn system config cycle start age ${age} must belong to exactly one stage rule`);
    }
  }
}

function validateFateConfig(value: Record<string, unknown>): FateConfig {
  if (typeof value.triggerProbability !== 'number' || Number.isNaN(value.triggerProbability)) {
    throw new Error('Turn system fate field triggerProbability must be a number');
  }

  if (value.triggerProbability < 0 || value.triggerProbability > 1) {
    throw new Error('Turn system fate field triggerProbability must be between 0 and 1');
  }

  if (typeof value.adaptabilityMitigationPerPoint !== 'number' || Number.isNaN(value.adaptabilityMitigationPerPoint)) {
    throw new Error('Turn system fate field adaptabilityMitigationPerPoint must be a number');
  }

  if (value.adaptabilityMitigationPerPoint < 0 || value.adaptabilityMitigationPerPoint > 1) {
    throw new Error('Turn system fate field adaptabilityMitigationPerPoint must be between 0 and 1');
  }

  if (!Array.isArray(value.events)) {
    throw new Error('Turn system fate field events must be an array');
  }

  const events = value.events.map((event, index) => validateFateEventDefinition(event, index));

  if (events.length === 0) {
    throw new Error('Turn system fate field events must not be empty');
  }

  const ids = new Set<string>();

  for (const event of events) {
    if (ids.has(event.id)) {
      throw new Error(`Turn system fate event ids must be unique: ${event.id}`);
    }

    ids.add(event.id);
  }

  return {
    triggerProbability: value.triggerProbability,
    adaptabilityMitigationPerPoint: value.adaptabilityMitigationPerPoint,
    events
  };
}

function validateFateEventDefinition(value: unknown, index: number): FateEventDefinition {
  if (!value || typeof value !== 'object') {
    throw new Error(`Turn system fate event at index ${index} must be an object`);
  }

  const event = value as Record<string, unknown>;

  if (typeof event.id !== 'string' || event.id.length === 0) {
    throw new Error(`Turn system fate event at index ${index} must have a non-empty string id`);
  }

  if (typeof event.name !== 'string' || event.name.length === 0) {
    throw new Error(`Turn system fate event ${event.id} must have a non-empty string name`);
  }

  if (!Array.isArray(event.effects)) {
    throw new Error(`Turn system fate event ${event.id} field effects must be an array`);
  }

  return {
    id: event.id,
    name: event.name,
    effects: validateStatDeltas(event.id, event.effects)
  };
}

function validateStatDeltas(eventId: string, value: unknown[]): StatDelta[] {
  return value.map((delta, index) => {
    if (!delta || typeof delta !== 'object') {
      throw new Error(`Turn system fate event ${eventId} effect[${index}] must be an object`);
    }

    const deltaValue = delta as Record<string, unknown>;

    if (!isOneOf(deltaValue.key, STAT_KEYS)) {
      throw new Error(`Turn system fate event ${eventId} effect[${index}].key is invalid`);
    }

    if (!isIntegerInRange(deltaValue.amount, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Turn system fate event ${eventId} effect[${index}].amount must be an integer`);
    }

    return {
      key: deltaValue.key,
      amount: deltaValue.amount as number
    };
  });
}

function isOneOf<T extends readonly string[]>(value: unknown, items: T): value is T[number] {
  return typeof value === 'string' && items.includes(value as T[number]);
}
