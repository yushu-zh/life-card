import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { createInitialSnapshot } from '../../../src/engine/session/createInitialSnapshot.ts';
import { validateCreatePlayerInput } from '../../../src/engine/session/validateCreatePlayerInput.ts';
import type { CreatePlayerInput } from '../../../src/shared/types/bootstrap.ts';

const baseInput: CreatePlayerInput = {
  profile: {
    nickname: '小宇',
    skillTags: ['写作', '分析'],
    education: '本科',
    industry: '互联网',
    wishes: ['发财', '自由']
  },
  abilities: {
    cognition: 2,
    execution: 2,
    social: 2,
    creativity: 1,
    adaptability: 1
  }
};

describe('validateCreatePlayerInput', () => {
  it('accepts valid player initialization input', () => {
    assert.doesNotThrow(() => validateCreatePlayerInput(baseInput, loadInitialStateConfig()));
  });

  it('rejects empty nicknames', () => {
    assert.throws(
      () =>
        validateCreatePlayerInput(
          {
            ...baseInput,
            profile: {
              ...baseInput.profile,
              nickname: '   '
            }
          },
          loadInitialStateConfig()
        ),
      new Error('Nickname is required')
    );
  });

  it('rejects non integer abilities', () => {
    assert.throws(
      () =>
        validateCreatePlayerInput(
          {
            ...baseInput,
            abilities: {
              ...baseInput.abilities,
              cognition: 1.5
            }
          },
          loadInitialStateConfig()
        ),
      new Error('Ability cognition must be an integer')
    );
  });

  it('rejects ability totals that do not match the configured point total', () => {
    assert.throws(
      () =>
        validateCreatePlayerInput(
          {
            ...baseInput,
            abilities: {
              cognition: 1,
              execution: 1,
              social: 1,
              creativity: 1,
              adaptability: 1
            }
          },
          loadInitialStateConfig()
        ),
      new Error('Ability total must equal 8')
    );
  });

  it('rejects too many skill tags', () => {
    assert.throws(
      () =>
        validateCreatePlayerInput(
          {
            ...baseInput,
            profile: {
              ...baseInput.profile,
              skillTags: ['1', '2', '3', '4']
            }
          },
          loadInitialStateConfig()
        ),
      new Error('Skill tags cannot exceed 3 items')
    );
  });
});

describe('createInitialSnapshot', () => {
  it('creates a complete initial game session snapshot', () => {
    const snapshot = createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-1');

    assert.deepEqual(snapshot, {
      meta: {
        sessionId: 'session-1',
        schemaVersion: 2
      },
      player: {
        nickname: '小宇',
        skillTags: ['写作', '分析'],
        education: '本科',
        industry: '互联网',
        wishes: ['发财', '自由']
      },
      stats: {
        abilities: {
          cognition: 2,
          execution: 2,
          social: 2,
          creativity: 1,
          adaptability: 1
        },
        resources: {
          money: 5,
          energy: 5
        },
        outcomes: {
          happiness: 2,
          freedom: 2,
          health: 2,
          experience: 2,
          influence: 2
        }
      },
      progression: {
        age: 20,
        cycle: 1,
        turn: 1
      },
      turnState: {
        activeTurn: null
      },
      records: {
        selectedEventIds: [],
        discardedEventIds: [],
        triggeredStateIds: [],
        energyCrisisLastCycle: null,
        lifeHistory: [],
        categoryPickCounts: {
          achievement: 0,
          relationship: 0,
          self: 0
        },
        lifeNodes: {
          romanceSuccessCount: 0,
          marriageEstablished: false,
          familyEstablished: false
        }
      },
      lifecycle: {
        isEnded: false,
        endReason: null,
        finalReportId: null
      }
    });
  });
});
