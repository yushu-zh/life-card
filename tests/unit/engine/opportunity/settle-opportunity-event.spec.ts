import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { settleOpportunityEvent } from '../../../../src/engine/opportunity/settleOpportunityEvent.ts';
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
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-phase-1');
}

function findEvent(eventId: string) {
  const event = loadOpportunityEventConfig().events.find((entry) => entry.id === eventId);

  if (!event) {
    throw new Error(`Missing event ${eventId}`);
  }

  return event;
}

describe('settleOpportunityEvent', () => {
  it('uses the configured startup formula and classifies costly success', () => {
    const snapshot = createBaseSnapshot();
    const config = loadOpportunityEventConfig();
    const event = findEvent('achievement-startup');

    const summary = settleOpportunityEvent(snapshot, event, { dice: { first: 2, second: 3 } }, config);

    assert.equal(summary.resolutionKind, 'checked');
    assert.equal(summary.resultGrade, 'costlySuccess');
    assert.deepEqual(summary.formula, {
      dice: { first: 2, second: 3 },
      abilities: [
        { key: 'social', value: 2 },
        { key: 'creativity', value: 1 }
      ],
      totalScore: 8
    });
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'money', amount: -1 },
      { key: 'freedom', amount: 1 },
      { key: 'energy', amount: -2 }
    ]);
    assert.equal(summary.updatedSnapshot.stats.resources.energy, 3);
    assert.equal(summary.updatedSnapshot.stats.resources.money, 4);
    assert.equal(summary.updatedSnapshot.stats.outcomes.freedom, 3);
    assert.deepEqual(summary.updatedSnapshot.records.selectedEventIds, ['achievement-startup']);
    assert.equal(summary.updatedSnapshot.records.categoryPickCounts.achievement, 1);
  });

  it('applies critical success bonus without fixed cost', () => {
    const snapshot = createBaseSnapshot();
    const config = loadOpportunityEventConfig();
    const event = findEvent('achievement-job-opportunity');

    const summary = settleOpportunityEvent(snapshot, event, { dice: { first: 4, second: 6 } }, config);

    assert.equal(summary.resultGrade, 'criticalSuccess');
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'money', amount: 3 },
      { key: 'experience', amount: 1 }
    ]);
    assert.equal(summary.updatedSnapshot.stats.resources.money, 8);
    assert.equal(summary.updatedSnapshot.stats.resources.energy, 5);
    assert.equal(summary.updatedSnapshot.stats.outcomes.experience, 3);
  });

  it('handles direct resolution events without dice or grade', () => {
    const snapshot = createBaseSnapshot();
    const config = loadOpportunityEventConfig();
    const event = findEvent('self-rest');

    const summary = settleOpportunityEvent(snapshot, event, {}, config);

    assert.equal(summary.resolutionKind, 'direct');
    assert.equal(summary.resultGrade, null);
    assert.equal(summary.formula, null);
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'energy', amount: 2 },
      { key: 'health', amount: 1 }
    ]);
    assert.equal(summary.updatedSnapshot.stats.resources.energy, 7);
    assert.equal(summary.updatedSnapshot.stats.outcomes.health, 3);
  });

  it('applies fixed cost for direct income cards', () => {
    const snapshot = createBaseSnapshot();
    const config = loadOpportunityEventConfig();
    const event = findEvent('achievement-odd-job');

    const summary = settleOpportunityEvent(snapshot, event, {}, config);

    assert.equal(summary.resolutionKind, 'direct');
    assert.equal(summary.resultGrade, null);
    assert.deepEqual(summary.appliedDeltas, [
      { key: 'money', amount: 1 },
      { key: 'energy', amount: -1 }
    ]);
    assert.equal(summary.updatedSnapshot.stats.resources.money, 6);
    assert.equal(summary.updatedSnapshot.stats.resources.energy, 4);
  });

  it('updates life nodes on non-failure and enforces prerequisites', () => {
    const config = loadOpportunityEventConfig();
    const romanceEvent = findEvent('relationship-romance');
    const marriageEvent = findEvent('relationship-marriage');
    const snapshot = createBaseSnapshot();

    const romanceSummary = settleOpportunityEvent(snapshot, romanceEvent, { dice: { first: 4, second: 4 } }, config);

    assert.equal(romanceSummary.resultGrade, 'success');
    assert.equal(romanceSummary.updatedSnapshot.records.lifeNodes.romanceSuccessCount, 1);
    assert.deepEqual(romanceSummary.lifeNodeChanges, [
      {
        key: 'romanceSuccessCount',
        previousValue: 0,
        nextValue: 1
      }
    ]);

    const marriageSummary = settleOpportunityEvent(
      romanceSummary.updatedSnapshot,
      marriageEvent,
      { dice: { first: 4, second: 4 } },
      config
    );

    assert.equal(marriageSummary.resultGrade, 'success');
    assert.equal(marriageSummary.updatedSnapshot.records.lifeNodes.marriageEstablished, true);
  });

  it('rejects unavailable events and invalid dice', () => {
    const config = loadOpportunityEventConfig();
    const marriageEvent = findEvent('relationship-marriage');
    const studyEvent = findEvent('achievement-advanced-study');
    const snapshot = createBaseSnapshot();

    assert.throws(
      () => settleOpportunityEvent(snapshot, marriageEvent, { dice: { first: 3, second: 4 } }, config),
      new Error('Life node requirement romanceSuccessCount requires at least 1')
    );

    const olderSnapshot = createBaseSnapshot();
    olderSnapshot.progression.age = 35;

    assert.throws(
      () => settleOpportunityEvent(olderSnapshot, studyEvent, { dice: { first: 3, second: 4 } }, config),
      new Error('Event achievement-advanced-study requires age < 35')
    );

    assert.throws(
      () => settleOpportunityEvent(snapshot, studyEvent, { dice: { first: 0, second: 7 } }, config),
      new Error('Dice first must be an integer between 1 and 6')
    );
  });

  it('enforces once-per-session limits and stays deterministic', () => {
    const config = loadOpportunityEventConfig();
    const romanceEvent = findEvent('relationship-romance');
    const marriageEvent = findEvent('relationship-marriage');
    const snapshot = createBaseSnapshot();
    const firstRomance = settleOpportunityEvent(snapshot, romanceEvent, { dice: { first: 3, second: 4 } }, config);
    const firstMarriage = settleOpportunityEvent(
      firstRomance.updatedSnapshot,
      marriageEvent,
      { dice: { first: 3, second: 4 } },
      config
    );

    assert.throws(
      () =>
        settleOpportunityEvent(firstMarriage.updatedSnapshot, marriageEvent, { dice: { first: 3, second: 4 } }, config),
      new Error('Event relationship-marriage can only occur 1 time(s) per session')
    );

    const startupEvent = findEvent('achievement-startup');
    const first = settleOpportunityEvent(createBaseSnapshot(), startupEvent, { dice: { first: 2, second: 3 } }, config);
    const second = settleOpportunityEvent(createBaseSnapshot(), startupEvent, { dice: { first: 2, second: 3 } }, config);

    assert.deepEqual(second, first);
  });
});
