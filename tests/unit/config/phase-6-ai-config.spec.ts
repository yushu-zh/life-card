import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadAiConfig } from '../../../src/config/loaders/loadAiConfig.ts';
import { validateAiConfig } from '../../../src/config/validators/validateAiConfig.ts';

// 测试 Phase 6 的 AI 配置能被正确加载与校验。
describe('loadAiConfig', () => {
  it('loads the phase 6 ai config', () => {
    const config = loadAiConfig();

    assert.strictEqual(typeof config.enabled, 'boolean');
    assert.strictEqual(typeof config.style, 'string');
    assert.strictEqual(typeof config.model, 'string');
    assert.strictEqual(typeof config.baseUrl, 'string');
    assert.strictEqual(typeof config.timeoutMs, 'number');
    assert.strictEqual(typeof config.maxRetries, 'number');
    assert.ok(config.cardPrompt.system);
    assert.ok(config.cardPrompt.userTemplate);
    assert.ok(config.resultPrompt.system);
    assert.ok(config.resultPrompt.userTemplate);
  });
});

describe('validateAiConfig', () => {
  function buildValidConfig(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(loadAiConfig()));
  }

  it('throws when style is invalid', () => {
    const config = buildValidConfig();
    config.style = 'dramatic';

    assert.throws(() => validateAiConfig(config), /style must be one of/);
  });

  it('throws when timeoutMs is not a positive integer', () => {
    const config = buildValidConfig();
    config.timeoutMs = 0;

    assert.throws(() => validateAiConfig(config), /timeoutMs must be a positive integer/);
  });

  it('throws when maxRetries is negative', () => {
    const config = buildValidConfig();
    config.maxRetries = -1;

    assert.throws(() => validateAiConfig(config), /maxRetries must be a non-negative integer/);
  });

  it('throws when cardPrompt.system is empty', () => {
    const config = buildValidConfig();
    (config.cardPrompt as Record<string, unknown>).system = '';

    assert.throws(() => validateAiConfig(config), /cardPrompt.system must be a non-empty string/);
  });
});
