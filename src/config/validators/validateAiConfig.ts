import type { AiConfig, AiPromptConfig, NarrativeStyle } from '../../shared/types/narrative.ts';

// 允许的文本风格取值。
const VALID_STYLES: NarrativeStyle[] = ['concise', 'vivid'];

// 检查 Phase 6 的 AI 配置是否合法，并整理成固定结构返回。
export function validateAiConfig(value: unknown): AiConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI config must be an object');
  }

  const config = value as Record<string, unknown>;

  assertBoolean(config.enabled, 'enabled');
  assertStyle(config.style, 'style');
  assertNonEmptyString(config.model, 'model');
  assertNonEmptyString(config.baseUrl, 'baseUrl');
  assertNonEmptyString(config.deepseekBaseUrl, 'deepseekBaseUrl');
  assertPositiveInteger(config.timeoutMs, 'timeoutMs');
  assertNonNegativeInteger(config.maxRetries, 'maxRetries');
  assertPositiveInteger(config.maxTokens, 'maxTokens');
  assertPositiveInteger(config.reportTimeoutMs, 'reportTimeoutMs');

  const cardPrompt = validatePrompt(config.cardPrompt, 'cardPrompt');
  const resultPrompt = validatePrompt(config.resultPrompt, 'resultPrompt');
  const fatePrompt = validatePrompt(config.fatePrompt, 'fatePrompt');
  const statusPrompt = validatePrompt(config.statusPrompt, 'statusPrompt');
  const reportPrompt = validatePrompt(config.reportPrompt, 'reportPrompt');
  const eventHints = validateEventHints(config.eventHints);

  return {
    enabled: config.enabled as boolean,
    style: config.style as NarrativeStyle,
    model: config.model as string,
    baseUrl: config.baseUrl as string,
    deepseekBaseUrl: config.deepseekBaseUrl as string,
    timeoutMs: config.timeoutMs as number,
    maxRetries: config.maxRetries as number,
    maxTokens: config.maxTokens as number,
    reportTimeoutMs: config.reportTimeoutMs as number,
    cardPrompt,
    resultPrompt,
    fatePrompt,
    statusPrompt,
    reportPrompt,
    eventHints
  };
}

// 校验事件范围提示词：可选，键为 eventId，值为字符串（允许空串表示「无提示」）。
function validateEventHints(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('eventHints must be an object');
  }

  const hints = value as Record<string, unknown>;
  for (const [eventId, hint] of Object.entries(hints)) {
    if (typeof hint !== 'string') {
      throw new Error(`eventHints.${eventId} must be a string`);
    }
  }

  return hints as Record<string, string>;
}

// 校验单个 prompt 配置（system + user 模板都必须是非空字符串）。
function validatePrompt(value: unknown, label: string): AiPromptConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  const prompt = value as Record<string, unknown>;
  assertNonEmptyString(prompt.system, `${label}.system`);
  assertNonEmptyString(prompt.userTemplate, `${label}.userTemplate`);

  return {
    system: prompt.system as string,
    userTemplate: prompt.userTemplate as string
  };
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
}

function assertStyle(value: unknown, label: string): asserts value is NarrativeStyle {
  if (typeof value !== 'string' || !VALID_STYLES.includes(value as NarrativeStyle)) {
    throw new Error(`${label} must be one of: ${VALID_STYLES.join(', ')}`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}
