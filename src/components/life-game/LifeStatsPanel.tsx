import type { LifeStatsResourceSeries, LifeStatsViewModel } from '../../shared/types/ui.ts';

// 三大类在图表中的配色：成就沿用主题金，关系用暖铜、自我用灰蓝，
// 在黑金底色上既区分清楚又不跳出整体色板。
const CATEGORY_COLORS: Record<'achievement' | 'relationship' | 'self', string> = {
  achievement: '#d9a84e',
  relationship: '#c9856a',
  self: '#7d9ec4'
};

// 资源曲线配色：金钱用金、精力用灰绿，一眼区分两条线。
const RESOURCE_COLORS = {
  money: '#d9a84e',
  energy: '#7db48a'
};

interface LifeStatsPanelProps {
  stats: LifeStatsViewModel;
}

// 人生报告第一页：纯数据统计面板。
// 全部内容来自 LifeStatsViewModel（lifeHistory 派生），不依赖 AI，进入报告页即可展示。
export function LifeStatsPanel({ stats }: LifeStatsPanelProps) {
  return (
    <div className="life-game__data">
      <HeaderSection stats={stats} />
      <CategoryBalanceSection stats={stats} />
      <UnchosenSection stats={stats} />
      <TrajectorySection stats={stats} />
      <AbilitiesSection stats={stats} />
      {stats.dice && <DiceSection dice={stats.dice} />}
      {stats.resources && <ResourcesSection resources={stats.resources} />}
      <RadarSection radar={stats.radar} />
    </div>
  );
}

// ===== 头部：一生的关键计数 =====

function HeaderSection({ stats }: LifeStatsPanelProps) {
  const { header, finalOutcomes } = stats;
  return (
    <section className="life-game__data-hero">
      <h2 className="life-game__data-hero-title">{header.nickname} 的一生</h2>
      <p className="life-game__data-hero-ages">
        {header.startAge} <span className="life-game__data-hero-ages-dash">—</span> {header.endAge}
      </p>
      <p className="life-game__data-hero-line">
        {header.choiceCount} 次人生选择 · {header.opportunityCount} 个曾经摆在面前的机会
      </p>
      <p className="life-game__data-hero-line life-game__data-hero-line--muted">
        {header.criticalSuccessCount} 次大成功 · {header.failureCount} 次失败 · {header.rerollCount} 次命运转折 ·
        经历 {header.crisisCount} 次人生危机 · {header.fateEventCount} 次命运事件
      </p>
      <div className="life-game__data-hero-outcomes">
        {finalOutcomes.map((outcome) => (
          <span key={outcome.key} className="life-game__data-hero-outcome">
            {outcome.label} <strong>{outcome.value}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

// ===== 你这一生，到底选择了什么：「机会」与「选择」分开统计 =====

function CategoryBalanceSection({ stats }: LifeStatsPanelProps) {
  const { categoryBalance } = stats;
  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">你这一生，到底选择了什么</h2>
      <div className="life-game__data-balance-head">
        <span />
        <span>出现在你面前</span>
        <span>你最终选择</span>
      </div>
      {categoryBalance.items.map((item) => (
        <div key={item.key} className="life-game__data-balance-row">
          <span className="life-game__data-balance-label" style={{ color: CATEGORY_COLORS[item.key] }}>
            {item.label}
          </span>
          <BalanceBar ratio={item.appearedRatio} percent={Math.round(item.appearedRatio * 100)} muted />
          <BalanceBar
            ratio={item.chosenRatio}
            percent={Math.round(item.chosenRatio * 100)}
            color={CATEGORY_COLORS[item.key]}
          />
        </div>
      ))}
      {categoryBalance.insight && <p className="life-game__data-insight">{categoryBalance.insight}</p>}
    </section>
  );
}

// 单条占比条：百分比文字 + 细横条。
function BalanceBar({ ratio, percent, color, muted }: { ratio: number; percent: number; color?: string; muted?: boolean }) {
  return (
    <div className="life-game__data-balance-cell">
      <span className="life-game__data-balance-percent">{percent}%</span>
      <span className="life-game__data-balance-track">
        <span
          className={`life-game__data-balance-fill${muted ? ' life-game__data-balance-fill--muted' : ''}`}
          style={{ width: `${Math.max(ratio * 100, 2)}%`, background: muted ? undefined : color }}
        />
      </span>
    </div>
  );
}

// ===== 那些没有选择的人生 =====

function UnchosenSection({ stats }: LifeStatsPanelProps) {
  const { unchosen } = stats;
  if (unchosen.totalCount === 0) return null;

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">你曾与这些人生擦肩而过</h2>
      <p className="life-game__data-unchosen-total">
        你没有选择的 <strong>{unchosen.totalCount}</strong> 张牌
      </p>
      <div className="life-game__data-unchosen-categories">
        {unchosen.byCategory.map((item) => (
          <span key={item.key} className="life-game__data-unchosen-category">
            <i style={{ background: CATEGORY_COLORS[item.key] }} />
            {item.label}机会 {item.count}
          </span>
        ))}
      </div>
      {unchosen.mostMissed.length > 0 && (
        <>
          <h3 className="life-game__data-subheading">你最常错过的机会</h3>
          <div className="life-game__data-missed-list">
            {unchosen.mostMissed.map((event) => (
              <div key={event.eventId} className="life-game__data-missed-item">
                <span className="life-game__data-missed-name">{event.name}</span>
                <span className="life-game__data-missed-count">
                  出现 {event.appearedCount} 次 / 选择 {event.chosenCount} 次
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {unchosen.missedSentence && <blockquote className="life-game__data-quote">{unchosen.missedSentence}</blockquote>}
    </section>
  );
}

// ===== 一生的选择轨迹：累计选择比例 =====

function TrajectorySection({ stats }: LifeStatsPanelProps) {
  const { trajectory } = stats;
  if (trajectory.series.every((serie) => serie.points.length === 0)) return null;

  const width = 320;
  const height = 150;
  const padX = 10;
  const padTop = 10;
  const padBottom = 22;
  const span = Math.max(trajectory.endAge - trajectory.startAge, 1);
  const x = (age: number) => padX + ((age - trajectory.startAge) / span) * (width - padX * 2);
  // 纵轴是累计占比 0..1，0 在下、100% 在上。
  const y = (ratio: number) => padTop + (1 - ratio) * (height - padTop - padBottom);

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">一生的选择轨迹</h2>
      <p className="life-game__data-caption">每个回合结束后的累计选择占比——路径是怎样形成的</p>
      <svg className="life-game__data-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="一生的选择轨迹">
        {/* 25% / 50% / 75% 参考虚线 */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={y(ratio)}
            y2={y(ratio)}
            className="life-game__data-grid-line"
          />
        ))}
        {trajectory.series.map((serie) => (
          <polyline
            key={serie.key}
            fill="none"
            stroke={CATEGORY_COLORS[serie.key]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={serie.points.map((point) => `${x(point.age)},${y(point.ratio)}`).join(' ')}
          />
        ))}
        {/* 横轴年龄端点 */}
        <text x={padX} y={height - 6} className="life-game__data-axis-label" textAnchor="start">
          {trajectory.startAge}
        </text>
        <text x={width - padX} y={height - 6} className="life-game__data-axis-label" textAnchor="end">
          {trajectory.endAge}
        </text>
      </svg>
      <div className="life-game__data-legend">
        {trajectory.series.map((serie) => {
          const finalRatio = serie.points[serie.points.length - 1]?.ratio ?? 0;
          return (
            <span key={serie.key} className="life-game__data-legend-item">
              <i style={{ background: CATEGORY_COLORS[serie.key] }} />
              {serie.label} {Math.round(finalRatio * 100)}%
            </span>
          );
        })}
      </div>
    </section>
  );
}

// ===== 能力成长：起点 → 终点 + 成长发生的阶段 =====

function AbilitiesSection({ stats }: LifeStatsPanelProps) {
  const { abilities } = stats;
  const { ageMarks } = abilities.timeline;

  // 把成长发生的年龄映射到时间轴列：每列覆盖 [mark, mark+5) 岁。
  const columnOf = (age: number) => {
    for (let i = ageMarks.length - 1; i >= 0; i -= 1) {
      if (age >= ageMarks[i]) return i;
    }
    return 0;
  };

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">
        {abilities.startAge} 岁的你 → {abilities.endAge} 岁的你
      </h2>
      <div className="life-game__data-ability-list">
        {abilities.items.map((item) => (
          <div key={item.key} className="life-game__data-ability-row">
            <span className="life-game__data-ability-label">{item.label}</span>
            <span className="life-game__data-ability-start">{item.startValue}</span>
            <span className="life-game__data-ability-line">
              <span
                className="life-game__data-ability-line-fill"
                style={{ width: `${Math.min(Math.max(item.delta, 0) * 12, 100)}%` }}
              />
            </span>
            <span className="life-game__data-ability-end">{item.endValue}</span>
            <span className="life-game__data-ability-delta">
              {item.delta > 0 ? `+${item.delta}` : item.delta}
            </span>
          </div>
        ))}
      </div>

      <h3 className="life-game__data-subheading">能力成长发生在哪些阶段</h3>
      <div
        className="life-game__data-timeline"
        style={{ gridTemplateColumns: `3.5rem repeat(${ageMarks.length}, 1fr)` }}
      >
        {/* 首行：年龄刻度 */}
        <span className="life-game__data-timeline-corner" />
        {ageMarks.map((age) => (
          <span key={age} className="life-game__data-timeline-age">
            {age}
          </span>
        ))}
        {abilities.timeline.rows.map((row) => {
          // 同一列内多次成长只画一个标记。
          const markedColumns = new Set(row.growthAges.map(columnOf));
          return [
            <span key={`${row.key}-label`} className="life-game__data-timeline-label">
              {row.label}
            </span>,
            ...ageMarks.map((age, columnIndex) => (
              <span key={`${row.key}-${age}`} className="life-game__data-timeline-cell">
                {markedColumns.has(columnIndex) ? '+' : ''}
              </span>
            ))
          ];
        })}
      </div>
    </section>
  );
}

// ===== 一生的骰运：分布、平均点与「全 7 反事实」 =====

function DiceSection({ dice }: { dice: NonNullable<LifeStatsViewModel['dice']> }) {
  const maxCount = Math.max(1, ...dice.histogram.map((bucket) => bucket.count));

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">一生的骰运</h2>
      <p className="life-game__data-hero-line">
        投掷 {dice.rollCount} 次 · 平均骰点 {dice.averageSum.toFixed(1)} · 理论平均 {dice.expectedSum.toFixed(1)}
      </p>
      <div className="life-game__data-histogram">
        {dice.histogram.map((bucket) => (
          <div key={bucket.sum} className="life-game__data-histogram-column">
            <span className="life-game__data-histogram-count">{bucket.count > 0 ? bucket.count : ''}</span>
            <span
              className="life-game__data-histogram-bar"
              style={{ height: `${(bucket.count / maxCount) * 3.5}rem` }}
            />
            <span className="life-game__data-histogram-sum">{bucket.sum}</span>
          </div>
        ))}
      </div>
      <p className="life-game__data-caption">如果所有骰子都固定为 7（平均运气）：</p>
      <p className="life-game__data-hero-line">
        实际结果更好 {dice.betterCount} 次 · 相同 {dice.sameCount} 次 · 更差 {dice.worseCount} 次
      </p>
      {dice.betterCount > 0 && (
        <p className="life-game__data-insight">其中 {dice.betterCount} 次，是骰子真正帮你跨过了门槛。</p>
      )}
      {dice.worseCount > 0 && (
        <p className="life-game__data-insight">也有 {dice.worseCount} 次，骰点把你拖过了门槛。</p>
      )}
    </section>
  );
}

// ===== 金钱与精力：一生的起伏 =====

function ResourcesSection({ resources }: { resources: NonNullable<LifeStatsViewModel['resources']> }) {
  const width = 320;
  const height = 140;
  const padX = 10;
  const padTop = 10;
  const padBottom = 22;
  const span = Math.max(resources.endAge - resources.startAge, 1);
  const x = (age: number) => padX + ((age - resources.startAge) / span) * (width - padX * 2);

  // 两条线各自按自身最小/最大值归一：金钱与精力量纲不同，
  // 玩家关心的是各自的起伏趋势（例如 40 岁后钱涨、精力一路掉）。
  const buildPoints = (series: LifeStatsResourceSeries) => {
    const values = series.points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    return series.points
      .map((point) => {
        const y = padTop + (1 - (point.value - min) / range) * (height - padTop - padBottom);
        return `${x(point.age)},${y}`;
      })
      .join(' ');
  };

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">一生的起伏</h2>
      <p className="life-game__data-caption">金钱与精力，是人生过程中用于交换的资源</p>
      <svg className="life-game__data-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="金钱与精力曲线">
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={padTop + ratio * (height - padTop - padBottom)}
            y2={padTop + ratio * (height - padTop - padBottom)}
            className="life-game__data-grid-line"
          />
        ))}
        <polyline
          fill="none"
          stroke={RESOURCE_COLORS.money}
          strokeWidth="2"
          strokeLinejoin="round"
          points={buildPoints(resources.money)}
        />
        <polyline
          fill="none"
          stroke={RESOURCE_COLORS.energy}
          strokeWidth="2"
          strokeLinejoin="round"
          points={buildPoints(resources.energy)}
        />
        <text x={padX} y={height - 6} className="life-game__data-axis-label" textAnchor="start">
          {resources.startAge}
        </text>
        <text x={width - padX} y={height - 6} className="life-game__data-axis-label" textAnchor="end">
          {resources.endAge}
        </text>
      </svg>
      <div className="life-game__data-legend">
        <span className="life-game__data-legend-item">
          <i style={{ background: RESOURCE_COLORS.money }} />
          金钱 {resources.money.startValue} → {resources.money.endValue}
        </span>
        <span className="life-game__data-legend-item">
          <i style={{ background: RESOURCE_COLORS.energy }} />
          精力 {resources.energy.startValue} → {resources.energy.endValue}
        </span>
      </div>
    </section>
  );
}

// ===== 最终五维雷达图 =====

function RadarSection({ radar }: { radar: LifeStatsViewModel['radar'] }) {
  const size = 220;
  const center = size / 2;
  const radius = 74;
  const axisCount = radar.axes.length;

  // 第 i 个轴的端点坐标：从正上方开始顺时针均布。
  const point = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / axisCount - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio
    };
  };

  const valuePolygon = radar.axes
    .map((axis, index) => {
      const p = point(index, Math.min(axis.value / radar.scaleMax, 1));
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <section className="life-game__report-section">
      <h2 className="life-game__report-heading">最终的人生</h2>
      <svg
        className="life-game__data-radar"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="幸福、自由、健康、阅历、影响五维雷达图"
      >
        {/* 33% / 66% / 100% 三圈五边形网格 */}
        {[1 / 3, 2 / 3, 1].map((ratio) => (
          <polygon
            key={ratio}
            className="life-game__data-radar-grid"
            points={radar.axes.map((_, index) => {
              const p = point(index, ratio);
              return `${p.x},${p.y}`;
            }).join(' ')}
          />
        ))}
        {/* 轴线 */}
        {radar.axes.map((axis, index) => {
          const p = point(index, 1);
          return <line key={axis.key} x1={center} y1={center} x2={p.x} y2={p.y} className="life-game__data-radar-grid" />;
        })}
        {/* 实际取值多边形 */}
        <polygon className="life-game__data-radar-shape" points={valuePolygon} />
        {/* 轴标签与数值 */}
        {radar.axes.map((axis, index) => {
          const p = point(index, 1.22);
          return (
            <text key={axis.key} x={p.x} y={p.y} className="life-game__data-radar-label" textAnchor="middle" dominantBaseline="middle">
              {axis.label} {axis.value}
            </text>
          );
        })}
      </svg>
    </section>
  );
}
