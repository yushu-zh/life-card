import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { resolveFateEvent } from '../../../../src/engine/fate/resolveFateEvent.ts';
import { createInitialSnapshot } from '../../../../src/engine/session/createInitialSnapshot.ts';
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
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-fate');
}

describe('resolveFateEvent', () => {
  it('returns a non-triggered summary when the fate roll misses', () => {
    const snapshot = createBaseSnapshot();
    const summary = resolveFateEvent(snapshot, loadTurnSystemConfig().fate, {
      random: () => 0.9
    });

    assert.equal(summary.triggered, false);
    assert.equal(summary.event, null);
    assert.deepEqual(summary.appliedDeltas, []);
    assert.equal(summary.mitigatedDelta, null);
    assert.deepEqual(summary.updatedSnapshot, snapshot);
  });

  it('triggers a fate event and mitigates one negative line based on adaptability', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.abilities.adaptability = 5;
    const randomValues = [0, 0.2, 0, 0];
    const summary = resolveFateEvent(snapshot, loadTurnSystemConfig().fate, {
      random: () => randomValues.shift() ?? 0
    });

    assert.equal(summary.triggered, true);
    assert.equal(summary.event?.id, 'fate-family-illness');
    assert.deepEqual(summary.mitigatedDelta, { key: 'money', amount: -1 });
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'energy', amount: -1 },
      { key: 'happiness', amount: -1 }
    ]);
    assert.equal(summary.updatedSnapshot.stats.resources.money, 5);
    assert.equal(summary.updatedSnapshot.stats.resources.energy, 4);
    assert.equal(summary.updatedSnapshot.stats.outcomes.happiness, 1);
  });

  it('does not mitigate negative lines when adaptability is zero', () => {
    const snapshot = createBaseSnapshot();
    snapshot.stats.abilities.adaptability = 0;
    const randomValues = [0, 0, 0.9];
    const summary = resolveFateEvent(snapshot, loadTurnSystemConfig().fate, {
      random: () => randomValues.shift() ?? 0
    });

    assert.equal(summary.triggered, true);
    assert.equal(summary.event?.id, 'fate-industry-downturn');
    assert.equal(summary.mitigatedDelta, null);
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'money', amount: -2 },
      { key: 'energy', amount: -1 }
    ]);
  });
});
