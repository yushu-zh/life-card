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
}

export interface CreatePlayerFieldErrors {
  nickname?: string;
  appId?: string;
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

export interface Phase4UiState {
  phase: 'create-player' | 'turn-overview' | 'rolling' | 'turn-resolution' | 'game-over' | 'life-report';
  pending: null | 'creating' | 'loading-turn' | 'rerolling' | 'resolving';
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
