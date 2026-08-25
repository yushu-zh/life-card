import type { CreatePlayerInput } from '../src/shared/types/bootstrap.ts';
import type { OpportunityCategory } from '../src/shared/types/opportunity.ts';

// Phase 5 支持的全部自动选择策略 id。
// 顺序也作为默认的回退 / 对比展示顺序使用。
export const SIMULATION_STRATEGY_IDS = [
  'random',
  'prefer-achievement',
  'prefer-relationship',
  'prefer-self',
  'prefer-high-reward',
  'prefer-low-risk'
] as const;

export type SimulationStrategyId = (typeof SIMULATION_STRATEGY_IDS)[number];

// 策略在打破平局时使用的评分口径。
export type SimulationTieBreak = 'random' | 'success-positive-total' | 'failure-negative-total';

// 单个策略的静态定义，全部来自 simulation 专用配置。
export interface SimulationStrategyDefinition {
  allowReroll: boolean;
  // 偏好类别按顺序排列：第一个是首选，后面是回退顺序。
  preferredCategories?: OpportunityCategory[];
  tieBreak: SimulationTieBreak;
  // 无偏好类别时（高收益 / 低风险）用到的类别并列顺序。
  categoryTieBreakOrder?: OpportunityCategory[];
  finalTieBreak: 'slot-order';
}

// 一局人生结束时需要统计的七项指标。
export interface SimulationFinalStats {
  money: number;
  energy: number;
  health: number;
  happiness: number;
  freedom: number;
  experience: number;
  influence: number;
}

// 七项指标的键，供统计聚合与对比时统一遍历。
export const SIMULATION_STAT_KEYS = [
  'money',
  'energy',
  'health',
  'happiness',
  'freedom',
  'experience',
  'influence'
] as const;

export type SimulationStatKey = (typeof SIMULATION_STAT_KEYS)[number];

// 模拟专用配置，只承载“局数、策略、角色模板、统计开关”等模拟专属参数。
// 正式数值规则仍从 src/config/rules/*.json 读取，不在这里重复定义。
export interface SimulationConfig {
  defaultRunCount: number;
  comparisonBaseline: SimulationStrategyId;
  enabledStrategies: SimulationStrategyId[];
  playerPreset: CreatePlayerInput;
  strategies: Record<SimulationStrategyId, SimulationStrategyDefinition>;
  metrics: {
    includeInvalidGames: boolean;
    includeStatusRates: boolean;
  };
}

// 单局模拟的最终结果记录。
export interface SimulationGameResult {
  strategyId: SimulationStrategyId;
  sessionId: string;
  ended: boolean;
  earlyDeath: boolean;
  endReason: string | null;
  invalid: boolean;
  invalidReason: string | null;
  finalStats: SimulationFinalStats;
  triggeredStatuses: string[];
}

// 单个策略连续跑多局后的统计结果。
export interface SimulationBatchResult {
  strategyId: SimulationStrategyId;
  totalRuns: number;
  validRuns: number;
  invalidRuns: number;
  averages: SimulationFinalStats;
  crisisTriggerRates: Record<string, number>;
  earlyDeathRate: number;
  invalidGames: Array<{ sessionId: string; reason: string }>;
}

// 各策略相对 baseline 的差异对比报告。
export interface SimulationComparisonReport {
  baseline: SimulationStrategyId;
  entries: Array<{
    strategyId: SimulationStrategyId;
    statsDelta: SimulationFinalStats;
    crisisTriggerRateDelta: Record<string, number>;
    earlyDeathRateDelta: number;
  }>;
}
