import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
import { getOrCreateCurrentTurnOffer } from '../../../src/modules/turn/getOrCreateCurrentTurnOffer.ts';
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

describe('getOrCreateCurrentTurnOffer', () => {
  it('creates and persists the active turn offer on first access', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-offer-1',
      store
    });

    const activeTurn = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-offer-1'
      },
      {
        store,
        random: () => 0
      }
    );

    assert.equal(activeTurn.currentOffer.length, 3);
    assert.deepEqual(activeTurn.slotCategories, ['achievement', 'relationship', 'self']);

    const persisted = await store.getGameSession('session-offer-1');
    assert.deepEqual(persisted?.snapshot.turnState.activeTurn, activeTurn);
  });

  it('returns the existing offer instead of silently dealing again', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-offer-2',
      store
    });

    const first = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-offer-2'
      },
      {
        store,
        random: () => 0
      }
    );
    const second = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-offer-2'
      },
      {
        store,
        random: () => 0.9
      }
    );

    assert.deepEqual(second, first);
  });

  it('forces an income card when money is at or below zero', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-offer-income',
      store
    });

    const persisted = await store.getGameSession('session-offer-income');

    if (!persisted) {
      throw new Error('Expected persisted session before forcing income');
    }

    persisted.snapshot.stats.resources.money = 0;
    await store.saveGameSession(persisted.snapshot);

    const activeTurn = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-offer-income'
      },
      {
        store,
        random: () => 0
      }
    );

    const incomeCard = activeTurn.currentOffer.find((card) =>
      ['achievement-odd-job', 'achievement-frugality'].includes(card.eventId)
    );

    assert.ok(incomeCard, 'money <= 0 should force an income card');
  });
});
