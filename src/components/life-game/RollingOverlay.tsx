interface RollingOverlayProps {
  title: string;
  loadingText: string;
}

// 掷骰过渡覆盖层：仅在需要检定时短暂展示。
// 布局对齐 docs/ui/reference/掷骰界面.png：事件标题在上、金色二十面骰居中、
// 下方一行“正在判定结果…”；reduced-motion 下退化为静态展示。
export function RollingOverlay({ title, loadingText }: RollingOverlayProps) {
  return (
    <div className="life-game__rolling-overlay" role="status" aria-live="polite">
      <h2 className="life-game__rolling-title">{title}</h2>
      <D20Dice />
      <p className="life-game__rolling-text">{loadingText}</p>
    </div>
  );
}

// 金色二十面骰：正六边形轮廓 + 内部三角分割线的线框 SVG。
function D20Dice() {
  return (
    <svg
      className="life-game__d20"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* 外轮廓：正六边形 */}
      <polygon
        points="50,4 92,28 92,72 50,96 8,72 8,28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="rgba(217, 168, 78, 0.08)"
      />
      {/* 内部三角分割：上三角与下三角 */}
      <polyline
        points="8,28 50,50 92,28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polyline
        points="8,72 50,50 92,72"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="50" y1="4" x2="50" y2="50" stroke="currentColor" strokeWidth="1.5" />
      <line x1="50" y1="50" x2="50" y2="96" stroke="currentColor" strokeWidth="1.5" />
      <polyline
        points="8,28 29,72"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polyline
        points="92,28 71,72"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="8" y1="72" x2="29" y2="72" stroke="currentColor" strokeWidth="1.5" />
      <line x1="92" y1="72" x2="71" y2="72" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
