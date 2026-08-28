import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCoreMemory } from '../../../src/ai/buildNarrativeFacts.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';

// 测试本局核心记忆的拼装：结构化人生节点 + 被选中牌面落盘的 AI 记忆条目。
describe('buildCoreMemory', () => {
  it('returns 暂无 when nothing has happened yet', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeHistory = [];
    snapshot.records.lifeNodes = { romanceSuccessCount: 0, marriageEstablished: false, familyEstablished: false };

    assert.strictEqual(buildCoreMemory(snapshot), '暂无');
  });

  it('summarizes established life nodes as verified facts', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeNodes = { romanceSuccessCount: 2, marriageEstablished: true, familyEstablished: false };

    const memory = buildCoreMemory(snapshot);

    assert.ok(memory.includes('恋爱2次'));
    assert.ok(memory.includes('已婚'));
    assert.ok(!memory.includes('已组建家庭'));
  });

  it('collects memory entries only from selected cards landed in history', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeNodes = { romanceSuccessCount: 0, marriageEstablished: false, familyEstablished: false };
    // 第一条历史被选中牌面留下了持久设定；第二条没有 memory（弃牌/无设定都不应出现）。
    snapshot.records.lifeHistory[0].context.age = 22;
    snapshot.records.lifeHistory[0].narrative = {
      card: { description: '你决定拜师学艺。', memory: '开始跟师傅学木工' },
      result: null,
      fate: null,
      statuses: {}
    };
    snapshot.records.lifeHistory[1].narrative = {
      card: { description: '你休息了一天。' },
      result: null,
      fate: null,
      statuses: {}
    };

    const memory = buildCoreMemory(snapshot);

    assert.ok(memory.includes('22岁·开始跟师傅学木工'));
    assert.ok(!memory.includes('你休息了一天'));
  });

  it('keeps only the most recent entries up to the limit', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeNodes = { romanceSuccessCount: 0, marriageEstablished: false, familyEstablished: false };
    // 塞入多于上限的记忆条目，验证只保留最近的几条。
    const baseEntry = snapshot.records.lifeHistory[0];
    snapshot.records.lifeHistory = Array.from({ length: 6 }, (_, index) => {
      const entry = structuredClone(baseEntry);
      entry.context.age = 20 + index;
      entry.narrative = {
        card: { description: `第${index}段经历`, memory: `记忆${index}` },
        result: null,
        fate: null,
        statuses: {}
      };
      return entry;
    });

    const memory = buildCoreMemory(snapshot, 3);

    // 超过上限时丢弃最早的条目，只留最近 3 条。
    assert.ok(!memory.includes('记忆0'));
    assert.ok(!memory.includes('记忆2'));
    assert.ok(memory.includes('记忆3'));
    assert.ok(memory.includes('记忆5'));
  });

  it('tolerates history entries without any narrative record', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    // 无 AI 场景下历史条目没有叙事记录，核心记忆应正常兜底而不是抛错。
    snapshot.records.lifeHistory[0].narrative = null;

    assert.doesNotThrow(() => buildCoreMemory(snapshot));
  });
});
