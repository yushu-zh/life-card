import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadPhase4PresentationConfig } from '../../../src/config/loaders/loadPhase4PresentationConfig.ts';
import { buildCreatePlayerViewModel } from '../../../src/modules/setup/buildCreatePlayerViewModel.ts';
import type { CreatePlayerInput } from '../../../src/shared/types/bootstrap.ts';

// 测试创建玩家页面的 ViewModel 映射。
// 主要验证 limits、剩余点数、ability 操作状态和非法输入禁用。
describe('buildCreatePlayerViewModel', () => {
  const config = loadInitialStateConfig();
  const presentation = loadPhase4PresentationConfig();
  const APP_ID = 'app-id-123';

  function buildValidDraft(): CreatePlayerInput {
    return {
      profile: {
        nickname: '小明',
        skillTags: ['编程'],
        education: '本科',
        industry: '互联网',
        wishes: ['环游世界']
      },
      abilities: {
        cognition: 2,
        execution: 2,
        social: 1,
        creativity: 1,
        adaptability: 2
      }
    };
  }

  it('exposes the configured limits', () => {
    const vm = buildCreatePlayerViewModel(buildValidDraft(), APP_ID, config, presentation);

    assert.strictEqual(vm.limits.skillTagLimit, config.skillTagLimit);
    assert.strictEqual(vm.limits.wishLimit, config.wishLimit);
    assert.strictEqual(vm.limits.abilityPointTotal, config.abilityPointTotal);
    assert.strictEqual(vm.limits.abilityMax, config.abilityMax);
  });

  it('calculates remaining points and ability stepper states', () => {
    const draft = buildValidDraft();
    draft.abilities.cognition = 1;
    draft.abilities.execution = 2;
    draft.abilities.social = 2;
    draft.abilities.creativity = 1;
    draft.abilities.adaptability = 1;

    const vm = buildCreatePlayerViewModel(draft, APP_ID, config, presentation);

    assert.strictEqual(vm.remainingPoints, 1);
    assert.ok(vm.abilityItems.every((item) => item.value === draft.abilities[item.key]));

    const cognition = vm.abilityItems.find((item) => item.key === 'cognition')!;
    assert.strictEqual(cognition.canIncrease, true);
    assert.strictEqual(cognition.canDecrease, true);

    // 当剩余点数用完时，即使未达单项上限也不能继续增加。
    const fullyAllocatedDraft = buildValidDraft();
    const fullyAllocatedVm = buildCreatePlayerViewModel(fullyAllocatedDraft, APP_ID, config, presentation);
    const fullyAllocatedCognition = fullyAllocatedVm.abilityItems.find(
      (item) => item.key === 'cognition'
    )!;
    assert.strictEqual(fullyAllocatedCognition.canIncrease, false);
    assert.strictEqual(fullyAllocatedCognition.canDecrease, true);
  });

  it('disables start when nickname is empty', () => {
    const draft = buildValidDraft();
    draft.profile.nickname = '';

    const vm = buildCreatePlayerViewModel(draft, APP_ID, config, presentation);

    assert.strictEqual(vm.canStart, false);
    assert.ok(vm.disabledReason?.includes('昵称'));
  });

  it('disables start when app id is empty', () => {
    const draft = buildValidDraft();

    const vm = buildCreatePlayerViewModel(draft, '  ', config, presentation);

    assert.strictEqual(vm.canStart, false);
    assert.strictEqual(vm.errors.appId, 'App ID 不能为空');
    assert.ok(vm.disabledReason?.includes('App ID'));
  });

  it('disables start when ability points are not fully allocated', () => {
    const draft = buildValidDraft();
    draft.abilities.cognition = 1;

    const vm = buildCreatePlayerViewModel(draft, APP_ID, config, presentation);

    assert.strictEqual(vm.canStart, false);
    assert.ok(vm.disabledReason?.includes('点数'));
  });

  it('disables start when skill tags exceed the limit', () => {
    const draft = buildValidDraft();
    draft.profile.skillTags = ['a', 'b', 'c', 'd'];

    const vm = buildCreatePlayerViewModel(draft, APP_ID, config, presentation);

    assert.strictEqual(vm.canStart, false);
  });
});
