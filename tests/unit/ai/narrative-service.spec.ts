import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMockNarrativeTransport,
  generateEventCardNarrative,
  generateOpportunityResultNarrative,
  type NarrativeTransport
} from '../../../src/ai/narrativeService.ts';
import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import type { CardNarrativeFacts, ResultNarrativeFacts } from '../../../src/shared/types/narrative.ts';

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
