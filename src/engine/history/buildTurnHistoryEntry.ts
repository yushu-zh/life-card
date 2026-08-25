import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { FateResolutionSummary } from '../../shared/types/fate.ts';
import type { OpportunityResolutionSummary } from '../../shared/types/opportunity.ts';
import type { TurnHistoryEntry, TurnOfferCard, TurnProgressionAfter, TurnStatusResult } from '../../shared/types/turn.ts';

// 把一次完整回合的所有关键事实整理成一条正式历史记录。
export function buildTurnHistoryEntry(input: {
  activeTurn: {
    age: number;
    cycle: number;
    turn: number;
    initialOffer: TurnOfferCard[];
    rerolledOffer: TurnOfferCard[] | null;
    currentOffer: TurnOfferCard[];
    rerollCount: number;
  };
  selectedCard: TurnOfferCard;
  discardedCards: TurnOfferCard[];
  opportunity: OpportunityResolutionSummary;
  fate: FateResolutionSummary | null;
  statuses: TurnStatusResult[];
  updatedSnapshot: GameSessionSnapshot;
  progressionAfterTurn: TurnProgressionAfter;
}): TurnHistoryEntry {
  return {
    type: 'turn-resolution',
    context: {
      age: input.activeTurn.age,
      cycle: input.activeTurn.cycle,
      turn: input.activeTurn.turn
    },
    offer: {
      initial: structuredClone(input.activeTurn.initialOffer),
      rerolled: input.activeTurn.rerolledOffer ? structuredClone(input.activeTurn.rerolledOffer) : null,
      final: structuredClone(input.activeTurn.currentOffer),
      rerollUsed: input.activeTurn.rerollCount > 0
    },
    selectedCard: structuredClone(input.selectedCard),
    discardedCards: structuredClone(input.discardedCards),
    opportunity: stripUpdatedSnapshot(input.opportunity),
    fate: input.fate ? stripUpdatedSnapshot(input.fate) : null,
    statuses: structuredClone(input.statuses),
    snapshotAfterTurn: {
      stats: structuredClone(input.updatedSnapshot.stats),
      lifeNodes: structuredClone(input.updatedSnapshot.records.lifeNodes)
    },
    progressionAfterTurn: {
      ...input.progressionAfterTurn
    }
  };
}

// 从结算摘要里剥离完整快照，只保留浅层事实。
// 历史条目不需要快照本身（终局状态由 snapshotAfterTurn 承载），保留它会让每条历史嵌套之前所有快照。
function stripUpdatedSnapshot<T extends { updatedSnapshot: unknown }>(value: T): Omit<T, 'updatedSnapshot'> {
  const { updatedSnapshot: _snapshot, ...rest } = value;

  return rest;
}
