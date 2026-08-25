import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { dealTurnOffer } from '../../../../src/engine/opportunity/dealTurnOffer.ts';
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
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-deal-turn');
}

describe('dealTurnOffer', () => {
  it('deals cards matching the requested slot categories', () => {
    const snapshot = createBaseSnapshot();
    const offer = dealTurnOffer(snapshot, ['achievement', 'relationship', 'self'], loadOpportunityEventConfig(), {
      random: () => 0
    });

    assert.deepEqual(
      offer.map((card) => ({ slotIndex: card.slotIndex, category: card.category })),
      [
        { slotIndex: 0, category: 'achievement' },
        { slotIndex: 1, category: 'relationship' },
        { slotIndex: 2, category: 'self' }
      ]
    );
  });

  it('skips events that have already reached the max issued count through selected or discarded records', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 40;
    snapshot.records.lifeNodes.romanceSuccessCount = 1;
    snapshot.records.selectedEventIds.push('relationship-marriage');

    const offer = dealTurnOffer(snapshot, ['relationship'], loadOpportunityEventConfig(), {
      random: () => 0
    });

    assert.equal(offer[0].eventId, 'relationship-home-car');
  });

  it('skips events that are already visible in the current active turn', () => {
    const snapshot = createBaseSnapshot();
    snapshot.progression.age = 40;
    snapshot.records.lifeNodes.romanceSuccessCount = 1;
    snapshot.turnState.activeTurn = {
      age: 40,
      cycle: 5,
      turn: 1,
      patternKind: 'balanced',
      slotCategories: ['relationship', 'achievement', 'self'],
      initialOffer: [
        {
          slotIndex: 0,
          eventId: 'relationship-marriage',
          category: 'relationship'
        },
        {
          slotIndex: 1,
          eventId: 'achievement-startup',
          category: 'achievement'
        },
        {
          slotIndex: 2,
          eventId: 'self-rest',
          category: 'self'
        }
      ],
      rerolledOffer: null,
      currentOffer: [
        {
          slotIndex: 0,
          eventId: 'relationship-marriage',
          category: 'relationship'
        },
        {
          slotIndex: 1,
          eventId: 'achievement-startup',
          category: 'achievement'
        },
        {
          slotIndex: 2,
          eventId: 'self-rest',
          category: 'self'
        }
      ],
      rerollCount: 0
    };

    const offer = dealTurnOffer(snapshot, ['relationship'], loadOpportunityEventConfig(), {
      random: () => 0
    });

    assert.equal(offer[0].eventId, 'relationship-home-car');
  });

  it('deals two unique cards even for the same category', () => {
    const snapshot = createBaseSnapshot();
    const offer = dealTurnOffer(snapshot, ['self', 'self'], loadOpportunityEventConfig(), {
      random: () => 0
    });

    assert.notEqual(offer[0].eventId, offer[1].eventId);
  });

  it('excludes the provided event ids', () => {
    const snapshot = createBaseSnapshot();
    const offer = dealTurnOffer(snapshot, ['self'], loadOpportunityEventConfig(), {
      random: () => 0,
      excludedEventIds: ['self-create-work']
    });

    assert.notEqual(offer[0].eventId, 'self-create-work');
  });

  it('forces the rest card when forcedEventIds is provided', () => {
    const snapshot = createBaseSnapshot();
    const offer = dealTurnOffer(snapshot, ['achievement', 'relationship', 'self'], loadOpportunityEventConfig(), {
      random: () => 0,
      forcedEventIds: ['self-rest']
    });

    const selfCard = offer.find((card) => card.category === 'self');

    assert.equal(selfCard?.eventId, 'self-rest');
  });
});
