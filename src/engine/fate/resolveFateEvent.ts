import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { FateConfig, FateEventDefinition, FateResolutionSummary } from '../../shared/types/fate.ts';
import type { StatDelta } from '../../shared/types/opportunity.ts';

// 判定并结算本回合的命运事件。
export function resolveFateEvent(
  snapshot: GameSessionSnapshot,
  config: FateConfig,
  options?: {
    random?: () => number;
  }
): FateResolutionSummary {
  const random = options?.random ?? Math.random;
  const baseSnapshot: GameSessionSnapshot = structuredClone(snapshot);

  if (drawRandom(random) >= config.triggerProbability) {
    return {
      triggered: false,
      event: null,
      appliedDeltas: [],
      mitigatedDelta: null,
      updatedSnapshot: baseSnapshot
    };
  }

  const selectedEvent = pickFateEvent(config.events, random);
  const updatedSnapshot: GameSessionSnapshot = structuredClone(snapshot);
  const negativeEffects = selectedEvent.effects.filter((effect) => effect.amount < 0);
  const mitigationProbability = Math.min(
    1,
    updatedSnapshot.stats.abilities.adaptability * config.adaptabilityMitigationPerPoint
  );
  let mitigatedDelta: StatDelta | null = null;
  let appliedDeltas = selectedEvent.effects.map((effect) => ({ ...effect }));

  if (negativeEffects.length > 0 && drawRandom(random) < mitigationProbability) {
    mitigatedDelta = pickStatDelta(negativeEffects, random);
    let skipped = false;

    appliedDeltas = appliedDeltas.filter((delta) => {
      if (
        !skipped &&
        delta.key === mitigatedDelta?.key &&
        delta.amount === mitigatedDelta.amount
      ) {
        skipped = true;
        return false;
      }

      return true;
    });
  }

  for (const delta of appliedDeltas) {
    applyStatDelta(updatedSnapshot, delta);
  }

  return {
    triggered: true,
    event: {
      id: selectedEvent.id,
      name: selectedEvent.name
    },
    appliedDeltas,
    mitigatedDelta,
    updatedSnapshot
  };
}

function pickFateEvent(events: FateEventDefinition[], random: () => number): FateEventDefinition {
  return events[Math.floor(drawRandom(random) * events.length)];
}

function pickStatDelta(deltas: StatDelta[], random: () => number): StatDelta {
  return deltas[Math.floor(drawRandom(random) * deltas.length)];
}

function applyStatDelta(snapshot: GameSessionSnapshot, delta: StatDelta): void {
  switch (delta.key) {
    case 'cognition':
    case 'execution':
    case 'social':
    case 'creativity':
    case 'adaptability':
      snapshot.stats.abilities[delta.key] += delta.amount;
      return;
    case 'money':
    case 'energy':
      snapshot.stats.resources[delta.key] += delta.amount;
      return;
    case 'happiness':
    case 'freedom':
    case 'health':
    case 'experience':
    case 'influence':
      snapshot.stats.outcomes[delta.key] += delta.amount;
      return;
  }
}

function drawRandom(random: () => number): number {
  const value = random();

  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a number between 0 and 1');
  }

  return value;
}
