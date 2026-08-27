import configJson from '../rules/phase-6.ai.json' with { type: 'json' };
import type { AiConfig } from '../../shared/types/narrative.ts';
import { validateAiConfig } from '../validators/validateAiConfig.ts';

// 读取 Phase 6 的 AI 配置：prompt 模板、文本风格、模型与传输参数。
export function loadAiConfig(): AiConfig {
  return validateAiConfig(configJson);
}
