import { GAME_SESSION_SCHEMA_VERSION, INITIAL_AGE, INITIAL_CYCLE, INITIAL_TURN } from '../../shared/constants/schema.ts';
import type { CreatePlayerInput, InitialStateConfig } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import { validateCreatePlayerInput } from './validateCreatePlayerInput.ts';

export function createInitialSnapshot(
  input: CreatePlayerInput,
  config: InitialStateConfig,
  sessionId: string
): GameSessionSnapshot {
  validateCreatePlayerInput(input, config);

  return {
    meta: {
      sessionId,
      schemaVersion: GAME_SESSION_SCHEMA_VERSION
    },
    player: {
      nickname: input.profile.nickname,
      skillTags: [...input.profile.skillTags],
      education: input.profile.education,
      industry: input.profile.industry,
      wishes: [...input.profile.wishes]
    },
    stats: {
      abilities: { ...input.abilities },
      resources: {
        money: config.initialResources.money,
        energy: config.initialResources.energy
      },
      outcomes: {
        happiness: config.initialResources.happiness,
        freedom: config.initialResources.freedom,
        health: config.initialResources.health,
        experience: config.initialResources.experience,
        influence: config.initialResources.influence
      }
    },
    progression: {
      age: INITIAL_AGE,
      cycle: INITIAL_CYCLE,
      turn: INITIAL_TURN
    },
    records: {
      selectedEventIds: [],
      discardedEventIds: [],
      triggeredStateIds: [],
      lifeHistory: [],
      categoryPickCounts: {
        achievement: 0,
        relationship: 0,
        self: 0
      },
      lifeNodes: {
        romanceSuccessCount: 0,
        marriageEstablished: false,
        familyEstablished: false
      }
    },
    lifecycle: {
      isEnded: false,
      endReason: null,
      finalReportId: null
    }
  };
}
