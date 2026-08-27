import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { createInitialSnapshot } from '../../../../src/engine/session/createInitialSnapshot.ts';
import { resolveTurnStatuses } from '../../../../src/engine/status/resolveTurnStatuses.ts';
import type { CreatePlayerInput } from '../../../../src/shared/types/bootstrap.ts';
import type { DeathRiskStatusResult } from '../../../../src/shared/types/status.ts';

const baseInput: CreatePlayerInput = {
  profile: {
    nickname: '小宇',
    skillTags: ['分析'],
    education: '本科',
    industry: '互联网',
    wishes: ['稳定']
  },
  abilities: {
    cognition: 2,
    execution: 2,
    social: 2,
    creativity: 1,
    adaptability: 1
  }
};

function createBaseSnapshot() {
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-status');
}

describe('resolveTurnStatuses', () => {
  it('triggers economic crisis once and records the state id', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.resources.money = 0;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.equal(result.results.length, 1);
    assert.deepEqual(result.updatedSnapshot.records.triggeredStateIds, ['economic-crisis']);
    assert.equal(result.updatedSnapshot.stats.outcomes.happiness, 1);
    assert.equal(result.updatedSnapshot.stats.outcomes.freedom, 1);
    assert.equal(result.results[0]?.id, 'economic-crisis');
  });

  it('does not resolve a one-time status again after it has already triggered', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.resources.money = 0;
    snapshot.records.triggeredStateIds.push('economic-crisis');

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(result.results, []);
    assert.equal(result.updatedSnapshot.stats.outcomes.happiness, 2);
    assert.equal(result.updatedSnapshot.stats.outcomes.freedom, 2);
  });

  it('chains professional achievement into social status in the same turn', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.abilities.cognition = 4;
    snapshot.stats.outcomes.experience = 8;
    snapshot.stats.outcomes.influence = 6;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(
      result.results.map((status) => status.id),
      ['professional-achievement', 'social-status']
    );
    assert.equal(result.updatedSnapshot.stats.outcomes.influence, 8);
    assert.equal(result.updatedSnapshot.stats.resources.money, 7);
    assert.deepEqual(result.updatedSnapshot.records.triggeredStateIds, ['professional-achievement', 'social-status']);
  });

  it('does not trigger professional achievement when cognition or experience is too low', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.abilities.cognition = 4; // 认知 > 3 满足
    snapshot.stats.outcomes.experience = 7; // 阅历 = 7，不满足 > 7

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(result.results, []);
  });

  it('applies health crisis death probability based on absolute health value', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.outcomes.health = -2;

    const survived = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.5
    });
    const died = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.01
    });

    assert.equal(survived.results.length, 1);

    const survivedResult = survived.results[0] as DeathRiskStatusResult | undefined;
    const diedResult = died.results[0] as DeathRiskStatusResult | undefined;

    assert.equal(survivedResult?.kind, 'death-risk');
    assert.equal(survivedResult?.deathProbability, 0.02);
    assert.equal(survivedResult?.died, false);
    assert.equal(diedResult?.deathProbability, 0.02);
    assert.equal(diedResult?.died, true);
    assert.equal(died.updatedSnapshot.lifecycle.endReason, 'status-health-crisis');
  });

  it('energy crisis reduces health and life crisis still checks afterwards', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 55;
    snapshot.stats.outcomes.health = -3;
    snapshot.stats.resources.energy = -4;

    // 依次消耗随机：健康危机(0.9 存活)、精力危机(无掷骰，健康-1)、生命危机(0.04 死亡)。
    const randomValues = [0.9, 0.04];
    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => randomValues.shift() ?? 0.9
    });

    assert.deepEqual(
      result.results.map((status) => status.id),
      ['health-crisis', 'energy-crisis', 'life-crisis']
    );
    // 精力危机现在是每周期健康-1 的持续效果，不再是死亡风险。
    assert.equal(result.results[1]?.kind, 'per-cycle-effect');
    assert.deepEqual(result.results[1]?.appliedDeltas, [{ key: 'health', amount: -1 }]);
    assert.equal(result.updatedSnapshot.stats.outcomes.health, -4);
    assert.equal(result.results[2]?.kind, 'death-risk');
    assert.equal(result.results[2]?.deathProbability, 0.05);
    assert.equal(result.results[2]?.died, true);
    assert.equal(result.updatedSnapshot.lifecycle.endReason, 'status-life-crisis');
  });

  it('energy crisis does not end the game and applies health -1 once per cycle', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.resources.energy = -4;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(result.results.map((status) => status.id), ['energy-crisis']);
    assert.equal(result.results[0]?.kind, 'per-cycle-effect');
    assert.equal(result.ended, false);
    assert.equal(result.updatedSnapshot.lifecycle.isEnded, false);
    assert.equal(result.updatedSnapshot.stats.outcomes.health, 1);
  });

  it('energy crisis only reduces health once within the same cycle', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.resources.energy = -4;

    const first = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.equal(first.updatedSnapshot.stats.outcomes.health, 1);

    // 同一周期内再次结算：精力仍 <= -4，但不应再扣健康。
    const second = resolveTurnStatuses(first.updatedSnapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(second.results, []);
    assert.equal(second.updatedSnapshot.stats.outcomes.health, 1);
  });

  it('energy crisis reduces health again when entering a new cycle', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.resources.energy = -4;
    snapshot.records.energyCrisisLastCycle = 1;
    snapshot.progression.cycle = 2;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(result.results.map((status) => status.id), ['energy-crisis']);
    assert.equal(result.updatedSnapshot.stats.outcomes.health, 1);
    assert.equal(result.updatedSnapshot.records.energyCrisisLastCycle, 2);
  });

  it('stops after the first death risk that kills the player', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 55;
    snapshot.stats.outcomes.health = -3;
    snapshot.stats.resources.energy = -2;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.01
    });

    assert.deepEqual(result.results.map((status) => status.id), ['health-crisis']);
    assert.equal(result.ended, true);
    assert.equal(result.endReason, 'status-health-crisis');
    assert.equal(result.updatedSnapshot.lifecycle.isEnded, true);
  });
});
