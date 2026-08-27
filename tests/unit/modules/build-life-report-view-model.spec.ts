import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLifeReportExportText, buildLifeReportViewModel } from '../../../src/modules/report/buildLifeReportViewModel.ts';
import { buildFallbackLifeReportViewModel } from '../../../src/modules/report/buildFallbackLifeReportViewModel.ts';
import { loadOpportunityEventConfig } from '../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { phase4MockScenarios } from '../../../src/mocks/phase4/scenarios.ts';

const presentation = loadPhase4PresentationConfig();

// 测试人生报告 ViewModel：有 AI 正文时替换章节，否则回退到 fallback。
describe('buildLifeReportViewModel', () => {
  it('falls back to the fallback view model when no report text is set', () => {
    const snapshot = phase4MockScenarios.lifeReportFallback.snapshot;
    const vm = buildLifeReportViewModel(snapshot, presentation);
    const fallback = buildFallbackLifeReportViewModel(snapshot, presentation);

    assert.deepEqual(vm, fallback);
  });

  it('uses AI paragraphs when report text is present', () => {
    const snapshot = structuredClone(phase4MockScenarios.lifeReportFallback.snapshot);
    snapshot.lifecycle.finalReportText = '第一段内容。\n\n第二段内容。';

    const vm = buildLifeReportViewModel(snapshot, presentation);

    assert.strictEqual(vm.sections.length, 1);
    assert.strictEqual(vm.sections[0].heading, presentation.reportFallback.sections.aiSectionHeading);
    assert.deepEqual(vm.sections[0].paragraphs, ['第一段内容。', '第二段内容。']);

    // 标题、副标题与最终属性摘要仍由结构化数据生成，不被 AI 正文取代。
    assert.ok(vm.title.includes('小明'));
    assert.ok(vm.finalStats.length > 0);
  });
});

describe('buildLifeReportExportText', () => {
  it('renders the structured facts as a readable text export', () => {
    const snapshot = phase4MockScenarios.lifeReportFallback.snapshot;
    const text = buildLifeReportExportText(snapshot, loadOpportunityEventConfig(), presentation);

    assert.ok(text.includes('人生记录'));
    assert.ok(text.includes('工作机会'));
    assert.ok(text.includes('公司裁员'));
    assert.ok(text.includes('最终状态'));
  });
});
