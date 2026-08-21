import type { GameSessionSnapshot } from './game-session.ts';
import type { StatDelta } from './opportunity.ts';

export interface FateEventDefinition {
  id: string;
  name: string;
  effects: StatDelta[];
}

export interface FateConfig {
  triggerProbability: number;
  adaptabilityMitigationPerPoint: number;
  events: FateEventDefinition[];
}

export interface FateResolutionSummary {
  triggered: boolean;
  event: {
    id: string;
    name: string;
  } | null;
  appliedDeltas: StatDelta[];
  mitigatedDelta: StatDelta | null;
  updatedSnapshot: GameSessionSnapshot;
}
