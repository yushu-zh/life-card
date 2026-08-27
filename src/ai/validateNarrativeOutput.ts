import type { EventCardNarrative, OpportunityResultNarrative } from '../shared/types/narrative.ts';

// 解析并校验 AI 返回的事件牌文案。
// 只读取白名单字段（一段描述），其余字段一律忽略；缺失、空或非法都返回 null，交由上层走 fallback。
export function parseEventCardNarrative(raw: string): EventCardNarrative | null {
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
