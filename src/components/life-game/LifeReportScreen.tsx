import type { LifeReportViewModel } from '../../shared/types/ui.ts';

interface LifeReportScreenProps {
  vm: LifeReportViewModel;
  restartLabel: string;
  onRestart: () => void;
  // 重新生成报告：始终提供，允许在 fallback 或已生成报告上重新请求 AI。
  retryLabel: string;
  onRetry: () => void;
  // 导出人生记录。
  exportLabel: string;
  onExport: () => void;
}

// 人生报告页：文章式 fallback 排版，无 AI 时也能输出完整 sections；
// 底部保留「重新生成」「导出人生记录」「重新开始」三个动作。
export function LifeReportScreen({
  vm,
  restartLabel,
  retryLabel,
  exportLabel,
  onRestart,
  onRetry,
  onExport
}: LifeReportScreenProps) {
  return (
    <div className="life-game__container">
      <header className="life-game__report-head">
        <h1 className="life-game__title">{vm.title}</h1>
        <p className="life-game__subtitle">{vm.subtitle}</p>
      </header>

      {vm.sections.map((section, index) => (
        <section key={index} className="life-game__report-section">
          <h2 className="life-game__report-heading">{section.heading}</h2>
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={pIndex} className="life-game__report-paragraph">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section className="life-game__report-section">
        <h2 className="life-game__report-heading">{vm.finalStatsHeading}</h2>
        <div className="life-game__report-stats">
          <div className="life-game__stats-items">
            {vm.finalStats.map((stat) => (
              <div key={stat.key} className="life-game__stats-item">
                <span className="life-game__stats-label">{stat.label}</span>
                <span className="life-game__stats-value">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="life-game__report-actions">
        <button className="life-game__secondary-button" onClick={onRetry}>
          {retryLabel}
        </button>
        <button className="life-game__secondary-button" onClick={onExport}>
          {exportLabel}
        </button>
      </div>

      <button className="life-game__primary-button life-game__cta" onClick={onRestart}>
        {restartLabel}
      </button>
    </div>
  );
}
