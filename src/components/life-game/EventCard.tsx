import type { TurnCardViewModel } from '../../shared/types/ui.ts';

interface EventCardProps {
  card: TurnCardViewModel;
  onSelect: (slotIndex: number) => void;
}

// 单张事件卡：整张可点击。
// 布局对齐 docs/ui/reference/事件界面.png：金色标题、短描述、检定行，
// 以及“可能收获 / 固定代价 / 失败风险”三行前缀金色、内容浅色的行内文本。
export function EventCard({ card, onSelect }: EventCardProps) {
  const classNames = ['life-game__card'];
  if (card.isSelected) classNames.push('life-game__card--selected');
  if (card.isDisabled) classNames.push('life-game__card--disabled');

  // AI 文案存在时，用一段描述替代默认短描述；标题始终用骨架事件名，不用 AI 生成。
  const narrative = card.narrative;
  const description = narrative?.description ?? card.shortDescription;

  return (
    <div
      className={classNames.join(' ')}
      onClick={() => !card.isDisabled && onSelect(card.slotIndex)}
      role="button"
      tabIndex={card.isDisabled ? -1 : 0}
      aria-disabled={card.isDisabled}
    >
      <h3 className="life-game__card-title">{card.title}</h3>
      <p className="life-game__card-description">{description}</p>
      <div className="life-game__card-check">{card.checkLabel}</div>

      <div className="life-game__card-hints">
        <HintRow label="可能收获" items={card.rewards} />
        <HintRow label="固定代价" items={card.fixedCosts} />
        <HintRow label="失败风险" items={card.risks} />
      </div>
    </div>
  );
}

interface HintRowProps {
  label: string;
  items: string[];
}

// 单行后果提示：金色前缀 + 逗号连接的内容；无内容时不渲染该行。
function HintRow({ label, items }: HintRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="life-game__card-hint">
      <span className="life-game__card-hint-label">{label}：</span>
      {items.join('，')}
    </div>
  );
}
