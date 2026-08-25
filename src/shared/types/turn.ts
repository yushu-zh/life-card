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
  energyRules: EnergyRulesConfig;
  moneyRules: MoneyRulesConfig;
  stageRules: TurnStageRule[];
  fate: FateConfig;
  statuses: StatusSystemConfig;
}

// 与精力相关的发牌/选择规则阈值。
export interface EnergyRulesConfig {
  // 精力 <= 该值时，强制刷出一张休养身心。
  restCardId: string;
  forceRestMaxEnergy: number;
  // 精力 < 该值时，禁止选择消耗精力的事件。
  blockSelectionBelowEnergy: number;
}

// 与金钱相关的发牌规则阈值。
export interface MoneyRulesConfig {
  // 金钱 <= 该值时，强制刷出一张能赚钱的兜底卡。
  forceIncomeMaxMoney: number;
  // 兜底赚钱卡的事件 id 池，随机刷出其中一张。
  incomeCardIds: string[];
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
  // 历史条目只保留结算摘要的浅层事实，剥离完整快照：
  // 否则每条历史会嵌套之前所有回合的快照，随回合数指数膨胀导致内存爆炸。
  opportunity: Omit<OpportunityResolutionSummary, 'updatedSnapshot'>;
  fate: Omit<FateResolutionSummary, 'updatedSnapshot'> | null;
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
