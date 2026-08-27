import type { TurnOverviewViewModel } from '../../shared/types/ui.ts';

interface StatGridProps {
  stats: TurnOverviewViewModel['stats'];
}

// 状态面板：单个深色卡片，内部分三行分组——
// 能力、资源、人生指标各占一行，每行为「侧边标题 + 数值横向连排」。
// 视觉对齐 docs/ui/reference/事件界面.png 的紧凑数值排布。
export function StatGrid({ stats }: StatGridProps) {
  return (
    <section className="life-game__stats-panel">
      <StatRow label={stats.abilitiesTitle} items={stats.abilities} />
      <StatRow label={stats.resourcesTitle} items={stats.resources} />
      <StatRow label={stats.outcomesTitle} items={stats.outcomes} />
    </section>
  );
}

// 单行分组：左侧分组标题 + 右侧横向流式排布的数值项。
function StatRow({
  label,
  items
}: {
  label: string;
  items: Array<{ key: string; label: string; value: number; tone: string }>;
}) {
  return (
    <div className="life-game__stat-row">
      <span className="life-game__stat-heading">{label}</span>
      <div className="life-game__stat-items">
        {items.map((item) => (
          <StatItem key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

// 单个数值项：完整属性名 + 数值横向连排，基线对齐。
function StatItem({
  item
}: {
  item: { key: string; label: string; value: number; tone: string };
}) {
  return (
    <span className="life-game__stat">
      <span className="life-game__stat-name">{item.label}</span>
      <span className={`life-game__stat-value life-game__stat-value--${item.tone}`}>
        {item.value}
      </span>
    </span>
  );
}
