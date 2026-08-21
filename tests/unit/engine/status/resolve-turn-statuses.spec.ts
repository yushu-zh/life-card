import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { createInitialSnapshot } from '../../../../src/engine/session/createInitialSnapshot.ts';
import { resolveTurnStatuses } from '../../../../src/engine/status/resolveTurnStatuses.ts';
import type { CreatePlayerInput } from '../../../../src/shared/types/bootstrap.ts';

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
    snapshot.stats.resources.money = 2;

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
    snapshot.stats.resources.money = 2;
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
    snapshot.stats.abilities.cognition = 5;
    snapshot.stats.outcomes.influence = 4;

    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => 0.9
    });

    assert.deepEqual(
      result.results.map((status) => status.id),
      ['professional-achievement', 'social-status']
    );
    assert.equal(result.updatedSnapshot.stats.outcomes.influence, 5);
    assert.equal(result.updatedSnapshot.stats.resources.money, 6);
    assert.deepEqual(result.updatedSnapshot.records.triggeredStateIds, ['professional-achievement', 'social-status']);
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
    assert.equal(survived.results[0]?.kind, 'death-risk');
    assert.equal(survived.results[0]?.deathProbability, 0.02);
    assert.equal(survived.results[0]?.died, false);
    assert.equal(died.results[0]?.deathProbability, 0.02);
    assert.equal(died.results[0]?.died, true);
    assert.equal(died.updatedSnapshot.lifecycle.endReason, 'status-health-crisis');
  });

  it('checks life crisis after earlier death risks when the player survives', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 55;
    snapshot.stats.outcomes.health = -3;
    snapshot.stats.resources.energy = -2;

    const randomValues = [0.9, 0.9, 0.04];
    const result = resolveTurnStatuses(snapshot, loadTurnSystemConfig().statuses, {
      random: () => randomValues.shift() ?? 0.9
    });

    assert.deepEqual(
      result.results.map((status) => status.id),
      ['health-crisis', 'energy-crisis', 'life-crisis']
    );
    assert.equal(result.results[2]?.kind, 'death-risk');
    assert.equal(result.results[2]?.deathProbability, 0.05);
    assert.equal(result.results[2]?.died, true);
    assert.equal(result.updatedSnapshot.lifecycle.endReason, 'status-life-crisis');
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
