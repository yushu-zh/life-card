import type {
  AiConfig,
  CardNarrativeFacts,
  EventCardNarrative,
  FateEventNarrative,
  FateNarrativeFacts,
  LifeReportFacts,
  LifeReportNarrative,
  OpportunityResultNarrative,
  ResultNarrativeFacts,
  StatusEventNarrative,
  StatusNarrativeFacts
} from '../shared/types/narrative.ts';
import { buildCardNarrativePrompt, buildFateNarrativePrompt, buildLifeReportPrompt, buildResultNarrativePrompt, buildStatusNarrativePrompt } from './buildNarrativePrompts.ts';
import { parseEventCardNarrative, parseFateNarrative, parseLifeReport, parseOpportunityResultNarrative, parseStatusNarrative } from './validateNarrativeOutput.ts';

// 唯一传输边界：换服务端时只替换这个实现，AI 层其余部分与编排层契约不变。
export interface NarrativeTransport {
  // options.timeoutMs 用于单次调用覆盖默认超时（报告生成比事件卡慢，需要单独放宽）。
  generate(system: string, user: string, options?: { timeoutMs?: number }): Promise<string>;
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

// 生成命运事件文案；任何失败返回 null，由上层走 fallback。
export async function generateFateNarrative(
  facts: FateNarrativeFacts,
  config: AiConfig,
  transport: NarrativeTransport
): Promise<FateEventNarrative | null> {
  if (!config.enabled) {
    return null;
  }

  const prompt = buildFateNarrativePrompt(facts, config);
  const raw = await callWithRetry(prompt, config, transport);

  return raw === null ? null : parseFateNarrative(raw);
}

// 生成状态触发文案；任何失败返回 null，由上层走 fallback。
export async function generateStatusNarrative(
  facts: StatusNarrativeFacts,
  config: AiConfig,
  transport: NarrativeTransport
): Promise<StatusEventNarrative | null> {
  if (!config.enabled) {
    return null;
  }

  const prompt = buildStatusNarrativePrompt(facts, config);
  const raw = await callWithRetry(prompt, config, transport);

  return raw === null ? null : parseStatusNarrative(raw);
}

// 生成人生报告叙事正文；任何失败返回 null，由上层走 fallback。
export async function generateLifeReportNarrative(
  facts: LifeReportFacts,
  config: AiConfig,
  transport: NarrativeTransport
): Promise<LifeReportNarrative | null> {
  if (!config.enabled) {
    return null;
  }

  const prompt = buildLifeReportPrompt(facts, config);
  // 报告输入长、输出长，用比事件卡更宽松的专用超时，避免 8 秒内被 AbortController 掐断。
  const raw = await callWithRetry(prompt, config, transport, { timeoutMs: config.reportTimeoutMs });

  return raw === null ? null : parseLifeReport(raw);
}

// 按配置重试调用传输层；全部失败返回 null，不向上抛错。
async function callWithRetry(
  prompt: { system: string; user: string },
  config: AiConfig,
  transport: NarrativeTransport,
  options?: { timeoutMs?: number }
): Promise<string | null> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await transport.generate(prompt.system, prompt.user, options);
    } catch {
      // 单次失败后继续重试；重试耗尽后统一返回 null。
    }
  }

  return null;
}

// AI 提供商：美团 FRIDAY（内网，App ID）或 DeepSeek 官方（公网，API Key）。
export type AiProvider = 'friday' | 'deepseek';

// 根据用户填写的 App ID 与 DeepSeek API Key 决定使用哪个 AI 提供商。
// 规则：两者都填时优先美团 FRIDAY；都不填时返回 null（由上层校验拦截）。
export function resolveAiProvider(
  appId: string,
  deepseekApiKey: string
): { provider: AiProvider; key: string } | null {
  const fridayId = appId.trim();
  if (fridayId) {
    return { provider: 'friday', key: fridayId };
  }

  const deepseekKey = deepseekApiKey.trim();
  if (deepseekKey) {
    return { provider: 'deepseek', key: deepseekKey };
  }

  return null;
}

// 客户端直连 FRIDAY（OpenAI Chat Completions 兼容）。
// App ID 由调用方传入（建档时用户输入并持久化），不再从环境变量读取。
export function createFridayTransport(config: AiConfig, appId: string): NarrativeTransport {
  return createOpenAiCompatibleTransport(config, config.baseUrl, appId, 'FRIDAY App ID');
}

// 客户端直连 DeepSeek 官方（OpenAI Chat Completions 兼容），API Key 由调用方传入。
export function createDeepSeekTransport(config: AiConfig, apiKey: string): NarrativeTransport {
  return createOpenAiCompatibleTransport(config, config.deepseekBaseUrl, apiKey, 'DeepSeek API Key');
}

// OpenAI Chat Completions 兼容传输的通用实现。
// 美团 FRIDAY 与 DeepSeek 官方走同一套请求格式，仅 baseUrl 与凭据不同，换这两个参数即可适配。
function createOpenAiCompatibleTransport(
  config: AiConfig,
  baseUrl: string,
  apiKey: string,
  missingLabel: string
): NarrativeTransport {
  return {
    async generate(system: string, user: string, options?: { timeoutMs?: number }): Promise<string> {
      if (!apiKey) {
        throw new Error(`Missing ${missingLabel}`);
      }

      const timeoutMs = options?.timeoutMs ?? config.timeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            max_tokens: config.maxTokens,
            stream: false
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`AI request failed with status ${response.status}`);
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || content.length === 0) {
          throw new Error('AI response did not contain message content');
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

