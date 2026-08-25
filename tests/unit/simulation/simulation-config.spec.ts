import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadSimulationConfig, validateSimulationConfig } from '../../../simulation/config/loadSimulationConfig.ts';
import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { validateCreatePlayerInput } from '../../../src/engine/session/validateCreatePlayerInput.ts';
import type { SimulationConfig } from '../../../simulation/types.ts';

describe('loadSimulationConfig', () => {
  it('加载出一份自洽的模拟配置', () => {
    const config = loadSimulationConfig();

    // 默认局数为正整数。
    assert.ok(Number.isInteger(config.defaultRunCount) && config.defaultRunCount > 0);
    // 启用策略列表非空，且不重复。
    assert.ok(config.enabledStrategies.length > 0);
    assert.equal(new Set(config.enabledStrategies).size, config.enabledStrategies.length);
    // 对比基准必须出现在启用策略列表里。
    assert.ok(config.enabledStrategies.includes(config.comparisonBaseline));
  });

  it('playerPreset 能通过正式开局校验', () => {
    const config = loadSimulationConfig();

    assert.doesNotThrow(() => validateCreatePlayerInput(config.playerPreset, loadInitialStateConfig()));
  });
});

describe('validateSimulationConfig', () => {
  const base = loadSimulationConfig();

  it('拒绝非正整数的默认局数', () => {
    assert.throws(() => validateSimulationConfig({ ...base, defaultRunCount: 0 }));
    assert.throws(() => validateSimulationConfig({ ...base, defaultRunCount: -3 }));
    assert.throws(() => validateSimulationConfig({ ...base, defaultRunCount: 1.5 }));
  });

  it('拒绝重复的策略 id', () => {
    assert.throws(() =>
      validateSimulationConfig({ ...base, enabledStrategies: ['random', 'random', 'prefer-self'] })
    );
  });

  it('拒绝不在启用列表里的对比基准', () => {
    assert.throws(() =>
      validateSimulationConfig({
        ...base,
        enabledStrategies: ['random', 'prefer-self'],
        comparisonBaseline: 'prefer-high-reward'
      })
    );
  });

  it('拒绝未知的策略 id', () => {
    assert.throws(() =>
      validateSimulationConfig({
        ...base,
        enabledStrategies: ['random', 'not-a-strategy']
      } as unknown as SimulationConfig)
    );
  });
});
