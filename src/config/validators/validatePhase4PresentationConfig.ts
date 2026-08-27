import type { AbilityKey } from '../../shared/types/bootstrap.ts';
import type { OutcomeKey, Phase4PresentationConfig, ResourceKey } from '../../shared/types/ui.ts';

// Phase 4 展示配置里必须存在的顶层字段。
const REQUIRED_TOP_FIELDS = [
  'labels',
  'statOrder',
  'statLabels',
  'toneThresholds',
  'riskHints',
  'templates',
  'eventCardFallbacks',
  'opportunityResultFallbacks',
  'fateFallbacks',
  'statusFallbacks',
  'reportFallback'
] as const;

// 创建人物界面需要的标签字段。
const REQUIRED_CREATE_PLAYER_FIELDS = [
  'title',
  'subtitle',
  'nickname',
  'nicknamePlaceholder',
  'appId',
  'appIdPlaceholder',
  'skillTags',
  'skillTagsPlaceholder',
  'skillTagsAction',
  'education',
  'educationPlaceholder',
  'industry',
  'industryPlaceholder',
  'wishes',
  'wishesPlaceholder',
  'wishesAction',
  'abilitiesTitle',
  'remainingPointsTemplate',
  'startAction'
] as const;

// 回合总览需要的标签字段。
const REQUIRED_TURN_OVERVIEW_FIELDS = [
  'title',
  'subtitle',
  'ageTemplate',
  'cycleTemplate',
  'turnTemplate',
  'ageTrackLabel',
  'abilitiesTitle',
  'resourcesTitle',
  'outcomesTitle',
  'rerollAction',
  'rerollUsed',
  'rerollDisabledMessage',
  'rerollSuccessToast',
  'chooseCardHint',
  'resolvingMessage'
] as const;

// 卡牌通用标签字段。
const REQUIRED_CARD_FIELDS = [
  'noCheckLabel',
  'rewardHeading',
  'fixedCostHeading',
  'riskHeading'
] as const;

// 掷骰过渡标签字段。
const REQUIRED_ROLLING_FIELDS = ['title', 'loadingText'] as const;

// 结果流标签字段。
const REQUIRED_RESULT_FLOW_FIELDS = [
  'opportunityStepTitle',
  'noCheckGradeLabel',
  'resultGradePrefix',
  'descriptionHeading',
  'diceTemplate',
  'checkTemplate',
  'totalScoreLabel',
  'deltaHeading',
  'continueAction',
  'nextTurnAction',
  'fateStepTitle',
  'fateRuleHint',
  'fateDeltaHeading',
  'mitigationTitle',
  'statusStepTitle',
  'riskStillActiveLabel',
  'gameOverAction',
  'reportAction'
] as const;

// 终局页标签字段。
const REQUIRED_GAME_OVER_FIELDS = ['title', 'subtitle', 'reportAction'] as const;

// 报告页标签字段。
const REQUIRED_REPORT_FIELDS = ['title', 'restartAction', 'finalStatsHeading'] as const;

// 重新开始确认弹窗标签字段。
const REQUIRED_RESTART_CONFIRM_FIELDS = ['title', 'message', 'confirmAction', 'cancelAction'] as const;

// 公共标签字段。
const REQUIRED_COMMON_FIELDS = ['unknownLabel', 'loadingSessionText', 'emptyText'] as const;

// 属性顺序里必须包含的键。
const REQUIRED_ABILITY_KEYS = ['cognition', 'execution', 'social', 'creativity', 'adaptability'] as const;
const REQUIRED_RESOURCE_KEYS = ['money', 'energy'] as const;
const REQUIRED_OUTCOME_KEYS = ['happiness', 'freedom', 'health', 'experience', 'influence'] as const;
const REQUIRED_STAT_KEYS = [
  ...REQUIRED_ABILITY_KEYS,
  ...REQUIRED_RESOURCE_KEYS,
  ...REQUIRED_OUTCOME_KEYS
] as const;

// 风险提示里必须存在的键。
const REQUIRED_RISK_HINT_KEYS = ['economicPressure', 'energyWarning', 'healthWarning', 'lifeCrisis'] as const;

// 模板里必须存在的字段。
const REQUIRED_TEMPLATE_FIELDS = [
  'eventShortDescription',
  'opportunityResult',
  'fateDescription',
  'statusTriggerReason',
  'statusResult',
  'statusDeath',
  'reportOpening',
  'reportEnding'
] as const;

// 机会结果模板里必须存在的等级。
const REQUIRED_OPPORTUNITY_RESULT_GRADES = ['direct', 'failure', 'costlySuccess', 'success', 'criticalSuccess'] as const;

// 报告 section 模板里必须存在的字段。
const REQUIRED_REPORT_SECTION_FIELDS = [
  'openingHeading',
  'choicesHeading',
  'choicesEmptyText',
  'fateHeading',
  'fateEmptyText',
  'endingHeading',
  'finalStatsHeading'
] as const;

// 确保值是非空对象。
function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

// 确保值是非空字符串。
function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

// 确保值是字符串数组。
function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be an array of strings`);
  }
}

// 检查 Phase 4 展示配置是否合法，并整理成固定结构返回。
export function validatePhase4PresentationConfig(value: unknown): Phase4PresentationConfig {
  assertObject(value, 'Phase 4 presentation config');
  const config = value as Record<string, unknown>;

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!(field in config)) {
      throw new Error(`Phase 4 presentation config is missing required field: ${field}`);
    }
  }

  const labels = validateLabels(config.labels);
  const statOrder = validateStatOrder(config.statOrder);
  const statLabels = validateStatLabels(config.statLabels);
  const toneThresholds = validateToneThresholds(config.toneThresholds);
  const riskHints = validateRiskHints(config.riskHints);
  const templates = validateTemplates(config.templates);
  const eventCardFallbacks = validateEventCardFallbacks(config.eventCardFallbacks);
  const opportunityResultFallbacks = validateOpportunityResultFallbacks(config.opportunityResultFallbacks);
  const fateFallbacks = validateFateFallbacks(config.fateFallbacks);
  const statusFallbacks = validateStatusFallbacks(config.statusFallbacks);
  const reportFallback = validateReportFallback(config.reportFallback);

  return {
    labels,
    statOrder,
    statLabels,
    toneThresholds,
    riskHints,
    templates,
    eventCardFallbacks,
    opportunityResultFallbacks,
    fateFallbacks,
    statusFallbacks,
    reportFallback
  };
}

function validateLabels(value: unknown): Phase4PresentationConfig['labels'] {
  assertObject(value, 'labels');
  const labels = value as Record<string, unknown>;

  const createPlayer = validateCreatePlayerLabels(labels.createPlayer);
  const turnOverview = validateTurnOverviewLabels(labels.turnOverview);
  const cards = validateCardLabels(labels.cards);
  const rolling = validateRollingLabels(labels.rolling);
  const resultFlow = validateResultFlowLabels(labels.resultFlow);
  const gameOver = validateGameOverLabels(labels.gameOver);
  const report = validateReportLabels(labels.report);
  const restartConfirm = validateRestartConfirmLabels(labels.restartConfirm);
  const common = validateCommonLabels(labels.common);

  return {
    createPlayer,
    turnOverview,
    cards,
    rolling,
    resultFlow,
    gameOver,
    report,
    restartConfirm,
    common
  };
}

function validateCreatePlayerLabels(value: unknown): Phase4PresentationConfig['labels']['createPlayer'] {
  assertObject(value, 'labels.createPlayer');
  const createPlayer = value as Record<string, unknown>;

  for (const field of REQUIRED_CREATE_PLAYER_FIELDS) {
    assertString(createPlayer[field], `labels.createPlayer.${field}`);
  }

  return createPlayer as Phase4PresentationConfig['labels']['createPlayer'];
}

function validateTurnOverviewLabels(value: unknown): Phase4PresentationConfig['labels']['turnOverview'] {
  assertObject(value, 'labels.turnOverview');
  const turnOverview = value as Record<string, unknown>;

  for (const field of REQUIRED_TURN_OVERVIEW_FIELDS) {
    assertString(turnOverview[field], `labels.turnOverview.${field}`);
  }

  return turnOverview as Phase4PresentationConfig['labels']['turnOverview'];
}

function validateCardLabels(value: unknown): Phase4PresentationConfig['labels']['cards'] {
  assertObject(value, 'labels.cards');
  const cards = value as Record<string, unknown>;

  for (const field of REQUIRED_CARD_FIELDS) {
    assertString(cards[field], `labels.cards.${field}`);
  }

  return cards as Phase4PresentationConfig['labels']['cards'];
}

function validateRollingLabels(value: unknown): Phase4PresentationConfig['labels']['rolling'] {
  assertObject(value, 'labels.rolling');
  const rolling = value as Record<string, unknown>;

  for (const field of REQUIRED_ROLLING_FIELDS) {
    assertString(rolling[field], `labels.rolling.${field}`);
  }

  return rolling as Phase4PresentationConfig['labels']['rolling'];
}

function validateResultFlowLabels(value: unknown): Phase4PresentationConfig['labels']['resultFlow'] {
  assertObject(value, 'labels.resultFlow');
  const resultFlow = value as Record<string, unknown>;

  for (const field of REQUIRED_RESULT_FLOW_FIELDS) {
    assertString(resultFlow[field], `labels.resultFlow.${field}`);
  }

  return resultFlow as Phase4PresentationConfig['labels']['resultFlow'];
}

function validateGameOverLabels(value: unknown): Phase4PresentationConfig['labels']['gameOver'] {
  assertObject(value, 'labels.gameOver');
  const gameOver = value as Record<string, unknown>;

  for (const field of REQUIRED_GAME_OVER_FIELDS) {
    assertString(gameOver[field], `labels.gameOver.${field}`);
  }

  return gameOver as Phase4PresentationConfig['labels']['gameOver'];
}

function validateReportLabels(value: unknown): Phase4PresentationConfig['labels']['report'] {
  assertObject(value, 'labels.report');
  const report = value as Record<string, unknown>;

  for (const field of REQUIRED_REPORT_FIELDS) {
    assertString(report[field], `labels.report.${field}`);
  }

  return report as Phase4PresentationConfig['labels']['report'];
}

function validateRestartConfirmLabels(value: unknown): Phase4PresentationConfig['labels']['restartConfirm'] {
  assertObject(value, 'labels.restartConfirm');
  const restartConfirm = value as Record<string, unknown>;

  for (const field of REQUIRED_RESTART_CONFIRM_FIELDS) {
    assertString(restartConfirm[field], `labels.restartConfirm.${field}`);
  }

  return restartConfirm as Phase4PresentationConfig['labels']['restartConfirm'];
}

function validateCommonLabels(value: unknown): Phase4PresentationConfig['labels']['common'] {
  assertObject(value, 'labels.common');
  const common = value as Record<string, unknown>;

  for (const field of REQUIRED_COMMON_FIELDS) {
    assertString(common[field], `labels.common.${field}`);
  }

  return common as Phase4PresentationConfig['labels']['common'];
}

function validateStatOrder(value: unknown): Phase4PresentationConfig['statOrder'] {
  assertObject(value, 'statOrder');
  const statOrder = value as Record<string, unknown>;

  assertStringArray(statOrder.abilities, 'statOrder.abilities');
  assertStringArray(statOrder.resources, 'statOrder.resources');
  assertStringArray(statOrder.outcomes, 'statOrder.outcomes');

  const abilities = statOrder.abilities;
  const resources = statOrder.resources;
  const outcomes = statOrder.outcomes;

  for (const key of REQUIRED_ABILITY_KEYS) {
    if (!abilities.includes(key)) {
      throw new Error(`statOrder.abilities must include ${key}`);
    }
  }

  for (const key of REQUIRED_RESOURCE_KEYS) {
    if (!resources.includes(key)) {
      throw new Error(`statOrder.resources must include ${key}`);
    }
  }

  for (const key of REQUIRED_OUTCOME_KEYS) {
    if (!outcomes.includes(key)) {
      throw new Error(`statOrder.outcomes must include ${key}`);
    }
  }

  // 校验已确认三个数组都包含全部必需键，这里收窄到具体键的联合类型。
  return {
    abilities: abilities as AbilityKey[],
    resources: resources as ResourceKey[],
    outcomes: outcomes as OutcomeKey[]
  };
}

function validateStatLabels(value: unknown): Phase4PresentationConfig['statLabels'] {
  assertObject(value, 'statLabels');
  const statLabels = value as Record<string, unknown>;

  for (const key of REQUIRED_STAT_KEYS) {
    assertString(statLabels[key], `statLabels.${key}`);
  }

  return statLabels as Phase4PresentationConfig['statLabels'];
}

function validateToneThresholds(value: unknown): Phase4PresentationConfig['toneThresholds'] {
  assertObject(value, 'toneThresholds');
  const toneThresholds = value as Record<string, unknown>;

  for (const field of ['lowMoneyMax', 'lowEnergyMax', 'lowHealthMax'] as const) {
    if (!Number.isInteger(toneThresholds[field])) {
      throw new Error(`toneThresholds.${field} must be an integer`);
    }
  }

  return toneThresholds as Phase4PresentationConfig['toneThresholds'];
}

function validateRiskHints(value: unknown): Phase4PresentationConfig['riskHints'] {
  assertObject(value, 'riskHints');
  const riskHints = value as Record<string, unknown>;

  for (const key of REQUIRED_RISK_HINT_KEYS) {
    const item = riskHints[key];
    assertObject(item, `riskHints.${key}`);
    assertString(item.title, `riskHints.${key}.title`);
    assertString(item.text, `riskHints.${key}.text`);
  }

  return riskHints as Phase4PresentationConfig['riskHints'];
}

function validateTemplates(value: unknown): Phase4PresentationConfig['templates'] {
  assertObject(value, 'templates');
  const templates = value as Record<string, unknown>;

  for (const field of REQUIRED_TEMPLATE_FIELDS) {
    if (!(field in templates)) {
      throw new Error(`templates is missing required field: ${field}`);
    }
  }

  assertString(templates.eventShortDescription, 'templates.eventShortDescription');

  const opportunityResult = templates.opportunityResult;
  assertObject(opportunityResult, 'templates.opportunityResult');
  for (const grade of REQUIRED_OPPORTUNITY_RESULT_GRADES) {
    assertString(opportunityResult[grade], `templates.opportunityResult.${grade}`);
  }

  assertString(templates.fateDescription, 'templates.fateDescription');
  assertString(templates.statusTriggerReason, 'templates.statusTriggerReason');
  assertString(templates.statusResult, 'templates.statusResult');
  assertString(templates.statusDeath, 'templates.statusDeath');
  assertString(templates.reportOpening, 'templates.reportOpening');
  assertString(templates.reportEnding, 'templates.reportEnding');

  return templates as Phase4PresentationConfig['templates'];
}

function validateEventCardFallbacks(
  value: unknown
): Phase4PresentationConfig['eventCardFallbacks'] {
  assertObject(value, 'eventCardFallbacks');
  const fallbacks = value as Record<string, unknown>;

  for (const [eventId, fallback] of Object.entries(fallbacks)) {
    assertObject(fallback, `eventCardFallbacks.${eventId}`);
    assertString(fallback.shortDescription, `eventCardFallbacks.${eventId}.shortDescription`);

    if (fallback.rewardHints !== undefined) {
      assertStringArray(fallback.rewardHints, `eventCardFallbacks.${eventId}.rewardHints`);
    }
    if (fallback.fixedCostHints !== undefined) {
      assertStringArray(fallback.fixedCostHints, `eventCardFallbacks.${eventId}.fixedCostHints`);
    }
    if (fallback.riskHints !== undefined) {
      assertStringArray(fallback.riskHints, `eventCardFallbacks.${eventId}.riskHints`);
    }
  }

  return fallbacks as Phase4PresentationConfig['eventCardFallbacks'];
}

function validateOpportunityResultFallbacks(
  value: unknown
): Phase4PresentationConfig['opportunityResultFallbacks'] {
  assertObject(value, 'opportunityResultFallbacks');
  const fallbacks = value as Record<string, unknown>;

  for (const [eventId, fallback] of Object.entries(fallbacks)) {
    assertObject(fallback, `opportunityResultFallbacks.${eventId}`);
    const grades = Object.keys(fallback);
    if (grades.length === 0) {
      throw new Error(`opportunityResultFallbacks.${eventId} must have at least one grade entry`);
    }
  }

  return fallbacks as Phase4PresentationConfig['opportunityResultFallbacks'];
}

function validateFateFallbacks(value: unknown): Phase4PresentationConfig['fateFallbacks'] {
  assertObject(value, 'fateFallbacks');
  const fallbacks = value as Record<string, unknown>;

  for (const [fateId, fallback] of Object.entries(fallbacks)) {
    assertObject(fallback, `fateFallbacks.${fateId}`);
    assertString(fallback.title, `fateFallbacks.${fateId}.title`);
    assertString(fallback.subtitle, `fateFallbacks.${fateId}.subtitle`);
    assertString(fallback.description, `fateFallbacks.${fateId}.description`);
  }

  return fallbacks as Phase4PresentationConfig['fateFallbacks'];
}

function validateStatusFallbacks(value: unknown): Phase4PresentationConfig['statusFallbacks'] {
  assertObject(value, 'statusFallbacks');
  const fallbacks = value as Record<string, unknown>;

  for (const [statusId, fallback] of Object.entries(fallbacks)) {
    assertObject(fallback, `statusFallbacks.${statusId}`);
    assertString(fallback.title, `statusFallbacks.${statusId}.title`);
    assertString(fallback.triggerReasonTemplate, `statusFallbacks.${statusId}.triggerReasonTemplate`);
    assertString(fallback.resultTemplate, `statusFallbacks.${statusId}.resultTemplate`);

    if (fallback.deathTemplate !== undefined) {
      assertString(fallback.deathTemplate, `statusFallbacks.${statusId}.deathTemplate`);
    }
  }

  return fallbacks as Phase4PresentationConfig['statusFallbacks'];
}

function validateReportFallback(value: unknown): Phase4PresentationConfig['reportFallback'] {
  assertObject(value, 'reportFallback');
  const reportFallback = value as Record<string, unknown>;

  assertString(reportFallback.titleTemplate, 'reportFallback.titleTemplate');
  assertString(reportFallback.subtitleTemplate, 'reportFallback.subtitleTemplate');

  const sections = reportFallback.sections;
  assertObject(sections, 'reportFallback.sections');
  for (const field of REQUIRED_REPORT_SECTION_FIELDS) {
    assertString(sections[field], `reportFallback.sections.${field}`);
  }

  const endReasonLabels = reportFallback.endReasonLabels;
  assertObject(endReasonLabels, 'reportFallback.endReasonLabels');

  return {
    titleTemplate: reportFallback.titleTemplate as string,
    subtitleTemplate: reportFallback.subtitleTemplate as string,
    sections: sections as Phase4PresentationConfig['reportFallback']['sections'],
    endReasonLabels: endReasonLabels as Phase4PresentationConfig['reportFallback']['endReasonLabels']
  };
}
