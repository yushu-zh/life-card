import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseEventCardNarrative,
  parseFateNarrative,
  parseOpportunityResultNarrative,
  parseStatusNarrative
} from '../../../src/ai/validateNarrativeOutput.ts';

// 测试 AI 输出的白名单校验：只接受一段描述，非法/缺字段/非 JSON 一律返回 null。
describe('parseEventCardNarrative', () => {
  it('parses valid card narrative and strips forbidden fields', () => {
    const raw = JSON.stringify({
      description: '一家AI公司向你发出邀请，你决定接受这份工作。',
      // 以下都是 AI 不该碰的字段，必须被白名单剥离。
      check: 'cognition',
      reward: [{ key: 'money', amount: 2 }],
      grade: 'criticalSuccess',
      title: '不应出现的标题',
      characters: ['不应出现的人物']
    });

    assert.deepEqual(parseEventCardNarrative(raw), {
      description: '一家AI公司向你发出邀请，你决定接受这份工作。'
    });
  });

  it('returns null when description is missing', () => {
    assert.strictEqual(parseEventCardNarrative('{}'), null);
  });

  it('returns null for invalid JSON', () => {
    assert.strictEqual(parseEventCardNarrative('not json'), null);
  });

  it('returns null for a non-object top level', () => {
    assert.strictEqual(parseEventCardNarrative('[]'), null);
  });

  it('returns null when description is empty', () => {
    assert.strictEqual(parseEventCardNarrative('{"description":""}'), null);
  });

  it('parses card narrative wrapped in markdown code fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify({ description: '大厂数据分析岗内推，你决定优化简历争取机会。' }, null, 2)}\n\`\`\``;

    const result = parseEventCardNarrative(raw);
    assert.ok(result);
    assert.strictEqual(result.description, '大厂数据分析岗内推，你决定优化简历争取机会。');
  });

  it('parses card narrative with surrounding prose', () => {
    const raw = `好的，以下是结果：\n${JSON.stringify({ description: '你决定开始健身。' })}\n希望对你有帮助`;

    const result = parseEventCardNarrative(raw);
    assert.ok(result);
    assert.strictEqual(result.description, '你决定开始健身。');
  });
});

describe('parseOpportunityResultNarrative', () => {
  it('parses valid result narrative', () => {
    const raw = JSON.stringify({ description: '你成功入职，收入提升，经验增长。' });

    assert.deepEqual(parseOpportunityResultNarrative(raw), {
      description: '你成功入职，收入提升，经验增长。'
    });
  });

  it('returns null when description is missing', () => {
    assert.strictEqual(parseOpportunityResultNarrative('{}'), null);
  });
});

describe('parseFateNarrative', () => {
  it('parses valid fate narrative and strips forbidden fields', () => {
    const raw = JSON.stringify({
      description: '公司架构调整，你被迫离开原有岗位。',
      appliedDeltas: [{ key: 'money', amount: -2 }]
    });

    assert.deepEqual(parseFateNarrative(raw), {
      description: '公司架构调整，你被迫离开原有岗位。'
    });
  });

  it('returns null when description is missing', () => {
    assert.strictEqual(parseFateNarrative('{}'), null);
  });

  it('returns null for invalid JSON', () => {
    assert.strictEqual(parseFateNarrative('not json'), null);
  });
});

describe('parseStatusNarrative', () => {
  it('parses valid status narrative', () => {
    const raw = JSON.stringify({ description: '收入中断让你陷入经济压力。' });

    assert.deepEqual(parseStatusNarrative(raw), {
      description: '收入中断让你陷入经济压力。'
    });
  });

  it('returns null when description is empty', () => {
    assert.strictEqual(parseStatusNarrative('{"description":""}'), null);
  });
});
