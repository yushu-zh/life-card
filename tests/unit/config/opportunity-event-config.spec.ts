import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { validateOpportunityEventConfig } from '../../../src/config/validators/validateOpportunityEventConfig.ts';

describe('loadOpportunityEventConfig', () => {
  it('loads the Phase 1 opportunity event config', () => {
    const config = loadOpportunityEventConfig();

    assert.equal(config.scoreBands.failure.max, 6);
    assert.equal(config.scoreBands.costlySuccess.min, 7);
    assert.equal(config.scoreBands.success.max, 11);
    assert.equal(config.scoreBands.criticalSuccess.min, 12);
    assert.equal(config.events.length, 22);

    const startup = config.events.find((event) => event.id === 'achievement-startup');
    assert.deepEqual(startup?.check.abilityKeys, ['social', 'creativity']);

    const rest = config.events.find((event) => event.id === 'self-rest');
    assert.equal(rest?.check.kind, 'none');

    const oddJob = config.events.find((event) => event.id === 'achievement-odd-job');
    assert.equal(oddJob?.check.kind, 'none');
    assert.deepEqual(oddJob?.effects.fixedCost, [
      { key: 'money', amount: 1 },
      { key: 'energy', amount: -1 }
    ]);

    const frugality = config.events.find((event) => event.id === 'achievement-frugality');
    assert.equal(frugality?.check.kind, 'none');
    assert.deepEqual(frugality?.effects.fixedCost, [
      { key: 'freedom', amount: -1 },
      { key: 'money', amount: 1 }
    ]);
  });
});

describe('validateOpportunityEventConfig', () => {
  it('throws when a required effects field is missing', () => {
    assert.throws(
      () =>
        validateOpportunityEventConfig({
          scoreBands: {
            failure: { max: 6 },
            costlySuccess: { min: 7, max: 9 },
            success: { min: 10, max: 11 },
            criticalSuccess: { min: 12 }
          },
          events: [
            {
              id: 'event-1',
              name: '事件1',
              category: 'self',
              availability: {
                maxOccurrences: null,
                requiresLifeNodes: []
              },
              check: {
                kind: 'sum',
                abilityKeys: ['cognition']
              },
              effects: {
                reward: [],
                fixedCost: [],
                risk: []
              },
              onNonFailure: []
            }
          ]
        }),
      new Error('Opportunity event event-1 field effects.criticalBonus must be an array')
    );
  });

  it('throws when score bands are not continuous', () => {
    assert.throws(
      () =>
        validateOpportunityEventConfig({
          scoreBands: {
            failure: { max: 6 },
            costlySuccess: { min: 8, max: 9 },
            success: { min: 10, max: 11 },
            criticalSuccess: { min: 12 }
          },
          events: []
        }),
      new Error('Opportunity score bands must form a continuous non-overlapping range')
    );
  });

  it('throws when a sum check event has no abilities', () => {
    assert.throws(
      () =>
        validateOpportunityEventConfig({
          scoreBands: {
            failure: { max: 6 },
            costlySuccess: { min: 7, max: 9 },
            success: { min: 10, max: 11 },
            criticalSuccess: { min: 12 }
          },
          events: [
            {
              id: 'event-1',
              name: '事件1',
              category: 'self',
              availability: {
                maxOccurrences: null,
                requiresLifeNodes: []
              },
              check: {
                kind: 'sum',
                abilityKeys: []
              },
              effects: {
                reward: [],
                fixedCost: [],
                risk: [],
                criticalBonus: []
              },
              onNonFailure: []
            }
          ]
        }),
      new Error('Opportunity event event-1 requires at least one ability key for check kind sum')
    );
  });
});
