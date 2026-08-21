import type { StatDelta } from './opportunity.ts';

export type StatusResolutionMode = 'once-per-game' | 'per-turn-risk-check';
export type StatusConditionKey = 'money' | 'cognition' | 'influence' | 'health' | 'energy' | 'age';

// 一次性状态的公共配置。
interface OneTimeStatusConfigBase {
  id: string;
  name: string;
  resolutionMode: 'once-per-game';
  effects: StatDelta[];
}

// 经济危机的配置。
export interface EconomicCrisisConfig extends OneTimeStatusConfigBase {
  moneyMax: number;
}

// 专业成就的配置。
export interface ProfessionalAchievementConfig extends OneTimeStatusConfigBase {
  cognitionMin: number;
}

// 社会地位的配置。
export interface SocialStatusConfig extends OneTimeStatusConfigBase {
  influenceMin: number;
}

// 健康危机的配置。
export interface HealthCrisisConfig {
  id: string;
  name: string;
  resolutionMode: 'per-turn-risk-check';
  healthMax: number;
  probabilityPerNegativePoint: number;
}

// 精力危机的配置。
export interface EnergyCrisisConfig {
  id: string;
  name: string;
  resolutionMode: 'per-turn-risk-check';
  energyMax: number;
  probabilityPerNegativePoint: number;
}

// 生命危机的配置。
export interface LifeCrisisConfig {
  id: string;
  name: string;
  resolutionMode: 'per-turn-risk-check';
  ageMin: number;
  healthMax: number;
  energyMax: number;
  deathProbability: number;
}

// Phase 3 的状态系统完整配置。
export interface StatusSystemConfig {
  economicCrisis: EconomicCrisisConfig;
  professionalAchievement: ProfessionalAchievementConfig;
  socialStatus: SocialStatusConfig;
  healthCrisis: HealthCrisisConfig;
  energyCrisis: EnergyCrisisConfig;
  lifeCrisis: LifeCrisisConfig;
}

// 一条状态触发条件在结算时的快照。
export interface StatusConditionSnapshot {
  key: StatusConditionKey;
  operator: '<=' | '>=';
  threshold: number;
  actual: number;
}

// 一次性状态的结算结果。
export interface OneTimeStatusResult {
  id: string;
  name: string;
  kind: 'one-time-effect';
  resolutionMode: 'once-per-game';
  firstTrigger: true;
  conditions: StatusConditionSnapshot[];
  appliedDeltas: StatDelta[];
}

// 死亡风险状态的结算结果。
export interface DeathRiskStatusResult {
  id: string;
  name: string;
  kind: 'death-risk';
  resolutionMode: 'per-turn-risk-check';
  firstTrigger: false;
  conditions: StatusConditionSnapshot[];
  deathProbability: number;
  roll: number;
  died: boolean;
  endReason: string | null;
}

// Phase 3 回合内可能产出的状态结果。
export type StatusResult = OneTimeStatusResult | DeathRiskStatusResult;
