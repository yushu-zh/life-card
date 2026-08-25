import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { loadTurnSystemConfig } from '../../../src/config/loaders/loadTurnSystemConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';
import { buildTurnOverviewViewModel } from '../../../src/modules/turn/buildTurnOverviewViewModel.ts';

// 测试回合总览页面的 ViewModel 映射。
// 主要验证事件卡信息、换牌禁用状态和风险提示。
describe('buildTurnOverviewViewModel', () => {
  const presentation = loadPhase4PresentationConfig();
  const opportunityConfig = loadOpportunityEventConfig();
  const turnSystemConfig = loadTurnSystemConfig();

  it('extracts reward, fixedCost and risk hints for all three cards', () => {
    const { snapshot } = phase4MockScenarios.turnOverviewNormal;
    const vm = buildTurnOverviewViewModel(
      snapshot,
      snapshot.turnState.activeTurn,
      opportunityConfig,
      turnSystemConfig,
      presentation
    );

    assert.strictEqual(vm.cards.length, 3);

    for (const card of vm.cards) {
      assert.ok(card.rewards.length > 0, `card ${card.eventId} should have rewards`);
      assert.ok(card.fixedCosts.length > 0, `card ${card.eventId} should have fixedCosts`);
      assert.ok(card.risks.length > 0, `card ${card.eventId} should have risks`);
      assert.ok(card.shortDescription.length > 0, `card ${card.eventId} should have description`);
    }

    const jobCard = vm.cards.find((card) => card.eventId === 'achievement-job-opportunity')!;
    // 卡面后果展示精确数值（对齐参考图）：金钱+2、阅历+1 / 精力-1 / 健康-1。
    assert.ok(jobCard.rewards.includes('金钱+2'));
    assert.ok(jobCard.rewards.includes('阅历+1'));
    assert.ok(jobCard.fixedCosts.includes('精力-1'));
    assert.ok(jobCard.risks.includes('健康-1'));
    assert.strictEqual(jobCard.checkLabel, '检定：认知 + 行动');

    const restCard = vm.cards.find((card) => card.eventId === 'self-rest')!;
    assert.strictEqual(restCard.checkLabel, presentation.labels.cards.noCheckLabel);
  });

  it('disables reroll when the limit is already used', () => {
    const { snapshot } = phase4MockScenarios.turnOverviewRerollUsed;
    const vm = buildTurnOverviewViewModel(
      snapshot,
      snapshot.turnState.activeTurn,
      opportunityConfig,
      turnSystemConfig,
      presentation
    );

    assert.strictEqual(vm.header.reroll.canUse, false);
    assert.strictEqual(vm.header.reroll.used, true);
    assert.ok(vm.header.reroll.helperText.length > 0);
  });

  it('shows risk hint when resources are low', () => {
    const { snapshot } = phase4MockScenarios.turnOverviewRiskHint;
    const vm = buildTurnOverviewViewModel(
      snapshot,
      snapshot.turnState.activeTurn,
      opportunityConfig,
      turnSystemConfig,
      presentation
    );

    assert.ok(vm.riskHint);
    assert.strictEqual(vm.riskHint.tone, 'warning');
  });

  it('throws when active turn is missing', () => {
    const { snapshot } = phase4MockScenarios.turnOverviewNormal;
    snapshot.turnState.activeTurn = null;

    assert.throws(
      () =>
        buildTurnOverviewViewModel(
          snapshot,
          null,
          opportunityConfig,
          turnSystemConfig,
          presentation
        ),
      /Active turn is required/
    );
  });
});
