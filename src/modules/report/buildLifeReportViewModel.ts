import { buildLifeReportFacts } from '../../ai/buildNarrativeFacts.ts';
import { formatLifeReportFacts } from '../../ai/buildNarrativePrompts.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { OpportunityEventConfig } from '../../shared/types/opportunity.ts';
import type { LifeReportViewModel, Phase4PresentationConfig } from '../../shared/types/ui.ts';
import { buildFallbackLifeReportViewModel } from './buildFallbackLifeReportViewModel.ts';

// 生成人生报告 ViewModel：AI 报告正文命中时用它替换 fallback 章节，
// 否则原样回退到 fallback。标题、副标题与最终属性摘要两者共用（由结构化数据生成）。
export function buildLifeReportViewModel(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeReportViewModel {
  const fallback = buildFallbackLifeReportViewModel(snapshot, presentation);

  const paragraphs = readReportParagraphs(snapshot.lifecycle.finalReportText);
  if (paragraphs.length === 0) {
    return fallback;
  }

  return {
    ...fallback,
    sections: [
      {
        heading: presentation.reportFallback.sections.aiSectionHeading,
        paragraphs
      }
    ]
  };
}

// 把持久化的报告全文按空行拆回段落，过滤空白段；空文本返回空数组。
// 参数放宽为可空，兼容旧存档缺失该字段（undefined）的情况。
function readReportParagraphs(reportText: string | null | undefined): string[] {
  if (!reportText) {
    return [];
  }

  return reportText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

// 组装「导出人生记录」的纯文本：内容就是提供给 AI 的结构化事实，供玩家保存/分享。
// 这里只做数据组装，不碰浏览器 API；下载动作由 UI 层用 Blob 完成。
export function buildLifeReportExportText(
  snapshot: GameSessionSnapshot,
  opportunityConfig: OpportunityEventConfig,
  presentation: Phase4PresentationConfig
): string {
  const facts = buildLifeReportFacts(snapshot, opportunityConfig, presentation);
  return formatLifeReportFacts(facts);
}
