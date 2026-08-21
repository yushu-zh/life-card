import configJson from '../rules/phase-1.opportunity-events.json' with { type: 'json' };
import type { OpportunityEventConfig } from '../../shared/types/opportunity.ts';
import { validateOpportunityEventConfig } from '../validators/validateOpportunityEventConfig.ts';

// 读取 Phase 1 的事件配置。
// 这里会把分档区间和事件表一起加载出来，供后面的结算逻辑直接使用。
// Phase 1 的事件表和分档区间都统一从配置域进入运行时，后续发牌、模拟和 AI 包装都应复用这份事实源。
export function loadOpportunityEventConfig(): OpportunityEventConfig {
  return validateOpportunityEventConfig(configJson);
}
