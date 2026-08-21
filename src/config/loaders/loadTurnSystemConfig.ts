import configJson from '../rules/phase-2.turn-system.json' with { type: 'json' };
import type { TurnSystemConfig } from '../../shared/types/turn.ts';
import { validateTurnSystemConfig } from '../validators/validateTurnSystemConfig.ts';

export function loadTurnSystemConfig(): TurnSystemConfig {
  return validateTurnSystemConfig(configJson);
}
