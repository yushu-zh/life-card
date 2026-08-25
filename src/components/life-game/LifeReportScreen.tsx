import type { LifeReportViewModel } from '../../shared/types/ui.ts';

interface LifeReportScreenProps {
  vm: LifeReportViewModel;
  restartLabel: string;
  onRestart: () => void;
}

// 人生报告页：文章式 fallback 排版，无 AI 时也能输出完整 sections；
// 底部保留全宽“重新开始”主按钮。
export function LifeReportScreen({ vm, restartLabel, onRestart }: LifeReportScreenProps) {
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

      <button className="life-game__primary-button life-game__cta" onClick={onRestart}>
        {restartLabel}
      </button>
    </div>
  );
}
