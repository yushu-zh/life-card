import type { AbilityKey, CreatePlayerInput } from './bootstrap.ts';
import type { GameSessionSnapshot } from './game-session.ts';
import type { OpportunityResultGrade, StatKey } from './opportunity.ts';
import type { StatusConditionSnapshot, StatusResult } from './status.ts';
import type { TurnOfferSlotIndex, TurnResolutionSummary } from './turn.ts';
import type { EventCardNarrative } from './narrative.ts';

export type ResourceKey = 'money' | 'energy';
export type OutcomeKey = 'happiness' | 'freedom' | 'health' | 'experience' | 'influence';
export type DisplayTone = 'normal' | 'positive' | 'warning' | 'danger' | 'muted';
export type NarrativeSource = 'ai-generated' | 'mock-curated' | 'template-fallback';

export interface Phase4PresentationConfig {
  labels: {
    createPlayer: {
      title: string;
      subtitle: string;
      nickname: string;
      nicknamePlaceholder: string;
      appId: string;
      appIdPlaceholder: string;
      appIdHint: string;
      deepseekApiKey: string;
      deepseekApiKeyPlaceholder: string;
      skillTags: string;
      skillTagsPlaceholder: string;
      skillTagsAction: string;
      education: string;
      educationPlaceholder: string;
      industry: string;
      industryPlaceholder: string;
      wishes: string;
      wishesPlaceholder: string;
      wishesAction: string;
      abilitiesTitle: string;
      remainingPointsTemplate: string;
      startAction: string;
      optionalFieldsHint: string;
    };
    turnOverview: {
      title: string;
      subtitle: string;
      ageTemplate: string;
      cycleTemplate: string;
      turnTemplate: string;
      ageTrackLabel: string;
      abilitiesTitle: string;
      resourcesTitle: string;
      outcomesTitle: string;
      rerollAction: string;
      rerollUsed: string;
      rerollDisabledMessage: string;
      rerollSuccessToast: string;
      chooseCardHint: string;
      resolvingMessage: string;
    };
    cards: {
      noCheckLabel: string;
      rewardHeading: string;
      fixedCostHeading: string;
      riskHeading: string;
    };
    rolling: {
      title: string;
      loadingText: string;
    };
    resultFlow: {
      opportunityStepTitle: string;
      noCheckGradeLabel: string;
      resultGradePrefix: string;
      descriptionHeading: string;
      diceTemplate: string;
      checkTemplate: string;
      totalScoreLabel: string;
      deltaHeading: string;
      continueAction: string;
      nextTurnAction: string;
      fateStepTitle: string;
      fateRuleHint: string;
      fateDeltaHeading: string;
      mitigationTitle: string;
      statusStepTitle: string;
      riskStillActiveLabel: string;
      gameOverAction: string;
      reportAction: string;
    };
    gameOver: {
      title: string;
      subtitle: string;
      reportAction: string;
    };
    report: {
      title: string;
      restartAction: string;
      retryAction: string;
      exportAction: string;
      finalStatsHeading: string;
    };
    restartConfirm: {
      title: string;
      message: string;
      confirmAction: string;
      cancelAction: string;
    };
    common: {
      unknownLabel: string;
      loadingSessionText: string;
      emptyText: string;
    };
  };
  statOrder: {
    abilities: AbilityKey[];
    resources: ResourceKey[];
    outcomes: OutcomeKey[];
  };
  statLabels: Record<StatKey, string>;
  toneThresholds: {
    lowMoneyMax: number;
    lowEnergyMax: number;
    lowHealthMax: number;
  };
  riskHints: {
    economicPressure: {
      title: string;
      text: string;
    };
    energyWarning: {
      title: string;
      text: string;
    };
    healthWarning: {
      title: string;
      text: string;
    };
    lifeCrisis: {
      title: string;
      text: string;
    };
  };
  templates: {
    eventShortDescription: string;
    opportunityResult: {
      direct: string;
      failure: string;
      costlySuccess: string;
      success: string;
      criticalSuccess: string;
    };
    fateDescription: string;
    statusTriggerReason: string;
    statusResult: string;
    statusDeath: string;
    reportOpening: string;
    reportEnding: string;
  };
  eventCardFallbacks: Record<
    string,
    {
      shortDescription: string;
      rewardHints?: string[];
      fixedCostHints?: string[];
      riskHints?: string[];
    }
  >;
  opportunityResultFallbacks: Record<
    string,
    Partial<Record<'direct' | OpportunityResultGrade, string>>
  >;
  fateFallbacks: Record<
    string,
    {
      title: string;
      subtitle: string;
      description: string;
    }
  >;
  statusFallbacks: Record<
    string,
    {
      title: string;
      triggerReasonTemplate: string;
      resultTemplate: string;
      deathTemplate?: string;
    }
  >;
  reportFallback: {
    titleTemplate: string;
    subtitleTemplate: string;
    sections: {
      openingHeading: string;
      choicesHeading: string;
      choicesEmptyText: string;
      fateHeading: string;
      fateEmptyText: string;
      endingHeading: string;
      finalStatsHeading: string;
      aiSectionHeading: string;
    };
    endReasonLabels: Record<string, string>;
  };
}

export interface UiStatItem<TKey extends string = string> {
  key: TKey;
  label: string;
  value: number;
  tone: DisplayTone;
}

export interface UiRiskHint {
  title: string;
  text: string;
  tone: 'warning' | 'danger';
}

export interface CreatePlayerFieldLabels {
  nickname: string;
  nicknamePlaceholder: string;
  appId: string;
  appIdPlaceholder: string;
  appIdHint: string;
  deepseekApiKey: string;
  deepseekApiKeyPlaceholder: string;
  skillTags: string;
  skillTagsPlaceholder: string;
  skillTagsAction: string;
  education: string;
  educationPlaceholder: string;
  industry: string;
  industryPlaceholder: string;
  wishes: string;
  wishesPlaceholder: string;
  wishesAction: string;
  abilitiesTitle: string;
  optionalFieldsHint: string;
}

export interface CreatePlayerFieldErrors {
  nickname?: string;
  appId?: string;
  deepseekApiKey?: string;
  aiCredential?: string;
  skillTags?: string;
  wishes?: string;
  abilities?: string;
}

export interface CreatePlayerViewModel {
  title: string;
  subtitle: string;
  labels: CreatePlayerFieldLabels;
  draft: CreatePlayerInput;
  appId: string;
  deepseekApiKey: string;
  limits: {
    skillTagLimit: number;
    wishLimit: number;
    abilityPointTotal: number;
    abilityMax: number;
  };
  abilityItems: Array<{
    key: AbilityKey;
    label: string;
    value: number;
    canIncrease: boolean;
    canDecrease: boolean;
  }>;
  remainingPoints: number;
  remainingPointsLabel: string;
  errors: CreatePlayerFieldErrors;
  canStart: boolean;
  disabledReason: string | null;
  startActionLabel: string;
}

export interface TurnCardViewModel {
  slotIndex: TurnOfferSlotIndex;
  eventId: string;
  title: string;
  shortDescription: string;
  checkLabel: string;
  rewards: string[];
  fixedCosts: string[];
  risks: string[];
  narrativeSource: NarrativeSource;
  narrative?: EventCardNarrative | null;
  isDisabled: boolean;
  isSelected: boolean;
}

export interface TurnOverviewViewModel {
  title: string;
  subtitle: string;
  header: {
    ageLabel: string;
    cycleLabel: string;
    turnLabel: string;
    ageTrackLabel: string;
    age: number;
    ageTrackMarks: number[];
    reroll: {
      canUse: boolean;
      used: boolean;
      label: string;
      helperText: string;
      successToastText: string;
    };
  };
  stats: {
    abilitiesTitle: string;
    resourcesTitle: string;
    outcomesTitle: string;
    abilities: UiStatItem<AbilityKey>[];
    resources: UiStatItem<ResourceKey>[];
    outcomes: UiStatItem<OutcomeKey>[];
  };
  riskHint: UiRiskHint | null;
  cards: TurnCardViewModel[];
  chooseCardHint: string;
  resolvingMessage: string;
}

export interface TurnResolutionDeltaItem {
  key: StatKey;
  label: string;
  amount: number;
  tone: DisplayTone;
}

export interface TurnResolutionBaseStep {
  kind: 'opportunity' | 'fate' | 'status';
  title: string;
  subtitle?: string;
  body: string[];
  deltas: TurnResolutionDeltaItem[];
  deltaHeading: string;
  narrativeSource: NarrativeSource;
}

export interface OpportunityResolutionStepViewModel extends TurnResolutionBaseStep {
  kind: 'opportunity';
  gradeLabel: string;
  grade: OpportunityResultGrade | 'direct';
  diceLabel?: string;
  checkLabel?: string;
  totalScoreLabel?: string;
}

export interface FateResolutionStepViewModel extends TurnResolutionBaseStep {
  kind: 'fate';
  ruleHint: string;
  mitigationLabel?: string;
}

export interface StatusResolutionStepViewModel extends TurnResolutionBaseStep {
  kind: 'status';
  statusId: string;
  conditions: StatusConditionSnapshot[];
  isTerminal: boolean;
}

export interface TurnResolutionFlowViewModel {
  context: TurnResolutionSummary['context'];
  steps: Array<OpportunityResolutionStepViewModel | FateResolutionStepViewModel | StatusResolutionStepViewModel>;
  nextAction: {
    label: string;
    target: 'next-turn' | 'game-over' | 'life-report';
  };
}

export interface LifeReportViewModel {
  title: string;
  subtitle: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
  finalStatsHeading: string;
  finalStats: Array<UiStatItem<StatKey>>;
}

// ===== 人生报告第一页：纯数据统计（无需 AI，一秒可得） =====

// 头部一生的关键计数。
export interface LifeStatsHeader {
  nickname: string;
  startAge: number;
  endAge: number;
  // 人生选择次数（每回合选一张牌）。
  choiceCount: number;
  // 曾经摆在面前的机会总数（各回合最终供选牌的总量）。
  opportunityCount: number;
  criticalSuccessCount: number;
  failureCount: number;
  // 命运转折次数：换牌即主动改写一次命运。
  rerollCount: number;
  // 经历过的人生危机种数（经济/健康/精力/生命危机去重）。
  crisisCount: number;
  // 命运事件触发次数。
  fateEventCount: number;
}

// 「机会」与「选择」分开统计：同一类别出现过多少、最终选了多少。
export interface LifeStatsCategoryBalanceItem {
  key: 'achievement' | 'relationship' | 'self';
  label: string;
  appearedCount: number;
  appearedRatio: number;
  chosenCount: number;
  chosenRatio: number;
}

// 一张没有选择的牌：出现次数与最终选择次数。
export interface LifeStatsMissedEvent {
  eventId: string;
  name: string;
  appearedCount: number;
  chosenCount: number;
}

// 累计选择比例轨迹：每个回合结束后的累计占比。
export interface LifeStatsTrajectoryPoint {
  age: number;
  ratio: number;
}

// 能力成长时间轴行：记录该能力在哪些年龄发生过正增长。
export interface LifeStatsAbilityTimelineRow {
  key: AbilityKey;
  label: string;
  growthAges: number[];
}

// 一生的骰运：分布、平均值与「全 7 反事实」对比。
export interface LifeStatsDice {
  rollCount: number;
  averageSum: number;
  expectedSum: number;
  // 2..12 每个点数的出现次数（0 也保留，保证直方图完整）。
  histogram: Array<{ sum: number; count: number }>;
  // 若所有骰点固定为 7：实际结果比平均运气更好 / 相同 / 更差的次数。
  betterCount: number;
  sameCount: number;
  worseCount: number;
  // 模板结论：这一生更多靠能力还是靠运气。
  verdict: string;
}

// 资源曲线：横轴年龄、纵轴数值，含起点与终点。
export interface LifeStatsResourceSeries {
  startValue: number;
  endValue: number;
  points: Array<{ age: number; value: number }>;
}

// 人生报告第一页完整 ViewModel：全部由 lifeHistory 派生，不依赖 AI。
export interface LifeStatsViewModel {
  header: LifeStatsHeader;
  finalOutcomes: Array<{ key: OutcomeKey; label: string; value: number }>;
  categoryBalance: {
    items: LifeStatsCategoryBalanceItem[];
    // 模板洞察：出现占比远高于选择占比的类别（没有明显差距时为 null）。
    insight: string | null;
  };
  unchosen: {
    totalCount: number;
    byCategory: Array<{ key: 'achievement' | 'relationship' | 'self'; label: string; count: number }>;
    mostMissed: LifeStatsMissedEvent[];
    // 纯模板生成的数据描述，例如「培养兴趣」曾 4 次出现，你一次也没有选择它。
    missedSentence: string | null;
  };
  trajectory: {
    startAge: number;
    endAge: number;
    series: Array<{
      key: 'achievement' | 'relationship' | 'self';
      label: string;
      points: LifeStatsTrajectoryPoint[];
    }>;
  };
  abilities: {
    startAge: number;
    endAge: number;
    items: Array<{
      key: AbilityKey;
      label: string;
      startValue: number;
      endValue: number;
      delta: number;
    }>;
    timeline: {
      ageMarks: number[];
      rows: LifeStatsAbilityTimelineRow[];
    };
  };
  // 没有任何检定时为 null（例如所有事件都是直接生效）。
  dice: LifeStatsDice | null;
  resources: {
    startAge: number;
    endAge: number;
    money: LifeStatsResourceSeries;
    energy: LifeStatsResourceSeries;
  } | null;
  radar: {
    scaleMax: number;
    axes: Array<{ key: OutcomeKey; label: string; value: number }>;
  };
}

export interface Phase4UiState {
  phase: 'create-player' | 'turn-overview' | 'turn-resolution' | 'game-over' | 'life-report';
  pending: null | 'creating' | 'loading-turn' | 'rerolling' | 'resolving' | 'generating-report';
  resolutionStepIndex: number;
  draft: CreatePlayerInput;
  sessionId: string | null;
}

export interface CurrentSessionPointer {
  sessionId: string | null;
}

export interface Phase4MockScenarioMap {
  createPlayerValid: {
    draft: CreatePlayerInput;
  };
  createPlayerInvalid: {
    draft: CreatePlayerInput;
  };
  turnOverviewNormal: {
    snapshot: GameSessionSnapshot;
  };
  turnOverviewRerollUsed: {
    snapshot: GameSessionSnapshot;
  };
  turnOverviewRiskHint: {
    snapshot: GameSessionSnapshot;
  };
  resultOpportunityOnly: {
    summary: TurnResolutionSummary;
  };
  resultWithFateMitigation: {
    summary: TurnResolutionSummary;
  };
  resultWithStatusEnd: {
    summary: TurnResolutionSummary;
  };
  lifeReportFallback: {
    snapshot: GameSessionSnapshot;
  };
}

export interface Phase4StatusSummary {
  activeStatusIds: string[];
  latestStatuses: StatusResult[];
}
