import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createNewGame } from '../../../src/modules/bootstrap/createNewGame.ts';
import { getOrCreateCurrentTurnOffer } from '../../../src/modules/turn/getOrCreateCurrentTurnOffer.ts';
import { rerollCurrentTurnOffer } from '../../../src/modules/turn/rerollCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../../src/modules/turn/resolveCurrentTurnSelection.ts';
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

describe('resolveCurrentTurnSelection', () => {
  it('settles the full turn, writes history, and advances progression', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-resolve-1',
      store
    });

    const activeTurn = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-resolve-1'
      },
      {
        store,
        random: () => 0
      }
    );

    const summary = await resolveCurrentTurnSelection(
      {
        sessionId: 'session-resolve-1',
        slotIndex: 0
      },
      {
        store,
        random: () => 0.9,
        rollDice: () => ({ first: 2, second: 3 })
      }
    );

    assert.equal(summary.selectedCard.eventId, activeTurn.currentOffer[0].eventId);
    assert.equal(summary.opportunity.event.id, activeTurn.currentOffer[0].eventId);
    assert.equal(summary.fate, null);
    assert.equal(summary.statuses.length, 0);
    assert.equal(summary.updatedSnapshot.turnState.activeTurn, null);
    assert.equal(summary.updatedSnapshot.progression.turn, 2);
    assert.deepEqual(summary.updatedSnapshot.records.discardedEventIds, [
      activeTurn.currentOffer[1].eventId,
      activeTurn.currentOffer[2].eventId
    ]);
    assert.equal(summary.updatedSnapshot.records.lifeHistory.at(-1)?.type, 'turn-resolution');

    const persisted = await store.getGameSession('session-resolve-1');
    assert.deepEqual(persisted?.snapshot, summary.updatedSnapshot);
  });

  it('includes rerolled-away cards in discarded history and stops progression when statuses end the game', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-resolve-2',
      store
    });

    const initial = await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-resolve-2'
      },
      {
        store,
        random: () => 0
      }
    );

    const rerolled = await rerollCurrentTurnOffer(
      {
        sessionId: 'session-resolve-2'
      },
      {
        store,
        random: () => 0.95
      }
    );

    const summary = await resolveCurrentTurnSelection(
      {
        sessionId: 'session-resolve-2',
        slotIndex: rerolled.currentOffer[0].slotIndex
      },
      {
        store,
        random: () => 0,
        rollDice: () => ({ first: 2, second: 3 }),
        resolveStatuses: (snapshot) => {
          const updatedSnapshot = structuredClone(snapshot);
          updatedSnapshot.lifecycle.isEnded = true;
          updatedSnapshot.lifecycle.endReason = 'status-death';

          return {
            updatedSnapshot,
            results: [
              {
                type: 'status-result',
                source: 'test-status'
              }
            ],
            ended: true,
            endReason: 'status-death'
          };
        }
      }
    );

    assert.equal(summary.progressionAfterTurn.isEnded, true);
    assert.equal(summary.progressionAfterTurn.endReason, 'status-death');
    assert.equal(summary.updatedSnapshot.progression.turn, 1);
    assert.deepEqual(
      summary.discardedCards.map((card) => card.eventId),
      [
        ...initial.initialOffer.map((card) => card.eventId),
        rerolled.currentOffer[1].eventId,
        rerolled.currentOffer[2].eventId
      ]
    );
    assert.equal(summary.statuses.length, 1);
  });
});
