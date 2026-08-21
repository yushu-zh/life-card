import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { resolveFateEvent } from '../../engine/fate/resolveFateEvent.ts';
import { buildTurnHistoryEntry } from '../../engine/history/buildTurnHistoryEntry.ts';
import { settleOpportunityEvent } from '../../engine/opportunity/settleOpportunityEvent.ts';
import { advanceTurnProgression } from '../../engine/progression/advanceTurnProgression.ts';
import { resolveTurnStatuses } from '../../engine/status/resolveTurnStatuses.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { Dice2D6 } from '../../shared/types/opportunity.ts';
import type { StatusSystemConfig } from '../../shared/types/status.ts';
import type { ResolveTurnStatusesResult, TurnOfferCard, TurnResolutionSummary } from '../../shared/types/turn.ts';

// 选择当前牌组中的一张牌，并把整回合结算到最终可持久化状态。
export async function resolveCurrentTurnSelection(
  input: {
    sessionId: string;
    slotIndex: 0 | 1 | 2;
  },
  options?: {
    store?: ReturnType<typeof createGameSessionStore>;
    random?: () => number;
    rollDice?: () => Dice2D6;
    resolveStatuses?: (
      snapshot: GameSessionSnapshot,
      config: StatusSystemConfig,
      options?: { random?: () => number }
    ) => ResolveTurnStatusesResult;
  }
): Promise<TurnResolutionSummary> {
  const turnSystemConfig = loadTurnSystemConfig();
  const opportunityConfig = loadOpportunityEventConfig();
  const store = options?.store ?? createGameSessionStore();
  const persistedSession = await store.getGameSession(input.sessionId);

  if (!persistedSession) {
    throw new Error(`Game session ${input.sessionId} was not found`);
  }

  assertTurnReadySnapshot(persistedSession.snapshot);

  if (persistedSession.snapshot.lifecycle.isEnded) {
    throw new Error(`Game session ${input.sessionId} has already ended`);
  }

  const activeTurn = persistedSession.snapshot.turnState.activeTurn;

  if (!activeTurn) {
    throw new Error(`Game session ${input.sessionId} does not have an active turn offer`);
  }

  const selectedCard = activeTurn.currentOffer.find((card) => card.slotIndex === input.slotIndex);

  if (!selectedCard) {
    throw new Error(`Turn offer slot ${input.slotIndex} was not found in the current offer`);
  }

  const eventDefinition = opportunityConfig.events.find((event) => event.id === selectedCard.eventId);

  if (!eventDefinition) {
    throw new Error(`Opportunity event ${selectedCard.eventId} was not found`);
  }

  const dice = eventDefinition.check.kind === 'sum' ? (options?.rollDice ?? createRollDice(options?.random))() : undefined;
  const opportunitySummary = settleOpportunityEvent(
    persistedSession.snapshot,
    eventDefinition,
    { dice },
    opportunityConfig
  );
  const fateSummary = resolveFateEvent(opportunitySummary.updatedSnapshot, turnSystemConfig.fate, {
    random: options?.random
  });
  const statusResult = (options?.resolveStatuses ?? defaultResolveStatuses)(
    fateSummary.updatedSnapshot,
    turnSystemConfig.statuses,
    {
      random: options?.random
    }
  );
  const discardedCards = buildDiscardedCards(activeTurn, selectedCard);
  const updatedSnapshot = structuredClone(statusResult.updatedSnapshot);

  updatedSnapshot.records.discardedEventIds.push(...discardedCards.map((card) => card.eventId));
  updatedSnapshot.turnState.activeTurn = null;

  if (statusResult.ended) {
    updatedSnapshot.lifecycle.isEnded = true;
    updatedSnapshot.lifecycle.endReason = statusResult.endReason ?? updatedSnapshot.lifecycle.endReason;
  }

  const progressionResult = updatedSnapshot.lifecycle.isEnded
    ? {
        updatedSnapshot,
        progressionAfter: {
          age: updatedSnapshot.progression.age,
          cycle: updatedSnapshot.progression.cycle,
          turn: updatedSnapshot.progression.turn,
          isEnded: updatedSnapshot.lifecycle.isEnded,
          endReason: updatedSnapshot.lifecycle.endReason
        }
      }
    : advanceTurnProgression(updatedSnapshot, turnSystemConfig);
  const historyEntry = buildTurnHistoryEntry({
    activeTurn,
    selectedCard,
    discardedCards,
    opportunity: opportunitySummary,
    fate: fateSummary.triggered ? fateSummary : null,
    statuses: statusResult.results,
    updatedSnapshot: progressionResult.updatedSnapshot,
    progressionAfterTurn: progressionResult.progressionAfter
  });

  progressionResult.updatedSnapshot.records.lifeHistory.push(historyEntry);

  await store.saveGameSession(progressionResult.updatedSnapshot);

  return {
    context: {
      age: activeTurn.age,
      cycle: activeTurn.cycle,
      turn: activeTurn.turn
    },
    offer: {
      initial: structuredClone(activeTurn.initialOffer),
      rerolled: activeTurn.rerolledOffer ? structuredClone(activeTurn.rerolledOffer) : null,
      final: structuredClone(activeTurn.currentOffer),
      rerollUsed: activeTurn.rerollCount > 0
    },
    selectedCard: structuredClone(selectedCard),
    discardedCards: structuredClone(discardedCards),
    opportunity: opportunitySummary,
    fate: fateSummary.triggered ? fateSummary : null,
    statuses: structuredClone(statusResult.results),
    progressionAfterTurn: progressionResult.progressionAfter,
    updatedSnapshot: progressionResult.updatedSnapshot
  };
}

function buildDiscardedCards(activeTurn: GameSessionSnapshot['turnState']['activeTurn'], selectedCard: TurnOfferCard): TurnOfferCard[] {
  if (!activeTurn) {
    return [];
  }

  const rerolledAwayCards = activeTurn.rerolledOffer ? activeTurn.initialOffer : [];
  const unselectedCurrentCards = activeTurn.currentOffer.filter((card) => card.slotIndex !== selectedCard.slotIndex);

  return [...rerolledAwayCards.map((card) => ({ ...card })), ...unselectedCurrentCards.map((card) => ({ ...card }))];
}

function defaultResolveStatuses(
  snapshot: GameSessionSnapshot,
  config: StatusSystemConfig,
  options?: {
    random?: () => number;
  }
): ResolveTurnStatusesResult {
  return resolveTurnStatuses(snapshot, config, options);
}

function createRollDice(random?: () => number): () => Dice2D6 {
  const randomSource = random ?? Math.random;

  return () => ({
    first: drawDie(randomSource),
    second: drawDie(randomSource)
  });
}

function drawDie(random: () => number): number {
  const value = random();

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a number between 0 and 1');
  }

  return Math.floor(value * 6) + 1;
}

function assertTurnReadySnapshot(snapshot: GameSessionSnapshot): void {
  if (!snapshot.turnState || !('activeTurn' in snapshot.turnState)) {
    throw new Error('Game session snapshot is incompatible with the Phase 2 turn system');
  }
}
