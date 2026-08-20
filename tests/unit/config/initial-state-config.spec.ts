import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { validateInitialStateConfig } from '../../../src/config/validators/validateInitialStateConfig.ts';

describe('loadInitialStateConfig', () => {
  it('loads the phase 0 initial state config', () => {
    const config = loadInitialStateConfig();

    assert.deepEqual(config, {
      abilityPointTotal: 8,
      abilityMax: 5,
      initialResources: {
        money: 5,
        energy: 5,
        happiness: 2,
        freedom: 2,
        health: 2,
        experience: 2,
        influence: 2
      },
      skillTagLimit: 3,
      wishLimit: 5
    });
  });
});

describe('validateInitialStateConfig', () => {
  it('throws when a required field is missing', () => {
    assert.throws(
      () =>
        validateInitialStateConfig({
          abilityPointTotal: 8,
          abilityMax: 5,
          initialResources: {
            money: 5,
            energy: 5,
            happiness: 2,
            freedom: 2,
            health: 2,
            experience: 2,
            influence: 2
          },
          skillTagLimit: 3
        }),
      new Error('Initial state config is missing required field: wishLimit')
    );
  });

  it('throws when numeric values are invalid', () => {
    assert.throws(
      () =>
        validateInitialStateConfig({
          abilityPointTotal: 8,
          abilityMax: -1,
          initialResources: {
            money: 5,
            energy: 5,
            happiness: 2,
            freedom: 2,
            health: 2,
            experience: 2,
            influence: 2
          },
          skillTagLimit: 3,
          wishLimit: 5
        }),
      new Error('Initial state config field abilityMax must be a non-negative integer')
    );
  });
});
