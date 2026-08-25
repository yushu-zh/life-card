import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnOfferSlotIndex } from '../../../src/shared/types/turn.ts';
import { loadSimulationConfig } from '../../../simulation/config/loadSimulationConfig.ts';
import { buildSimulationComparison } from '../../../simulation/runner/buildSimulationComparison.ts';
import { runSimulationBatch } from '../../../simulation/runner/runSimulationBatch.ts';
import { selectTurnCard } from '../../../simulation/strategies/selectTurnCard.ts';
import type { SimulationBatchResult, SimulationFinalStats } from '../../../simulation/types.ts';

const config = loadSimulationConfig();

describe('runSimulationBatch', () => {
  it('统计 totalRuns / validRuns / invalidRuns', async () => {
    const batch = await runSimulationBatch({ strategyId: 'random', runCount: 5, config, baseSeed: 'batch-basic' });

    assert.equal(batch.totalRuns, 5);
    assert.equal(batch.validRuns, 5);
    assert.equal(batch.invalidRuns, 0);
    assert.equal(batch.invalidGames.length, 0);
  });

  it('平均最终属性只基于有效局，invalid 局被单独列出', async () => {
    // 注入一个选择器：第一次调用返回非法槽位（第一局 invalid），之后交给正式策略。
    let calls = 0;
    const selectCard = (offer: Parameters<typeof selectTurnCard>[0], context: Parameters<typeof selectTurnCard>[1]) => {
      calls += 1;
      return calls === 1 ? (99 as TurnOfferSlotIndex) : selectTurnCard(offer, context);
    };

    const batch = await runSimulationBatch({
      strategyId: 'random',
      runCount: 3,
      config,
      baseSeed: 'batch-mixed',
      selectCard
    });

    assert.equal(batch.totalRuns, 3);
    assert.equal(batch.invalidRuns, 1);
    assert.equal(batch.validRuns, 2);
    assert.equal(batch.invalidGames.length, 1);
    assert.ok(batch.invalidGames[0].reason.length > 0);

    // 平均值来自 2 个有效局，应为有限数值。
    for (const key of Object.keys(batch.averages) as Array<keyof SimulationFinalStats>) {
      assert.ok(Number.isFinite(batch.averages[key]));
    }
  });

  it('没有有效局时平均值为 0', async () => {
    const batch = await runSimulationBatch({
      strategyId: 'random',
      runCount: 2,
      config,
      baseSeed: 'batch-all-invalid',
      selectCard: () => 99 as TurnOfferSlotIndex
    });

    assert.equal(batch.validRuns, 0);
    assert.equal(batch.invalidRuns, 2);
    assert.deepEqual(batch.averages, {
      money: 0,
      energy: 0,
      health: 0,
      happiness: 0,
      freedom: 0,
      experience: 0,
      influence: 0
    });
  });

  it('危机触发率覆盖全部状态 id 且取值落在 [0, 1]', async () => {
    const batch = await runSimulationBatch({ strategyId: 'random', runCount: 5, config, baseSeed: 'batch-rates' });

    assert.ok(Object.keys(batch.crisisTriggerRates).length > 0);

    for (const rate of Object.values(batch.crisisTriggerRates)) {
      assert.ok(rate >= 0 && rate <= 1);
    }
  });
});

describe('buildSimulationComparison', () => {
  it('按 baseline 输出属性、危机触发率与提前死亡率的 delta', () => {
    const baseline = buildBatch('random', {
      money: 10,
      energy: 1,
      health: 2,
      happiness: 3,
      freedom: 4,
      experience: 5,
      influence: 6
    }, { 'economic-crisis': 0.5 }, 0.2);
    const other = buildBatch('prefer-achievement', {
      money: 20,
      energy: 3,
      health: 2,
      happiness: 1,
      freedom: 4,
      experience: 7,
      influence: 6
    }, { 'economic-crisis': 0.3 }, 0.1);

    const report = buildSimulationComparison([baseline, other], config);

    assert.equal(report.baseline, 'random');
    assert.equal(report.entries.length, 1);

    const entry = report.entries[0];

    assert.equal(entry.strategyId, 'prefer-achievement');
    assert.equal(entry.statsDelta.money, 10);
    assert.equal(entry.statsDelta.energy, 2);
    assert.equal(entry.statsDelta.happiness, -2);
    assert.equal(entry.crisisTriggerRateDelta['economic-crisis'], -0.2);
    assert.equal(entry.earlyDeathRateDelta, -0.1);
  });
});

function buildBatch(
  strategyId: SimulationBatchResult['strategyId'],
  averages: SimulationFinalStats,
  crisisTriggerRates: Record<string, number>,
  earlyDeathRate: number
): SimulationBatchResult {
  return {
    strategyId,
    totalRuns: 10,
    validRuns: 10,
    invalidRuns: 0,
    averages,
    crisisTriggerRates,
    earlyDeathRate,
    invalidGames: []
  };
}
