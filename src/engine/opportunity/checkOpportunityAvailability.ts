import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { LifeNodeRequirement, OpportunityEventDefinition, StatDelta } from '../../shared/types/opportunity.ts';
import type { EnergyRulesConfig } from '../../shared/types/turn.ts';
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
  // 规则1/2：同回合三张事件卡不重复，且换牌后的牌不与换牌前重复。
  if (reservedEventIds.includes(eventDefinition.id)) {
    throw new Error(`Event ${eventDefinition.id} already appears in the current turn offer`);
  }

  validateOpportunityAge(snapshot, eventDefinition);
  validateDealOccurrences(snapshot, eventDefinition, reservedEventIds);
  validateOpportunityLifeNodeRequirements(snapshot, eventDefinition.availability.requiresLifeNodes ?? []);
}

// 判断一个机会事件在当前快照下是否允许被玩家选择。
// 与发牌合法性（年龄/次数/人生节点）无关，只看当前资源是否足够负担这次选择。
export function isOpportunitySelectable(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  energyRules: EnergyRulesConfig
): boolean {
  // 规则3：固定代价里的金钱扣减不得超过现有金钱。
  const moneyCost = sumNegativeAmounts(eventDefinition.effects.fixedCost, 'money');

  if (moneyCost < 0 && snapshot.stats.resources.money < -moneyCost) {
    return false;
  }

  // 规则8：精力过低时，禁止选择消耗精力（固定代价含精力扣减）的事件。
  if (
    snapshot.stats.resources.energy < energyRules.blockSelectionBelowEnergy &&
    hasNegativeAmount(eventDefinition.effects.fixedCost, 'energy')
  ) {
    return false;
  }

  return true;
}

// 求和一组数值变化中指定 key 的所有负向变化量（结果 <= 0）。
function sumNegativeAmounts(deltas: StatDelta[], key: StatDelta['key']): number {
  return deltas.reduce(
    (total, delta) => (delta.key === key && delta.amount < 0 ? total + delta.amount : total),
    0
  );
}

// 判断一组数值变化里是否存在指定 key 的负向变化。
function hasNegativeAmount(deltas: StatDelta[], key: StatDelta['key']): boolean {
  return deltas.some((delta) => delta.key === key && delta.amount < 0);
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
