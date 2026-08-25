interface GameOverScreenProps {
  title: string;
  subtitle: string;
  reportActionLabel: string;
  onReport: () => void;
}

// 终局页：只陈述结束事实 + 具体原因 + 人生报告入口，不做长篇总结。
export function GameOverScreen({ title, subtitle, reportActionLabel, onReport }: GameOverScreenProps) {
  return (
    <div className="life-game__container">
      <div className="life-game__game-over">
        <h1 className="life-game__rolling-title">{title}</h1>
        <p className="life-game__game-over-reason">{subtitle}</p>
        <button className="life-game__primary-button life-game__cta" onClick={onReport}>
          {reportActionLabel}
        </button>
      </div>
    </div>
  );
}
