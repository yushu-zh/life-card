import type { AbilityKey, CreatePlayerInput, InitialStateConfig } from '../../shared/types/bootstrap.ts';
import type { CreatePlayerViewModel, Phase4PresentationConfig } from '../../shared/types/ui.ts';
import { sumNumbers } from '../../shared/utils/validation.ts';

// 能力键的固定顺序，和展示配置保持一致。
const ABILITY_ORDER: AbilityKey[] = ['cognition', 'execution', 'social', 'creativity', 'adaptability'];

// 把创建玩家输入映射成前端可直接渲染的 ViewModel。
// ViewModel 里包含即时校验结果、按钮禁用状态和 ability 操作状态，
// 组件只需要根据这些布尔值渲染，不用自己判断规则。
export function buildCreatePlayerViewModel(
  draft: CreatePlayerInput,
  config: InitialStateConfig,
  presentation: Phase4PresentationConfig
): CreatePlayerViewModel {
  const labels = presentation.labels.createPlayer;
  const totalAllocated = sumNumbers(ABILITY_ORDER.map((key) => draft.abilities[key]));
  const remainingPoints = config.abilityPointTotal - totalAllocated;

  const errors = collectFieldErrors(draft, config);
  const disabledReason = buildDisabledReason(draft, config, remainingPoints, errors, presentation);

  const abilityItems = ABILITY_ORDER.map((key) => {
    const value = draft.abilities[key];
    const canIncrease = value < config.abilityMax && remainingPoints > 0;
    const canDecrease = value > 0;

    return {
      key,
      label: presentation.statLabels[key],
      value,
      canIncrease,
      canDecrease
    };
  });

  return {
    title: labels.title,
    subtitle: labels.subtitle,
    labels: {
      nickname: labels.nickname,
      nicknamePlaceholder: labels.nicknamePlaceholder,
      skillTags: labels.skillTags,
      skillTagsPlaceholder: labels.skillTagsPlaceholder,
      skillTagsAction: labels.skillTagsAction,
      education: labels.education,
      educationPlaceholder: labels.educationPlaceholder,
      industry: labels.industry,
      industryPlaceholder: labels.industryPlaceholder,
      wishes: labels.wishes,
      wishesPlaceholder: labels.wishesPlaceholder,
      wishesAction: labels.wishesAction
    },
    draft,
    limits: {
      skillTagLimit: config.skillTagLimit,
      wishLimit: config.wishLimit,
      abilityPointTotal: config.abilityPointTotal,
      abilityMax: config.abilityMax
    },
    abilityItems,
    remainingPoints,
    remainingPointsLabel: labels.remainingPointsTemplate
      .replace('{remaining}', String(remainingPoints))
      .replace('{total}', String(config.abilityPointTotal)),
    errors,
    canStart: disabledReason === null,
    disabledReason,
    startActionLabel: labels.startAction
  };
}

// 收集表单字段级别的错误提示。
function collectFieldErrors(
  draft: CreatePlayerInput,
  config: InitialStateConfig
): CreatePlayerViewModel['errors'] {
  const errors: CreatePlayerViewModel['errors'] = {};

  if (!draft.profile.nickname.trim()) {
    errors.nickname = '昵称不能为空';
  }

  if (draft.profile.skillTags.length > config.skillTagLimit) {
    errors.skillTags = `技能标签不能超过 ${config.skillTagLimit} 个`;
  }

  if (draft.profile.wishes.length > config.wishLimit) {
    errors.wishes = `愿望不能超过 ${config.wishLimit} 个`;
  }

  const total = sumNumbers(ABILITY_ORDER.map((key) => draft.abilities[key]));
  if (total !== config.abilityPointTotal) {
    errors.abilities = `能力点数总和必须等于 ${config.abilityPointTotal}`;
  }

  for (const key of ABILITY_ORDER) {
    const value = draft.abilities[key];
    if (!Number.isInteger(value) || value < 0 || value > config.abilityMax) {
      errors.abilities = `每项能力必须是 0 ~ ${config.abilityMax} 的整数`;
      break;
    }
  }

  return errors;
}

// 构造主按钮禁用原因；返回 null 表示可以开始。
function buildDisabledReason(
  draft: CreatePlayerInput,
  config: InitialStateConfig,
  remainingPoints: number,
  errors: CreatePlayerViewModel['errors'],
  presentation: Phase4PresentationConfig
): string | null {
  if (!draft.profile.nickname.trim()) {
    return '请先填写昵称';
  }

  if (draft.profile.skillTags.length > config.skillTagLimit) {
    return `技能标签不能超过 ${config.skillTagLimit} 个`;
  }

  if (draft.profile.wishes.length > config.wishLimit) {
    return `愿望不能超过 ${config.wishLimit} 个`;
  }

  if (remainingPoints !== 0) {
    const label = presentation.labels.createPlayer.remainingPointsTemplate
      .replace('{remaining}', String(remainingPoints))
      .replace('{total}', String(config.abilityPointTotal));
    return remainingPoints > 0 ? `${label}，请继续分配` : `超出可用点数，请重新分配`;
  }

  if (Object.keys(errors).length > 0) {
    return '请修正表单错误后再开始';
  }

  return null;
}
