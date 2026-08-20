import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
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

describe('createNewGame', () => {
  it('creates and persists a new game session', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });

    const snapshot = await createNewGame(baseInput, {
      sessionId: 'session-3',
      store
    });

    assert.equal(snapshot.meta.sessionId, 'session-3');
    assert.equal(snapshot.progression.age, 20);
    assert.deepEqual(snapshot.records.selectedEventIds, []);
    assert.deepEqual(await store.getGameSession('session-3'), {
      sessionId: 'session-3',
      schemaVersion: 1,
      snapshot
    });
  });
});
