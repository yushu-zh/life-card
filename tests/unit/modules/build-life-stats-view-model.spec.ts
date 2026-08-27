import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { loadTurnSystemConfig } from '../../../src/config/loaders/loadTurnSystemConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';
import { buildLifeStatsViewModel } from '../../../src/modules/report/buildLifeStatsViewModel.ts';
import type { GameSessionSnapshot } from '../../../src/shared/types/game-session.ts';
import type { OpportunityResultGrade } from '../../../src/shared/types/opportunity.ts';
import type { TurnHistoryEntry, TurnOfferCard } from '../../../src/shared/types/turn.ts';

// 测试人生报告第一页（纯数据统计）ViewModel 的派生逻辑。
// 覆盖：头部计数、机会 vs 选择、未选择的人生、选择轨迹、能力成长、骰运反事实、资源曲线与雷达。
describe('buildLifeStatsViewModel', () => {
  const presentation = loadPhase4PresentationConfig();
  const opportunityConfig = loadOpportunityEventConfig();
  const turnSystemConfig = loadTurnSystemConfig();

  const build = (snapshot: GameSessionSnapshot) =>
    buildLifeStatsViewModel(snapshot, opportunityConfig, turnSystemConfig, presentation);

  it('summarizes header counts from lifeHistory', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    assert.strictEqual(vm.header.nickname, '小明');
    assert.strictEqual(vm.header.startAge, turnSystemConfig.cycleStartAges[0]);
    assert.strictEqual(vm.header.endAge, 80);
    assert.strictEqual(vm.header.choiceCount, 2);
    // 两个回合的最终供选牌各 1 张，共 2 个机会。
    assert.strictEqual(vm.header.opportunityCount, 2);
    assert.strictEqual(vm.header.failureCount, 1);
    assert.strictEqual(vm.header.criticalSuccessCount, 0);
    assert.strictEqual(vm.header.rerollCount, 0);
    assert.strictEqual(vm.header.crisisCount, 0);
    assert.strictEqual(vm.header.fateEventCount, 1);
  });

  it('separates appeared vs chosen ratios per category', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    const achievement = vm.categoryBalance.items.find((item) => item.key === 'achievement')!;
    assert.strictEqual(achievement.appearedCount, 2);
    assert.strictEqual(achievement.appearedRatio, 1);
    assert.strictEqual(achievement.chosenCount, 2);
    assert.strictEqual(achievement.chosenRatio, 1);

    const relationship = vm.categoryBalance.items.find((item) => item.key === 'relationship')!;
    assert.strictEqual(relationship.appearedCount, 0);
    assert.strictEqual(relationship.chosenCount, 0);
  });

  it('builds cumulative trajectory points per turn', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    const achievement = vm.trajectory.series.find((serie) => serie.key === 'achievement')!;
    assert.deepStrictEqual(achievement.points, [
      { age: 25, ratio: 1 },
      { age: 30, ratio: 1 }
    ]);
  });

  it('keeps ability start equal to end when no ability deltas happened', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    assert.strictEqual(vm.abilities.items.length, 5);
    for (const item of vm.abilities.items) {
      assert.strictEqual(item.startValue, item.endValue);
      assert.strictEqual(item.delta, 0);
    }
    // 时间轴从 20 岁到 80 岁每 5 岁一列。
    assert.strictEqual(vm.abilities.timeline.ageMarks[0], 20);
    assert.strictEqual(vm.abilities.timeline.ageMarks.at(-1), 80);
  });

  it('returns null dice stats when no checked formula exists', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    assert.strictEqual(vm.dice, null);
  });

  it('builds resource series starting at the start age', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    assert.ok(vm.resources);
    assert.strictEqual(vm.resources.money.points.length, 3);
    assert.strictEqual(vm.resources.money.points[0].age, vm.resources.startAge);
  });

  it('builds radar axes with a sane scale max', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = build(snapshot);

    assert.strictEqual(vm.radar.axes.length, 5);
    // mock 五维最大为 6，刻度上限取保底 10。
    assert.strictEqual(vm.radar.scaleMax, 10);
  });

  it('compares actual grades against the all-7 counterfactual', () => {
    const snapshot = buildSnapshotWithHistory([
      // 实际 3+4+认知3=10 成功；全 7 也是 10 成功 → 相同。
      buildCheckedEntry(25, { first: 3, second: 4 }, 3, 'success'),
      // 实际 6+6+认知3=15 大成功；全 7 是 10 成功 → 骰子帮了忙。
      buildCheckedEntry(30, { first: 6, second: 6 }, 3, 'criticalSuccess'),
      // 实际 1+1+认知3=5 失败；全 7 是 10 成功 → 骰子拖了后腿。
      buildCheckedEntry(35, { first: 1, second: 1 }, 3, 'failure')
    ]);
    const vm = build(snapshot);

    assert.ok(vm.dice);
    assert.strictEqual(vm.dice.rollCount, 3);
    assert.strictEqual(vm.dice.averageSum, 7);
    assert.strictEqual(vm.dice.betterCount, 1);
    assert.strictEqual(vm.dice.sameCount, 1);
    assert.strictEqual(vm.dice.worseCount, 1);
    assert.strictEqual(vm.dice.histogram.find((bucket) => bucket.sum === 7)!.count, 1);
    assert.strictEqual(vm.dice.histogram.find((bucket) => bucket.sum === 12)!.count, 1);
    assert.strictEqual(vm.dice.histogram.find((bucket) => bucket.sum === 2)!.count, 1);
  });

  it('finds the most missed events and renders the template sentence', () => {
    const romance: TurnOfferCard = { slotIndex: 0, eventId: 'relationship-romance', category: 'relationship' };
    const promotion: TurnOfferCard = { slotIndex: 1, eventId: 'achievement-promotion', category: 'achievement' };
    const startup: TurnOfferCard = { slotIndex: 2, eventId: 'achievement-startup', category: 'achievement' };

    const snapshot = buildSnapshotWithHistory([
      // 「新恋情」两次出现都没有被选择。
      buildOfferEntry(25, [romance, promotion, startup], startup),
      buildOfferEntry(30, [romance, promotion, startup], promotion)
    ]);
    const vm = build(snapshot);

    assert.strictEqual(vm.unchosen.totalCount, 4);
    const top = vm.unchosen.mostMissed[0];
    assert.strictEqual(top.eventId, 'relationship-romance');
    assert.strictEqual(top.appearedCount, 2);
    assert.strictEqual(top.chosenCount, 0);
    assert.ok(vm.unchosen.missedSentence!.includes('曾 2 次出现在你的人生中'));
    assert.ok(vm.unchosen.missedSentence!.includes('一次也没有选择'));
  });
});

// ===== 测试夹具 =====

// 基于 mock 终局快照替换整回合历史。
function buildSnapshotWithHistory(history: TurnHistoryEntry[]): GameSessionSnapshot {
  const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
  snapshot.records.lifeHistory = history;
  return snapshot;
}

// 构造一条带检定的历史条目：骰点、认知能力值与结果等级可指定。
function buildCheckedEntry(
  age: number,
  dice: { first: number; second: number },
  cognition: number,
  grade: OpportunityResultGrade
): TurnHistoryEntry {
  return {
    type: 'turn-resolution',
    context: { age, cycle: 1, turn: 1 },
    offer: {
      initial: [{ slotIndex: 0, eventId: 'achievement-promotion', category: 'achievement' }],
      rerolled: null,
      final: [{ slotIndex: 0, eventId: 'achievement-promotion', category: 'achievement' }],
      rerollUsed: false
    },
    selectedCard: { slotIndex: 0, eventId: 'achievement-promotion', category: 'achievement' },
    discardedCards: [],
    opportunity: {
      event: { id: 'achievement-promotion', name: '升职机会', category: 'achievement' },
      resolutionKind: 'checked',
      formula: {
        dice,
        abilities: [{ key: 'cognition', value: cognition }],
        totalScore: dice.first + dice.second + cognition
      },
      resultGrade: grade,
      appliedDeltas: [],
      lifeNodeChanges: []
    },
    fate: null,
    statuses: [],
    snapshotAfterTurn: {
      stats: phase4MockScenarios.lifeReportFallback.snapshot.stats,
      lifeNodes: phase4MockScenarios.lifeReportFallback.snapshot.records.lifeNodes
    },
    progressionAfterTurn: { age, cycle: 1, turn: 2, isEnded: false, endReason: null }
  };
}

// 构造一条直接生效的历史条目：供选牌、选中牌可指定，其余自动弃牌。
function buildOfferEntry(age: number, offer: TurnOfferCard[], selected: TurnOfferCard): TurnHistoryEntry {
  return {
    type: 'turn-resolution',
    context: { age, cycle: 1, turn: 1 },
    offer: { initial: offer, rerolled: null, final: offer, rerollUsed: false },
    selectedCard: selected,
    discardedCards: offer.filter((card) => card.slotIndex !== selected.slotIndex),
    opportunity: {
      event: { id: selected.eventId, name: selected.eventId, category: selected.category },
      resolutionKind: 'direct',
      formula: null,
      resultGrade: null,
      appliedDeltas: [],
      lifeNodeChanges: []
    },
    fate: null,
    statuses: [],
    snapshotAfterTurn: {
      stats: phase4MockScenarios.lifeReportFallback.snapshot.stats,
      lifeNodes: phase4MockScenarios.lifeReportFallback.snapshot.records.lifeNodes
    },
    progressionAfterTurn: { age, cycle: 1, turn: 2, isEnded: false, endReason: null }
  };
}
