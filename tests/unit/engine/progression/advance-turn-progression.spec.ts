import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { advanceTurnProgression } from '../../../../src/engine/progression/advanceTurnProgression.ts';
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
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-progression');
}

describe('advanceTurnProgression', () => {
  it('moves to the next turn within the same cycle', () => {
    const snapshot = createBaseSnapshot();
    const result = advanceTurnProgression(snapshot, loadTurnSystemConfig());

    assert.equal(result.updatedSnapshot.progression.age, 20);
    assert.equal(result.updatedSnapshot.progression.cycle, 1);
    assert.equal(result.updatedSnapshot.progression.turn, 2);
    assert.deepEqual(result.progressionAfter, {
      age: 20,
      cycle: 1,
      turn: 2,
      isEnded: false,
      endReason: null
    });
  });

  it('moves to the next cycle and adds 5 years when the cycle finishes', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.turn = 3;
    const result = advanceTurnProgression(snapshot, loadTurnSystemConfig());

    assert.equal(result.updatedSnapshot.progression.age, 25);
    assert.equal(result.updatedSnapshot.progression.cycle, 2);
    assert.equal(result.updatedSnapshot.progression.turn, 1);
  });

  it('ends the game after the final cycle instead of entering age 80', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 75;
    snapshot.progression.cycle = 12;
    snapshot.progression.turn = 1;
    const result = advanceTurnProgression(snapshot, loadTurnSystemConfig());

    assert.equal(result.updatedSnapshot.lifecycle.isEnded, true);
    assert.equal(result.updatedSnapshot.lifecycle.endReason, 'age-limit');
    assert.equal(result.updatedSnapshot.progression.age, 80);
    assert.deepEqual(result.progressionAfter, {
      age: 80,
      cycle: 12,
      turn: 1,
      isEnded: true,
      endReason: 'age-limit'
    });
  });
});
