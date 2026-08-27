import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { StatKey } from '../../shared/types/opportunity.ts';
import type { TurnHistoryEntry } from '../../shared/types/turn.ts';
import type { LifeReportViewModel, Phase4PresentationConfig } from '../../shared/types/ui.ts';

// 能力、资源、结算键的统一顺序，用于报告最终属性摘要。
const STAT_ORDER: StatKey[] = [
  'cognition',
  'execution',
  'social',
  'creativity',
  'adaptability',
  'money',
  'energy',
  'happiness',
  'freedom',
  'health',
  'experience',
  'influence'
];

// 根据终局快照生成 fallback 人生报告 ViewModel。
// 报告内容由展示配置中的模板驱动，不需要 AI；后续接入 AI 时仍可复用同一结构替换 narrative 段落。
export function buildFallbackLifeReportViewModel(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeReportViewModel {
  const labels = presentation.labels.report;
  const reportFallback = presentation.reportFallback;
  const { player, progression, lifecycle, stats, records } = snapshot;

  const endReason = lifecycle.endReason ?? 'age-limit';
  const endReasonLabel = reportFallback.endReasonLabels[endReason] ?? '人生已结束';

  const sections = buildSections(snapshot, presentation);

  return {
    title: reportFallback.titleTemplate.replace('{nickname}', player.nickname || '匿名玩家'),
    subtitle: reportFallback.subtitleTemplate
      .replace('{age}', String(progression.age))
      .replace('{endReasonLabel}', endReasonLabel),
    sections,
    finalStatsHeading: labels.finalStatsHeading,
    finalStats: buildFinalStats(snapshot, presentation)
  };
}

// 构造报告的各个章节。
function buildSections(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeReportViewModel['sections'] {
  const sections: LifeReportViewModel['sections'] = [];
  const reportFallback = presentation.reportFallback;

  // 开局画像。
  sections.push({
    heading: reportFallback.sections.openingHeading,
    paragraphs: buildOpeningParagraphs(snapshot, presentation)
  });

  // 关键选择。
  const choices = extractKeyChoices(snapshot.records.lifeHistory);
  sections.push({
    heading: reportFallback.sections.choicesHeading,
    paragraphs:
      choices.length > 0
        ? choices
        : [reportFallback.sections.choicesEmptyText]
  });

  // 后续变故与代价。
  const fateParagraphs = extractFateParagraphs(snapshot.records.lifeHistory);
  sections.push({
    heading: reportFallback.sections.fateHeading,
    paragraphs:
      fateParagraphs.length > 0 ? fateParagraphs : [reportFallback.sections.fateEmptyText]
  });

  // 最终结局。
  sections.push({
    heading: reportFallback.sections.endingHeading,
    paragraphs: buildEndingParagraphs(snapshot, presentation)
  });

  return sections;
}

// 开局画像：用玩家输入和最终属性差异做简短描述。
function buildOpeningParagraphs(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): string[] {
  const { player, stats } = snapshot;
  const paragraphs: string[] = [];

  paragraphs.push(
    presentation.templates.reportOpening.replace('{nickname}', player.nickname || '匿名玩家')
  );

  const wishesText =
    player.wishes.length > 0 ? `怀揣${player.wishes.join('、')}等愿望，` : '';
  const tagsText =
    player.skillTags.length > 0 ? `擅长${player.skillTags.join('、')}，` : '';

  paragraphs.push(
    `${player.nickname || '这位玩家'}${wishesText}${tagsText}在 ${player.education || '未知学历'} 毕业后进入${player.industry || '未知行业'}，开始了这段人生旅程。`
  );

  return paragraphs;
}

// 从 lifeHistory 中提取关键选择。
function extractKeyChoices(lifeHistory: TurnHistoryEntry[]): string[] {
  const paragraphs: string[] = [];

  for (const entry of lifeHistory) {
    const eventName = entry.opportunity.event.name;
    const grade = entry.opportunity.resultGrade ?? 'direct';
    const gradeText = grade === 'direct' ? '直接生效' : formatGradeText(grade);

    paragraphs.push(
      `在 ${entry.context.age} 岁的第 ${entry.context.turn} 回合，你选择了「${eventName}」，结果${gradeText}。`
    );
  }

  return paragraphs;
}

// 从 lifeHistory 中提取命运事件相关段落。
function extractFateParagraphs(lifeHistory: TurnHistoryEntry[]): string[] {
  const paragraphs: string[] = [];

  for (const entry of lifeHistory) {
    if (entry.fate?.triggered && entry.fate.event) {
      paragraphs.push(
        `${entry.context.age} 岁时，局势发生变化：${entry.fate.event.name}，给你的生活带来了深远影响。`
      );
    }
  }

  return paragraphs;
}

// 最终结局段落。
function buildEndingParagraphs(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): string[] {
  const reportFallback = presentation.reportFallback;
  const endReason = snapshot.lifecycle.endReason ?? 'age-limit';
  const endReasonLabel = reportFallback.endReasonLabels[endReason] ?? '人生已结束';

  return [
    presentation.templates.reportEnding.replace('{age}', String(snapshot.progression.age)),
    endReasonLabel
  ];
}

// 构造最终属性摘要。
function buildFinalStats(
  snapshot: GameSessionSnapshot,
  presentation: Phase4PresentationConfig
): LifeReportViewModel['finalStats'] {
  const { abilities, resources, outcomes } = snapshot.stats;

  const allStats: Record<string, number> = {
    ...abilities,
    ...resources,
    ...outcomes
  };

  return STAT_ORDER.map((key) => ({
    key,
    label: presentation.statLabels[key],
    value: allStats[key] ?? 0,
    tone: 'normal'
  }));
}

// 把结果等级转成自然语言。
function formatGradeText(grade: string): string {
  switch (grade) {
    case 'failure':
      return '失败';
    case 'costlySuccess':
      return '代价成功';
    case 'success':
      return '成功';
    case 'criticalSuccess':
      return '大成功';
    default:
      return '生效';
  }
}
