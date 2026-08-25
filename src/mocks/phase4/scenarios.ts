import { createInitialSnapshot } from '../../engine/session/createInitialSnapshot.ts';
import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { TurnOfferCard, TurnResolutionSummary } from '../../shared/types/turn.ts';
import type { Phase4MockScenarioMap } from '../../shared/types/ui.ts';

// 返回一份用于演示的合法创建玩家输入。
function createValidCreatePlayerInput(): CreatePlayerInput {
  return {
    profile: {
      nickname: '小明',
      skillTags: ['编程', '写作'],
      education: '本科',
      industry: '互联网',
      wishes: ['环游世界', '财务自由']
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

// 返回一份带有常见错误的创建玩家输入，用于演示禁用状态。
function createInvalidCreatePlayerInput(): CreatePlayerInput {
  return {
    profile: {
      nickname: '',
      skillTags: ['编程', '写作', '设计', '管理'],
      education: '',
      industry: '',
      wishes: ['环游世界']
    },
    abilities: {
      cognition: 1,
      execution: 1,
      social: 1,
      creativity: 1,
      adaptability: 1
    }
  };
}

// 构造一个初始快照，不依赖 IndexedDB。
function buildInitialSnapshot(input: CreatePlayerInput, sessionId: string): GameSessionSnapshot {
  const config = loadInitialStateConfig();
  return createInitialSnapshot(input, config, sessionId);
}

// 构造一个回合总览的快照，支持是否已换牌、是否带风险提示。
function buildTurnOverviewSnapshot(
  sessionId: string,
  options: { rerollUsed?: boolean; riskHint?: 'money' | 'energy' | 'health' | 'life' } = {}
): GameSessionSnapshot {
  const snapshot = buildInitialSnapshot(createValidCreatePlayerInput(), sessionId);

  snapshot.progression.age = 25;
  snapshot.progression.cycle = 2;
  snapshot.progression.turn = 1;

  // 根据风险类型调整数值。
  if (options.riskHint === 'money') {
    snapshot.stats.resources.money = 0;
  } else if (options.riskHint === 'energy') {
    snapshot.stats.resources.energy = 0;
  } else if (options.riskHint === 'health') {
    snapshot.stats.outcomes.health = -1;
  } else if (options.riskHint === 'life') {
    snapshot.progression.age = 55;
    snapshot.stats.outcomes.health = -4;
    snapshot.stats.resources.energy = -3;
  }

  const initialOffer: TurnOfferCard[] = [
    { slotIndex: 0, eventId: 'achievement-job-opportunity', category: 'achievement' },
    { slotIndex: 1, eventId: 'relationship-romance', category: 'relationship' },
    { slotIndex: 2, eventId: 'self-rest', category: 'self' }
  ];

  snapshot.turnState.activeTurn = {
    age: snapshot.progression.age,
    cycle: snapshot.progression.cycle,
    turn: snapshot.progression.turn,
    patternKind: 'balanced',
    slotCategories: ['achievement', 'relationship', 'self'],
    initialOffer,
    rerolledOffer: options.rerollUsed
      ? [
          { slotIndex: 0, eventId: 'achievement-advanced-study', category: 'achievement' },
          { slotIndex: 1, eventId: 'relationship-friends', category: 'relationship' },
          { slotIndex: 2, eventId: 'self-fitness', category: 'self' }
        ]
      : null,
    currentOffer: options.rerollUsed
      ? [
          { slotIndex: 0, eventId: 'achievement-advanced-study', category: 'achievement' },
          { slotIndex: 1, eventId: 'relationship-friends', category: 'relationship' },
          { slotIndex: 2, eventId: 'self-fitness', category: 'self' }
        ]
      : initialOffer,
    rerollCount: options.rerollUsed ? 1 : 0
  };

  return snapshot;
}

// 构造一份仅含机会事件结果的结算摘要。
function buildOpportunityOnlySummary(sessionId: string): TurnResolutionSummary {
  const snapshot = buildTurnOverviewSnapshot(sessionId);
  const selectedCard = snapshot.turnState.activeTurn!.currentOffer[0];

  return {
    context: {
      age: snapshot.progression.age,
      cycle: snapshot.progression.cycle,
      turn: snapshot.progression.turn
    },
    offer: {
      initial: snapshot.turnState.activeTurn!.initialOffer,
      rerolled: null,
      final: snapshot.turnState.activeTurn!.currentOffer,
      rerollUsed: false
    },
    selectedCard,
    discardedCards: snapshot.turnState.activeTurn!.currentOffer.filter(
      (card) => card.slotIndex !== selectedCard.slotIndex
    ),
    opportunity: {
      event: {
        id: 'achievement-job-opportunity',
        name: '工作机会',
        category: 'achievement'
      },
      resolutionKind: 'checked',
      formula: {
        dice: { first: 4, second: 3 },
        abilities: [
          { key: 'cognition', value: 2 },
          { key: 'execution', value: 2 }
        ],
        totalScore: 11
      },
      resultGrade: 'success',
      appliedDeltas: [
        { key: 'money', amount: 2 },
        { key: 'experience', amount: 1 }
      ],
      lifeNodeChanges: [],
      updatedSnapshot: snapshot
    },
    fate: null,
    statuses: [],
    progressionAfterTurn: {
      age: snapshot.progression.age,
      cycle: snapshot.progression.cycle,
      turn: snapshot.progression.turn + 1,
      isEnded: false,
      endReason: null
    },
    updatedSnapshot: snapshot
  };
}

// 构造一份含命运事件且被减免的结算摘要。
function buildFateMitigationSummary(sessionId: string): TurnResolutionSummary {
  const summary = buildOpportunityOnlySummary(sessionId);

  summary.fate = {
    triggered: true,
    event: { id: 'fate-layoff', name: '公司裁员' },
    appliedDeltas: [
      { key: 'money', amount: -1 },
      { key: 'happiness', amount: -1 },
      { key: 'freedom', amount: 1 }
    ],
    mitigatedDelta: { key: 'money', amount: 1 },
    updatedSnapshot: summary.updatedSnapshot
  };

  return summary;
}

// 构造一份由状态导致终局的结算摘要。
function buildStatusEndSummary(sessionId: string): TurnResolutionSummary {
  const summary = buildOpportunityOnlySummary(sessionId);

  summary.statuses = [
    {
      id: 'health-crisis',
      name: '健康危机',
      kind: 'death-risk',
      resolutionMode: 'per-turn-risk-check',
      firstTrigger: false,
      conditions: [{ key: 'health', operator: '<=', threshold: -1, actual: -1 }],
      deathProbability: 0.01,
      roll: 0.001,
      died: true,
      endReason: 'status-health-crisis'
    }
  ];

  summary.progressionAfterTurn.isEnded = true;
  summary.progressionAfterTurn.endReason = 'status-health-crisis';
  summary.updatedSnapshot.lifecycle.isEnded = true;
  summary.updatedSnapshot.lifecycle.endReason = 'status-health-crisis';

  return summary;
}

// 构造一份用于报告页 fallback 的终局快照。
function buildReportSnapshot(sessionId: string): GameSessionSnapshot {
  const snapshot = buildInitialSnapshot(createValidCreatePlayerInput(), sessionId);

  snapshot.progression.age = 80;
  snapshot.progression.cycle = 13;
  snapshot.progression.turn = 1;

  snapshot.stats.outcomes.happiness = 5;
  snapshot.stats.outcomes.freedom = 3;
  snapshot.stats.outcomes.health = -1;
  snapshot.stats.outcomes.experience = 6;
  snapshot.stats.outcomes.influence = 4;

  snapshot.records.lifeHistory = [
    {
      type: 'turn-resolution',
      context: { age: 25, cycle: 2, turn: 1 },
      offer: {
        initial: [
          { slotIndex: 0, eventId: 'achievement-job-opportunity', category: 'achievement' }
        ],
        rerolled: null,
        final: [{ slotIndex: 0, eventId: 'achievement-job-opportunity', category: 'achievement' }],
        rerollUsed: false
      },
      selectedCard: { slotIndex: 0, eventId: 'achievement-job-opportunity', category: 'achievement' },
      discardedCards: [],
      opportunity: {
        event: { id: 'achievement-job-opportunity', name: '工作机会', category: 'achievement' },
        resolutionKind: 'checked',
        formula: null,
        resultGrade: 'success',
        appliedDeltas: [
          { key: 'money', amount: 2 },
          { key: 'experience', amount: 1 }
        ],
        lifeNodeChanges: []
      },
      fate: null,
      statuses: [],
      snapshotAfterTurn: {
        stats: snapshot.stats,
        lifeNodes: snapshot.records.lifeNodes
      },
      progressionAfterTurn: {
        age: 25,
        cycle: 2,
        turn: 2,
        isEnded: false,
        endReason: null
      }
    },
    {
      type: 'turn-resolution',
      context: { age: 30, cycle: 3, turn: 1 },
      offer: {
        initial: [{ slotIndex: 0, eventId: 'fate-layoff', category: 'achievement' }],
        rerolled: null,
        final: [{ slotIndex: 0, eventId: 'fate-layoff', category: 'achievement' }],
        rerollUsed: false
      },
      selectedCard: { slotIndex: 0, eventId: 'achievement-startup', category: 'achievement' },
      discardedCards: [],
      opportunity: {
        event: { id: 'achievement-startup', name: '创业', category: 'achievement' },
        resolutionKind: 'checked',
        formula: null,
        resultGrade: 'failure',
        appliedDeltas: [
          { key: 'money', amount: -2 },
          { key: 'energy', amount: -1 }
        ],
        lifeNodeChanges: []
      },
      fate: {
        triggered: true,
        event: { id: 'fate-layoff', name: '公司裁员' },
        appliedDeltas: [{ key: 'money', amount: -2 }],
        mitigatedDelta: null
      },
      statuses: [],
      snapshotAfterTurn: {
        stats: snapshot.stats,
        lifeNodes: snapshot.records.lifeNodes
      },
      progressionAfterTurn: {
        age: 30,
        cycle: 3,
        turn: 2,
        isEnded: false,
        endReason: null
      }
    }
  ];

  snapshot.lifecycle.isEnded = true;
  snapshot.lifecycle.endReason = 'age-limit';

  return snapshot;
}

// Phase 4 的演示与兜底数据集合。
// 场景直接复用已有的 domain 类型，不造伪结构。
export const phase4MockScenarios: Phase4MockScenarioMap = {
  createPlayerValid: {
    draft: createValidCreatePlayerInput()
  },
  createPlayerInvalid: {
    draft: createInvalidCreatePlayerInput()
  },
  turnOverviewNormal: {
    snapshot: buildTurnOverviewSnapshot('mock-session-normal')
  },
  turnOverviewRerollUsed: {
    snapshot: buildTurnOverviewSnapshot('mock-session-reroll-used', { rerollUsed: true })
  },
  turnOverviewRiskHint: {
    snapshot: buildTurnOverviewSnapshot('mock-session-risk-hint', { riskHint: 'money' })
  },
  resultOpportunityOnly: {
    summary: buildOpportunityOnlySummary('mock-session-opportunity-only')
  },
  resultWithFateMitigation: {
    summary: buildFateMitigationSummary('mock-session-fate-mitigation')
  },
  resultWithStatusEnd: {
    summary: buildStatusEndSummary('mock-session-status-end')
  },
  lifeReportFallback: {
    snapshot: buildReportSnapshot('mock-session-life-report')
  }
};
