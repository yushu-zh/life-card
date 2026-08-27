import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';
import { buildTurnResolutionFlowViewModel } from '../../../src/modules/turn/buildTurnResolutionFlowViewModel.ts';

// 测试结果流 ViewModel 映射。
// 主要验证 step 顺序、mitigatedDelta 展示和死亡终局指向。
describe('buildTurnResolutionFlowViewModel', () => {
  const presentation = loadPhase4PresentationConfig();
  const opportunityConfig = loadOpportunityEventConfig();

  it('renders opportunity result only when fate and statuses are empty', () => {
    const { summary } = phase4MockScenarios.resultOpportunityOnly;
    const vm = buildTurnResolutionFlowViewModel(summary, opportunityConfig, presentation);

    assert.strictEqual(vm.steps.length, 1);
    assert.strictEqual(vm.steps[0].kind, 'opportunity');
    assert.strictEqual(vm.nextAction.target, 'next-turn');
  });

  it('keeps opportunity, fate and status steps in fixed order', () => {
    const { summary } = phase4MockScenarios.resultWithFateMitigation;
    const vm = buildTurnResolutionFlowViewModel(summary, opportunityConfig, presentation);

    assert.strictEqual(vm.steps[0].kind, 'opportunity');
    assert.strictEqual(vm.steps[1].kind, 'fate');
  });

  it('shows mitigated delta separately for fate step', () => {
    const { summary } = phase4MockScenarios.resultWithFateMitigation;
    const vm = buildTurnResolutionFlowViewModel(summary, opportunityConfig, presentation);

    const fateStep = vm.steps.find((step) => step.kind === 'fate') as {
      mitigationLabel?: string;
    } | undefined;

    assert.ok(fateStep);
    assert.ok(fateStep!.mitigationLabel);
    assert.ok(fateStep!.mitigationLabel!.includes('应变减免'));
  });

  it('points next action to game-over when a death-risk status kills the player', () => {
    const { summary } = phase4MockScenarios.resultWithStatusEnd;
    const vm = buildTurnResolutionFlowViewModel(summary, opportunityConfig, presentation);

    const statusStep = vm.steps.find((step) => step.kind === 'status')!;
    assert.strictEqual(statusStep.isTerminal, true);
    assert.strictEqual(vm.nextAction.target, 'game-over');
  });

  it('prefers AI fate description over curated fallback', () => {
    const { summary } = phase4MockScenarios.resultWithFateMitigation;
    const withAi = structuredClone(summary);
    withAi.narrative = {
      card: null,
      result: null,
      fate: { description: '公司架构调整，你被迫离开原有岗位。' },
      statuses: {}
    };

    const vm = buildTurnResolutionFlowViewModel(withAi, opportunityConfig, presentation);

    const fateStep = vm.steps.find((step) => step.kind === 'fate')!;
    assert.strictEqual(fateStep.narrativeSource, 'ai-generated');
    assert.deepEqual(fateStep.body, ['公司架构调整，你被迫离开原有岗位。']);
  });

  it('prefers AI status description over curated fallback', () => {
    const { summary } = phase4MockScenarios.resultWithStatusEnd;
    const withAi = structuredClone(summary);
    withAi.narrative = {
      card: null,
      result: null,
      fate: null,
      statuses: {
        'health-crisis': { description: '健康持续恶化，最终未能挺过。' }
      }
    };

    const vm = buildTurnResolutionFlowViewModel(withAi, opportunityConfig, presentation);

    const statusStep = vm.steps.find((step) => step.kind === 'status')!;
    assert.strictEqual(statusStep.narrativeSource, 'ai-generated');
    assert.deepEqual(statusStep.body, ['健康持续恶化，最终未能挺过。']);
  });
});
