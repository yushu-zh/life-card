import type {
  LifeNodeMutation,
  LifeNodeRequirement,
  OpportunityCategory,
  OpportunityEventConfig,
  OpportunityEventDefinition,
  OpportunityResultGrade,
  StatDelta,
  StatKey
} from '../../shared/types/opportunity.ts';
import type { AbilityKey } from '../../shared/types/bootstrap.ts';
import { isIntegerInRange, isNonNegativeInteger } from '../../shared/utils/validation.ts';

// 这些是机会事件配置里允许出现的事件类别。
const CATEGORIES = ['achievement', 'relationship', 'self'] as const satisfies OpportunityCategory[];
// 这些是检定配置里允许引用的能力键。
const ABILITY_KEYS = ['cognition', 'execution', 'social', 'creativity', 'adaptability'] as const satisfies AbilityKey[];
// 这些是事件效果里允许变化的全部属性键。
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
// 这些是分档配置里必须覆盖的四种结果等级。
const RESULT_GRADES = ['failure', 'costlySuccess', 'success', 'criticalSuccess'] as const satisfies OpportunityResultGrade[];
// 这些是当前配置允许引用的人生节点键。
const LIFE_NODE_KEYS = ['romanceSuccessCount', 'marriageEstablished', 'familyEstablished'] as const;

// 检查整份事件配置是否合法，并整理成固定结构返回。
export function validateOpportunityEventConfig(value: unknown): OpportunityEventConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Opportunity event config must be an object');
  }

  const config = value as Record<string, unknown>;

  if (!config.scoreBands || typeof config.scoreBands !== 'object') {
    throw new Error('Opportunity event config field scoreBands must be an object');
  }

  if (!Array.isArray(config.events)) {
    throw new Error('Opportunity event config field events must be an array');
  }

  const scoreBands = validateScoreBands(config.scoreBands as Record<string, unknown>);
  const events = config.events.map((event, index) => validateEventDefinition(event, index));

  const ids = new Set<string>();

  for (const event of events) {
    if (ids.has(event.id)) {
      throw new Error(`Opportunity event ids must be unique: ${event.id}`);
    }

    ids.add(event.id);
  }

  return {
    scoreBands,
    events
  };
}

// 检查四档分数区间是否合法。
function validateScoreBands(value: Record<string, unknown>): OpportunityEventConfig['scoreBands'] {
  for (const grade of RESULT_GRADES) {
    if (!(grade in value) || !value[grade] || typeof value[grade] !== 'object') {
      throw new Error(`Opportunity score band ${grade} must be an object`);
    }
  }

  const failure = value.failure as Record<string, unknown>;
  const costlySuccess = value.costlySuccess as Record<string, unknown>;
  const success = value.success as Record<string, unknown>;
  const criticalSuccess = value.criticalSuccess as Record<string, unknown>;

  if (!isIntegerInRange(failure.max, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)) {
    throw new Error('Opportunity score band failure.max must be an integer');
  }

  if (
    !isIntegerInRange(costlySuccess.min, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) ||
    !isIntegerInRange(costlySuccess.max, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error('Opportunity score band costlySuccess must contain integer min and max');
  }

  if (
    !isIntegerInRange(success.min, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) ||
    !isIntegerInRange(success.max, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error('Opportunity score band success must contain integer min and max');
  }

  if (!isIntegerInRange(criticalSuccess.min, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)) {
    throw new Error('Opportunity score band criticalSuccess.min must be an integer');
  }

  const normalized = {
    failure: {
      max: failure.max as number
    },
    costlySuccess: {
      min: costlySuccess.min as number,
      max: costlySuccess.max as number
    },
    success: {
      min: success.min as number,
      max: success.max as number
    },
    criticalSuccess: {
      min: criticalSuccess.min as number
    }
  };

  if (
    normalized.costlySuccess.min !== normalized.failure.max + 1 ||
    normalized.success.min !== normalized.costlySuccess.max + 1 ||
    normalized.criticalSuccess.min !== normalized.success.max + 1
  ) {
    throw new Error('Opportunity score bands must form a continuous non-overlapping range');
  }

  return normalized;
}

// 检查单个事件定义是否合法。
function validateEventDefinition(value: unknown, index: number): OpportunityEventDefinition {
  if (!value || typeof value !== 'object') {
    throw new Error(`Opportunity event at index ${index} must be an object`);
  }

  const event = value as Record<string, unknown>;

  if (typeof event.id !== 'string' || event.id.length === 0) {
    throw new Error(`Opportunity event at index ${index} must have a non-empty string id`);
  }

  if (typeof event.name !== 'string' || event.name.length === 0) {
    throw new Error(`Opportunity event ${event.id} must have a non-empty string name`);
  }

  if (!isOneOf(event.category, CATEGORIES)) {
    throw new Error(`Opportunity event ${event.id} has invalid category`);
  }

  if (!event.availability || typeof event.availability !== 'object') {
    throw new Error(`Opportunity event ${event.id} field availability must be an object`);
  }

  if (!event.check || typeof event.check !== 'object') {
    throw new Error(`Opportunity event ${event.id} field check must be an object`);
  }

  if (!event.effects || typeof event.effects !== 'object') {
    throw new Error(`Opportunity event ${event.id} field effects must be an object`);
  }

  const check = validateCheck(event.id, event.check as Record<string, unknown>);

  return {
    id: event.id,
    name: event.name,
    category: event.category,
    availability: validateAvailability(event.id, event.availability as Record<string, unknown>),
    check,
    effects: validateEffects(event.id, event.effects as Record<string, unknown>),
    onNonFailure: validateLifeNodeMutations(event.id, event.onNonFailure)
  };
}

// 检查事件的出现条件是否合法。
function validateAvailability(
  eventId: string,
  value: Record<string, unknown>
): OpportunityEventDefinition['availability'] {
  let age: OpportunityEventDefinition['availability']['age'];

  if (value.age !== undefined) {
    if (!value.age || typeof value.age !== 'object') {
      throw new Error(`Opportunity event ${eventId} field availability.age must be an object`);
    }

    const ageValue = value.age as Record<string, unknown>;

    if (ageValue.min !== undefined && !isNonNegativeInteger(ageValue.min)) {
      throw new Error(`Opportunity event ${eventId} field availability.age.min must be a non-negative integer`);
    }

    if (ageValue.maxExclusive !== undefined && !isNonNegativeInteger(ageValue.maxExclusive)) {
      throw new Error(
        `Opportunity event ${eventId} field availability.age.maxExclusive must be a non-negative integer`
      );
    }

    if (
      ageValue.min !== undefined &&
      ageValue.maxExclusive !== undefined &&
      (ageValue.min as number) >= (ageValue.maxExclusive as number)
    ) {
      throw new Error(`Opportunity event ${eventId} age range must have min < maxExclusive`);
    }

    age = {
      min: ageValue.min as number | undefined,
      maxExclusive: ageValue.maxExclusive as number | undefined
    };
  }

  if (value.maxOccurrences !== undefined && value.maxOccurrences !== null && !isNonNegativeInteger(value.maxOccurrences)) {
    throw new Error(`Opportunity event ${eventId} field availability.maxOccurrences must be null or a non-negative integer`);
  }

  return {
    age,
    maxOccurrences: value.maxOccurrences === undefined ? null : (value.maxOccurrences as number | null),
    requiresLifeNodes: validateLifeNodeRequirements(eventId, value.requiresLifeNodes)
  };
}

// 检查事件的检定方式是否合法。
function validateCheck(eventId: string, value: Record<string, unknown>): OpportunityEventDefinition['check'] {
  if (value.kind !== 'none' && value.kind !== 'sum') {
    throw new Error(`Opportunity event ${eventId} field check.kind must be none or sum`);
  }

  if (!Array.isArray(value.abilityKeys)) {
    throw new Error(`Opportunity event ${eventId} field check.abilityKeys must be an array`);
  }

  const abilityKeys = value.abilityKeys.map((abilityKey) => {
    if (!isOneOf(abilityKey, ABILITY_KEYS)) {
      throw new Error(`Opportunity event ${eventId} contains an invalid ability key`);
    }

    return abilityKey;
  });

  if (value.kind === 'sum' && abilityKeys.length === 0) {
    throw new Error(`Opportunity event ${eventId} requires at least one ability key for check kind sum`);
  }

  if (value.kind === 'none' && abilityKeys.length > 0) {
    throw new Error(`Opportunity event ${eventId} cannot define ability keys for check kind none`);
  }

  return {
    kind: value.kind,
    abilityKeys
  };
}

// 检查事件的数值效果是否合法。
function validateEffects(eventId: string, value: Record<string, unknown>): OpportunityEventDefinition['effects'] {
  for (const field of ['reward', 'fixedCost', 'risk', 'criticalBonus'] as const) {
    if (!Array.isArray(value[field])) {
      throw new Error(`Opportunity event ${eventId} field effects.${field} must be an array`);
    }
  }

  return {
    reward: validateStatDeltas(eventId, 'reward', value.reward),
    fixedCost: validateStatDeltas(eventId, 'fixedCost', value.fixedCost),
    risk: validateStatDeltas(eventId, 'risk', value.risk),
    criticalBonus: validateStatDeltas(eventId, 'criticalBonus', value.criticalBonus)
  };
}

// 检查一组属性变化是否合法。
function validateStatDeltas(eventId: string, field: string, value: unknown): StatDelta[] {
  return (value as unknown[]).map((delta, index) => {
    if (!delta || typeof delta !== 'object') {
      throw new Error(`Opportunity event ${eventId} field effects.${field}[${index}] must be an object`);
    }

    const deltaValue = delta as Record<string, unknown>;

    if (!isOneOf(deltaValue.key, STAT_KEYS)) {
      throw new Error(`Opportunity event ${eventId} field effects.${field}[${index}].key is invalid`);
    }

    if (!isIntegerInRange(deltaValue.amount, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Opportunity event ${eventId} field effects.${field}[${index}].amount must be an integer`);
    }

    return {
      key: deltaValue.key,
      amount: deltaValue.amount as number
    };
  });
}

// 检查前置人生节点条件是否合法。
function validateLifeNodeRequirements(eventId: string, value: unknown): LifeNodeRequirement[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Opportunity event ${eventId} field availability.requiresLifeNodes must be an array`);
  }

  return value.map((requirement, index) => {
    if (!requirement || typeof requirement !== 'object') {
      throw new Error(`Opportunity event ${eventId} life node requirement at index ${index} must be an object`);
    }

    const requirementValue = requirement as Record<string, unknown>;

    if (!isOneOf(requirementValue.key, LIFE_NODE_KEYS)) {
      throw new Error(`Opportunity event ${eventId} life node requirement at index ${index} has an invalid key`);
    }

    if (requirementValue.key === 'romanceSuccessCount') {
      if (!isNonNegativeInteger(requirementValue.min)) {
        throw new Error(`Opportunity event ${eventId} romanceSuccessCount requirement must define a non-negative integer min`);
      }

      return {
        key: 'romanceSuccessCount',
        min: requirementValue.min as number
      };
    }

    if (typeof requirementValue.equals !== 'boolean') {
      throw new Error(`Opportunity event ${eventId} boolean life node requirement must define equals`);
    }

    return {
      key: requirementValue.key,
      equals: requirementValue.equals
    };
  });
}

// 检查人生节点变化规则是否合法。
function validateLifeNodeMutations(eventId: string, value: unknown): LifeNodeMutation[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Opportunity event ${eventId} field onNonFailure must be an array`);
  }

  return value.map((mutation, index) => {
    if (!mutation || typeof mutation !== 'object') {
      throw new Error(`Opportunity event ${eventId} life node mutation at index ${index} must be an object`);
    }

    const mutationValue = mutation as Record<string, unknown>;

    if (!isOneOf(mutationValue.key, LIFE_NODE_KEYS)) {
      throw new Error(`Opportunity event ${eventId} life node mutation at index ${index} has an invalid key`);
    }

    if (mutationValue.key === 'romanceSuccessCount') {
      if (mutationValue.operation !== 'increment' || !isNonNegativeInteger(mutationValue.amount)) {
        throw new Error(`Opportunity event ${eventId} romanceSuccessCount mutation must increment by a non-negative integer amount`);
      }

      return {
        key: 'romanceSuccessCount',
        operation: 'increment',
        amount: mutationValue.amount as number
      };
    }

    if (mutationValue.operation !== 'set' || typeof mutationValue.value !== 'boolean') {
      throw new Error(`Opportunity event ${eventId} boolean life node mutation must define set operation with boolean value`);
    }

    return {
      key: mutationValue.key,
      operation: 'set',
      value: mutationValue.value
    };
  });
}

// 判断一个值是不是给定列表里的合法字符串。
function isOneOf<T extends readonly string[]>(value: unknown, items: T): value is T[number] {
  return typeof value === 'string' && items.includes(value as T[number]);
}
