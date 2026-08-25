import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInitialStateConfig } from '../../../../src/config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../../../src/config/loaders/loadTurnSystemConfig.ts';
import { isOpportunitySelectable } from '../../../../src/engine/opportunity/checkOpportunityAvailability.ts';
import { createInitialSnapshot } from '../../../../src/engine/session/createInitialSnapshot.ts';
import type { CreatePlayerInput } from '../../../../src/shared/types/bootstrap.ts';

const baseInput: CreatePlayerInput = {
  profile: {
    nickname: '小宇',
    skillTags: ['分析'],
    education: '本科',
    industry: '互联网',
    wishes: ['稳定']
  },
  abilities: {
    cognition: 2,
    execution: 2,
    social: 2,
    creativity: 1,
    adaptability: 1
  }
};

const eventConfig = loadOpportunityEventConfig();
const energyRules = loadTurnSystemConfig().energyRules;

function createSnapshot() {
  return createInitialSnapshot(baseInput, loadInitialStateConfig(), 'session-selectable');
}

function findEvent(id: string) {
  const event = eventConfig.events.find((entry) => entry.id === id);

  if (!event) {
    throw new Error(`Unknown event ${id}`);
  }

  return event;
}

describe('isOpportunitySelectable', () => {
  it('金钱不足以覆盖固定代价时不可选', () => {
    const snapshot = createSnapshot();
    snapshot.stats.resources.money = 0;

    // 投资机会固定代价金钱-1。
    assert.equal(isOpportunitySelectable(snapshot, findEvent('achievement-investment'), energyRules), false);
  });

  it('金钱刚好覆盖固定代价时可选', () => {
    const snapshot = createSnapshot();
    snapshot.stats.resources.money = 1;

    assert.equal(isOpportunitySelectable(snapshot, findEvent('achievement-investment'), energyRules), true);
  });

  it('精力低于阈值时禁止选择消耗精力的事件', () => {
    const snapshot = createSnapshot();
    snapshot.stats.resources.energy = -6;

    // 工作机会固定代价精力-1。
    assert.equal(isOpportunitySelectable(snapshot, findEvent('achievement-job-opportunity'), energyRules), false);
  });

  it('精力低于阈值时仍可选择不消耗精力的休养身心', () => {
    const snapshot = createSnapshot();
    snapshot.stats.resources.energy = -6;

    assert.equal(isOpportunitySelectable(snapshot, findEvent('self-rest'), energyRules), true);
  });

  it('精力未跌破阈值时仍可选择消耗精力的事件', () => {
    const snapshot = createSnapshot();
    snapshot.stats.resources.energy = -5;

    // -5 不严格小于 -5，因此仍可选择消耗精力的事件。
    assert.equal(isOpportunitySelectable(snapshot, findEvent('achievement-job-opportunity'), energyRules), true);
  });
});
