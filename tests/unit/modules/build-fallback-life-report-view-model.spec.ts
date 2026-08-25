import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';
import { buildFallbackLifeReportViewModel } from '../../../src/modules/report/buildFallbackLifeReportViewModel.ts';

// 测试人生报告 fallback ViewModel 映射。
// 主要验证 lifeHistory 汇总、endReason 具体结局和完整 sections 输出。
describe('buildFallbackLifeReportViewModel', () => {
  const presentation = loadPhase4PresentationConfig();

  it('summarizes lifeHistory into key choices and fate sections', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = buildFallbackLifeReportViewModel(snapshot, presentation);

    const choicesSection = vm.sections.find((section) =>
      section.heading.includes('关键选择')
    )!;
    assert.ok(choicesSection.paragraphs.some((p) => p.includes('工作机会')));

    const fateSection = vm.sections.find((section) =>
      section.heading.includes('后续变故')
    )!;
    assert.ok(fateSection.paragraphs.some((p) => p.includes('公司裁员')));
  });

  it('uses the endReason label for the specific ending', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = buildFallbackLifeReportViewModel(snapshot, presentation);

    assert.ok(vm.subtitle.includes('你走完了这一生'));
    assert.ok(vm.sections.some((section) => section.heading.includes('最终结局')));
  });

  it('outputs complete sections even without AI', () => {
    const { snapshot } = phase4MockScenarios.lifeReportFallback;
    const vm = buildFallbackLifeReportViewModel(snapshot, presentation);

    assert.strictEqual(vm.sections.length >= 4, true);
    assert.ok(vm.finalStats.length > 0);
    assert.ok(vm.finalStats.some((stat) => stat.key === 'money'));
  });
});
