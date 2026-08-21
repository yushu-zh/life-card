import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { StatDelta } from '../../shared/types/opportunity.ts';
import type {
  DeathRiskStatusResult,
  EconomicCrisisConfig,
  EnergyCrisisConfig,
  HealthCrisisConfig,
  LifeCrisisConfig,
  OneTimeStatusResult,
  ProfessionalAchievementConfig,
  SocialStatusConfig,
  StatusConditionSnapshot,
  StatusSystemConfig
} from '../../shared/types/status.ts';
import type { ResolveTurnStatusesResult, TurnStatusResult } from '../../shared/types/turn.ts';

const STATUS_CHECK_ORDER = [
  'economicCrisis',
  'professionalAchievement',
  'socialStatus',
  'healthCrisis',
  'energyCrisis',
  'lifeCrisis'
] as const satisfies Array<keyof StatusSystemConfig>;

// 按固定顺序结算一次完整的状态触发与死亡风险检查。
export function resolveTurnStatuses(
  snapshot: GameSessionSnapshot,
  config: StatusSystemConfig,
  options?: {
    random?: () => number;
  }
): ResolveTurnStatusesResult {
  if (snapshot.lifecycle.isEnded) {
    throw new Error('Cannot resolve statuses for an ended game session');
  }

  const random = options?.random ?? Math.random;
  const workingSnapshot: GameSessionSnapshot = structuredClone(snapshot);
  const results: TurnStatusResult[] = [];

  for (const statusKey of STATUS_CHECK_ORDER) {
    const nextResult = resolveSingleStatus(statusKey, workingSnapshot, config, random);

    if (!nextResult) {
      continue;
    }

    results.push(nextResult);

    if (nextResult.kind === 'death-risk' && nextResult.died) {
      return {
        updatedSnapshot: workingSnapshot,
        results,
        ended: true,
        endReason: nextResult.endReason
      };
    }
  }

  return {
    updatedSnapshot: workingSnapshot,
    results,
    ended: false,
    endReason: null
  };
}

function resolveSingleStatus(
  statusKey: (typeof STATUS_CHECK_ORDER)[number],
  snapshot: GameSessionSnapshot,
  config: StatusSystemConfig,
  random: () => number
): TurnStatusResult | null {
  switch (statusKey) {
    case 'economicCrisis':
      return resolveEconomicCrisis(snapshot, config.economicCrisis);
    case 'professionalAchievement':
      return resolveProfessionalAchievement(snapshot, config.professionalAchievement);
    case 'socialStatus':
      return resolveSocialStatus(snapshot, config.socialStatus);
    case 'healthCrisis':
      return resolveHealthCrisis(snapshot, config.healthCrisis, random);
    case 'energyCrisis':
      return resolveEnergyCrisis(snapshot, config.energyCrisis, random);
    case 'lifeCrisis':
      return resolveLifeCrisis(snapshot, config.lifeCrisis, random);
  }
}

function resolveEconomicCrisis(snapshot: GameSessionSnapshot, config: EconomicCrisisConfig): OneTimeStatusResult | null {
  const actualMoney = snapshot.stats.resources.money;

  if (actualMoney > config.moneyMax || snapshot.records.triggeredStateIds.includes(config.id)) {
    return null;
  }

  const conditions = [buildCondition('money', '<=', config.moneyMax, actualMoney)];

  applyStatDeltas(snapshot, config.effects);
  snapshot.records.triggeredStateIds.push(config.id);

  return {
    id: config.id,
    name: config.name,
    kind: 'one-time-effect',
    resolutionMode: config.resolutionMode,
    firstTrigger: true,
    conditions,
    appliedDeltas: cloneStatDeltas(config.effects)
  };
}

function resolveProfessionalAchievement(
  snapshot: GameSessionSnapshot,
  config: ProfessionalAchievementConfig
): OneTimeStatusResult | null {
  const actualCognition = snapshot.stats.abilities.cognition;

  if (actualCognition < config.cognitionMin || snapshot.records.triggeredStateIds.includes(config.id)) {
    return null;
  }

  const conditions = [buildCondition('cognition', '>=', config.cognitionMin, actualCognition)];

  applyStatDeltas(snapshot, config.effects);
  snapshot.records.triggeredStateIds.push(config.id);

  return {
    id: config.id,
    name: config.name,
    kind: 'one-time-effect',
    resolutionMode: config.resolutionMode,
    firstTrigger: true,
    conditions,
    appliedDeltas: cloneStatDeltas(config.effects)
  };
}

function resolveSocialStatus(snapshot: GameSessionSnapshot, config: SocialStatusConfig): OneTimeStatusResult | null {
  const actualInfluence = snapshot.stats.outcomes.influence;

  if (actualInfluence < config.influenceMin || snapshot.records.triggeredStateIds.includes(config.id)) {
    return null;
  }

  const conditions = [buildCondition('influence', '>=', config.influenceMin, actualInfluence)];

  applyStatDeltas(snapshot, config.effects);
  snapshot.records.triggeredStateIds.push(config.id);

  return {
    id: config.id,
    name: config.name,
    kind: 'one-time-effect',
    resolutionMode: config.resolutionMode,
    firstTrigger: true,
    conditions,
    appliedDeltas: cloneStatDeltas(config.effects)
  };
}

function resolveHealthCrisis(
  snapshot: GameSessionSnapshot,
  config: HealthCrisisConfig,
  random: () => number
): DeathRiskStatusResult | null {
  const actualHealth = snapshot.stats.outcomes.health;

  if (actualHealth > config.healthMax) {
    return null;
  }

  const deathProbability = Math.abs(actualHealth) * config.probabilityPerNegativePoint;
  const roll = drawRandom(random);
  const died = roll < deathProbability;
  const endReason = died ? 'status-health-crisis' : null;

  if (died) {
    snapshot.lifecycle.isEnded = true;
    snapshot.lifecycle.endReason = endReason;
  }

  return {
    id: config.id,
    name: config.name,
    kind: 'death-risk',
    resolutionMode: config.resolutionMode,
    firstTrigger: false,
    conditions: [buildCondition('health', '<=', config.healthMax, actualHealth)],
    deathProbability,
    roll,
    died,
    endReason
  };
}

function resolveEnergyCrisis(
  snapshot: GameSessionSnapshot,
  config: EnergyCrisisConfig,
  random: () => number
): DeathRiskStatusResult | null {
  const actualEnergy = snapshot.stats.resources.energy;

  if (actualEnergy > config.energyMax) {
    return null;
  }

  const deathProbability = Math.abs(actualEnergy) * config.probabilityPerNegativePoint;
  const roll = drawRandom(random);
  const died = roll < deathProbability;
  const endReason = died ? 'status-energy-crisis' : null;

  if (died) {
    snapshot.lifecycle.isEnded = true;
    snapshot.lifecycle.endReason = endReason;
  }

  return {
    id: config.id,
    name: config.name,
    kind: 'death-risk',
    resolutionMode: config.resolutionMode,
    firstTrigger: false,
    conditions: [buildCondition('energy', '<=', config.energyMax, actualEnergy)],
    deathProbability,
    roll,
    died,
    endReason
  };
}

function resolveLifeCrisis(
  snapshot: GameSessionSnapshot,
  config: LifeCrisisConfig,
  random: () => number
): DeathRiskStatusResult | null {
  const actualAge = snapshot.progression.age;
  const actualHealth = snapshot.stats.outcomes.health;
  const actualEnergy = snapshot.stats.resources.energy;

  if (actualAge < config.ageMin || actualHealth > config.healthMax || actualEnergy > config.energyMax) {
    return null;
  }

  const roll = drawRandom(random);
  const died = roll < config.deathProbability;
  const endReason = died ? 'status-life-crisis' : null;

  if (died) {
    snapshot.lifecycle.isEnded = true;
    snapshot.lifecycle.endReason = endReason;
  }

  return {
    id: config.id,
    name: config.name,
    kind: 'death-risk',
    resolutionMode: config.resolutionMode,
    firstTrigger: false,
    conditions: [
      buildCondition('health', '<=', config.healthMax, actualHealth),
      buildCondition('energy', '<=', config.energyMax, actualEnergy),
      buildCondition('age', '>=', config.ageMin, actualAge)
    ],
    deathProbability: config.deathProbability,
    roll,
    died,
    endReason
  };
}

// 把一组状态数值变化真正写回快照。
function applyStatDeltas(snapshot: GameSessionSnapshot, deltas: StatDelta[]): void {
  for (const delta of deltas) {
    switch (delta.key) {
      case 'cognition':
      case 'execution':
      case 'social':
      case 'creativity':
      case 'adaptability':
        snapshot.stats.abilities[delta.key] += delta.amount;
        break;
      case 'money':
      case 'energy':
        snapshot.stats.resources[delta.key] += delta.amount;
        break;
      case 'happiness':
      case 'freedom':
      case 'health':
      case 'experience':
      case 'influence':
        snapshot.stats.outcomes[delta.key] += delta.amount;
        break;
    }
  }
}

function cloneStatDeltas(deltas: StatDelta[]): StatDelta[] {
  return deltas.map((delta) => ({ ...delta }));
}

function buildCondition(
  key: StatusConditionSnapshot['key'],
  operator: StatusConditionSnapshot['operator'],
  threshold: number,
  actual: number
): StatusConditionSnapshot {
  return {
    key,
    operator,
    threshold,
    actual
  };
}

function drawRandom(random: () => number): number {
  const value = random();

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a number between 0 and 1');
  }

  return value;
}
