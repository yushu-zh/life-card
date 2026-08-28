import type { EventCardNarrative, FateEventNarrative, LifeReportNarrative, OpportunityResultNarrative, StatusEventNarrative } from '../shared/types/narrative.ts';

// 解析并校验 AI 返回的事件牌文案。
// 只读取白名单字段（一段描述 + 可选的一条持久设定记忆），其余字段一律忽略；
// 缺失、空或非法都返回 null，交由上层走 fallback。
export function parseEventCardNarrative(raw: string): EventCardNarrative | null {
  const value = parseObject(raw);
  if (!value) {
    return null;
  }

  const description = readString(value.description);
  if (!description) {
    return null;
  }

  // memory 是可选项：AI 认为这张牌不会留下持久设定时会返回 null 或省略。
  // 截断到 30 字防 AI 写长，控制后续 prompt 的体积。
  const memory = readOptionalMemory(value.memory);

  return memory ? { description, memory } : { description };
}

// 读取可选的记忆短句：非字符串、空白串视为「无记忆」；超长截断。
function readOptionalMemory(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().slice(0, 30);
}

// 解析并校验 AI 返回的结果文案。只读取白名单字段（一段描述），非法则返回 null。
export function parseOpportunityResultNarrative(raw: string): OpportunityResultNarrative | null {
  const value = parseObject(raw);
  if (!value) {
    return null;
  }

  const description = readString(value.description);
  if (!description) {
    return null;
  }

  return { description };
}

// 解析并校验 AI 返回的命运事件文案。只读取白名单字段（一段描述），非法则返回 null。
export function parseFateNarrative(raw: string): FateEventNarrative | null {
  const value = parseObject(raw);
  if (!value) {
    return null;
  }

  const description = readString(value.description);
  if (!description) {
    return null;
  }

  return { description };
}

// 解析并校验 AI 返回的状态触发文案。只读取白名单字段（一段描述），非法则返回 null。
export function parseStatusNarrative(raw: string): StatusEventNarrative | null {
  const value = parseObject(raw);
  if (!value) {
    return null;
  }

  const description = readString(value.description);
  if (!description) {
    return null;
  }

  return { description };
}

// 把一段文本解析成顶层对象；非对象或 JSON 解析失败都返回 null。
function parseObject(raw: string): Record<string, unknown> | null {
  const candidate = extractJsonObject(raw);
  if (candidate === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(candidate);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

// 从模型返回的文本里抽出最外层 JSON 对象。
// 模型可能把 JSON 包在 ```json 代码块里，或在前后附加解释文字，这里做容错剥离。
function extractJsonObject(raw: string): string | null {
  let text = raw.trim();
  if (text.length === 0) {
    return null;
  }

  // 去掉 markdown 代码块包裹：```json ... ``` 或 ``` ... ```。
  if (text.startsWith('```')) {
    const firstNewline = text.indexOf('\n');
    text = firstNewline === -1 ? '' : text.slice(firstNewline + 1);
    const fenceEnd = text.lastIndexOf('```');
    if (fenceEnd !== -1) {
      text = text.slice(0, fenceEnd);
    }
    text = text.trim();
  }

  // 从第一个 { 到最后一个 }，容错前后解释性文字。
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

// 读取非空字符串；空串或非字符串返回 null。
function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// 解析并校验 AI 返回的人生报告。只读取白名单字段 paragraphs（非空字符串数组），
// 其余字段一律忽略；缺失、空数组或任一空段都返回 null，交由上层走 fallback。
export function parseLifeReport(raw: string): LifeReportNarrative | null {
  const value = parseObject(raw);
  if (!value) {
    return null;
  }

  const paragraphs = readParagraphs(value.paragraphs);
  if (!paragraphs) {
    return null;
  }

  return { paragraphs };
}

// 读取非空段落数组：只保留非空字符串段落，过滤后为空则返回 null。
function readParagraphs(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const paragraphs = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  ).map((item) => item.trim());

  return paragraphs.length > 0 ? paragraphs : null;
}
