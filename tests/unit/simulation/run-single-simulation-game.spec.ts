import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../../src/config/loaders/loadTurnSystemConfig.ts';
import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
import { getOrCreateCurrentTurnOffer } from '../../../src/modules/turn/getOrCreateCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../../src/modules/turn/resolveCurrentTurnSelection.ts';
import type { GameSessionSnapshot } from '../../../src/shared/types/game-session.ts';
import type { TurnOfferSlotIndex } from '../../../src/shared/types/turn.ts';
import { loadSimulationConfig } from '../../../simulation/config/loadSimulationConfig.ts';
import { runSingleSimulationGame } from '../../../simulation/runner/runSingleSimulationGame.ts';
import { createSeededRandom } from '../../../simulation/support/createSeededRandom.ts';
import { createSimulationSessionStore } from '../../../simulation/support/createSimulationSessionStore.ts';
import { selectTurnCard } from '../../../simulation/strategies/selectTurnCard.ts';
import type { SimulationStrategyId } from '../../../simulation/types.ts';

const config = loadSimulationConfig();

describe('runSingleSimulationGame', () => {
  it('一局模拟能推进到终局', async () => {
    const result = await runSingleSimulationGame({ strategyId: 'random', gameIndex: 0, config, seed: 'end-game' });

    assert.equal(result.invalid, false);
    assert.equal(result.ended, true);
  });

  it('提前死亡时 earlyDeath 为 true', async () => {
    const result = await runSingleSimulationGame({ strategyId: 'random', gameIndex: 1, config, seed: 'probe-273' });

    assert.equal(result.invalid, false);
    assert.equal(result.earlyDeath, true);
    assert.ok(result.endReason !== null);
  });

  it('策略返回非法槽位时该局被记为 invalid', async () => {
    const result = await runSingleSimulationGame({
      strategyId: 'random',
      gameIndex: 0,
      config,
      seed: 'invalid-slot',
      selectCard: () => 99 as TurnOfferSlotIndex
    });

    assert.equal(result.invalid, true);
    assert.ok(result.invalidReason !== null);
  });

  it('策略决策抛错时该局被记为 invalid', async () => {
    const result = await runSingleSimulationGame({
      strategyId: 'random',
      gameIndex: 0,
      config,
      seed: 'invalid-throw',
      selectCard: () => {
        throw new Error('策略实现错误');
      }
    });

    assert.equal(result.invalid, true);
  });

  it('最终属性与快照末状态一致，且默认不换牌', async () => {
    const seed = 'final-stats-check';
    const snapshot = await runManualGame('random', seed);
    const result = await runSingleSimulationGame({ strategyId: 'random', gameIndex: 0, config, seed });

    // 默认不换牌：所有回合的 rerollUsed 都为 false。
    for (const entry of snapshot.records.lifeHistory) {
      assert.equal(entry.offer.rerollUsed, false);
    }

    // 结果里的最终属性与快照末状态逐项一致。
    assert.equal(result.finalStats.money, snapshot.stats.resources.money);
    assert.equal(result.finalStats.energy, snapshot.stats.resources.energy);
    assert.equal(result.finalStats.health, snapshot.stats.outcomes.health);
    assert.equal(result.finalStats.happiness, snapshot.stats.outcomes.happiness);
    assert.equal(result.finalStats.freedom, snapshot.stats.outcomes.freedom);
    assert.equal(result.finalStats.experience, snapshot.stats.outcomes.experience);
    assert.equal(result.finalStats.influence, snapshot.stats.outcomes.influence);
  });
});

// 用注入的 store 手动跑一局，返回最终快照，供测试校验不换牌与最终属性。
async function runManualGame(strategyId: SimulationStrategyId, seed: string): Promise<GameSessionSnapshot> {
  const strategy = config.strategies[strategyId];
  const store = createSimulationSessionStore();
  const random = createSeededRandom(seed);
  const eventConfig = loadOpportunityEventConfig();
  const energyRules = loadTurnSystemConfig().energyRules;
  const sessionId = `manual-${strategyId}-${seed}`;

  let snapshot = await createNewGame(config.playerPreset, { sessionId, store });

  while (!snapshot.lifecycle.isEnded) {
    const offer = await getOrCreateCurrentTurnOffer({ sessionId }, { store, random });
    const slotIndex = selectTurnCard(offer.currentOffer, { strategy, snapshot, eventConfig, energyRules, random });
    const summary = await resolveCurrentTurnSelection({ sessionId, slotIndex }, { store, random });

    snapshot = summary.updatedSnapshot;
  }

  return snapshot;
}
