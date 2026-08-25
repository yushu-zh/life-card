import configJson from '../rules/phase-4.presentation.json' with { type: 'json' };
import type { Phase4PresentationConfig } from '../../shared/types/ui.ts';
import { validatePhase4PresentationConfig } from '../validators/validatePhase4PresentationConfig.ts';

// 读取 Phase 4 的展示配置。
// 所有 UI 文案、字段顺序、风险提示和 fallback 模板都从这份配置获取。
// 这样可以让前端组件只负责渲染，不硬编码任何展示规则。
export function loadPhase4PresentationConfig(): Phase4PresentationConfig {
  return validatePhase4PresentationConfig(configJson);
}
