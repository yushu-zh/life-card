import {
  SIMULATION_STAT_KEYS,
  type SimulationBatchResult,
  type SimulationComparisonReport,
  type SimulationConfig,
  type SimulationFinalStats
} from '../types.ts';

// 把多个策略的批次结果按 baseline 策略做 delta 对比。
// 只生成“相对 baseline”的差异，不做全量两两矩阵，避免为展示完整度引入无必要的复杂度。
export function buildSimulationComparison(
  batches: SimulationBatchResult[],
  config: SimulationConfig
): SimulationComparisonReport {
  const baseline = config.comparisonBaseline;
  const baselineBatch = batches.find((batch) => batch.strategyId === baseline);

  if (!baselineBatch) {
    throw new Error(`Comparison baseline ${baseline} was not found in the batch results`);
  }

  const entries = batches
    .filter((batch) => batch.strategyId !== baseline)
    .map((batch) => buildEntry(batch, baselineBatch));

  return { baseline, entries };
}

function buildEntry(
  batch: SimulationBatchResult,
  baselineBatch: SimulationBatchResult
): SimulationComparisonReport['entries'][number] {
  const statsDelta = {} as SimulationFinalStats;

  for (const key of SIMULATION_STAT_KEYS) {
    statsDelta[key] = batch.averages[key] - baselineBatch.averages[key];
  }

  const crisisTriggerRateDelta: Record<string, number> = {};
  const allStatusIds = new Set<string>([
    ...Object.keys(baselineBatch.crisisTriggerRates),
    ...Object.keys(batch.crisisTriggerRates)
  ]);

  for (const statusId of allStatusIds) {
    crisisTriggerRateDelta[statusId] =
      (batch.crisisTriggerRates[statusId] ?? 0) - (baselineBatch.crisisTriggerRates[statusId] ?? 0);
  }

  return {
    strategyId: batch.strategyId,
    statsDelta,
    crisisTriggerRateDelta,
    earlyDeathRateDelta: batch.earlyDeathRate - baselineBatch.earlyDeathRate
  };
}
