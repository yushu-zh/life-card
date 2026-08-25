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
    assert.equal(config.statuses.economicCrisis.id, 'economic-crisis');
    assert.equal(config.statuses.economicCrisis.moneyMax, 0);
    assert.equal(config.statuses.healthCrisis.probabilityPerNegativePoint, 0.01);
    assert.equal(config.statuses.energyCrisis.resolutionMode, 'per-cycle-effect');
    assert.equal(config.statuses.energyCrisis.energyMax, -3);
    assert.deepEqual(config.statuses.energyCrisis.effects, [{ key: 'health', amount: -1 }]);
    assert.equal(config.statuses.lifeCrisis.deathProbability, 0.05);
    assert.equal(config.energyRules.restCardId, 'self-rest');
    assert.equal(config.energyRules.forceRestMaxEnergy, 0);
    assert.equal(config.energyRules.blockSelectionBelowEnergy, -5);
    assert.deepEqual(config.moneyRules.incomeCardIds, ['achievement-odd-job', 'achievement-frugality']);
    assert.equal(config.moneyRules.forceIncomeMaxMoney, 0);
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
          energyRules: {
            restCardId: 'self-rest',
            forceRestMaxEnergy: 0,
            blockSelectionBelowEnergy: -5
          },
          moneyRules: {
            incomeCardIds: ['achievement-odd-job', 'achievement-frugality'],
            forceIncomeMaxMoney: 0
          },
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
          },
          statuses: {
            economicCrisis: {
              id: 'economic-crisis',
              name: '经济危机',
              resolutionMode: 'once-per-game',
              moneyMax: 2,
              effects: [{ key: 'happiness', amount: -1 }]
            },
            professionalAchievement: {
              id: 'professional-achievement',
              name: '专业成就',
              resolutionMode: 'once-per-game',
              cognitionMin: 5,
              effects: [{ key: 'influence', amount: 1 }]
            },
            socialStatus: {
              id: 'social-status',
              name: '社会地位',
              resolutionMode: 'once-per-game',
              influenceMin: 5,
              effects: [{ key: 'money', amount: 1 }]
            },
            healthCrisis: {
              id: 'health-crisis',
              name: '健康危机',
              resolutionMode: 'per-turn-risk-check',
              healthMax: -1,
              probabilityPerNegativePoint: 0.01
            },
            energyCrisis: {
              id: 'energy-crisis',
              name: '精力危机',
              resolutionMode: 'per-cycle-effect',
              energyMax: -3,
              effects: [{ key: 'health', amount: -1 }]
            },
            lifeCrisis: {
              id: 'life-crisis',
              name: '生命危机',
              resolutionMode: 'per-turn-risk-check',
              ageMin: 50,
              healthMax: -3,
              energyMax: -2,
              deathProbability: 0.05
            }
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
          energyRules: {
            restCardId: 'self-rest',
            forceRestMaxEnergy: 0,
            blockSelectionBelowEnergy: -5
          },
          moneyRules: {
            incomeCardIds: ['achievement-odd-job', 'achievement-frugality'],
            forceIncomeMaxMoney: 0
          },
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
          },
          statuses: {
            economicCrisis: {
              id: 'economic-crisis',
              name: '经济危机',
              resolutionMode: 'once-per-game',
              moneyMax: 2,
              effects: [{ key: 'happiness', amount: -1 }]
            },
            professionalAchievement: {
              id: 'professional-achievement',
              name: '专业成就',
              resolutionMode: 'once-per-game',
              cognitionMin: 5,
              effects: [{ key: 'influence', amount: 1 }]
            },
            socialStatus: {
              id: 'social-status',
              name: '社会地位',
              resolutionMode: 'once-per-game',
              influenceMin: 5,
              effects: [{ key: 'money', amount: 1 }]
            },
            healthCrisis: {
              id: 'health-crisis',
              name: '健康危机',
              resolutionMode: 'per-turn-risk-check',
              healthMax: -1,
              probabilityPerNegativePoint: 0.01
            },
            energyCrisis: {
              id: 'energy-crisis',
              name: '精力危机',
              resolutionMode: 'per-cycle-effect',
              energyMax: -3,
              effects: [{ key: 'health', amount: -1 }]
            },
            lifeCrisis: {
              id: 'life-crisis',
              name: '生命危机',
              resolutionMode: 'per-turn-risk-check',
              ageMin: 50,
              healthMax: -3,
              energyMax: -2,
              deathProbability: 0.05
            }
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
          energyRules: {
            restCardId: 'self-rest',
            forceRestMaxEnergy: 0,
            blockSelectionBelowEnergy: -5
          },
          moneyRules: {
            incomeCardIds: ['achievement-odd-job', 'achievement-frugality'],
            forceIncomeMaxMoney: 0
          },
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
          },
          statuses: {
            economicCrisis: {
              id: 'economic-crisis',
              name: '经济危机',
              resolutionMode: 'once-per-game',
              moneyMax: 2,
              effects: [{ key: 'happiness', amount: -1 }]
            },
            professionalAchievement: {
              id: 'professional-achievement',
              name: '专业成就',
              resolutionMode: 'once-per-game',
              cognitionMin: 5,
              effects: [{ key: 'influence', amount: 1 }]
            },
            socialStatus: {
              id: 'social-status',
              name: '社会地位',
              resolutionMode: 'once-per-game',
              influenceMin: 5,
              effects: [{ key: 'money', amount: 1 }]
            },
            healthCrisis: {
              id: 'health-crisis',
              name: '健康危机',
              resolutionMode: 'per-turn-risk-check',
              healthMax: -1,
              probabilityPerNegativePoint: 0.01
            },
            energyCrisis: {
              id: 'energy-crisis',
              name: '精力危机',
              resolutionMode: 'per-cycle-effect',
              energyMax: -3,
              effects: [{ key: 'health', amount: -1 }]
            },
            lifeCrisis: {
              id: 'life-crisis',
              name: '生命危机',
              resolutionMode: 'per-turn-risk-check',
              ageMin: 50,
              healthMax: -3,
              energyMax: -2,
              deathProbability: 0.05
            }
          }
        }),
      new Error('Turn system fate field events must not be empty')
    );
  });

  it('throws when status ids are duplicated', () => {
    assert.throws(
      () =>
        validateTurnSystemConfig({
          cycleStartAges: [20],
          endAgeExclusive: 25,
          redrawLimitPerTurn: 1,
          categoryTieBreakOrder: ['achievement', 'relationship', 'self'],
          energyRules: {
            restCardId: 'self-rest',
            forceRestMaxEnergy: 0,
            blockSelectionBelowEnergy: -5
          },
          moneyRules: {
            incomeCardIds: ['achievement-odd-job', 'achievement-frugality'],
            forceIncomeMaxMoney: 0
          },
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
            events: [
              {
                id: 'fate-1',
                name: '命运1',
                effects: [{ key: 'money', amount: -1 }]
              }
            ]
          },
          statuses: {
            economicCrisis: {
              id: 'duplicated-status',
              name: '经济危机',
              resolutionMode: 'once-per-game',
              moneyMax: 2,
              effects: [{ key: 'happiness', amount: -1 }]
            },
            professionalAchievement: {
              id: 'duplicated-status',
              name: '专业成就',
              resolutionMode: 'once-per-game',
              cognitionMin: 5,
              effects: [{ key: 'influence', amount: 1 }]
            },
            socialStatus: {
              id: 'social-status',
              name: '社会地位',
              resolutionMode: 'once-per-game',
              influenceMin: 5,
              effects: [{ key: 'money', amount: 1 }]
            },
            healthCrisis: {
              id: 'health-crisis',
              name: '健康危机',
              resolutionMode: 'per-turn-risk-check',
              healthMax: -1,
              probabilityPerNegativePoint: 0.01
            },
            energyCrisis: {
              id: 'energy-crisis',
              name: '精力危机',
              resolutionMode: 'per-cycle-effect',
              energyMax: -3,
              effects: [{ key: 'health', amount: -1 }]
            },
            lifeCrisis: {
              id: 'life-crisis',
              name: '生命危机',
              resolutionMode: 'per-turn-risk-check',
              ageMin: 50,
              healthMax: -3,
              energyMax: -2,
              deathProbability: 0.05
            }
          }
        }),
      new Error('Turn system status ids must be unique: duplicated-status')
    );
  });

  it('throws when a status probability is outside the valid range', () => {
    assert.throws(
      () =>
        validateTurnSystemConfig({
          cycleStartAges: [20],
          endAgeExclusive: 25,
          redrawLimitPerTurn: 1,
          categoryTieBreakOrder: ['achievement', 'relationship', 'self'],
          energyRules: {
            restCardId: 'self-rest',
            forceRestMaxEnergy: 0,
            blockSelectionBelowEnergy: -5
          },
          moneyRules: {
            incomeCardIds: ['achievement-odd-job', 'achievement-frugality'],
            forceIncomeMaxMoney: 0
          },
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
            events: [
              {
                id: 'fate-1',
                name: '命运1',
                effects: [{ key: 'money', amount: -1 }]
              }
            ]
          },
          statuses: {
            economicCrisis: {
              id: 'economic-crisis',
              name: '经济危机',
              resolutionMode: 'once-per-game',
              moneyMax: 2,
              effects: [{ key: 'happiness', amount: -1 }]
            },
            professionalAchievement: {
              id: 'professional-achievement',
              name: '专业成就',
              resolutionMode: 'once-per-game',
              cognitionMin: 5,
              effects: [{ key: 'influence', amount: 1 }]
            },
            socialStatus: {
              id: 'social-status',
              name: '社会地位',
              resolutionMode: 'once-per-game',
              influenceMin: 5,
              effects: [{ key: 'money', amount: 1 }]
            },
            healthCrisis: {
              id: 'health-crisis',
              name: '健康危机',
              resolutionMode: 'per-turn-risk-check',
              healthMax: -1,
              probabilityPerNegativePoint: 2
            },
            energyCrisis: {
              id: 'energy-crisis',
              name: '精力危机',
              resolutionMode: 'per-cycle-effect',
              energyMax: -3,
              effects: [{ key: 'health', amount: -1 }]
            },
            lifeCrisis: {
              id: 'life-crisis',
              name: '生命危机',
              resolutionMode: 'per-turn-risk-check',
              ageMin: 50,
              healthMax: -3,
              energyMax: -2,
              deathProbability: 0.05
            }
          }
        }),
      new Error('Turn system statuses field healthCrisis probabilityPerNegativePoint must be between 0 and 1')
    );
  });
});
