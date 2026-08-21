import type { GameSessionSnapshot } from './game-session.ts';
import type { FateConfig, FateResolutionSummary } from './fate.ts';
import type { OpportunityCategory, OpportunityResolutionSummary } from './opportunity.ts';
import type { StatusResult, StatusSystemConfig } from './status.ts';

export type TurnPatternKind = 'balanced' | 'weighted-by-pick-counts';
export type TurnRuleName = TurnPatternKind;
export type TurnOfferSlotIndex = 0 | 1 | 2;
export type TurnStatusResult = StatusResult;

export interface TurnOfferCard {
  slotIndex: TurnOfferSlotIndex;
  eventId: string;
  category: OpportunityCategory;
}

export interface ActiveTurnState {
  age: number;
  cycle: number;
  turn: number;
  patternKind: TurnPatternKind;
  slotCategories: OpportunityCategory[];
  initialOffer: TurnOfferCard[];
  rerolledOffer: TurnOfferCard[] | null;
  currentOffer: TurnOfferCard[];
  rerollCount: number;
}

export interface TurnStageRule {
  minAge: number;
  maxExclusive: number;
  turnsPerCycle: number;
  turnRules: TurnRuleName[];
}

export interface TurnSystemConfig {
  cycleStartAges: number[];
  endAgeExclusive: number;
  redrawLimitPerTurn: number;
  categoryTieBreakOrder: OpportunityCategory[];
  stageRules: TurnStageRule[];
  fate: FateConfig;
  statuses: StatusSystemConfig;
}

export interface TurnCategoryPlan {
  patternKind: TurnPatternKind;
  slotCategories: OpportunityCategory[];
}

export interface TurnProgressionAfter {
  age: number;
  cycle: number;
  turn: number;
  isEnded: boolean;
  endReason: string | null;
}

export interface ResolveTurnStatusesResult {
  updatedSnapshot: GameSessionSnapshot;
  results: TurnStatusResult[];
  ended: boolean;
  endReason: string | null;
}

export interface TurnHistoryEntry {
  type: 'turn-resolution';
  context: {
    age: number;
    cycle: number;
    turn: number;
  };
  offer: {
    initial: TurnOfferCard[];
    rerolled: TurnOfferCard[] | null;
    final: TurnOfferCard[];
    rerollUsed: boolean;
  };
  selectedCard: TurnOfferCard;
  discardedCards: TurnOfferCard[];
  opportunity: OpportunityResolutionSummary;
  fate: FateResolutionSummary | null;
  statuses: TurnStatusResult[];
  snapshotAfterTurn: {
    stats: GameSessionSnapshot['stats'];
    lifeNodes: GameSessionSnapshot['records']['lifeNodes'];
  };
  progressionAfterTurn: TurnProgressionAfter;
}

export interface TurnResolutionSummary {
  context: {
    age: number;
    cycle: number;
    turn: number;
  };
  offer: {
    initial: TurnOfferCard[];
    rerolled: TurnOfferCard[] | null;
    final: TurnOfferCard[];
    rerollUsed: boolean;
  };
  selectedCard: TurnOfferCard;
  discardedCards: TurnOfferCard[];
  opportunity: OpportunityResolutionSummary;
  fate: FateResolutionSummary | null;
  statuses: TurnStatusResult[];
  progressionAfterTurn: TurnProgressionAfter;
  updatedSnapshot: GameSessionSnapshot;
}
