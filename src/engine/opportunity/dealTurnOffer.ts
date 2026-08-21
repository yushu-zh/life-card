import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityEventConfig, OpportunityEventDefinition } from '../../shared/types/opportunity.ts';
import type { TurnOfferCard, TurnOfferSlotIndex } from '../../shared/types/turn.ts';
import { assertOpportunityCanBeDealt } from './checkOpportunityAvailability.ts';

// 按照给定的类别结构，为当前回合真正发出三张机会牌。
export function dealTurnOffer(
  snapshot: GameSessionSnapshot,
  slotCategories: TurnOfferCard['category'][],
  config: OpportunityEventConfig,
  options?: {
    random?: () => number;
  }
): TurnOfferCard[] {
  const random = options?.random ?? Math.random;
  const reservedEventIds: string[] = [];

  return slotCategories.map((category, index) => {
    const legalEvents = config.events.filter((eventDefinition) => {
      if (eventDefinition.category !== category) {
        return false;
      }

      try {
        assertOpportunityCanBeDealt(snapshot, eventDefinition, reservedEventIds);
        return true;
      } catch {
        return false;
      }
    });

    if (legalEvents.length === 0) {
      throw new Error(`No legal opportunity event is available for category ${category}`);
    }

    const eventDefinition = pickEvent(legalEvents, random);

    reservedEventIds.push(eventDefinition.id);

    return {
      slotIndex: toSlotIndex(index),
      eventId: eventDefinition.id,
      category
    };
  });
}

function pickEvent(events: OpportunityEventDefinition[], random: () => number): OpportunityEventDefinition {
  const value = drawRandom(random);
  const index = Math.floor(value * events.length);

  return events[index];
}

function toSlotIndex(index: number): TurnOfferSlotIndex {
  if (index !== 0 && index !== 1 && index !== 2) {
    throw new Error(`Invalid turn offer slot index ${index}`);
  }

  return index;
}

function drawRandom(random: () => number): number {
  const value = random();

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a number between 0 and 1');
  }

  return value;
}
