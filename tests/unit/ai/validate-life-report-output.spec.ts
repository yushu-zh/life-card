import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLifeReport } from '../../../src/ai/validateNarrativeOutput.ts';

// 测试人生报告输出的白名单校验：只接受 paragraphs 段落数组，非法/缺字段一律返回 null。
describe('parseLifeReport', () => {
  it('parses valid paragraphs and strips forbidden fields', () => {
    const raw = JSON.stringify({
      paragraphs: ['你的一生把重心放在事业上。', '最终你成为了一个沉稳的人。'],
      // 以下都是 AI 不该碰的字段，必须被白名单剥离。
      grade: 'success',
      stats: { money: 100 },
      endReason: 'age-limit',
      title: '不应出现的标题'
    });

    assert.deepEqual(parseLifeReport(raw), {
      paragraphs: ['你的一生把重心放在事业上。', '最终你成为了一个沉稳的人。']
    });
  });

  it('returns null when paragraphs is missing', () => {
    assert.strictEqual(parseLifeReport('{}'), null);
  });

  it('returns null when paragraphs is empty', () => {
    assert.strictEqual(parseLifeReport('{"paragraphs":[]}'), null);
  });

  it('returns null when all paragraphs are empty', () => {
    assert.strictEqual(parseLifeReport('{"paragraphs":["", "  "]}'), null);
  });

  it('drops empty paragraphs and keeps non-empty ones', () => {
    const result = parseLifeReport('{"paragraphs":["第一段", "", "第三段"]}');

    assert.ok(result);
    assert.deepEqual(result.paragraphs, ['第一段', '第三段']);
  });

  it('returns null for invalid JSON', () => {
    assert.strictEqual(parseLifeReport('not json'), null);
  });

  it('parses report wrapped in markdown code fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify({ paragraphs: ['第一段', '第二段'] })}\n\`\`\``;

    const result = parseLifeReport(raw);
    assert.ok(result);
    assert.deepEqual(result.paragraphs, ['第一段', '第二段']);
  });
});
