interface RollingOverlayProps {
  title: string;
  loadingText?: string;
}

// 掷骰过渡覆盖层：仅在需要检定时短暂展示。
// 中央为两颗金色六面骰的 3D 滚动动画，上方为阶段标题；
// 仅在提供 loadingText 时才额外显示底部提示行（避免与标题重复两套文案）。
export function RollingOverlay({ title, loadingText }: RollingOverlayProps) {
  return (
    <div className="life-game__rolling-overlay" role="status" aria-live="polite">
      <h2 className="life-game__rolling-title">{title}</h2>
      <div className="life-game__dice">
        <Die className="life-game__die" />
        <Die className="life-game__die life-game__die--second" />
      </div>
      {loadingText && <p className="life-game__rolling-text">{loadingText}</p>}
    </div>
  );
}

// 各点数在 3x3 网格中的布局（1 表示该格有点），行列优先。
const FACE_PIPS: Record<number, number[]> = {
  1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
  3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
  5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  6: [1, 0, 1, 1, 0, 1, 1, 0, 1]
};

// 立方体六个面的朝向；对面点数之和为 7（1-6、2-5、3-4），与真实骰子一致。
const CUBE_FACES: Array<{ face: number; className: string }> = [
  { face: 5, className: 'life-game__die-face--front' },
  { face: 2, className: 'life-game__die-face--back' },
  { face: 3, className: 'life-game__die-face--right' },
  { face: 4, className: 'life-game__die-face--left' },
  { face: 1, className: 'life-game__die-face--top' },
  { face: 6, className: 'life-game__die-face--bottom' }
];

// 金色 3D 六面骰：CSS 立方体，六面均为金色线框 + 实心金色点数，
// 黑金配色与原有 2D 线框骰一致，仅将翻滚动画升级为立体转动。
function Die({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="life-game__die-cube">
        {CUBE_FACES.map(({ face, className: faceClass }) => (
          <div key={face} className={`life-game__die-face ${faceClass}`}>
            {FACE_PIPS[face].map((hasPip, index) => (
              <span
                key={index}
                className={
                  hasPip ? 'life-game__die-pip' : 'life-game__die-pip life-game__die-pip--empty'
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
