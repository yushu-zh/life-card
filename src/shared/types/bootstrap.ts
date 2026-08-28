export type AbilityKey = 'cognition' | 'execution' | 'social' | 'creativity' | 'adaptability';

export interface CreatePlayerInput {
  profile: {
    nickname: string;
    // 性别为自由文本，接受一切输入；可选，旧存档没有此字段时按未填写处理。
    gender?: string;
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
