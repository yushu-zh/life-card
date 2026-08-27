import type { OpportunityEventConfig, OpportunityResultGrade, StatDelta, StatKey } from '../../shared/types/opportunity.ts';
import type { TurnResolutionSummary } from '../../shared/types/turn.ts';
import type {
  DisplayTone,
  FateResolutionStepViewModel,
  OpportunityResolutionStepViewModel,
  Phase4PresentationConfig,
  StatusResolutionStepViewModel,
  TurnResolutionDeltaItem,
  TurnResolutionFlowViewModel
} from '../../shared/types/ui.ts';

// 把一次完整的回合结算摘要映射成结果流 ViewModel。
// 结果流严格按顺序只展示：机会事件 -> 后续变故（命运） -> 状态影响。
export function buildTurnResolutionFlowViewModel(
  summary: TurnResolutionSummary,
  opportunityConfig: OpportunityEventConfig,
  presentation: Phase4PresentationConfig
): TurnResolutionFlowViewModel {
  const labels = presentation.labels.resultFlow;
  const steps: TurnResolutionFlowViewModel['steps'] = [];

  // 1. 机会事件结果。
  steps.push(buildOpportunityStep(summary, opportunityConfig, presentation));

  // 2. 后续变故（命运事件），仅在触发时出现。
  if (summary.fate?.triggered) {
    steps.push(buildFateStep(summary.fate, presentation));
  }

  // 3. 状态影响，按结算顺序依次出现。
  for (const statusResult of summary.statuses) {
    steps.push(buildStatusStep(statusResult, presentation));
  }

  // 决定下一步按钮的目标。
  const nextAction = buildNextAction(summary, labels);

  return {
    context: summary.context,
    steps,
    nextAction
  };
}

// 构造机会事件结果步骤。
function buildOpportunityStep(
  summary: TurnResolutionSummary,
  opportunityConfig: OpportunityEventConfig,
  presentation: Phase4PresentationConfig
): OpportunityResolutionStepViewModel {
  const labels = presentation.labels.resultFlow;
  const opportunity = summary.opportunity;
  const event = opportunityConfig.events.find((e) => e.id === opportunity.event.id);

  const grade: OpportunityResultGrade | 'direct' = opportunity.resolutionKind === 'direct'
    ? 'direct'
    : (opportunity.resultGrade ?? 'failure');

  const fallback = presentation.opportunityResultFallbacks[opportunity.event.id];
  const aiResult = summary.narrative?.result;
  const narrativeSource = aiResult ? 'ai-generated' : (fallback ? 'mock-curated' : 'template-fallback');

  const body: string[] = [];
  if (aiResult) {
    // AI 结果文案：一段展现事件结果、与事件描述呼应的文本。
    body.push(aiResult.description);
  } else {
    const fallbackText = fallback?.[grade as keyof typeof fallback];
    const templateText = presentation.templates.opportunityResult[grade];

    body.push(
      typeof fallbackText === 'string' && fallbackText.length > 0
        ? fallbackText.replace('{eventName}', event?.name ?? opportunity.event.name)
        : templateText.replace('{eventName}', event?.name ?? opportunity.event.name)
    );
  }

  const eventName = event?.name ?? opportunity.event.name;
  // 等级展示统一带“结果：”前缀，对齐结果页参考图。
  const gradeText = grade === 'direct' ? labels.noCheckGradeLabel : formatGradeLabel(grade, presentation);

  const step: OpportunityResolutionStepViewModel = {
    kind: 'opportunity',
    title: labels.opportunityStepTitle.replace('{eventName}', eventName),
    body,
    deltas: buildDeltaItems(opportunity.appliedDeltas, presentation),
    deltaHeading: labels.deltaHeading,
    gradeLabel: `${labels.resultGradePrefix}${gradeText}`,
    grade,
    narrativeSource
  };

  if (opportunity.formula) {
    // 检定详情按参考图拆成三行：掷骰：2d6 = 12 / 检定：认知3 + 行动2 / 总分：15。
    step.diceLabel = labels.diceTemplate.replace(
      '{diceTotal}',
      String(opportunity.formula.dice.first + opportunity.formula.dice.second)
    );

    const abilityPart = opportunity.formula.abilities
      .map((ability) => `${presentation.statLabels[ability.key]}${ability.value}`)
      .join(' + ');
    step.checkLabel = labels.checkTemplate.replace('{abilities}', abilityPart);
    step.totalScoreLabel = labels.totalScoreLabel.replace(
      '{total}',
      String(opportunity.formula.totalScore)
    );
  }

  return step;
}

// 构造命运事件结果步骤。
function buildFateStep(
  fate: NonNullable<TurnResolutionSummary['fate']>,
  presentation: Phase4PresentationConfig
): FateResolutionStepViewModel {
  const labels = presentation.labels.resultFlow;
  const fallback = presentation.fateFallbacks[fate.event?.id ?? ''];
  const narrativeSource = fallback ? 'mock-curated' : 'template-fallback';

  const body: string[] = [];
  if (fallback) {
    body.push(fallback.description);
  } else if (fate.event) {
    body.push(presentation.templates.fateDescription.replace('{fateName}', fate.event.name));
  }

  const step: FateResolutionStepViewModel = {
    kind: 'fate',
    // 主标题统一为“触发命运事件”，对齐命运事件界面参考图。
    title: labels.fateStepTitle,
    subtitle: fallback?.subtitle ?? labels.fateRuleHint,
    body,
    deltas: buildDeltaItems(fate.appliedDeltas, presentation),
    deltaHeading: labels.fateDeltaHeading,
    ruleHint: labels.fateRuleHint,
    narrativeSource
  };

  if (fate.mitigatedDelta) {
    step.mitigationLabel = `${labels.mitigationTitle}：${presentation.statLabels[fate.mitigatedDelta.key]} ${fate.mitigatedDelta.amount}`;
  }

  return step;
}

// 构造状态影响结果步骤。
function buildStatusStep(
  statusResult: TurnResolutionSummary['statuses'][number],
  presentation: Phase4PresentationConfig
): StatusResolutionStepViewModel {
  const labels = presentation.labels.resultFlow;
  const fallback = presentation.statusFallbacks[statusResult.id];
  const narrativeSource = fallback ? 'mock-curated' : 'template-fallback';

  const statusName = fallback?.title ?? statusResult.name;
  // 标题对齐线框格式：“当前状态：经济压力”。
  const title = `${labels.statusStepTitle}：${statusName}`;
  const body: string[] = [];

  // 先讲触发原因（为什么发生），再讲本次结果。
  if (fallback?.triggerReasonTemplate) {
    body.push(fallback.triggerReasonTemplate);
  }

  if (statusResult.kind === 'one-time-effect' || statusResult.kind === 'per-cycle-effect') {
    body.push(
      fallback?.resultTemplate ??
        presentation.templates.statusResult.replace('{statusName}', statusResult.name)
    );
  } else if (statusResult.kind === 'death-risk') {
    if (statusResult.died) {
      body.push(fallback?.deathTemplate ?? presentation.templates.statusDeath);
    } else {
      body.push(labels.riskStillActiveLabel);
    }
  }

  return {
    kind: 'status',
    statusId: statusResult.id,
    title,
    body,
    deltas: buildDeltaItems(statusResult.appliedDeltas ?? [], presentation),
    deltaHeading: labels.deltaHeading,
    conditions: statusResult.conditions ?? [],
    isTerminal: statusResult.kind === 'death-risk' && statusResult.died,
    narrativeSource
  };
}

// 把数值变化数组映射成 UI 可直接渲染的条目，并附带展示色调。
function buildDeltaItems(deltas: StatDelta[], presentation: Phase4PresentationConfig): TurnResolutionDeltaItem[] {
  return deltas.map((delta) => ({
    key: delta.key,
    label: presentation.statLabels[delta.key],
    amount: delta.amount,
    tone: resolveDeltaTone(delta.key, delta.amount)
  }));
}

// 根据变化方向决定展示色调。
function resolveDeltaTone(key: StatKey, amount: number): DisplayTone {
  if (amount === 0) return 'muted';
  if (key === 'health' || key === 'energy' || key === 'money') {
    return amount > 0 ? 'positive' : 'danger';
  }
  return amount > 0 ? 'positive' : 'warning';
}

// 格式化机会结果等级文案。
function formatGradeLabel(
  grade: OpportunityResultGrade,
  presentation: Phase4PresentationConfig
): string {
  switch (grade) {
    case 'failure':
      return '失败';
    case 'costlySuccess':
      return '代价成功';
    case 'success':
      return '成功';
    case 'criticalSuccess':
      return '大成功';
    default:
      return presentation.labels.common.unknownLabel;
  }
}

// 根据结算结果决定下一步按钮的目标与文案。
function buildNextAction(
  summary: TurnResolutionSummary,
  labels: Phase4PresentationConfig['labels']['resultFlow']
): TurnResolutionFlowViewModel['nextAction'] {
  const terminalDeath = summary.statuses.some(
    (status) => status.kind === 'death-risk' && status.died
  );

  if (terminalDeath || summary.progressionAfterTurn.isEnded) {
    return { label: labels.gameOverAction, target: 'game-over' };
  }

  return { label: labels.nextTurnAction, target: 'next-turn' };
}
