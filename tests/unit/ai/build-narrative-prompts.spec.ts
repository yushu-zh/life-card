import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCardNarrativePrompt,
  buildResultNarrativePrompt,
  formatGrade
} from '../../../src/ai/buildNarrativePrompts.ts';
import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import type { CardNarrativeFacts, ResultNarrativeFacts } from '../../../src/shared/types/narrative.ts';

const config = loadAiConfig();

const cardFacts: CardNarrativeFacts = {
  player: { nickname: '小宇', skillTags: ['分析'], education: '本科', industry: '互联网', wishes: ['稳定'] },
  age: 25,
  cycle: 2,
  turn: 1,
  stageLabel: '20-34岁',
  category: 'achievement',
  eventSkeleton: { id: 'achievement-job-opportunity', name: '工作机会', checkAbilityKeys: ['cognition', 'execution'] }
};

describe('buildCardNarrativePrompt', () => {
  it('replaces placeholders and includes the skeleton', () => {
    const prompt = buildCardNarrativePrompt(cardFacts, config);

    assert.ok(prompt.user.includes('小宇'));
    assert.ok(prompt.user.includes('25岁'));
    assert.ok(prompt.user.includes('工作机会'));
    assert.ok(prompt.user.includes('cognition')); // 骨架能力进入上下文
    assert.ok(!prompt.user.includes('{playerProfile}')); // 占位符已替换
  });

  it('instructs the model to output only a description', () => {
    const prompt = buildCardNarrativePrompt(cardFacts, config);
    assert.match(prompt.system, /不能修改|绝不/);
    assert.ok(prompt.user.includes('description'));
  });
});

describe('buildResultNarrativePrompt', () => {
  it('includes grade, deltas and card description', () => {
    const facts: ResultNarrativeFacts = {
      player: cardFacts.player,
      age: 25,
      event: { id: 'achievement-job-opportunity', name: '工作机会', category: 'achievement' },
      resultGrade: 'success',
      appliedDeltas: [
        { key: 'money', amount: 2 },
        { key: 'experience', amount: 1 }
      ],
      historySummary: '暂无',
      cardDescription: '一家AI公司向你发出邀请，你决定接受这份工作。'
    };
    const prompt = buildResultNarrativePrompt(facts, config);

    assert.ok(prompt.user.includes('成功'));
    assert.ok(prompt.user.includes('money'));
    assert.ok(prompt.user.includes('一家AI公司向你发出邀请')); // 事件描述进入上下文，让结果与其呼应
  });
});

describe('formatGrade', () => {
  it('maps grades to Chinese', () => {
    assert.strictEqual(formatGrade('failure'), '失败');
    assert.strictEqual(formatGrade('costlySuccess'), '代价成功');
    assert.strictEqual(formatGrade('success'), '成功');
    assert.strictEqual(formatGrade('criticalSuccess'), '大成功');
    assert.strictEqual(formatGrade('direct'), '直接生效');
    assert.strictEqual(formatGrade(null), '直接生效');
  });
});
