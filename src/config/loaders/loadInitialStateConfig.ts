import configJson from '../rules/phase-0.initial-state.json' with { type: 'json' };
import type { InitialStateConfig } from '../../shared/types/bootstrap.ts';
import { validateInitialStateConfig } from '../validators/validateInitialStateConfig.ts';

export function loadInitialStateConfig(): InitialStateConfig {
  return validateInitialStateConfig(configJson);
}
