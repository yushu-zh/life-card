import type { AbilityKey, CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { CreatePlayerViewModel } from '../../shared/types/ui.ts';

interface CreatePlayerScreenProps {
  vm: CreatePlayerViewModel;
  onChange: (draft: CreatePlayerInput) => void;
  onAppIdChange: (value: string) => void;
  onStart: () => void;
}

// 创建人物界面：单列布局，App ID / 昵称 / 技能 / 学历 / 行业 / 愿望 + 能力分配面板 + 全宽开始按钮。
// 视觉对齐 docs/ui/reference/创建人物界面.png。
export function CreatePlayerScreen({ vm, onChange, onAppIdChange, onStart }: CreatePlayerScreenProps) {
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
          placeholder={vm.labels.nicknamePlaceholder}
          value={profile.nickname}
          onChange={(e) => updateProfile({ nickname: e.target.value })}
        />
        {vm.errors.nickname && <div className="life-game__form-error">{vm.errors.nickname}</div>}
      </div>

      <div className="life-game__form-group">
        <label className="life-game__form-label" htmlFor="app-id">
          {vm.labels.appId}
        </label>
        <input
          id="app-id"
          className="life-game__input"
          placeholder={vm.labels.appIdPlaceholder}
          value={vm.appId}
          onChange={(e) => onAppIdChange(e.target.value)}
        />
        {vm.errors.appId && <div className="life-game__form-error">{vm.errors.appId}</div>}
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
        onClick={onStart}
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
