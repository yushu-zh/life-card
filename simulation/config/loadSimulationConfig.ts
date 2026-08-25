import configJson from './phase-5.simulation.json' with { type: 'json' };
import { loadInitialStateConfig } from '../../src/config/loaders/loadInitialStateConfig.ts';
import { validateCreatePlayerInput } from '../../src/engine/session/validateCreatePlayerInput.ts';
import type { CreatePlayerInput } from '../../src/shared/types/bootstrap.ts';
import type { OpportunityCategory } from '../../src/shared/types/opportunity.ts';
import {
  SIMULATION_STRATEGY_IDS,
  type SimulationConfig,
  type SimulationStrategyDefinition,
  type SimulationStrategyId
} from '../types.ts';

const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = ['achievement', 'relationship', 'self'];

// 读取并校验 Phase 5 的模拟专用配置。
export function loadSimulationConfig(): SimulationConfig {
  return validateSimulationConfig(configJson);
}

// 校验模拟配置的结构与取值，确保进入模拟运行器的配置自洽。
// 正式数值规则仍由 src/config/rules/*.json 单独加载，这里只校验模拟专属参数。
export function validateSimulationConfig(input: unknown): SimulationConfig {
  if (!isRecord(input)) {
    throw new Error('Simulation config must be an object');
  }

  const defaultRunCount = input.defaultRunCount;

  if (typeof defaultRunCount !== 'number' || !Number.isInteger(defaultRunCount) || defaultRunCount <= 0) {
    throw new Error('Simulation config defaultRunCount must be a positive integer');
  }

  const enabledStrategies = input.enabledStrategies;

  if (!Array.isArray(enabledStrategies) || enabledStrategies.length === 0) {
    throw new Error('Simulation config enabledStrategies must be a non-empty array');
  }

  if (new Set(enabledStrategies).size !== enabledStrategies.length) {
    throw new Error('Simulation config enabledStrategies must not contain duplicates');
  }

  const strategiesRaw = input.strategies;

  if (!isRecord(strategiesRaw)) {
    throw new Error('Simulation config strategies must be an object');
  }

  const strategies = {} as Record<SimulationStrategyId, SimulationStrategyDefinition>;

  for (const id of enabledStrategies) {
    if (!isStrategyId(id)) {
      throw new Error(`Simulation config strategy id ${String(id)} is not a known strategy`);
    }

    const definition = strategiesRaw[id];

    if (!isRecord(definition)) {
      throw new Error(`Simulation config strategies.${id} must be an object`);
    }

    strategies[id] = validateStrategyDefinition(id, definition);
  }

  const comparisonBaseline = input.comparisonBaseline;

  if (!isStrategyId(comparisonBaseline)) {
    throw new Error('Simulation config comparisonBaseline must be a known strategy id');
  }

  if (!enabledStrategies.includes(comparisonBaseline)) {
    throw new Error('Simulation config comparisonBaseline must be present in enabledStrategies');
  }

  const playerPreset = input.playerPreset;

  if (!isRecord(playerPreset)) {
    throw new Error('Simulation config playerPreset must be an object');
  }

  // 模拟角色模板必须能通过正式开局校验，否则无法创建一局人生。
  validateCreatePlayerInput(playerPreset as unknown as CreatePlayerInput, loadInitialStateConfig());

  const metrics = input.metrics;

  return {
    defaultRunCount,
    comparisonBaseline,
    enabledStrategies: enabledStrategies as SimulationStrategyId[],
    playerPreset: playerPreset as unknown as CreatePlayerInput,
    strategies,
    metrics: {
      includeInvalidGames: isRecord(metrics) && typeof metrics.includeInvalidGames === 'boolean'
        ? metrics.includeInvalidGames
        : true,
      includeStatusRates: isRecord(metrics) && typeof metrics.includeStatusRates === 'boolean'
        ? metrics.includeStatusRates
        : true
    }
  };
}

function validateStrategyDefinition(
  id: SimulationStrategyId,
  definition: Record<string, unknown>
): SimulationStrategyDefinition {
  if (typeof definition.allowReroll !== 'boolean') {
    throw new Error(`Simulation config strategies.${id}.allowReroll must be a boolean`);
  }

  const tieBreak = definition.tieBreak;

  if (tieBreak !== 'random' && tieBreak !== 'success-positive-total' && tieBreak !== 'failure-negative-total') {
    throw new Error(`Simulation config strategies.${id}.tieBreak is invalid`);
  }

  if (definition.finalTieBreak !== 'slot-order') {
    throw new Error(`Simulation config strategies.${id}.finalTieBreak must be "slot-order"`);
  }

  return {
    allowReroll: definition.allowReroll,
    preferredCategories: readCategoryList(id, definition.preferredCategories, 'preferredCategories'),
    tieBreak,
    categoryTieBreakOrder: readCategoryList(id, definition.categoryTieBreakOrder, 'categoryTieBreakOrder'),
    finalTieBreak: 'slot-order'
  };
}

function readCategoryList(
  id: SimulationStrategyId,
  value: unknown,
  field: 'preferredCategories' | 'categoryTieBreakOrder'
): OpportunityCategory[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Simulation config strategies.${id}.${field} must be a non-empty array`);
  }

  for (const category of value) {
    if (!OPPORTUNITY_CATEGORIES.includes(category as OpportunityCategory)) {
      throw new Error(`Simulation config strategies.${id}.${field} contains invalid category ${String(category)}`);
    }
  }

  return value as OpportunityCategory[];
}

function isStrategyId(value: unknown): value is SimulationStrategyId {
  return typeof value === 'string' && (SIMULATION_STRATEGY_IDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
