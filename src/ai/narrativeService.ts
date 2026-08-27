import type {
  AiConfig,
  CardNarrativeFacts,
  EventCardNarrative,
  OpportunityResultNarrative,
  ResultNarrativeFacts
} from '../shared/types/narrative.ts';
import { buildCardNarrativePrompt, buildResultNarrativePrompt } from './buildNarrativePrompts.ts';
import { parseEventCardNarrative, parseOpportunityResultNarrative } from './validateNarrativeOutput.ts';

// 唯一传输边界：换服务端时只替换这个实现，AI 层其余部分与编排层契约不变。
export interface NarrativeTransport {
  generate(system: string, user: string): Promise<string>;
}

// 生成事件牌文案；任何失败（超时/网络/校验）都返回 null，由上层走 fallback。
export async function generateEventCardNarrative(
  facts: CardNarrativeFacts,
  config: AiConfig,
  transport: NarrativeTransport
): Promise<EventCardNarrative | null> {
  if (!config.enabled) {
    return null;
  }

  const prompt = buildCardNarrativePrompt(facts, config);
  const raw = await callWithRetry(prompt, config, transport);

  return raw === null ? null : parseEventCardNarrative(raw);
}

// 生成结果文案；任何失败返回 null。
export async function generateOpportunityResultNarrative(
  facts: ResultNarrativeFacts,
  config: AiConfig,
  transport: NarrativeTransport
): Promise<OpportunityResultNarrative | null> {
  if (!config.enabled) {
    return null;
  }

  const prompt = buildResultNarrativePrompt(facts, config);
  const raw = await callWithRetry(prompt, config, transport);

  return raw === null ? null : parseOpportunityResultNarrative(raw);
}

// 按配置重试调用传输层；全部失败返回 null，不向上抛错。
async function callWithRetry(
  prompt: { system: string; user: string },
  config: AiConfig,
  transport: NarrativeTransport
): Promise<string | null> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await transport.generate(prompt.system, prompt.user);
    } catch {
      // 单次失败后继续重试；重试耗尽后统一返回 null。
    }
  }

  return null;
}

// 客户端直连 FRIDAY（OpenAI Chat Completions 兼容）。
// App ID 由调用方传入（建档时用户输入并持久化），不再从环境变量读取。
export function createFridayTransport(config: AiConfig, appId: string): NarrativeTransport {
  return {
    async generate(system: string, user: string): Promise<string> {
      if (!appId) {
        throw new Error('Missing FRIDAY App ID');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appId}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            max_tokens: 2048,
            stream: false
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`FRIDAY request failed with status ${response.status}`);
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || content.length === 0) {
          throw new Error('FRIDAY response did not contain message content');
        }

        return content;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

// 联调 / 测试替身：始终抛错，用于验证 fallback 链路。
export function createMockNarrativeTransport(): NarrativeTransport {
  return {
    async generate(): Promise<string> {
      throw new Error('Mock narrative transport is not configured to generate');
    }
  };
}

