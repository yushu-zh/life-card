import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { TurnProgressionAfter, TurnStageRule, TurnSystemConfig } from '../../shared/types/turn.ts';

// 在一个完整回合结束后，推进到下一回合、下一周期或终局状态。
export function advanceTurnProgression(
  snapshot: GameSessionSnapshot,
  config: TurnSystemConfig
): {
  updatedSnapshot: GameSessionSnapshot;
  progressionAfter: TurnProgressionAfter;
} {
  const updatedSnapshot: GameSessionSnapshot = structuredClone(snapshot);

  if (updatedSnapshot.lifecycle.isEnded) {
    return {
      updatedSnapshot,
      progressionAfter: buildProgressionAfter(updatedSnapshot)
    };
  }

  const stageRule = findStageRuleForAge(updatedSnapshot.progression.age, config.stageRules);

  if (updatedSnapshot.progression.turn < stageRule.turnsPerCycle) {
    updatedSnapshot.progression.turn += 1;

    return {
      updatedSnapshot,
      progressionAfter: buildProgressionAfter(updatedSnapshot)
    };
  }

  const nextAge = updatedSnapshot.progression.age + 5;

  if (nextAge >= config.endAgeExclusive) {
    updatedSnapshot.progression.age = config.endAgeExclusive;
    updatedSnapshot.lifecycle.isEnded = true;
    updatedSnapshot.lifecycle.endReason = updatedSnapshot.lifecycle.endReason ?? 'age-limit';

    return {
      updatedSnapshot,
      progressionAfter: buildProgressionAfter(updatedSnapshot)
    };
  }

  updatedSnapshot.progression.age = nextAge;
  updatedSnapshot.progression.cycle += 1;
  updatedSnapshot.progression.turn = 1;

  return {
    updatedSnapshot,
    progressionAfter: buildProgressionAfter(updatedSnapshot)
  };
}

function findStageRuleForAge(age: number, stageRules: TurnStageRule[]): TurnStageRule {
  const matchedStageRule = stageRules.find((stageRule) => age >= stageRule.minAge && age < stageRule.maxExclusive);

  if (!matchedStageRule) {
    throw new Error(`No turn stage rule matches age ${age}`);
  }

  return matchedStageRule;
}

function buildProgressionAfter(snapshot: GameSessionSnapshot): TurnProgressionAfter {
  return {
    age: snapshot.progression.age,
    cycle: snapshot.progression.cycle,
    turn: snapshot.progression.turn,
    isEnded: snapshot.lifecycle.isEnded,
    endReason: snapshot.lifecycle.endReason
  };
}
