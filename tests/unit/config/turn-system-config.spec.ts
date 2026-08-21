import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadTurnSystemConfig } from '../../../src/config/loaders/loadTurnSystemConfig.ts';
import { validateTurnSystemConfig } from '../../../src/config/validators/validateTurnSystemConfig.ts';

describe('loadTurnSystemConfig', () => {
  it('loads the phase 2 turn system config', () => {
    const config = loadTurnSystemConfig();

    assert.deepEqual(config.cycleStartAges, [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]);
    assert.equal(config.endAgeExclusive, 80);
    assert.equal(config.redrawLimitPerTurn, 1);
    assert.deepEqual(config.categoryTieBreakOrder, ['achievement', 'relationship', 'self']);
    assert.equal(config.stageRules.length, 3);
    assert.equal(config.stageRules[1].turnRules[1], 'weighted-by-pick-counts');
    assert.equal(config.fate.triggerProbability, 0.03);
    assert.equal(config.fate.events.length, 5);
  });
});

describe('validateTurnSystemConfig', () => {
  it('throws when a stage rule turnRules length does not match turnsPerCycle', () => {
    assert.throws(
      () =>
        validateTurnSystemConfig({
          cycleStartAges: [20],
          endAgeExclusive: 25,
          redrawLimitPerTurn: 1,
          categoryTieBreakOrder: ['achievement', 'relationship', 'self'],
          stageRules: [
            {
              minAge: 20,
              maxExclusive: 25,
              turnsPerCycle: 2,
              turnRules: ['balanced']
            }
          ],
          fate: {
            triggerProbability: 0.03,
            adaptabilityMitigationPerPoint: 0.2,
            events: [
              {
                id: 'fate-1',
                name: '命运1',
                effects: [{ key: 'money', amount: -1 }]
              }
            ]
          }
        }),
      new Error('Turn system stage rule at index 0 turnRules length must match turnsPerCycle')
    );
  });

  it('throws when stage rules do not continuously cover the configured ages', () => {
    assert.throws(
      () =>
        validateTurnSystemConfig({
          cycleStartAges: [20, 25],
          endAgeExclusive: 30,
          redrawLimitPerTurn: 1,
          categoryTieBreakOrder: ['achievement', 'relationship', 'self'],
          stageRules: [
            {
              minAge: 20,
              maxExclusive: 24,
              turnsPerCycle: 1,
              turnRules: ['balanced']
            },
            {
              minAge: 25,
              maxExclusive: 30,
              turnsPerCycle: 1,
              turnRules: ['balanced']
            }
          ],
          fate: {
            triggerProbability: 0.03,
            adaptabilityMitigationPerPoint: 0.2,
            events: [
              {
                id: 'fate-1',
                name: '命运1',
                effects: [{ key: 'money', amount: -1 }]
              }
            ]
          }
        }),
      new Error('Turn system stage rules must be continuous and non-overlapping')
    );
  });

  it('throws when fate events are empty', () => {
    assert.throws(
      () =>
        validateTurnSystemConfig({
          cycleStartAges: [20],
          endAgeExclusive: 25,
          redrawLimitPerTurn: 1,
          categoryTieBreakOrder: ['achievement', 'relationship', 'self'],
          stageRules: [
            {
              minAge: 20,
              maxExclusive: 25,
              turnsPerCycle: 1,
              turnRules: ['balanced']
            }
          ],
          fate: {
            triggerProbability: 0.03,
            adaptabilityMitigationPerPoint: 0.2,
            events: []
          }
        }),
      new Error('Turn system fate field events must not be empty')
    );
  });
});
