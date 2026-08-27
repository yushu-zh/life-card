import type { AbilityKey, CreatePlayerInput } from './bootstrap.ts';
import type { OpportunityCategory, OpportunityResultGrade, StatDelta } from './opportunity.ts';

// 事件牌文案：AI 只输出一段事件描述（背景 + 你选择怎么做），其余字段一律白名单剥离。
export interface EventCardNarrative {
  description: string;
}

// 机会事件结果文案：AI 只输出一段结果描述，与所选事件描述呼应。
export interface OpportunityResultNarrative {
  description: string;
}

// 一回合采纳的叙事：两个槽位都可为 null（表示走既有 fallback）。
export interface TurnNarrativeRecord {
  card: EventCardNarrative | null;
  result: OpportunityResultNarrative | null;
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
  timeoutMs: number;
  maxRetries: number;
  cardPrompt: AiPromptConfig;
  resultPrompt: AiPromptConfig;
  // 每个事件可选的范围提示词，键为 eventId，用于约束该事件的生成边界。
  eventHints: Record<string, string>;
}
