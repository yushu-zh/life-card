import type { TurnOverviewViewModel } from '../../shared/types/ui.ts';

interface StatGridProps {
  stats: TurnOverviewViewModel['stats'];
}

// 状态面板：单个深色卡片内含能力 / 资源 / 结算指标三组，
// 资源与结算指标之间用分隔线隔开（UX 要求的视觉分隔）。
// 视觉对齐 docs/ui/reference/事件界面.png。
export function StatGrid({ stats }: StatGridProps) {
  return (
    <section className="life-game__stats-panel">
      <StatGroup title={stats.abilitiesTitle} items={stats.abilities} />
      <StatGroup title={stats.resourcesTitle} items={stats.resources} />
      <hr className="life-game__stats-divider" />
      <StatGroup title={stats.outcomesTitle} items={stats.outcomes} />
    </section>
  );
}

interface StatGroupProps {
  title: string;
  items: Array<{ key: string; label: string; value: number; tone: string }>;
}

// 单组数值：弱色小标题 + 两列“名称 + 数值”项。
function StatGroup({ title, items }: StatGroupProps) {
  return (
    <div className="life-game__stats-group">
      <div className="life-game__stats-group-title">{title}</div>
      <div className="life-game__stats-items">
        {items.map((item) => (
          <div key={item.key} className="life-game__stats-item">
            <span className="life-game__stats-label">{item.label}</span>
            <span className={`life-game__stats-value life-game__stats-value--${item.tone}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
