import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../../src/config/loaders/loadTurnSystemConfig.ts';
import { createInitialSnapshot } from '../../../src/engine/session/createInitialSnapshot.ts';
import type { GameSessionSnapshot } from '../../../src/shared/types/game-session.ts';
import type { TurnOfferCard, TurnOfferSlotIndex } from '../../../src/shared/types/turn.ts';
import { loadSimulationConfig } from '../../../simulation/config/loadSimulationConfig.ts';
import { selectTurnCard } from '../../../simulation/strategies/selectTurnCard.ts';

const config = loadSimulationConfig();
const eventConfig = loadOpportunityEventConfig();
const energyRules = loadTurnSystemConfig().energyRules;
const snapshot: GameSessionSnapshot = createInitialSnapshot(config.playerPreset, loadInitialStateConfig(), 'test-session');

// 用真实事件 id 构造一张牌，类别直接从事件配置里读取，避免测试里手写类别。
function card(slotIndex: TurnOfferSlotIndex, eventId: string): TurnOfferCard {
  const definition = eventConfig.events.find((event) => event.id === eventId);

  if (!definition) {
    throw new Error(`Unknown event ${eventId}`);
  }

  return { slotIndex, eventId, category: definition.category };
}

function pick(strategyId: keyof typeof config.strategies, offer: TurnOfferCard[], random = 0): TurnOfferSlotIndex {
  return selectTurnCard(offer, {
    strategy: config.strategies[strategyId],
    snapshot,
    eventConfig,
    energyRules,
    random: () => random
  });
}

describe('selectTurnCard', () => {
  it('完全随机策略只在 0/1/2 之间选牌', () => {
    const offer = [card(0, 'achievement-job-opportunity'), card(1, 'relationship-romance'), card(2, 'self-rest')];

    for (const value of [0, 0.3, 0.5, 0.7, 0.99]) {
      const result = pick('random', offer, value);

      assert.ok(result === 0 || result === 1 || result === 2);
    }
  });

  it('优先成就在没有成就类时回退到关系类', () => {
    const offer = [card(0, 'relationship-romance'), card(1, 'self-hobby'), card(2, 'self-fitness')];

    assert.equal(pick('prefer-achievement', offer), 0);
  });

  it('优先关系在没有关系类时回退到成就类', () => {
    const offer = [card(0, 'self-hobby'), card(1, 'achievement-job-opportunity'), card(2, 'self-fitness')];

    assert.equal(pick('prefer-relationship', offer), 1);
  });

  it('优先自我在没有自我类时回退到关系类', () => {
    const offer = [card(0, 'achievement-job-opportunity'), card(1, 'relationship-romance'), card(2, 'achievement-startup')];

    assert.equal(pick('prefer-self', offer), 1);
  });

  it('高收益优先选择成功正向值最高的牌', () => {
    // 成功正向值：job-opportunity=3，self-travel=4，relationship-marriage=2。
    const offer = [card(0, 'achievement-job-opportunity'), card(1, 'self-travel'), card(2, 'relationship-marriage')];

    assert.equal(pick('prefer-high-reward', offer), 1);
  });

  it('低风险优先选择失败负向值最小的牌', () => {
    // 失败负向绝对值：startup=4，investment=3，job-opportunity=2。
    const offer = [card(0, 'achievement-startup'), card(1, 'achievement-investment'), card(2, 'achievement-job-opportunity')];

    assert.equal(pick('prefer-low-risk', offer), 2);
  });

  it('高收益并列时按成就>关系>自我打破平局', () => {
    // 两者成功正向值都是 3，但 achievement 优先于 self。
    const offer = [card(0, 'self-rest'), card(1, 'achievement-job-opportunity')];

    assert.equal(pick('prefer-high-reward', offer), 1);
  });

  it('同类并列时按展示顺序靠前打破平局', () => {
    // 三张关系类事件的成功正向值都是 2，应选 slotIndex 最靠前的。
    const offer = [card(0, 'relationship-family'), card(1, 'relationship-children'), card(2, 'relationship-marriage')];

    assert.equal(pick('prefer-high-reward', offer), 0);
  });
});
