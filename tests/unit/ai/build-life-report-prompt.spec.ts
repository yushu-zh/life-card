import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLifeReportPrompt, formatLifeReportFacts } from '../../../src/ai/buildNarrativePrompts.ts';
import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import type { LifeReportFacts } from '../../../src/shared/types/narrative.ts';

const config = loadAiConfig();

// 构造一份覆盖各字段的最小报告事实集，供 prompt 组装测试使用。
function buildFacts(): LifeReportFacts {
  return {
    player: { nickname: '小宇', skillTags: ['编程'], education: '本科', industry: '互联网', wishes: ['财务自由'] },
    finalAge: 80,
    endReason: 'age-limit',
    endReasonLabel: '你走完了这一生',
    isPrematureDeath: false,
    stageLabels: ['20岁', '25岁'],
    choices: [
      {
        age: 25,
        eventName: '工作机会',
        categoryLabel: '成就机会',
        gradeLabel: '成功',
        cardDescription: '一家AI公司向你发出邀请，你决定接受这份工作。',
        resultDescription: '你成功入职，收入提升，经验增长。'
      }
    ],
    discardedEvents: [{ age: 25, eventName: '休养身心' }],
    fateEvents: [{ age: 30, eventName: '公司裁员' }],
    statusEvents: [],
    finalStats: [
      { label: '认知', value: 3 },
      { label: '金钱', value: 5 }
    ],
    lifeNodes: '已婚、已组建家庭',
    categoryPickCounts: '成就机会3次、关系机会2次、自我机会1次',
    successCount: 2,
    failureCount: 1
  };
}

describe('buildLifeReportPrompt', () => {
  it('replaces placeholders and includes the facts', () => {
    const prompt = buildLifeReportPrompt(buildFacts(), config);

    assert.ok(prompt.user.includes('小宇'));
    assert.ok(prompt.user.includes('80岁'));
    assert.ok(prompt.user.includes('工作机会'));
    assert.ok(prompt.user.includes('公司裁员'));
    assert.ok(prompt.user.includes('认知：3'));
    assert.ok(prompt.user.includes('已婚、已组建家庭'));
    assert.ok(prompt.user.includes('一家AI公司向你发出邀请')); // 事件牌文案进入报告素材
    assert.ok(prompt.user.includes('你成功入职，收入提升')); // 结果文案进入报告素材
    assert.ok(!prompt.user.includes('{choices}'));
    assert.ok(!prompt.user.includes('{finalStats}'));
    assert.ok(!prompt.user.includes('{playerProfile}'));
  });

  it('instructs the model to only output paragraphs', () => {
    const prompt = buildLifeReportPrompt(buildFacts(), config);

    assert.match(prompt.system, /不能|绝不/);
    assert.ok(prompt.user.includes('paragraphs'));
  });
});

describe('formatLifeReportFacts', () => {
  it('renders a readable text covering all fact sections', () => {
    const text = formatLifeReportFacts(buildFacts());

    assert.ok(text.includes('人生记录'));
    assert.ok(text.includes('玩家背景'));
    assert.ok(text.includes('小宇'));
    assert.ok(text.includes('80岁'));
    assert.ok(text.includes('一生的选择'));
    assert.ok(text.includes('工作机会'));
    assert.ok(text.includes('一家AI公司向你发出邀请'));
    assert.ok(text.includes('被放弃的选择'));
    assert.ok(text.includes('休养身心'));
    assert.ok(text.includes('命运中的变故'));
    assert.ok(text.includes('公司裁员'));
    assert.ok(text.includes('最终状态'));
    assert.ok(text.includes('认知：3'));
  });
});
