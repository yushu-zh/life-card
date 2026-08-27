import type { CreatePlayerInput } from '../shared/types/bootstrap.ts';
import type { OpportunityCategory, OpportunityResultGrade, StatDelta } from '../shared/types/opportunity.ts';
import type { AiConfig, CardNarrativeFacts, FateNarrativeFacts, LifeReportFacts, NarrativeStyle, ResultNarrativeFacts, StatusNarrativeFacts } from '../shared/types/narrative.ts';

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

// 组装命运事件文案的 prompt。
export function buildFateNarrativePrompt(
  facts: FateNarrativeFacts,
  config: AiConfig
): { system: string; user: string } {
  return {
    system: withStyle(config.fatePrompt.system, config.style),
    user: renderTemplate(config.fatePrompt.userTemplate, {
      playerProfile: formatPlayerProfile(facts.player),
      age: String(facts.age),
      eventName: facts.eventName,
      appliedDeltas: stringifyOrNone(facts.appliedDeltas),
      mitigatedDelta: stringifyOrNone(facts.mitigatedDelta)
    })
  };
}

// 组装状态触发文案的 prompt。
export function buildStatusNarrativePrompt(
  facts: StatusNarrativeFacts,
  config: AiConfig
): { system: string; user: string } {
  return {
    system: withStyle(config.statusPrompt.system, config.style),
    user: renderTemplate(config.statusPrompt.userTemplate, {
      playerProfile: formatPlayerProfile(facts.player),
      age: String(facts.age),
      statusName: facts.statusName,
      statusKind: formatStatusKind(facts.kind),
      conditions: stringifyOrNone(facts.conditions),
      appliedDeltas: stringifyOrNone(facts.appliedDeltas),
      statusOutcome: formatStatusOutcome(facts.kind, facts.died)
    })
  };
}

// 把状态类型转成中文，供 prompt 里给 AI 交代状态的性质。
function formatStatusKind(kind: StatusNarrativeFacts['kind']): string {
  switch (kind) {
    case 'one-time-effect':
      return '一次性影响';
    case 'death-risk':
      return '死亡风险';
    case 'per-cycle-effect':
      return '持续影响';
  }
}

// 把状态的最终结果转成一句中文结论，尤其区分死亡风险是否成真。
function formatStatusOutcome(kind: StatusNarrativeFacts['kind'], died: boolean): string {
  if (kind === 'death-risk') {
    return died ? '本次未能挺过，导致离世' : '仍有风险，但本次未离世';
  }

  return '本次状态影响已生效';
}

// 把数组/可空值转成 JSON 字符串；空数组或 null 统一落成「无」，避免喂给 AI 裸的 null/[]。
function stringifyOrNone(value: unknown): string {
  if (value === null || value === undefined) {
    return '无';
  }
  if (Array.isArray(value) && value.length === 0) {
    return '无';
  }

  return JSON.stringify(value);
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
export function formatCategory(category: OpportunityCategory): string {
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

// 组装人生报告的 prompt。facts 里已渲染好可读文本，这里只做占位符替换。
export function buildLifeReportPrompt(
  facts: LifeReportFacts,
  config: AiConfig
): { system: string; user: string } {
  return {
    system: withStyle(config.reportPrompt.system, config.style),
    user: renderTemplate(config.reportPrompt.userTemplate, {
      playerProfile: formatPlayerProfile(facts.player),
      finalAge: String(facts.finalAge),
      endReasonLabel: facts.endReasonLabel,
      choices: formatChoices(facts.choices),
      discardedEvents: formatEventLines(facts.discardedEvents),
      fateEvents: formatFateEvents(facts.fateEvents),
      statusEvents: formatStatusEvents(facts.statusEvents),
      finalStats: facts.finalStats.map((stat) => `${stat.label}：${stat.value}`).join('\n'),
      lifeNodes: facts.lifeNodes,
      categoryPickCounts: facts.categoryPickCounts
    })
  };
}

// 把已选择事件压成多行，每行含年龄、事件名、事件描述与结果描述，形成完整的故事素材。
// 每个选择用「当时/结果」分行，避免拼接标点产生歧义；叙事文案缺失时退化到只有事件名和等级。
function formatChoices(choices: LifeReportFacts['choices']): string {
  if (choices.length === 0) {
    return '（无）';
  }

  return choices.map((choice) => {
    const lines = [`- ${choice.age}岁·${choice.eventName}（${choice.categoryLabel}）`];
    if (choice.cardDescription) {
      lines.push(`  当时：${choice.cardDescription}`);
    }
    const resultLine = `  结果（${choice.gradeLabel}）`;
    lines.push(choice.resultDescription ? `${resultLine}：${choice.resultDescription}` : resultLine);
    return lines.join('\n');
  }).join('\n');
}

// 把「年龄 + 事件名」这类简单事件列表压成多行。
function formatEventLines(events: Array<{ age: number; eventName: string }>): string {
  if (events.length === 0) {
    return '（无）';
  }

  return events.map((event) => `- ${event.age}岁·${event.eventName}`).join('\n');
}

// 把命运变故压成多行，带 AI 描述时补充一句具体叙述。
function formatFateEvents(events: LifeReportFacts['fateEvents']): string {
  if (events.length === 0) {
    return '（无）';
  }

  return events
    .map((event) => {
      const line = `- ${event.age}岁·${event.eventName}`;
      return event.description ? `${line}：${event.description}` : line;
    })
    .join('\n');
}

// 把关键状态事件压成多行，死亡类状态补一句「导致离世」，带 AI 描述时补充具体叙述。
function formatStatusEvents(events: LifeReportFacts['statusEvents']): string {
  if (events.length === 0) {
    return '（无）';
  }

  return events
    .map((event) => {
      const suffix = event.died ? '（导致离世）' : '';
      const line = `- ${event.age}岁·${event.statusName}${suffix}`;
      return event.description ? `${line}：${event.description}` : line;
    })
    .join('\n');
}

// 把报告事实集渲染成一份可读的纯文本，供「导出人生记录」使用。
// 与 prompt 的事实部分共用同一套格式化函数，保证导出内容就是喂给 AI 的事实信息。
export function formatLifeReportFacts(facts: LifeReportFacts): string {
  return [
    '人生记录',
    '',
    `玩家背景：${formatPlayerProfile(facts.player)}`,
    `最终年龄：${facts.finalAge}岁`,
    `结局：${facts.endReasonLabel}`,
    '',
    '一生的选择：',
    formatChoices(facts.choices),
    '',
    '被放弃的选择：',
    formatEventLines(facts.discardedEvents),
    '',
    '命运中的变故：',
    formatFateEvents(facts.fateEvents),
    '',
    '关键境遇：',
    formatStatusEvents(facts.statusEvents),
    '',
    `人生节点：${facts.lifeNodes}`,
    `长期选择倾向：${facts.categoryPickCounts}`,
    '',
    '最终状态：',
    facts.finalStats.map((stat) => `${stat.label}：${stat.value}`).join('\n')
  ].join('\n');
}
