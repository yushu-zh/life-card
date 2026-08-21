import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { LifeNodeRequirement, OpportunityEventDefinition } from '../../shared/types/opportunity.ts';
import { countOccurrences } from '../../shared/utils/validation.ts';

// 检查一个事件在当前快照下能不能结算。
export function checkOpportunityAvailability(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition
): void {
  validateAge(snapshot, eventDefinition);
  validateOccurrences(snapshot, eventDefinition);
  validateLifeNodeRequirements(snapshot, eventDefinition.availability.requiresLifeNodes ?? []);
}

// 检查当前年龄是否满足这个事件的年龄限制。
function validateAge(snapshot: GameSessionSnapshot, eventDefinition: OpportunityEventDefinition): void {
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

// 检查这个事件是不是已经达到次数上限。
function validateOccurrences(snapshot: GameSessionSnapshot, eventDefinition: OpportunityEventDefinition): void {
  const maxOccurrences = eventDefinition.availability.maxOccurrences;

  if (maxOccurrences === null || maxOccurrences === undefined) {
    return;
  }

  const currentCount = countOccurrences(snapshot.records.selectedEventIds, eventDefinition.id);

  if (currentCount >= maxOccurrences) {
    throw new Error(`Event ${eventDefinition.id} can only occur ${maxOccurrences} time(s) per session`);
  }
}

// 检查当前人生节点是否满足这个事件的前置条件。
function validateLifeNodeRequirements(snapshot: GameSessionSnapshot, requirements: LifeNodeRequirement[]): void {
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
