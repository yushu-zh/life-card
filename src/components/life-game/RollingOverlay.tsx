interface RollingOverlayProps {
  title: string;
  loadingText?: string;
}

// 掷骰过渡覆盖层：仅在需要检定时短暂展示。
// 中央为两颗金色六面骰的滚动动画，上方为阶段标题；
// 仅在提供 loadingText 时才额外显示底部提示行（避免与标题重复两套文案）。
export function RollingOverlay({ title, loadingText }: RollingOverlayProps) {
  return (
    <div className="life-game__rolling-overlay" role="status" aria-live="polite">
      <h2 className="life-game__rolling-title">{title}</h2>
      <div className="life-game__dice">
        <Die face={5} className="life-game__die" />
        <Die face={3} className="life-game__die life-game__die--second" />
      </div>
      {loadingText && <p className="life-game__rolling-text">{loadingText}</p>}
    </div>
  );
}

// 各点数的骰面布局（100x100 坐标系）：只用到动画里展示的两面。
const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  3: [
    [28, 28],
    [50, 50],
    [72, 72]
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72]
  ]
};

// 金色六面骰：圆角方框描边 + 实心金色点数，线框风格与整体黑金质感一致。
function Die({ face, className }: { face: 3 | 5; className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="18"
        stroke="currentColor"
        strokeWidth="3"
        fill="rgba(217, 168, 78, 0.08)"
      />
      {PIP_POSITIONS[face].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill="currentColor" />
      ))}
    </svg>
  );
}
