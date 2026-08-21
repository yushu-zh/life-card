import type { CreatePlayerInput, InitialStateConfig } from '../../shared/types/bootstrap.ts';
import { assertMaxLength, isNonNegativeInteger, sumNumbers } from '../../shared/utils/validation.ts';

// 创建角色时只能分配这五项基础能力。
const ABILITY_KEYS = ['cognition', 'execution', 'social', 'creativity', 'adaptability'] as const;

// 检查创建玩家时传入的数据是否合法。
// 创建初始快照前先做输入校验，保证进入 GameSessionSnapshot 的是完整且自洽的开局数据。
export function validateCreatePlayerInput(input: CreatePlayerInput, config: InitialStateConfig): void {
  if (!input.profile.nickname.trim()) {
    throw new Error('Nickname is required');
  }

  assertMaxLength(input.profile.skillTags, config.skillTagLimit, 'Skill tags');
  assertMaxLength(input.profile.wishes, config.wishLimit, 'Wishes');

  for (const key of ABILITY_KEYS) {
    const value = input.abilities[key];

    if (!isNonNegativeInteger(value)) {
      throw new Error(`Ability ${key} must be an integer`);
    }

    if (value > config.abilityMax) {
      throw new Error(`Ability ${key} cannot exceed ${config.abilityMax}`);
    }
  }

  if (sumNumbers(ABILITY_KEYS.map((key) => input.abilities[key])) !== config.abilityPointTotal) {
    throw new Error(`Ability total must equal ${config.abilityPointTotal}`);
  }
}
