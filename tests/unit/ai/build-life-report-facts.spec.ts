import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLifeReportFacts } from '../../../src/ai/buildNarrativeFacts.ts';
import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';

const opportunityConfig = loadOpportunityEventConfig();
const presentation = loadPhase4PresentationConfig();

// 测试把终局快照组装成人生报告事实集：覆盖选择、命运、放弃事件、成败统计与提前死亡。
describe('buildLifeReportFacts', () => {
  it('summarizes choices, fate events and success/failure counts', () => {
    const snapshot = phase4MockScenarios.lifeReportFallback.snapshot;
    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    assert.strictEqual(facts.finalAge, 80);
    assert.strictEqual(facts.endReason, 'age-limit');
    assert.strictEqual(facts.isPrematureDeath, false);
    assert.strictEqual(facts.successCount, 1);
    assert.strictEqual(facts.failureCount, 1);

    assert.ok(facts.choices.some((c) => c.eventName === '工作机会' && c.gradeLabel === '成功'));
    assert.ok(facts.choices.some((c) => c.eventName === '创业' && c.gradeLabel === '失败'));
    assert.ok(facts.fateEvents.some((f) => f.eventName === '公司裁员'));
    assert.ok(facts.stageLabels.includes('25岁'));
    assert.ok(facts.stageLabels.includes('30岁'));
  });

  it('marks premature death from the end reason', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.lifecycle.endReason = 'status-health-crisis';

    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    assert.strictEqual(facts.isPrematureDeath, true);
    assert.ok(facts.endReasonLabel.includes('健康'));
  });

  it('maps discarded event ids back to readable names', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeHistory[0].discardedCards = [
      { slotIndex: 1, eventId: 'self-rest', category: 'self' },
      { slotIndex: 2, eventId: 'achievement-job-opportunity', category: 'achievement' }
    ];

    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    assert.strictEqual(facts.discardedEvents.length, 2);
    assert.ok(facts.discardedEvents.every((event) => event.eventName.length > 0));
  });

  it('renders final stats with configured labels in configured order', () => {
    const snapshot = phase4MockScenarios.lifeReportFallback.snapshot;
    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    const firstStat = facts.finalStats[0];
    assert.strictEqual(firstStat.label, '认知');
    assert.ok(facts.finalStats.some((stat) => stat.label === '金钱'));
  });

  it('carries the AI narrative text into each choice', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.records.lifeHistory[0].narrative = {
      card: { description: '一家AI公司向你发出邀请，你决定接受这份工作。' },
      result: { description: '你成功入职，收入提升，经验增长。' },
      fate: null,
      statuses: {}
    };

    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    const firstChoice = facts.choices[0];
    assert.strictEqual(firstChoice.cardDescription, '一家AI公司向你发出邀请，你决定接受这份工作。');
    assert.strictEqual(firstChoice.resultDescription, '你成功入职，收入提升，经验增长。');
  });

  it('carries the AI narrative text into fate and status events', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    // 第二个历史条目已经触发命运事件「公司裁员」，这里补上 AI 变故文案与状态文案。
    const fateEntry = snapshot.records.lifeHistory[1];
    fateEntry.narrative = {
      card: null,
      result: null,
      fate: { description: '公司架构调整，你被迫离开原有岗位。' },
      statuses: {
        'economic-crisis': { description: '收入中断让你陷入经济压力。' }
      }
    };
    // 给第二个历史条目补一条状态，验证状态描述也能被带出。
    fateEntry.statuses = [
      {
        id: 'economic-crisis',
        name: '经济危机',
        kind: 'one-time-effect',
        resolutionMode: 'once-per-game',
        firstTrigger: true,
        conditions: [{ key: 'money', operator: '<=', threshold: 0, actual: 0 }],
        appliedDeltas: [{ key: 'happiness', amount: -1 }]
      }
    ];

    const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);

    const fateEvent = facts.fateEvents.find((f) => f.eventName === '公司裁员');
    assert.ok(fateEvent);
    assert.strictEqual(fateEvent.description, '公司架构调整，你被迫离开原有岗位。');

    const statusEvent = facts.statusEvents.find((s) => s.statusName === '经济危机');
    assert.ok(statusEvent);
    assert.strictEqual(statusEvent.description, '收入中断让你陷入经济压力。');
  });
});
