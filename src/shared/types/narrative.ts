import type { AbilityKey, CreatePlayerInput } from './bootstrap.ts';
import type { OpportunityCategory, OpportunityResultGrade, StatDelta } from './opportunity.ts';
import type { StatusConditionSnapshot } from './status.ts';

// 事件牌文案：AI 只输出一段事件描述（背景 + 你选择怎么做），其余字段一律白名单剥离。
export interface EventCardNarrative {
  description: string;
}

// 机会事件结果文案：AI 只输出一段结果描述，与所选事件描述呼应。
export interface OpportunityResultNarrative {
  description: string;
}

// 命运事件文案：AI 只输出一段变故描述。
export interface FateEventNarrative {
  description: string;
}

// 状态触发事件文案：AI 只输出一段状态描述（触发原因 + 本次结果）。
export interface StatusEventNarrative {
  description: string;
}

// 一回合采纳的叙事：四个槽位都可为空，任一为空表示该位置走既有 fallback。
export interface TurnNarrativeRecord {
  card: EventCardNarrative | null;
  result: OpportunityResultNarrative | null;
  fate: FateEventNarrative | null;
  // 按状态 id 索引；一个回合可能同时触发多个状态，各自独立生成。
  statuses: Record<string, StatusEventNarrative>;
}

// 组装事件牌文案 prompt 的结构化事实。
export interface CardNarrativeFacts {
  player: CreatePlayerInput['profile'];
  age: number;
  cycle: number;
  turn: number;
  stageLabel: string;
  category: OpportunityCategory;
  eventSkeleton: {
    id: string;
    name: string;
    checkAbilityKeys: AbilityKey[];
  };
}

// 组装结果文案 prompt 的结构化事实。
export interface ResultNarrativeFacts {
  player: CreatePlayerInput['profile'];
  age: number;
  event: {
    id: string;
    name: string;
    category: OpportunityCategory;
  };
  resultGrade: OpportunityResultGrade | 'direct';
  appliedDeltas: StatDelta[];
  historySummary: string;
  // 所选事件牌的描述，用于让结果文案与其呼应。
  cardDescription: string;
}

// 组装命运事件文案 prompt 的结构化事实。
export interface FateNarrativeFacts {
  player: CreatePlayerInput['profile'];
  age: number;
  eventName: string;
  appliedDeltas: StatDelta[];
  mitigatedDelta: StatDelta | null;
}

// 组装状态触发文案 prompt 的结构化事实。
export interface StatusNarrativeFacts {
  player: CreatePlayerInput['profile'];
  age: number;
  statusName: string;
  kind: 'one-time-effect' | 'death-risk' | 'per-cycle-effect';
  conditions: StatusConditionSnapshot[];
  appliedDeltas: StatDelta[];
  died: boolean;
}

// 人生报告叙事正文：AI 只输出一段由多个段落组成的报告正文，其余字段一律白名单剥离。
export interface LifeReportNarrative {
  paragraphs: string[];
}

// 组装人生报告 prompt 的结构化事实，覆盖 PRD 3.2 要求的最低事实集合。
export interface LifeReportFacts {
  player: CreatePlayerInput['profile'];
  finalAge: number;
  endReason: string;
  endReasonLabel: string;
  isPrematureDeath: boolean;
  stageLabels: string[];
  choices: Array<{
    age: number;
    eventName: string;
    categoryLabel: string;
    gradeLabel: string;
    // AI 生成的事件牌文案与结果文案；无 AI 时为 null，报告仍可用事件名退化。
    cardDescription: string | null;
    resultDescription: string | null;
  }>;
  discardedEvents: Array<{
    age: number;
    eventName: string;
  }>;
  fateEvents: Array<{
    age: number;
    eventName: string;
    // AI 生成的命运变故描述；无 AI 时为 null，报告仍可用事件名退化。
    description: string | null;
  }>;
  statusEvents: Array<{
    age: number;
    statusName: string;
    kind: 'one-time-effect' | 'death-risk' | 'per-cycle-effect';
    died: boolean;
    // AI 生成的状态描述；无 AI 时为 null，报告仍可用状态名退化。
    description: string | null;
  }>;
  finalStats: Array<{ label: string; value: number }>;
  lifeNodes: string;
  categoryPickCounts: string;
  successCount: number;
  failureCount: number;
}

// 文本风格开关（PRD 3.7）。
export type NarrativeStyle = 'concise' | 'vivid';

// 单类 prompt（system + 带占位符的 user 模板）。
export interface AiPromptConfig {
  system: string;
  userTemplate: string;
}

// Phase 6 的 AI 配置：prompt 模板、风格、模型与传输参数。
export interface AiConfig {
  enabled: boolean;
  style: NarrativeStyle;
  model: string;
  baseUrl: string;
  // DeepSeek 官方 API 的地址（公网），与美团内网 baseUrl 区分开。
  deepseekBaseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  // 输出 token 上限；报告要输出整篇文章，需要比事件卡大得多。
  maxTokens: number;
  // 报告专用超时：报告输入长、输出长，生成比事件卡慢，需要单独放宽。
  reportTimeoutMs: number;
  cardPrompt: AiPromptConfig;
  resultPrompt: AiPromptConfig;
  fatePrompt: AiPromptConfig;
  statusPrompt: AiPromptConfig;
  reportPrompt: AiPromptConfig;
  // 每个事件可选的范围提示词，键为 eventId，用于约束该事件的生成边界。
  eventHints: Record<string, string>;
}
