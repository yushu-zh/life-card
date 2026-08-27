import type { CreatePlayerInput } from '../shared/types/bootstrap.ts';
import type { OpportunityCategory, OpportunityResultGrade, StatDelta } from '../shared/types/opportunity.ts';
import type { AiConfig, CardNarrativeFacts, NarrativeStyle, ResultNarrativeFacts } from '../shared/types/narrative.ts';

// 组装事件牌文案的 prompt。
export function buildCardNarrativePrompt(
  facts: CardNarrativeFacts,
  config: AiConfig
): { system: string; user: string } {
  const hint = config.eventHints[facts.eventSkeleton.id] ?? '';

  return {
    system: withStyle(config.cardPrompt.system, config.style),
    user: renderTemplate(config.cardPrompt.userTemplate, {
      playerProfile: formatPlayerProfile(facts.player),
      age: String(facts.age),
      cycle: String(facts.cycle),
      turn: String(facts.turn),
      stageLabel: facts.stageLabel,
      category: formatCategory(facts.category),
      eventSkeleton: JSON.stringify(facts.eventSkeleton),
      // 有范围提示时追加一行；无则留空，不占位。
      eventHint: hint ? `事件范围提示：${hint}\n` : ''
    })
  };
}

// 组装结果文案的 prompt。
export function buildResultNarrativePrompt(
  facts: ResultNarrativeFacts,
  config: AiConfig
): { system: string; user: string } {
  return {
    system: withStyle(config.resultPrompt.system, config.style),
    user: renderTemplate(config.resultPrompt.userTemplate, {
      playerProfile: formatPlayerProfile(facts.player),
      age: String(facts.age),
      eventName: facts.event.name,
      cardDescription: facts.cardDescription,
      gradeLabel: formatGrade(facts.resultGrade),
      appliedDeltas: JSON.stringify(facts.appliedDeltas),
      historySummary: facts.historySummary
    })
  };
}

// 把结果等级转成中文。等级文案是 PRD 固定值，且现有 mapper 已用代码常量表达，这里保持一致。
export function formatGrade(grade: OpportunityResultGrade | 'direct' | null): string {
  switch (grade) {
    case 'failure':
      return '失败';
    case 'costlySuccess':
      return '代价成功';
    case 'success':
      return '成功';
    case 'criticalSuccess':
      return '大成功';
    case 'direct':
    case null:
      return '直接生效';
    default:
      return '未知';
  }
}

// 把事件类别转成中文。类别是 PRD 固定的三类，不在可调配置里。
function formatCategory(category: OpportunityCategory): string {
  switch (category) {
    case 'achievement':
      return '成就机会';
    case 'relationship':
      return '关系机会';
    case 'self':
      return '自我机会';
    default:
      return category;
  }
}

// 把玩家背景压成一行可读文本，空字段用「未填写」占位。
function formatPlayerProfile(profile: CreatePlayerInput['profile']): string {
  const parts = [
    `昵称：${profile.nickname || '未填写'}`,
    `学历：${profile.education || '未填写'}`,
    `行业：${profile.industry || '未填写'}`
  ];

  if (profile.skillTags.length > 0) {
    parts.push(`技能：${profile.skillTags.join('、')}`);
  }
  if (profile.wishes.length > 0) {
    parts.push(`愿望：${profile.wishes.join('、')}`);
  }

  return parts.join('；');
}

// 根据文本风格开关追加一句风格约束。
function withStyle(system: string, style: NarrativeStyle): string {
  const instruction =
    style === 'vivid'
      ? '请用有画面感的语言营造故事感和情境感，但保持克制，细节要服务于事件本身。'
      : '请用简洁克制的语言，避免冗长修饰。';

  return `${system}\n${instruction}`;
}

// 用一组键值替换模板里的 {key} 占位符。
function renderTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}
