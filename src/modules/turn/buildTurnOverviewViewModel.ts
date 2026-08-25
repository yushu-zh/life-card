import { isOpportunitySelectable } from '../../engine/opportunity/checkOpportunityAvailability.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityEventConfig, OpportunityEventDefinition, StatKey } from '../../shared/types/opportunity.ts';
import type { TurnSystemConfig } from '../../shared/types/turn.ts';
import type {
  Phase4PresentationConfig,
  TurnCardViewModel,
  TurnOverviewViewModel,
  UiRiskHint
} from '../../shared/types/ui.ts';

// 把当前游戏快照和回合状态映射成回合总览 ViewModel。
// 这个映射层负责把领域事实（snapshot + activeTurn）转成组件可直接渲染的字段，
// 包括卡牌文案、风险提示和换牌入口状态。
export function buildTurnOverviewViewModel(
  snapshot: GameSessionSnapshot,
  activeTurn: GameSessionSnapshot['turnState']['activeTurn'],
  opportunityConfig: OpportunityEventConfig,
  turnSystemConfig: TurnSystemConfig,
  presentation: Phase4PresentationConfig
): TurnOverviewViewModel {
  if (!activeTurn) {
    throw new Error('Active turn is required to build turn overview view model');
  }

  const labels = presentation.labels.turnOverview;
  const { age, cycle, turn } = activeTurn;

  const stats = buildStats(snapshot, presentation);
  const riskHint = buildRiskHint(snapshot, turnSystemConfig, presentation);
  const cards = activeTurn.currentOffer.map((card) =>
    buildCardViewModel(card, snapshot, opportunityConfig, turnSystemConfig.energyRules, presentation)
  );

  return {
    title: labels.title.replace('{age}', String(age)),
    subtitle: labels.subtitle,
    header: {
      ageLabel: labels.ageTemplate.replace('{age}', String(age)),
      cycleLabel: labels.cycleTemplate.replace('{cycle}', String(cycle)),
      turnLabel: labels.turnTemplate.replace('{turn}', String(turn)),
      ageTrackLabel: labels.ageTrackLabel,
      age,
      ageTrackMarks: turnSystemConfig.cycleStartAges,
      reroll: {
        canUse: activeTurn.rerollCount < turnSystemConfig.redrawLimitPerTurn,
        used: activeTurn.rerollCount > 0,
        // 未换牌时展示剩余次数，对齐参考图“换牌一次（剩余1次）”。
        label: activeTurn.rerollCount > 0
          ? labels.rerollUsed
          : labels.rerollAction.replace(
              '{remaining}',
              String(turnSystemConfig.redrawLimitPerTurn - activeTurn.rerollCount)
            ),
        helperText: activeTurn.rerollCount >= turnSystemConfig.redrawLimitPerTurn ? labels.rerollDisabledMessage : '',
        successToastText: labels.rerollSuccessToast
      }
    },
    stats,
    riskHint,
    cards,
    chooseCardHint: labels.chooseCardHint,
    resolvingMessage: labels.resolvingMessage
  };
}

// 构造顶部状态区：能力、资源、结算指标。
function buildStats(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): TurnOverviewViewModel['stats'] {
  const { abilities, resources, outcomes } = snapshot.stats;

  const thresholds = presentation.toneThresholds;

  return {
    abilitiesTitle: presentation.labels.turnOverview.abilitiesTitle,
    resourcesTitle: presentation.labels.turnOverview.resourcesTitle,
    outcomesTitle: presentation.labels.turnOverview.outcomesTitle,
    abilities: presentation.statOrder.abilities.map((key) => ({
      key,
      label: presentation.statLabels[key],
      value: abilities[key],
      tone: 'normal' as const
    })),
    resources: presentation.statOrder.resources.map((key) => ({
      key,
      label: presentation.statLabels[key],
      value: resources[key],
      tone: resolveResourceTone(key, resources[key], thresholds)
    })),
    outcomes: presentation.statOrder.outcomes.map((key) => ({
      key,
      label: presentation.statLabels[key],
      value: outcomes[key],
      tone: resolveOutcomeTone(key, outcomes[key], thresholds)
    }))
  };
}

// 根据资源数值决定展示色调。
function resolveResourceTone(
  key: 'money' | 'energy',
  value: number,
  thresholds: Phase4PresentationConfig['toneThresholds']
): 'normal' | 'warning' | 'danger' {
  if (key === 'money' && value <= thresholds.lowMoneyMax) return 'warning';
  if (key === 'energy' && value <= thresholds.lowEnergyMax) return 'danger';
  return 'normal';
}

// 根据结算数值决定展示色调。
function resolveOutcomeTone(
  key: 'happiness' | 'freedom' | 'health' | 'experience' | 'influence',
  value: number,
  thresholds: Phase4PresentationConfig['toneThresholds']
): 'normal' | 'warning' | 'danger' {
  if (key === 'health' && value <= thresholds.lowHealthMax) return 'danger';
  return 'normal';
}

// 根据 snapshot 和状态阈值推导风险提示。
function buildRiskHint(
  snapshot: GameSessionSnapshot,
  turnSystemConfig: TurnSystemConfig,
  presentation: Phase4PresentationConfig
): UiRiskHint | null {
  const statuses = turnSystemConfig.statuses;
  const { money, energy } = snapshot.stats.resources;
  const { health } = snapshot.stats.outcomes;
  const { age } = snapshot.progression;

  // 生命危机条件最强，放在最后覆盖判断。
  const lifeCrisis = statuses.lifeCrisis;
  if (
    age >= lifeCrisis.ageMin &&
    health <= lifeCrisis.healthMax &&
    energy <= lifeCrisis.energyMax
  ) {
    return { ...presentation.riskHints.lifeCrisis, tone: 'danger' };
  }

  // 健康危机。
  if (health <= statuses.healthCrisis.healthMax) {
    return { ...presentation.riskHints.healthWarning, tone: 'danger' };
  }

  // 精力危机。
  if (energy <= statuses.energyCrisis.energyMax) {
    return { ...presentation.riskHints.energyWarning, tone: 'danger' };
  }

  // 经济危机（轻提示）。
  if (money <= statuses.economicCrisis.moneyMax) {
    return { ...presentation.riskHints.economicPressure, tone: 'warning' };
  }

  return null;
}

// 把单个事件卡映射成组件可渲染的 ViewModel。
function buildCardViewModel(
  card: { slotIndex: number; eventId: string },
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  energyRules: TurnSystemConfig['energyRules'],
  presentation: Phase4PresentationConfig
): TurnCardViewModel {
  const event = opportunityConfig.events.find((e) => e.id === card.eventId);

  if (!event) {
    throw new Error(`Event ${card.eventId} not found in opportunity config`);
  }

  const fallback = presentation.eventCardFallbacks[card.eventId];
  const narrativeSource = fallback ? 'mock-curated' : 'template-fallback';

  return {
    slotIndex: card.slotIndex as 0 | 1 | 2,
    eventId: card.eventId,
    title: event.name,
    shortDescription: fallback?.shortDescription ?? buildTemplateShortDescription(event, presentation),
    checkLabel: buildCheckLabel(event, presentation),
    // 后果一律展示精确数值（对齐参考图卡面）；空列表时才用配置的空态兜底文案。
    rewards:
      event.effects.reward.length > 0
        ? event.effects.reward.map((delta) => formatDelta(delta, presentation))
        : (fallback?.rewardHints ?? []),
    fixedCosts:
      event.effects.fixedCost.length > 0
        ? event.effects.fixedCost.map((delta) => formatDelta(delta, presentation))
        : (fallback?.fixedCostHints ?? []),
    risks:
      event.effects.risk.length > 0
        ? event.effects.risk.map((delta) => formatDelta(delta, presentation))
        : (fallback?.riskHints ?? []),
    narrativeSource,
    // 规则3/8：金钱不足或精力过低时，把这张牌置灰不可选。
    isDisabled: !isOpportunitySelectable(snapshot, event, energyRules),
    isSelected: false
  };
}

// 当没有精修文案时，用模板生成短描述。
function buildTemplateShortDescription(
  event: OpportunityEventDefinition,
  presentation: Phase4PresentationConfig
): string {
  return presentation.templates.eventShortDescription.replace('{eventName}', event.name);
}

// 构造检定标签：无需检定或列出检定能力。
function buildCheckLabel(event: OpportunityEventDefinition, presentation: Phase4PresentationConfig): string {
  if (event.check.kind === 'none') {
    return presentation.labels.cards.noCheckLabel;
  }

  const abilityLabels = event.check.abilityKeys
    .map((key) => presentation.statLabels[key])
    .join(' + ');

  return `检定：${abilityLabels}`;
}

// 把数值变化格式化成“属性名+变化值”（对齐参考图卡面，如“金钱+2”）。
function formatDelta(delta: { key: StatKey; amount: number }, presentation: Phase4PresentationConfig): string {
  const label = presentation.statLabels[delta.key];
  const sign = delta.amount > 0 ? '+' : '';
  return `${label}${sign}${delta.amount}`;
}
