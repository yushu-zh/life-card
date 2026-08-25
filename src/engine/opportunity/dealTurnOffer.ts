import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityCategory, OpportunityEventConfig, OpportunityEventDefinition } from '../../shared/types/opportunity.ts';
import type { TurnOfferCard, TurnOfferSlotIndex } from '../../shared/types/turn.ts';
import { assertOpportunityCanBeDealt } from './checkOpportunityAvailability.ts';

// 按照给定的类别结构，为当前回合真正发出三张机会牌。
export function dealTurnOffer(
  snapshot: GameSessionSnapshot,
  slotCategories: TurnOfferCard['category'][],
  config: OpportunityEventConfig,
  options?: {
    random?: () => number;
    // 换牌前已出现的牌（规则2）：换牌后不再重复发出。
    excludedEventIds?: string[];
    // 资源不足时强制刷出的牌（规则6 休养身心 / 金钱兜底卡）：豁免不重复规则。
    // 每个类别最多强制一张，避免同类别多个槽位重复刷出同一张牌。
    forcedEventIds?: string[];
  }
): TurnOfferCard[] {
  const random = options?.random ?? Math.random;
  const reservedEventIds: string[] = [...(options?.excludedEventIds ?? [])];
  const forcedByCategory = buildForcedByCategory(config, options?.forcedEventIds ?? []);

  return slotCategories.map((category, index) => {
    const forced = forcedByCategory.get(category);

    if (forced) {
      forcedByCategory.delete(category);
      reservedEventIds.push(forced.id);

      return {
        slotIndex: toSlotIndex(index),
        eventId: forced.id,
        category
      };
    }

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

// 把强制事件 id 列表解析成「类别 -> 事件」映射；每个类别只保留第一个。
function buildForcedByCategory(
  config: OpportunityEventConfig,
  forcedEventIds: string[]
): Map<OpportunityCategory, OpportunityEventDefinition> {
  const forcedByCategory = new Map<OpportunityCategory, OpportunityEventDefinition>();

  for (const eventId of forcedEventIds) {
    const event = config.events.find((definition) => definition.id === eventId);

    if (event && !forcedByCategory.has(event.category)) {
      forcedByCategory.set(event.category, event);
    }
  }

  return forcedByCategory;
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
