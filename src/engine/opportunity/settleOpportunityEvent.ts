import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type {
  CheckedOpportunityFormula,
  Dice2D6,
  OpportunityEventConfig,
  OpportunityEventDefinition,
  OpportunityResolutionSummary
} from '../../shared/types/opportunity.ts';
import { assertIntegerInRange, sumNumbers } from '../../shared/utils/validation.ts';
import { applyOpportunityResolution } from './applyOpportunityResolution.ts';
import { checkOpportunityAvailability } from './checkOpportunityAvailability.ts';
import { classifyOpportunityResult } from './classifyOpportunityResult.ts';

// 执行一次完整的单事件结算。
export function settleOpportunityEvent(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  input: {
    dice?: Dice2D6;
  },
  config: OpportunityEventConfig
): OpportunityResolutionSummary {
  checkOpportunityAvailability(snapshot, eventDefinition);

  if (eventDefinition.check.kind === 'none') {
    if (input.dice !== undefined) {
      throw new Error(`Event ${eventDefinition.id} does not accept dice input`);
    }

    return applyOpportunityResolution(
      snapshot,
      eventDefinition,
      {
        event: {
          id: eventDefinition.id,
          name: eventDefinition.name,
          category: eventDefinition.category
        },
        resolutionKind: 'direct',
        formula: null
      },
      null
    );
  }

  const formula = buildFormula(snapshot, eventDefinition, input.dice);
  const resultGrade = classifyOpportunityResult(formula.totalScore, config.scoreBands);

  return applyOpportunityResolution(
    snapshot,
    eventDefinition,
    {
      event: {
        id: eventDefinition.id,
        name: eventDefinition.name,
        category: eventDefinition.category
      },
      resolutionKind: 'checked',
      formula
    },
    resultGrade
  );
}

// 计算这次检定的公式明细和总分。
function buildFormula(
  snapshot: GameSessionSnapshot,
  eventDefinition: OpportunityEventDefinition,
  dice: Dice2D6 | undefined
): CheckedOpportunityFormula {
  if (!dice) {
    throw new Error(`Event ${eventDefinition.id} requires 2d6 dice input`);
  }

  assertIntegerInRange(dice.first, 1, 6, 'Dice first');
  assertIntegerInRange(dice.second, 1, 6, 'Dice second');

  const abilities = eventDefinition.check.abilityKeys.map((key) => ({
    key,
    value: snapshot.stats.abilities[key]
  }));

  return {
    dice,
    abilities,
    totalScore: dice.first + dice.second + sumNumbers(abilities.map((ability) => ability.value))
  };
}
