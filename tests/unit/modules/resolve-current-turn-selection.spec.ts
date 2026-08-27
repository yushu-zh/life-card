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
          updatedSnapshot.lifecycle.endReason = 'status-health-crisis';

          return {
            updatedSnapshot,
            results: [
              {
                id: 'health-crisis',
                name: '健康危机',
                kind: 'death-risk',
                resolutionMode: 'per-turn-risk-check',
                firstTrigger: false,
                conditions: [
                  {
                    key: 'health',
                    operator: '<=',
                    threshold: -1,
                    actual: -2
                  }
                ],
                deathProbability: 0.02,
                roll: 0.01,
                died: true,
                endReason: 'status-health-crisis'
              }
            ],
            ended: true,
            endReason: 'status-health-crisis'
          };
        }
      }
    );

    assert.equal(summary.progressionAfterTurn.isEnded, true);
    assert.equal(summary.progressionAfterTurn.endReason, 'status-health-crisis');
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

  it('runs the built-in status engine by default and writes status results into turn history', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-resolve-3',
      store
    });

    const persistedBeforeOffer = await store.getGameSession('session-resolve-3');

    if (!persistedBeforeOffer) {
      throw new Error('Expected persisted session before creating turn offer');
    }

    persistedBeforeOffer.snapshot.stats.resources.money = 0;
    await store.saveGameSession(persistedBeforeOffer.snapshot);

    await getOrCreateCurrentTurnOffer(
      {
        sessionId: 'session-resolve-3'
      },
      {
        store,
        random: () => 0
      }
    );

    const summary = await resolveCurrentTurnSelection(
      {
        sessionId: 'session-resolve-3',
        slotIndex: 1
      },
      {
        store,
        random: () => 0.9,
        rollDice: () => ({ first: 2, second: 3 })
      }
    );

    assert.deepEqual(summary.statuses.map((status) => status.id), ['economic-crisis']);
    assert.equal(summary.updatedSnapshot.records.triggeredStateIds.includes('economic-crisis'), true);
    assert.equal(summary.updatedSnapshot.records.lifeHistory.at(-1)?.type, 'turn-resolution');

    const turnHistory = summary.updatedSnapshot.records.lifeHistory.at(-1);

    if (!turnHistory || turnHistory.type !== 'turn-resolution') {
      throw new Error('Expected the latest life history entry to be a turn-resolution record');
    }

    assert.deepEqual(turnHistory.statuses, summary.statuses);
  });

  it('attaches AI narrative to summary and history when injected', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, {
      sessionId: 'session-resolve-ai',
      store
    });

    await getOrCreateCurrentTurnOffer(
      { sessionId: 'session-resolve-ai' },
      { store, random: () => 0 }
    );

    const summary = await resolveCurrentTurnSelection(
      { sessionId: 'session-resolve-ai', slotIndex: 0 },
      {
        store,
        random: () => 0.9,
        rollDice: () => ({ first: 2, second: 3 }),
        selectedCardNarrative: {
          description: '一家AI公司向你发出邀请，你决定接受这份工作。'
        },
        generateResultNarrative: async () => ({
          description: '你成功入职，收入提升，经验增长。'
        })
      }
    );

    assert.ok(summary.narrative);
    assert.strictEqual(summary.narrative?.result?.description, '你成功入职，收入提升，经验增长。');
    assert.strictEqual(summary.narrative?.card?.description, '一家AI公司向你发出邀请，你决定接受这份工作。');

    const historyEntry = summary.updatedSnapshot.records.lifeHistory.at(-1);
    assert.equal(historyEntry?.type, 'turn-resolution');
    if (historyEntry?.type === 'turn-resolution') {
      assert.deepEqual(historyEntry.narrative, summary.narrative);
    }
  });

  it('attaches AI fate narrative to summary and history when fate triggers', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, { sessionId: 'session-resolve-fate-ai', store });

    await getOrCreateCurrentTurnOffer(
      { sessionId: 'session-resolve-fate-ai' },
      { store, random: () => 0 }
    );

    const summary = await resolveCurrentTurnSelection(
      { sessionId: 'session-resolve-fate-ai', slotIndex: 0 },
      {
        store,
        // random 0 低于命运触发概率，确保本回合触发命运事件。
        random: () => 0,
        rollDice: () => ({ first: 2, second: 3 }),
        // 空状态结果，避免默认状态引擎干扰本用例。
        resolveStatuses: (snapshot) => ({
          updatedSnapshot: snapshot,
          results: [],
          ended: false,
          endReason: null
        }),
        generateFateNarrative: async () => ({
          description: '公司架构调整，你被迫离开原有岗位。'
        })
      }
    );

    assert.ok(summary.fate?.triggered);
    assert.strictEqual(summary.narrative?.fate?.description, '公司架构调整，你被迫离开原有岗位。');

    const historyEntry = summary.updatedSnapshot.records.lifeHistory.at(-1);
    assert.equal(historyEntry?.type, 'turn-resolution');
    if (historyEntry?.type === 'turn-resolution') {
      assert.deepEqual(historyEntry.narrative, summary.narrative);
    }
  });

  it('attaches AI status narrative to summary and history when statuses trigger', async () => {
    const store = createGameSessionStore({ indexedDB: createInMemoryIndexedDB() });

    await createNewGame(baseInput, { sessionId: 'session-resolve-status-ai', store });

    await getOrCreateCurrentTurnOffer(
      { sessionId: 'session-resolve-status-ai' },
      { store, random: () => 0 }
    );

    const summary = await resolveCurrentTurnSelection(
      { sessionId: 'session-resolve-status-ai', slotIndex: 0 },
      {
        store,
        // random 0.9 高于命运触发概率，避免命运事件干扰本用例。
        random: () => 0.9,
        rollDice: () => ({ first: 2, second: 3 }),
        resolveStatuses: (snapshot) => {
          const updatedSnapshot = structuredClone(snapshot);

          return {
            updatedSnapshot,
            results: [
              {
                id: 'economic-crisis',
                name: '经济危机',
                kind: 'one-time-effect',
                resolutionMode: 'once-per-game',
                firstTrigger: true,
                conditions: [{ key: 'money', operator: '<=', threshold: 0, actual: 0 }],
                appliedDeltas: [{ key: 'happiness', amount: -1 }]
              }
            ],
            ended: false,
            endReason: null
          };
        },
        generateStatusNarrative: async () => ({
          description: '收入中断让你陷入经济压力。'
        })
      }
    );

    assert.strictEqual(summary.statuses.length, 1);
    assert.strictEqual(summary.narrative?.statuses['economic-crisis']?.description, '收入中断让你陷入经济压力。');

    const historyEntry = summary.updatedSnapshot.records.lifeHistory.at(-1);
    assert.equal(historyEntry?.type, 'turn-resolution');
    if (historyEntry?.type === 'turn-resolution') {
      assert.deepEqual(historyEntry.narrative, summary.narrative);
    }
  });
});
