import type { AbilityKey, CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { CreatePlayerViewModel } from '../../shared/types/ui.ts';

interface CreatePlayerScreenProps {
  vm: CreatePlayerViewModel;
  onChange: (draft: CreatePlayerInput) => void;
  onAppIdChange: (value: string) => void;
  onDeepSeekApiKeyChange: (value: string) => void;
  // draftOverride：点击开始时若技能/愿望输入框里还有未点「添加」的文字，
  // 组件会把它们合并进草稿后一并传出，避免依赖 setState 的异步时序。
  onStart: (draftOverride?: CreatePlayerInput) => void;
}

// 创建人物界面：单列布局，App ID / DeepSeek API Key / 昵称 / 技能 / 学历 / 行业 / 愿望 + 能力分配面板 + 全宽开始按钮。
// 视觉对齐 docs/ui/reference/创建人物界面.png。
// 安卓输入法/浏览器的防御性属性：部分 Android 键盘（自动纠错、联想输入）
// 在与受控 input 交互时会偶发内容截断，关闭这些行为并禁用自动填充可规避。
const ANDROID_SAFE_INPUT_PROPS = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false
} as const;

export function CreatePlayerScreen({
  vm,
  onChange,
  onAppIdChange,
  onDeepSeekApiKeyChange,
  onStart
}: CreatePlayerScreenProps) {
  const { profile } = vm.draft;

  function updateProfile(updates: Partial<CreatePlayerInput['profile']>) {
    onChange({
      ...vm.draft,
      profile: { ...profile, ...updates }
    });
  }

  function addTag(field: 'skillTags' | 'wishes') {
    const inputId = `new-${field}`;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const value = input?.value.trim() ?? '';

    if (!value) return;

    const current = profile[field];
    if (current.includes(value)) return;

    updateProfile({ [field]: [...current, value] });
    if (input) input.value = '';
  }

  function removeTag(field: 'skillTags' | 'wishes', index: number) {
    const next = [...profile[field]];
    next.splice(index, 1);
    updateProfile({ [field]: next });
  }

  // 开始游戏前兜底：把标签输入框里还没点「添加」的文字也合并进草稿。
  // 玩家很容易忘点添加，这里默默收下，不额外弹提示；超出上限或与已有标签重复时忽略。
  function flushPendingTag(field: 'skillTags' | 'wishes', draftProfile: CreatePlayerInput['profile']) {
    const input = document.getElementById(`new-${field}`) as HTMLInputElement | null;
    const value = input?.value.trim() ?? '';
    if (!value) return draftProfile;

    const limit = field === 'skillTags' ? vm.limits.skillTagLimit : vm.limits.wishLimit;
    const current = draftProfile[field];
    if (current.includes(value) || current.length >= limit) return draftProfile;

    if (input) input.value = '';
    return { ...draftProfile, [field]: [...current, value] };
  }

  function handleStart() {
    let profile = flushPendingTag('skillTags', vm.draft.profile);
    profile = flushPendingTag('wishes', profile);

    // 没有待添加的标签时按原路径走，避免多余的状态更新。
    if (profile === vm.draft.profile) {
      onStart();
      return;
    }

    // 同步父层草稿保持界面一致；同时把合并后的草稿直接传给 onStart，
    // 防止父层 handleStart 读到的还是 setState 之前的旧草稿。
    const nextDraft: CreatePlayerInput = { ...vm.draft, profile };
    onChange(nextDraft);
    onStart(nextDraft);
  }

  function updateAbility(key: AbilityKey, delta: number) {
    const nextValue = vm.draft.abilities[key] + delta;
    onChange({
      ...vm.draft,
      abilities: { ...vm.draft.abilities, [key]: nextValue }
    });
  }

  return (
    <div className="life-game__container">
      {/* 页头：左侧标题 + 右侧金色引导语 */}
      <header className="life-game__page-head">
        <h1 className="life-game__title">{vm.title}</h1>
        <span className="life-game__page-tagline">{vm.subtitle}</span>
      </header>

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="nickname">
          {vm.labels.nickname}
        </label>
        <input
          id="nickname"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.nicknamePlaceholder}
          value={profile.nickname}
          onChange={(e) => updateProfile({ nickname: e.target.value })}
        />
        {vm.errors.nickname && <div className="life-game__form-error">{vm.errors.nickname}</div>}
      </div>

      {/* 性别为自由文本，接受一切输入；留空时由 AI 结合其他背景合理推测 */}
      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="gender">
          {vm.labels.gender}
        </label>
        <input
          id="gender"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.genderPlaceholder}
          value={profile.gender ?? ''}
          onChange={(e) => updateProfile({ gender: e.target.value })}
        />
      </div>

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="app-id">
          {vm.labels.appId}
        </label>
        <input
          id="app-id"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.appIdPlaceholder}
          value={vm.appId}
          onChange={(e) => onAppIdChange(e.target.value)}
        />
        <div className="life-game__form-hint">{vm.labels.appIdHint}</div>
      </div>

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="deepseek-api-key">
          {vm.labels.deepseekApiKey}
        </label>
        <input
          id="deepseek-api-key"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.deepseekApiKeyPlaceholder}
          value={vm.deepseekApiKey}
          onChange={(e) => onDeepSeekApiKeyChange(e.target.value)}
        />
        {vm.errors.aiCredential && (
          <div className="life-game__form-error">{vm.errors.aiCredential}</div>
        )}
      </div>

      {/* 选填说明：技能/学历/行业/愿望都可留空，AI 会根据已填内容推测 */}
      <div className="life-game__form-hint" style={{ marginBottom: 'var(--space-sm)' }}>
        {vm.labels.optionalFieldsHint}
      </div>

      <TagField
        label={vm.labels.skillTags}
        placeholder={vm.labels.skillTagsPlaceholder}
        actionLabel={vm.labels.skillTagsAction}
        field="skillTags"
        tags={profile.skillTags}
        error={vm.errors.skillTags}
        onAdd={() => addTag('skillTags')}
        onRemove={(index) => removeTag('skillTags', index)}
      />

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="education">
          {vm.labels.education}
        </label>
        <input
          id="education"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.educationPlaceholder}
          value={profile.education}
          onChange={(e) => updateProfile({ education: e.target.value })}
        />
      </div>

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="industry">
          {vm.labels.industry}
        </label>
        <input
          id="industry"
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={vm.labels.industryPlaceholder}
          value={profile.industry}
          onChange={(e) => updateProfile({ industry: e.target.value })}
        />
      </div>

      <TagField
        label={vm.labels.wishes}
        placeholder={vm.labels.wishesPlaceholder}
        actionLabel={vm.labels.wishesAction}
        field="wishes"
        tags={profile.wishes}
        error={vm.errors.wishes}
        onAdd={() => addTag('wishes')}
        onRemove={(index) => removeTag('wishes', index)}
      />

      {/* 能力分配面板：标题 + 剩余点数（金色），圆形步进按钮 */}
      <section className="life-game__ability-panel">
        <div className="life-game__ability-panel-head">
          <span>{vm.labels.abilitiesTitle}</span>
          <span className="life-game__ability-remaining">{vm.remainingPointsLabel}</span>
        </div>

        {vm.errors.abilities && (
          <div className="life-game__form-error" style={{ marginBottom: 'var(--space-sm)' }}>
            {vm.errors.abilities}
          </div>
        )}

        <div className="life-game__ability-list">
          {vm.abilityItems.map((item) => (
            <div key={item.key} className="life-game__ability-item">
              <span className="life-game__ability-name">{item.label}</span>
              <div className="life-game__ability-stepper">
                <button
                  className="life-game__stepper-button"
                  disabled={!item.canDecrease}
                  onClick={() => updateAbility(item.key, -1)}
                  aria-label={`减少 ${item.label}`}
                >
                  −
                </button>
                <span className="life-game__ability-value">{item.value}</span>
                <button
                  className="life-game__stepper-button life-game__stepper-button--plus"
                  disabled={!item.canIncrease}
                  onClick={() => updateAbility(item.key, 1)}
                  aria-label={`增加 ${item.label}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {vm.disabledReason && (
        <div className="life-game__form-hint" style={{ marginTop: 'var(--space-md)' }}>
          {vm.disabledReason}
        </div>
      )}
      <button
        className="life-game__primary-button life-game__cta"
        disabled={!vm.canStart}
        onClick={handleStart}
      >
        {vm.startActionLabel}
      </button>
    </div>
  );
}

interface TagFieldProps {
  label: string;
  placeholder: string;
  actionLabel: string;
  field: 'skillTags' | 'wishes';
  tags: string[];
  error?: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

// 标签输入字段：输入框 + 金色添加按钮 + 金边胶囊标签。
function TagField({
  label,
  placeholder,
  actionLabel,
  field,
  tags,
  error,
  onAdd,
  onRemove
}: TagFieldProps) {
  return (
    <div className="life-game__form-group">
      <label className="life-game__form-label" htmlFor={`new-${field}`}>
        {label}
      </label>
      <div className="life-game__chip-input-row">
        <input
          id={`new-${field}`}
          className="life-game__input"
          {...ANDROID_SAFE_INPUT_PROPS}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button className="life-game__add-button" onClick={onAdd}>
          {actionLabel}
        </button>
      </div>
      {tags.length > 0 && (
        <div className="life-game__chip-row">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="life-game__chip">
              {tag}
              <button
                className="life-game__chip-remove"
                onClick={() => onRemove(index)}
                aria-label={`移除 ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <div className="life-game__form-error">{error}</div>}
    </div>
  );
}
