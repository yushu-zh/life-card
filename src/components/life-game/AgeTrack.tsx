interface AgeTrackProps {
  marks: number[];
  currentAge: number;
  label: string;
}

// 人生刻度带：左右端点年龄 + 一条细线 + 当前年龄发光点。
// 视觉对齐 docs/ui/reference/事件界面.png（端点 20/80 + 当前位置高亮点）。
export function AgeTrack({ marks, currentAge, label }: AgeTrackProps) {
  if (marks.length === 0) return null;

  const minAge = marks[0];
  const maxAge = marks[marks.length - 1];
  // 当前年龄在轨道上的相对位置（0 ~ 1）。
  const ratio = maxAge === minAge ? 0 : Math.min(1, Math.max(0, (currentAge - minAge) / (maxAge - minAge)));

  return (
    <div className="life-game__age-track" role="img" aria-label={`${label}：${currentAge} 岁`}>
      <span className="life-game__age-track-end">{minAge}</span>
      <div className="life-game__age-track-line">
        <div className="life-game__age-track-dot" style={{ left: `${ratio * 100}%` }} />
      </div>
      <span className="life-game__age-track-end">{maxAge}</span>
    </div>
  );
}
