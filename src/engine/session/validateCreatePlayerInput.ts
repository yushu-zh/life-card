import type { CreatePlayerInput, InitialStateConfig } from '../../shared/types/bootstrap.ts';
import { assertMaxLength, isNonNegativeInteger, sumNumbers } from '../../shared/utils/validation.ts';

const ABILITY_KEYS = ['cognition', 'execution', 'social', 'creativity', 'adaptability'] as const;

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
