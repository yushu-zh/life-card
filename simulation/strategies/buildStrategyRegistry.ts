import type { SimulationConfig, SimulationStrategyDefinition, SimulationStrategyId } from '../types.ts';

// 从模拟配置里构建策略注册表，把策略 id 映射到它的静态定义。
// runner 通过注册表查询当前策略的定义，再交给 selectTurnCard 统一决策。
export function buildStrategyRegistry(
  config: SimulationConfig
): Map<SimulationStrategyId, SimulationStrategyDefinition> {
  const registry = new Map<SimulationStrategyId, SimulationStrategyDefinition>();

  for (const id of config.enabledStrategies) {
    const definition = config.strategies[id];

    if (!definition) {
      // 配置校验已兜底过一次，这里再做一次防御，避免启用的策略缺少定义时静默跑偏。
      throw new Error(`Simulation config is missing a definition for strategy ${id}`);
    }

    registry.set(id, definition);
  }

  return registry;
}
