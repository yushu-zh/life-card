import configJson from '../rules/phase-0.initial-state.json' with { type: 'json' };
import type { InitialStateConfig } from '../../shared/types/bootstrap.ts';
import { validateInitialStateConfig } from '../validators/validateInitialStateConfig.ts';

// 读取 Phase 0 的初始配置。
// 这些数值后面会用来创建玩家的初始快照。
// Phase 0 的初始化数值全部来自 JSON 配置，避免把可调规则散落到 engine 或 module 层。
export function loadInitialStateConfig(): InitialStateConfig {
  return validateInitialStateConfig(configJson);
}
