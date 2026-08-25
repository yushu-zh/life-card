import type { UiRiskHint } from '../../shared/types/ui.ts';

interface RiskHintBarProps {
  hint: UiRiskHint | null;
}

// 风险提示条：仅在有风险时展示，不展示概率和阈值公式。
export function RiskHintBar({ hint }: RiskHintBarProps) {
  if (!hint) return null;

  return (
    <div className={`life-game__risk-hint life-game__risk-hint--${hint.tone}`}>
      <div className="life-game__risk-hint-title">{hint.title}</div>
      <div className="life-game__risk-hint-text">{hint.text}</div>
    </div>
  );
}
