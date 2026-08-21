import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
import { settleSingleOpportunityEvent } from '../../../src/modules/turn/settleSingleOpportunityEvent.ts';
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

describe('settleSingleOpportunityEvent', () => {
  it('loads the session, settles the event, and persists the updated snapshot', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });

    await createNewGame(baseInput, {
      sessionId: 'session-turn-1',
      store
    });

    const summary = await settleSingleOpportunityEvent(
      {
        sessionId: 'session-turn-1',
        eventId: 'achievement-startup',
        dice: { first: 2, second: 3 }
      },
      { store }
    );

    assert.equal(summary.event.id, 'achievement-startup');
    assert.equal(summary.resultGrade, 'costlySuccess');

    const persisted = await store.getGameSession('session-turn-1');

    assert.deepEqual(persisted?.snapshot, summary.updatedSnapshot);
    assert.equal(persisted?.snapshot.records.lifeHistory.length, 0);
    assert.equal(persisted?.snapshot.records.selectedEventIds[0], 'achievement-startup');
  });

  it('throws when the session or event cannot be found', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });

    await assert.rejects(
      () =>
        settleSingleOpportunityEvent(
          {
            sessionId: 'missing-session',
            eventId: 'achievement-startup',
            dice: { first: 2, second: 3 }
          },
          { store }
        ),
      new Error('Game session missing-session was not found')
    );

    await createNewGame(baseInput, {
      sessionId: 'session-turn-2',
      store
    });

    await assert.rejects(
      () =>
        settleSingleOpportunityEvent(
          {
            sessionId: 'session-turn-2',
            eventId: 'missing-event',
            dice: { first: 2, second: 3 }
          },
          { store }
        ),
      new Error('Opportunity event missing-event was not found')
    );
  });
});
