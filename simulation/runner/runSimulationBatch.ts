import { loadTurnSystemConfig } from '../../src/config/loaders/loadTurnSystemConfig.ts';
import type { TurnOfferCard, TurnOfferSlotIndex } from '../../src/shared/types/turn.ts';
import { deriveGameSeed } from '../support/createSeededRandom.ts';
import { buildStrategyRegistry } from '../strategies/buildStrategyRegistry.ts';
import type { SimulationStrategyContext } from '../strategies/selectTurnCard.ts';
import {
  SIMULATION_STAT_KEYS,
  type SimulationBatchResult,
  type SimulationConfig,
  type SimulationFinalStats,
  type SimulationGameResult,
  type SimulationStrategyId
} from '../types.ts';
import { runSingleSimulationGame } from './runSingleSimulationGame.ts';

// 对一个策略连续跑多局，并汇总成该策略的统计结果。
export async function runSimulationBatch(input: {
  strategyId: SimulationStrategyId;
  runCount: number;
  config: SimulationConfig;
  baseSeed?: string;
  // 可选注入：替换默认策略选择器，用于测试“策略返回非法选择”等异常路径。
  selectCard?: (offer: TurnOfferCard[], context: SimulationStrategyContext) => TurnOfferSlotIndex;
}): Promise<SimulationBatchResult> {
  const { strategyId, runCount, config } = input;
  const baseSeed = input.baseSeed ?? 'phase5-default';

  // 先构建一次注册表，确保启用策略的定义完整，避免跑到一半才发现配置缺项。
  buildStrategyRegistry(config);

  const games: SimulationGameResult[] = [];

  for (let gameIndex = 0; gameIndex < runCount; gameIndex += 1) {
    const seed = deriveGameSeed(baseSeed, strategyId, gameIndex);
    const result = await runSingleSimulationGame({ strategyId, gameIndex, config, seed, selectCard: input.selectCard });

    games.push(result);
  }

  return buildBatchResult(strategyId, games, config);
}

function buildBatchResult(
  strategyId: SimulationStrategyId,
  games: SimulationGameResult[],
  config: SimulationConfig
): SimulationBatchResult {
  const validGames = games.filter((game) => !game.invalid);
  const invalidGames = games.filter((game) => game.invalid);

  return {
    strategyId,
    totalRuns: games.length,
    validRuns: validGames.length,
    invalidRuns: invalidGames.length,
    averages: computeAverages(validGames),
    crisisTriggerRates: config.metrics.includeStatusRates
      ? computeCrisisTriggerRates(validGames)
      : {},
    earlyDeathRate: computeEarlyDeathRate(validGames),
    invalidGames: config.metrics.includeInvalidGames
      ? invalidGames.map((game) => ({ sessionId: game.sessionId, reason: game.invalidReason ?? 'unknown' }))
      : []
  };
}

// 平均最终属性只基于有效局计算，invalid 局不参与。
function computeAverages(games: SimulationGameResult[]): SimulationFinalStats {
  const averages = {} as SimulationFinalStats;

  for (const key of SIMULATION_STAT_KEYS) {
    const total = games.reduce((sum, game) => sum + game.finalStats[key], 0);

    averages[key] = games.length > 0 ? total / games.length : 0;
  }

  return averages;
}

// 各类状态（含一次性状态与死亡风险状态）的触发率，按有效局口径计算。
function computeCrisisTriggerRates(games: SimulationGameResult[]): Record<string, number> {
  const rates: Record<string, number> = {};

  for (const statusId of collectStatusIds()) {
    const triggeredCount = games.filter((game) => game.triggeredStatuses.includes(statusId)).length;

    rates[statusId] = games.length > 0 ? triggeredCount / games.length : 0;
  }

  return rates;
}

function computeEarlyDeathRate(games: SimulationGameResult[]): number {
  if (games.length === 0) {
    return 0;
  }

  return games.filter((game) => game.earlyDeath).length / games.length;
}

// 从正式回合系统配置里取回所有状态 id，作为触发率统计的完整维度。
function collectStatusIds(): string[] {
  const statuses = loadTurnSystemConfig().statuses;

  return [
    statuses.economicCrisis.id,
    statuses.professionalAchievement.id,
    statuses.socialStatus.id,
    statuses.healthCrisis.id,
    statuses.energyCrisis.id,
    statuses.lifeCrisis.id
  ];
}
