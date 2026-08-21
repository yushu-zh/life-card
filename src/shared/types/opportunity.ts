import type { GameSessionSnapshot } from './game-session.ts';
import type { AbilityKey } from './bootstrap.ts';

// 事件所属的三种大类。
export type OpportunityCategory = 'achievement' | 'relationship' | 'self';

// 一次事件结算里允许变化的指标键。
export type StatKey =
  | AbilityKey
  | 'money'
  | 'energy'
  | 'happiness'
  | 'freedom'
  | 'health'
  | 'experience'
  | 'influence';

// 一条数值变化。
export interface StatDelta {
  key: StatKey;
  amount: number;
}

// 当前会影响后续事件解锁的人生节点键。
export type LifeNodeKey = 'romanceSuccessCount' | 'marriageEstablished' | 'familyEstablished';

// 一个事件要求满足的人生节点条件。
export type LifeNodeRequirement =
  | {
      key: 'romanceSuccessCount';
      min: number;
    }
  | {
      key: 'marriageEstablished' | 'familyEstablished';
      equals: boolean;
    };

// 一个事件在非失败时会触发的人生节点变化。
export type LifeNodeMutation =
  | {
      key: 'romanceSuccessCount';
      operation: 'increment';
      amount: number;
    }
  | {
      key: 'marriageEstablished' | 'familyEstablished';
      operation: 'set';
      value: boolean;
    };

// 一次 2d6 掷骰的原始结果。
export interface Dice2D6 {
  first: number;
  second: number;
}

// 一个机会事件在配置里的完整定义。
export interface OpportunityEventDefinition {
  id: string;
  name: string;
  category: OpportunityCategory;
  availability: {
    age?: {
      min?: number;
      maxExclusive?: number;
    };
    maxOccurrences?: number | null;
    requiresLifeNodes?: LifeNodeRequirement[];
  };
  check: {
    kind: 'none' | 'sum';
    abilityKeys: AbilityKey[];
  };
  effects: {
    reward: StatDelta[];
    fixedCost: StatDelta[];
    risk: StatDelta[];
    criticalBonus: StatDelta[];
  };
  onNonFailure?: LifeNodeMutation[];
}

// Phase 1 的整份事件配置。
export interface OpportunityEventConfig {
  scoreBands: {
    failure: {
      max: number;
    };
    costlySuccess: {
      min: number;
      max: number;
    };
    success: {
      min: number;
      max: number;
    };
    criticalSuccess: {
      min: number;
    };
  };
  events: OpportunityEventDefinition[];
}

// 一次检定可能得到的结果等级。
export type OpportunityResultGrade = 'failure' | 'costlySuccess' | 'success' | 'criticalSuccess';

// 一条人生节点变化的前后对比。
export interface AppliedLifeNodeChange {
  key: LifeNodeKey;
  previousValue: number | boolean;
  nextValue: number | boolean;
}

// 一次检定公式的完整明细。
export interface CheckedOpportunityFormula {
  dice: Dice2D6;
  abilities: Array<{
    key: AbilityKey;
    value: number;
  }>;
  totalScore: number;
}

// 一次事件结算后返回给上层的结果摘要。
export interface OpportunityResolutionSummary {
  event: {
    id: string;
    name: string;
    category: OpportunityCategory;
  };
  resolutionKind: 'checked' | 'direct';
  formula: CheckedOpportunityFormula | null;
  resultGrade: OpportunityResultGrade | null;
  appliedDeltas: StatDelta[];
  lifeNodeChanges: AppliedLifeNodeChange[];
  updatedSnapshot: GameSessionSnapshot;
}
