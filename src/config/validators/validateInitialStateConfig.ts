import type { InitialStateConfig } from '../../shared/types/bootstrap.ts';
import { isNonNegativeInteger } from "../../shared/utils/validation.ts";

// 这些字段是初始配置里一定要有的。
const REQUIRED_FIELDS = [
  'abilityPointTotal',
  'abilityMax',
  'initialResources',
  'skillTagLimit',
  'wishLimit'
] as const;

// 这些字段是初始资源和结算指标。
const RESOURCE_FIELDS = [
  'money',
  'energy',
  'happiness',
  'freedom',
  'health',
  'experience',
  'influence'
] as const;

// 检查 Phase 0 的初始配置是否合法，并整理成固定结构返回。
export function validateInitialStateConfig(value: unknown): InitialStateConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Initial state config must be an object');
  }

  const config = value as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in config)) {
      throw new Error(`Initial state config is missing required field: ${field}`);
    }
  }

  for (const field of ['abilityPointTotal', 'abilityMax', 'skillTagLimit', 'wishLimit'] as const) {
    if (!isNonNegativeInteger(config[field])) {
      throw new Error(`Initial state config field ${field} must be a non-negative integer`);
    }
  }

  const initialResources = config.initialResources;

  if (!initialResources || typeof initialResources !== 'object') {
    throw new Error('Initial state config field initialResources must be an object');
  }

  const resources = initialResources as Record<string, unknown>;

  for (const field of RESOURCE_FIELDS) {
    if (!isNonNegativeInteger(resources[field])) {
      throw new Error(`Initial state config field initialResources.${field} must be a non-negative integer`);
    }
  }

  return {
    abilityPointTotal: config.abilityPointTotal as number,
    abilityMax: config.abilityMax as number,
    initialResources: {
      money: resources.money as number,
      energy: resources.energy as number,
      happiness: resources.happiness as number,
      freedom: resources.freedom as number,
      health: resources.health as number,
      experience: resources.experience as number,
      influence: resources.influence as number
    },
    skillTagLimit: config.skillTagLimit as number,
    wishLimit: config.wishLimit as number
  };
}
