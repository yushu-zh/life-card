import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMockNarrativeTransport,
  generateLifeReportNarrative,
  type NarrativeTransport
} from '../../../src/ai/narrativeService.ts';
import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import type { LifeReportFacts } from '../../../src/shared/types/narrative.ts';

const config = loadAiConfig();

// 构造一份最小的报告事实集，供生成编排测试使用。
function buildFacts(): LifeReportFacts {
  return {
    player: { nickname: '小宇', skillTags: [], education: '本科', industry: '互联网', wishes: [] },
    finalAge: 80,
    endReason: 'age-limit',
    endReasonLabel: '你走完了这一生',
    isPrematureDeath: false,
    stageLabels: ['20岁'],
    choices: [
      { age: 25, eventName: '工作机会', categoryLabel: '成就机会', gradeLabel: '成功', cardDescription: null, resultDescription: null }
    ],
    discardedEvents: [],
    fateEvents: [],
    statusEvents: [],
    finalStats: [{ label: '认知', value: 3 }],
    lifeNodes: '暂无关键人生节点',
    categoryPickCounts: '成就机会1次、关系机会0次、自我机会0次',
    successCount: 1,
    failureCount: 0
  };
}

// 返回固定文本的传输替身。
function createFixedTransport(raw: string): NarrativeTransport {
  return { generate: async () => raw };
}

describe('generateLifeReportNarrative', () => {
  it('returns parsed paragraphs when transport returns valid JSON', async () => {
    const raw = JSON.stringify({ paragraphs: ['你的一生充满选择。', '最终你走向了远方。'] });
    const narrative = await generateLifeReportNarrative(buildFacts(), config, createFixedTransport(raw));

    assert.ok(narrative);
    assert.deepEqual(narrative.paragraphs, ['你的一生充满选择。', '最终你走向了远方。']);
  });

  it('returns null when transport throws', async () => {
    const narrative = await generateLifeReportNarrative(buildFacts(), config, createMockNarrativeTransport());
    assert.strictEqual(narrative, null);
  });

  it('returns null when transport returns invalid JSON', async () => {
    const narrative = await generateLifeReportNarrative(buildFacts(), config, createFixedTransport('not json'));
    assert.strictEqual(narrative, null);
  });

  it('returns null when disabled', async () => {
    const disabled = { ...config, enabled: false };
    const narrative = await generateLifeReportNarrative(buildFacts(), disabled, createFixedTransport('{}'));
    assert.strictEqual(narrative, null);
  });
});
