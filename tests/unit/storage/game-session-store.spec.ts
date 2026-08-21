import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { createInitialSnapshot } from '../../../src/engine/session/createInitialSnapshot.ts';
import { createGameSessionStore } from '../../../src/storage/game-session/store.ts';
import type { CreatePlayerInput } from '../../../src/shared/types/bootstrap.ts';
import { createInMemoryIndexedDB } from '../../support/inMemoryIndexedDB.ts';

const baseInput: CreatePlayerInput = {
  profile: {
    nickname: '小宇',
    skillTags: [],
    education: '本科',
    industry: '互联网',
    wishes: []
  },
  abilities: {
    cognition: 2,
    execution: 2,
    social: 2,
    creativity: 1,
    adaptability: 1
  }
};

describe('game session store', () => {
  it('saves and reads back a persisted game session', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-2');

    await store.saveGameSession(snapshot);

    assert.deepEqual(await store.getGameSession('session-2'), {
      sessionId: 'session-2',
      schemaVersion: 2,
      snapshot
    });
  });
});
