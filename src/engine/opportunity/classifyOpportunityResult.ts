import type { OpportunityEventConfig, OpportunityResultGrade } from '../../shared/types/opportunity.ts';

// 根据总分判断这次事件属于哪个结果等级。
// 分档函数只做“总分 -> 结果等级”的映射，
// 不关心事件限制、效果组合或快照写回，从而保持职责单一。
export function classifyOpportunityResult(
  totalScore: number,
  scoreBands: OpportunityEventConfig['scoreBands']
): OpportunityResultGrade {
  if (totalScore <= scoreBands.failure.max) {
    return 'failure';
  }

  if (totalScore >= scoreBands.costlySuccess.min && totalScore <= scoreBands.costlySuccess.max) {
    return 'costlySuccess';
  }

  if (totalScore >= scoreBands.success.min && totalScore <= scoreBands.success.max) {
    return 'success';
  }

  return 'criticalSuccess';
}
