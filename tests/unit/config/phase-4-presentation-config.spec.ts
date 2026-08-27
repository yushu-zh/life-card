import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { validatePhase4PresentationConfig } from '../../../src/config/validators/validatePhase4PresentationConfig.ts';

// 测试 Phase 4 展示配置能被正确加载与校验。
// 这些测试确保所有 UI 文案、字段顺序、风险提示和 fallback 模板都按契约存在。
describe('loadPhase4PresentationConfig', () => {
  it('loads the phase 4 presentation config', () => {
    const config = loadPhase4PresentationConfig();

    // 所有顶层字段都存在。
    assert.ok(config.labels);
    assert.ok(config.statOrder);
    assert.ok(config.statLabels);
    assert.ok(config.toneThresholds);
    assert.ok(config.riskHints);
    assert.ok(config.templates);
    assert.ok(config.eventCardFallbacks);
    assert.ok(config.opportunityResultFallbacks);
    assert.ok(config.fateFallbacks);
    assert.ok(config.statusFallbacks);
    assert.ok(config.reportFallback);
  });

  it('exposes the expected field order and labels', () => {
    const config = loadPhase4PresentationConfig();

    // 能力、资源、结算的字段顺序必须包含全部预期键。
    assert.deepEqual(config.statOrder.abilities, [
      'cognition',
      'execution',
      'social',
      'creativity',
      'adaptability'
    ]);
    assert.deepEqual(config.statOrder.resources, ['money', 'energy']);
    assert.deepEqual(config.statOrder.outcomes, [
      'happiness',
      'freedom',
      'health',
      'experience',
      'influence'
    ]);

    // 所有属性都有中文标签。
    assert.strictEqual(config.statLabels.cognition, '认知');
    assert.strictEqual(config.statLabels.money, '金钱');
    assert.strictEqual(config.statLabels.happiness, '幸福');
  });

  it('exposes all risk hints', () => {
    const config = loadPhase4PresentationConfig();

    assert.ok(config.riskHints.economicPressure);
    assert.ok(config.riskHints.energyWarning);
    assert.ok(config.riskHints.healthWarning);
    assert.ok(config.riskHints.lifeCrisis);
  });

  it('exposes all report section templates', () => {
    const config = loadPhase4PresentationConfig();

    const sections = config.reportFallback.sections;
    assert.strictEqual(typeof sections.openingHeading, 'string');
    assert.strictEqual(typeof sections.choicesHeading, 'string');
    assert.strictEqual(typeof sections.fateHeading, 'string');
    assert.strictEqual(typeof sections.endingHeading, 'string');
    assert.strictEqual(typeof sections.finalStatsHeading, 'string');
    assert.strictEqual(typeof sections.aiSectionHeading, 'string');
  });

  it('exposes required template fallbacks', () => {
    const config = loadPhase4PresentationConfig();

    assert.strictEqual(typeof config.templates.eventShortDescription, 'string');
    assert.strictEqual(typeof config.templates.opportunityResult.direct, 'string');
    assert.strictEqual(typeof config.templates.opportunityResult.failure, 'string');
    assert.strictEqual(typeof config.templates.opportunityResult.costlySuccess, 'string');
    assert.strictEqual(typeof config.templates.opportunityResult.success, 'string');
    assert.strictEqual(typeof config.templates.opportunityResult.criticalSuccess, 'string');
    assert.strictEqual(typeof config.templates.fateDescription, 'string');
    assert.strictEqual(typeof config.templates.statusTriggerReason, 'string');
    assert.strictEqual(typeof config.templates.statusResult, 'string');
    assert.strictEqual(typeof config.templates.statusDeath, 'string');
    assert.strictEqual(typeof config.templates.reportOpening, 'string');
    assert.strictEqual(typeof config.templates.reportEnding, 'string');
  });

  it('exposes the restart confirm labels', () => {
    const config = loadPhase4PresentationConfig();

    assert.strictEqual(typeof config.labels.restartConfirm.title, 'string');
    assert.strictEqual(typeof config.labels.restartConfirm.message, 'string');
    assert.strictEqual(typeof config.labels.restartConfirm.confirmAction, 'string');
    assert.strictEqual(typeof config.labels.restartConfirm.cancelAction, 'string');
  });
});

describe('validatePhase4PresentationConfig', () => {
  function buildValidConfig(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(loadPhase4PresentationConfig()));
  }

  it('throws when a required top-level field is missing', () => {
    const config = buildValidConfig();
    delete config.labels;

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      new Error('Phase 4 presentation config is missing required field: labels')
    );
  });

  it('throws when labels.createPlayer.title is missing', () => {
    const config = buildValidConfig();
    (config.labels as Record<string, unknown>).createPlayer = {};

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      /labels.createPlayer.title must be a non-empty string/
    );
  });

  it('throws when statOrder.abilities is missing a required key', () => {
    const config = buildValidConfig();
    config.statOrder = {
      abilities: ['cognition'],
      resources: ['money', 'energy'],
      outcomes: ['happiness', 'freedom', 'health', 'experience', 'influence']
    };

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      /statOrder.abilities must include/
    );
  });

  it('throws when templates.opportunityResult is missing a grade', () => {
    const config = buildValidConfig();
    (config.templates as Record<string, unknown>).opportunityResult = {
      direct: 'direct',
      failure: 'failure',
      costlySuccess: 'costlySuccess',
      success: 'success'
    };

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      /templates.opportunityResult.criticalSuccess must be a non-empty string/
    );
  });

  it('throws when reportFallback.sections is missing a field', () => {
    const config = buildValidConfig();
    (config.reportFallback as Record<string, unknown>).sections = {
      openingHeading: '开局画像',
      choicesHeading: '关键选择',
      choicesEmptyText: '暂无',
      fateHeading: '后续变故',
      fateEmptyText: '暂无',
      endingHeading: '最终结局'
    };

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      /reportFallback.sections.finalStatsHeading must be a non-empty string/
    );
  });

  it('throws when eventCardFallbacks entry is empty', () => {
    const config = buildValidConfig();
    (config.eventCardFallbacks as Record<string, unknown>)['missing-description'] = {};

    assert.throws(
      () => validatePhase4PresentationConfig(config),
      /eventCardFallbacks.missing-description.shortDescription must be a non-empty string/
    );
  });
});
