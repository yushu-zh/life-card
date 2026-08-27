import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMockNarrativeTransport,
  generateEventCardNarrative,
  generateFateNarrative,
  generateOpportunityResultNarrative,
  generateStatusNarrative,
  resolveAiProvider,
  type NarrativeTransport
} from '../../../src/ai/narrativeService.ts';
import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import type { CardNarrativeFacts, FateNarrativeFacts, ResultNarrativeFacts, StatusNarrativeFacts } from '../../../src/shared/types/narrative.ts';

const config = loadAiConfig();

const cardFacts: CardNarrativeFacts = {
  player: { nickname: '小宇', skillTags: [], education: '本科', industry: '互联网', wishes: [] },
  age: 25,
  cycle: 1,
  turn: 1,
  stageLabel: '20-34岁',
  category: 'self',
  eventSkeleton: { id: 'self-fitness', name: '健身锻炼', checkAbilityKeys: ['execution'] }
};

const resultFacts: ResultNarrativeFacts = {
  player: cardFacts.player,
  age: 25,
  event: { id: 'self-fitness', name: '健身锻炼', category: 'self' },
  resultGrade: 'success',
  appliedDeltas: [{ key: 'health', amount: 2 }],
  historySummary: '暂无',
  cardDescription: '你决定开始健身。'
};

const fateFacts: FateNarrativeFacts = {
  player: cardFacts.player,
  age: 30,
  eventName: '公司裁员',
  appliedDeltas: [{ key: 'money', amount: -2 }],
  mitigatedDelta: null
};

const statusFacts: StatusNarrativeFacts = {
  player: cardFacts.player,
  age: 40,
  statusName: '经济危机',
  kind: 'one-time-effect',
  conditions: [{ key: 'money', operator: '<=', threshold: 0, actual: 0 }],
  appliedDeltas: [{ key: 'happiness', amount: -1 }],
  died: false
};

// 返回固定文本的传输替身。
function createFixedTransport(raw: string): NarrativeTransport {
  return { generate: async () => raw };
}

describe('generateEventCardNarrative', () => {
  it('returns parsed narrative when transport returns valid JSON', async () => {
    const raw = JSON.stringify({ description: '你决定开始健身，并坚持每天晨跑。' });
    const narrative = await generateEventCardNarrative(cardFacts, config, createFixedTransport(raw));

    assert.ok(narrative);
    assert.strictEqual(narrative.description, '你决定开始健身，并坚持每天晨跑。');
  });

  it('returns null when transport throws', async () => {
    const narrative = await generateEventCardNarrative(cardFacts, config, createMockNarrativeTransport());
    assert.strictEqual(narrative, null);
  });

  it('returns null when transport returns invalid JSON', async () => {
    const narrative = await generateEventCardNarrative(cardFacts, config, createFixedTransport('not json'));
    assert.strictEqual(narrative, null);
  });

  it('returns null when disabled', async () => {
    const disabled = { ...config, enabled: false };
    const narrative = await generateEventCardNarrative(cardFacts, disabled, createFixedTransport('{}'));
    assert.strictEqual(narrative, null);
  });
});

describe('generateOpportunityResultNarrative', () => {
  it('returns null when transport throws', async () => {
    const narrative = await generateOpportunityResultNarrative(resultFacts, config, createMockNarrativeTransport());
    assert.strictEqual(narrative, null);
  });

  it('returns parsed narrative on valid transport', async () => {
    const raw = JSON.stringify({ description: '这次锻炼很成功，你养成了好习惯，健康提升。' });
    const narrative = await generateOpportunityResultNarrative(resultFacts, config, createFixedTransport(raw));

    assert.ok(narrative);
    assert.strictEqual(narrative.description, '这次锻炼很成功，你养成了好习惯，健康提升。');
  });
});

describe('generateFateNarrative', () => {
  it('returns parsed narrative on valid transport', async () => {
    const raw = JSON.stringify({ description: '公司架构调整，你被迫离开原有岗位。' });
    const narrative = await generateFateNarrative(fateFacts, config, createFixedTransport(raw));

    assert.ok(narrative);
    assert.strictEqual(narrative.description, '公司架构调整，你被迫离开原有岗位。');
  });

  it('returns null when transport throws', async () => {
    const narrative = await generateFateNarrative(fateFacts, config, createMockNarrativeTransport());
    assert.strictEqual(narrative, null);
  });

  it('returns null when disabled', async () => {
    const disabled = { ...config, enabled: false };
    const narrative = await generateFateNarrative(fateFacts, disabled, createFixedTransport('{}'));
    assert.strictEqual(narrative, null);
  });
});

describe('generateStatusNarrative', () => {
  it('returns parsed narrative on valid transport', async () => {
    const raw = JSON.stringify({ description: '收入中断让你陷入经济压力。' });
    const narrative = await generateStatusNarrative(statusFacts, config, createFixedTransport(raw));

    assert.ok(narrative);
    assert.strictEqual(narrative.description, '收入中断让你陷入经济压力。');
  });

  it('returns null when transport throws', async () => {
    const narrative = await generateStatusNarrative(statusFacts, config, createMockNarrativeTransport());
    assert.strictEqual(narrative, null);
  });
});

describe('resolveAiProvider', () => {
  it('prefers friday when both app id and deepseek api key are filled', () => {
    const result = resolveAiProvider('app-id-123', 'sk-abc');

    assert.deepEqual(result, { provider: 'friday', key: 'app-id-123' });
  });

  it('uses friday when only app id is filled', () => {
    const result = resolveAiProvider('app-id-123', '');

    assert.deepEqual(result, { provider: 'friday', key: 'app-id-123' });
  });

  it('uses deepseek when only api key is filled', () => {
    const result = resolveAiProvider('', 'sk-abc');

    assert.deepEqual(result, { provider: 'deepseek', key: 'sk-abc' });
  });

  it('trims surrounding whitespace', () => {
    const result = resolveAiProvider('  ', '  sk-abc  ');

    assert.deepEqual(result, { provider: 'deepseek', key: 'sk-abc' });
  });

  it('returns null when neither is filled', () => {
    const result = resolveAiProvider('  ', '  ');

    assert.strictEqual(result, null);
  });
});
