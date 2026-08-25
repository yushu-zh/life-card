import type { TurnResolutionDeltaItem } from '../../shared/types/ui.ts';

interface DeltaListProps {
  deltas: TurnResolutionDeltaItem[];
}

// 结构化数值变化列表：每行“属性名 + 变化值”，变化值用金色强调。
// 视觉对齐 docs/ui/reference/结果界面.png。
export function DeltaList({ deltas }: DeltaListProps) {
  if (deltas.length === 0) {
    return <div className="life-game__form-hint">无数值变化</div>;
  }

  return (
    <div className="life-game__delta-list">
      {deltas.map((delta) => {
        const sign = delta.amount > 0 ? '+' : '';
        const toneClass =
          delta.amount === 0 ? 'life-game__delta-amount--muted' : '';

        return (
          <div key={delta.key} className="life-game__delta-item">
            <span className="life-game__delta-label">{delta.label}</span>
            <span className={`life-game__delta-amount ${toneClass}`}>
              {sign}{delta.amount}
            </span>
          </div>
        );
      })}
    </div>
  );
}
