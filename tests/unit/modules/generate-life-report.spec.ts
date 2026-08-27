import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateLifeReport } from '../../../src/modules/report/generateLifeReport.ts';
import { createGameSessionStore } from '../../../src/storage/game-session/store.ts';
import { createInMemoryIndexedDB } from '../../support/inMemoryIndexedDB.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';
import type { LifeReportNarrative } from '../../../src/shared/types/narrative.ts';

function buildReportNarrative(): LifeReportNarrative {
  return { paragraphs: ['你的一生充满选择。', '最终你走向了远方。'] };
}

// 测试人生报告编排：只在终局后生成、成功后持久化、失败走 fallback、已生成则幂等。
describe('generateLifeReport', () => {
  it('persists the report text when generation succeeds', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    await store.saveGameSession(snapshot);

    const result = await generateLifeReport(
      { sessionId: snapshot.meta.sessionId },
      { store, generateReportNarrative: async () => buildReportNarrative() }
    );

    assert.strictEqual(result.lifecycle.finalReportText, '你的一生充满选择。\n\n最终你走向了远方。');

    const persisted = await store.getGameSession(snapshot.meta.sessionId);
    assert.strictEqual(persisted?.snapshot.lifecycle.finalReportText, '你的一生充满选择。\n\n最终你走向了远方。');
  });

  it('throws when the session has not ended', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.lifecycle.isEnded = false;
    await store.saveGameSession(snapshot);

    await assert.rejects(
      generateLifeReport(
        { sessionId: snapshot.meta.sessionId },
        { store, generateReportNarrative: async () => buildReportNarrative() }
      ),
      /has not ended yet/
    );
  });

  it('keeps finalReportText null when generation returns null', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    await store.saveGameSession(snapshot);

    const result = await generateLifeReport(
      { sessionId: snapshot.meta.sessionId },
      { store, generateReportNarrative: async () => null }
    );

    assert.strictEqual(result.lifecycle.finalReportText, null);
  });

  it('does not call AI again when a report already exists', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.lifecycle.finalReportText = '已有报告';
    await store.saveGameSession(snapshot);

    let callCount = 0;
    const result = await generateLifeReport(
      { sessionId: snapshot.meta.sessionId },
      {
        store,
        generateReportNarrative: async () => {
          callCount += 1;
          return buildReportNarrative();
        }
      }
    );

    assert.strictEqual(callCount, 0);
    assert.strictEqual(result.lifecycle.finalReportText, '已有报告');
  });

  it('regenerates the report when forced', async () => {
    const indexedDB = createInMemoryIndexedDB();
    const store = createGameSessionStore({ indexedDB });
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.lifecycle.finalReportText = '旧报告';
    await store.saveGameSession(snapshot);

    let callCount = 0;
    const result = await generateLifeReport(
      { sessionId: snapshot.meta.sessionId },
      {
        store,
        force: true,
        generateReportNarrative: async () => {
          callCount += 1;
          return { paragraphs: ['新报告'] };
        }
      }
    );

    assert.strictEqual(callCount, 1);
    assert.strictEqual(result.lifecycle.finalReportText, '新报告');
  });
});
