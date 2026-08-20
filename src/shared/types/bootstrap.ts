export type AbilityKey = 'cognition' | 'execution' | 'social' | 'creativity' | 'adaptability';

export interface CreatePlayerInput {
  profile: {
    nickname: string;
    skillTags: string[];
    education: string;
    industry: string;
    wishes: string[];
  };
  abilities: Record<AbilityKey, number>;
}

export interface InitialStateConfig {
  abilityPointTotal: number;
  abilityMax: number;
  initialResources: {
    money: number;
    energy: number;
    happiness: number;
    freedom: number;
    health: number;
    experience: number;
    influence: number;
  };
  skillTagLimit: number;
  wishLimit: number;
}
