import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { LifeNodeRequirement, OpportunityEventDefinition } from '../../shared/types/opportunity.ts';
import { countOccurrences } from '../../shared/utils/validation.ts';

// 检查一个事件在当前快照下能不能结算。
export function checkOpportunityAvailability(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition
): void {
  validateOpportunityAge(snapshot, eventDefinition);
  validateSelectedOccurrences(snapshot, eventDefinition);
  validateOpportunityLifeNodeRequirements(snapshot, eventDefinition.availability.requiresLifeNodes ?? []);
}

// 检查当前年龄是否满足这个事件的年龄限制。
export function validateOpportunityAge(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition
): void {
  const ageRequirement = eventDefinition.availability.age;

  if (!ageRequirement) {
    return;
  }

  const age = snapshot.progression.age;

  if (ageRequirement.min !== undefined && age < ageRequirement.min) {
    throw new Error(`Event ${eventDefinition.id} requires age >= ${ageRequirement.min}`);
  }

  if (ageRequirement.maxExclusive !== undefined && age >= ageRequirement.maxExclusive) {
    throw new Error(`Event ${eventDefinition.id} requires age < ${ageRequirement.maxExclusive}`);
  }
}

// 检查这个事件是不是已经达到“已选择次数”的上限。
function validateSelectedOccurrences(snapshot: GameSessionSnapshot, eventDefinition: OpportunityEventDefinition): void {
  const maxOccurrences = eventDefinition.availability.maxOccurrences;

  if (maxOccurrences === null || maxOccurrences === undefined) {
    return;
  }

  const currentCount = countSelectedOpportunityOccurrences(snapshot, eventDefinition.id);

  if (currentCount >= maxOccurrences) {
    throw new Error(`Event ${eventDefinition.id} can only occur ${maxOccurrences} time(s) per session`);
  }
}

// 检查当前人生节点是否满足这个事件的前置条件。
export function validateOpportunityLifeNodeRequirements(
  snapshot: GameSessionSnapshot,
  requirements: LifeNodeRequirement[]
): void {
  for (const requirement of requirements) {
    if (requirement.key === 'romanceSuccessCount') {
      const currentValue = snapshot.records.lifeNodes.romanceSuccessCount;

      if (currentValue < requirement.min) {
        throw new Error(`Life node requirement ${requirement.key} requires at least ${requirement.min}`);
      }

      continue;
    }

    const currentValue = snapshot.records.lifeNodes[requirement.key];

    if (currentValue !== requirement.equals) {
      throw new Error(`Life node requirement ${requirement.key} must equal ${String(requirement.equals)}`);
    }
  }
}

// 统计一个事件当前已经被最终选中过多少次。
export function countSelectedOpportunityOccurrences(snapshot: GameSessionSnapshot, eventId: string): number {
  return countOccurrences(snapshot.records.selectedEventIds, eventId);
}

// 统计一个事件当前已经被“发出”过多少次。
// 这里既包含已选和已弃记录，也包含当前回合尚未落账的牌面。
export function countIssuedOpportunityOccurrences(snapshot: GameSessionSnapshot, eventId: string): number {
  let count = countOccurrences(snapshot.records.selectedEventIds, eventId);
  count += countOccurrences(snapshot.records.discardedEventIds, eventId);

  const activeTurn = snapshot.turnState.activeTurn;

  if (!activeTurn) {
    return count;
  }

  count += countCardOccurrences(activeTurn.initialOffer, eventId);

  if (activeTurn.rerolledOffer) {
    count += countCardOccurrences(activeTurn.rerolledOffer, eventId);
  }

  return count;
}

// 检查一个事件在发牌视角下是否仍然允许被发出。
export function assertOpportunityCanBeDealt(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  reservedEventIds: string[] = []
): void {
  validateOpportunityAge(snapshot, eventDefinition);
  validateDealOccurrences(snapshot, eventDefinition, reservedEventIds);
  validateOpportunityLifeNodeRequirements(snapshot, eventDefinition.availability.requiresLifeNodes ?? []);
}

function validateDealOccurrences(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  reservedEventIds: string[]
): void {
  const maxOccurrences = eventDefinition.availability.maxOccurrences;

  if (maxOccurrences === null || maxOccurrences === undefined) {
    return;
  }

  const issuedCount = countIssuedOpportunityOccurrences(snapshot, eventDefinition.id);
  const reservedCount = countOccurrences(reservedEventIds, eventDefinition.id);

  if (issuedCount + reservedCount >= maxOccurrences) {
    throw new Error(`Event ${eventDefinition.id} can only be dealt ${maxOccurrences} time(s) per session`);
  }
}

function countCardOccurrences(cards: Array<{ eventId: string }>, eventId: string): number {
  return cards.filter((card) => card.eventId === eventId).length;
}
