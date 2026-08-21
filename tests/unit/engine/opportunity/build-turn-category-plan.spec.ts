import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { buildTurnCategoryPlan } from '../../../../src/engine/opportunity/buildTurnCategoryPlan.ts';
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
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-turn-plan');
}

describe('buildTurnCategoryPlan', () => {
  it('returns 1-1-1 during the 20-35 age stage', () => {
    const snapshot = createBaseSnapshot();

    assert.deepEqual(buildTurnCategoryPlan(snapshot, loadTurnSystemConfig()), {
      patternKind: 'balanced',
      slotCategories: ['achievement', 'relationship', 'self']
    });
  });

  it('returns 1-1-1 when weighted stage has zero category counts', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 35;
    snapshot.progression.turn = 2;

    assert.deepEqual(buildTurnCategoryPlan(snapshot, loadTurnSystemConfig(), { random: () => 0 }), {
      patternKind: 'weighted-by-pick-counts',
      slotCategories: ['achievement', 'relationship', 'self']
    });
  });

  it('returns 2-1-0 using category pick counts and tie break order', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 35;
    snapshot.progression.turn = 2;
    snapshot.records.categoryPickCounts.achievement = 2;
    snapshot.records.categoryPickCounts.relationship = 2;
    snapshot.records.categoryPickCounts.self = 1;

    assert.deepEqual(buildTurnCategoryPlan(snapshot, loadTurnSystemConfig(), { random: () => 0.1 }), {
      patternKind: 'weighted-by-pick-counts',
      slotCategories: ['achievement', 'achievement', 'relationship']
    });
  });

  it('falls back to 1-1-1 when weighted random draw misses', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 50;
    snapshot.progression.turn = 1;
    snapshot.records.categoryPickCounts.achievement = 3;
    snapshot.records.categoryPickCounts.relationship = 1;
    snapshot.records.categoryPickCounts.self = 1;

    assert.deepEqual(buildTurnCategoryPlan(snapshot, loadTurnSystemConfig(), { random: () => 0.9 }), {
      patternKind: 'weighted-by-pick-counts',
      slotCategories: ['achievement', 'relationship', 'self']
    });
  });
});
