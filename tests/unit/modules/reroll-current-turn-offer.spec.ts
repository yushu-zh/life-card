import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
import { getOrCreateCurrentTurnOffer } from '../../../src/modules/turn/getOrCreateCurrentTurnOffer.ts';
import { rerollCurrentTurnOffer } from '../../../src/modules/turn/rerollCurrentTurnOffer.ts';
import { createGameSessionStore } from '../../../src/storage/game-session/store.ts';
import type { CreatePlayerInput } from '../../../src/shared/types/bootstrap.ts';
import { createInMemoryIndexedDB } from '../../support/inMemoryIndexedDB.ts';

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

describe('rerollCurrentTurnOffer', () => {
  it('keeps the slot categories but refreshes the cards after reroll', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-reroll-1',
      store
    });

    const first = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-reroll-1'
      },
      {
        store,
        random: () => 0
      }
    );
    const rerolled = await rerollCurrentTurnOffer(
      {
        sessionId: 'session-reroll-1'
      },
      {
        store,
        random: () => 0.95
      }
    );

    assert.deepEqual(rerolled.slotCategories, first.slotCategories);
    assert.deepEqual(rerolled.initialOffer, first.initialOffer);
    assert.equal(rerolled.rerollCount, 1);
    assert.notDeepEqual(rerolled.currentOffer, first.currentOffer);
  });

  it('reroll produces cards different from the initial offer', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-reroll-norepeat',
      store
    });

    const first = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-reroll-norepeat'
      },
      {
        store,
        random: () => 0
      }
    );
    const rerolled = await rerollCurrentTurnOffer(
      {
        sessionId: 'session-reroll-norepeat'
      },
      {
        store,
        random: () => 0.95
      }
    );

    const initialIds = new Set(first.currentOffer.map((card) => card.eventId));

    for (const card of rerolled.currentOffer) {
      assert.equal(initialIds.has(card.eventId), false, `rerolled card ${card.eventId} should not repeat an initial card`);
    }
  });

  it('rejects a second reroll in the same turn', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-reroll-2',
      store
    });

    await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-reroll-2'
      },
      {
        store,
        random: () => 0
      }
    );

    await rerollCurrentTurnOffer(
      {
        sessionId: 'session-reroll-2'
      },
      {
        store,
        random: () => 0.9
      }
    );

    await assert.rejects(
      () =>
        rerollCurrentTurnOffer(
          {
            sessionId: 'session-reroll-2'
          },
          {
            store,
            random: () => 0.2
          }
        ),
      new Error('Game session session-reroll-2 cannot reroll more than 1 time(s) in one turn')
    );
  });
});
