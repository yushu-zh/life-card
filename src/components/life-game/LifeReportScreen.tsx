import { useState } from 'react';

import type { LifeReportViewModel, LifeStatsViewModel } from '../../shared/types/ui.ts';
import { LifeStatsPanel } from './LifeStatsPanel.tsx';

// 报告页的两个标签：第一页是纯数据统计（无需 AI，立即展示），第二页是 AI 生成的文章。
type ReportTab = 'stats' | 'article';

interface LifeReportScreenProps {
  vm: LifeReportViewModel;
  // 第一页数据统计 ViewModel，由 lifeHistory 派生。
  stats: LifeStatsViewModel;
  // 是否已有 AI 报告正文（决定第二页展示文章还是生成中占位）。
  hasAiReport: boolean;
  // AI 报告是否正在后台生成中。
  isArticleGenerating: boolean;
  restartLabel: string;
  onRestart: () => void;
  // 重新生成报告：始终提供，允许在 fallback 或已生成报告上重新请求 AI。
  retryLabel: string;
  onRetry: () => void;
  // 导出人生记录。
  exportLabel: string;
  onExport: () => void;
}

// 人生报告页：双标签结构。
// 进入本页时 AI 报告已在后台并发生成：用户先浏览第一页数据统计，
// 切到第二页时文章通常已经就绪，无需等待。
export function LifeReportScreen({
  vm,
  stats,
  hasAiReport,
  isArticleGenerating,
  restartLabel,
  retryLabel,
  exportLabel,
  onRestart,
  onRetry,
  onExport
}: LifeReportScreenProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('stats');

  return (
    <div className="life-game__container">
      <header className="life-game__report-head">
        <h1 className="life-game__title">{vm.title}</h1>
        <p className="life-game__subtitle">{vm.subtitle}</p>
      </header>

      {/* 标签切换：数据统计 / 人生报告 */}
      <div className="life-game__report-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={`life-game__report-tab${activeTab === 'stats' ? ' life-game__report-tab--active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          人生数据
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'article'}
          className={`life-game__report-tab${activeTab === 'article' ? ' life-game__report-tab--active' : ''}`}
          onClick={() => setActiveTab('article')}
        >
          人生报告
          {/* 后台生成期间在标签上给一个呼吸点提示，用户切过去前就知道文章还在写 */}
          {!hasAiReport && isArticleGenerating && <i className="life-game__report-tab-dot" />}
        </button>
      </div>

      {activeTab === 'stats' ? (
        <LifeStatsPanel stats={stats} />
      ) : (
        <ArticleTab
          vm={vm}
          hasAiReport={hasAiReport}
          isArticleGenerating={isArticleGenerating}
          retryLabel={retryLabel}
          exportLabel={exportLabel}
          onRetry={onRetry}
          onExport={onExport}
        />
      )}

      <button className="life-game__primary-button life-game__cta" onClick={onRestart}>
        {restartLabel}
      </button>
    </div>
  );
}

// 第二页：AI 生成的人生报告文章。
// 生成中显示占位；已有 AI 正文时展示文章；AI 不可用（未配置或生成失败）时回退到模板文章。
function ArticleTab({
  vm,
  hasAiReport,
  isArticleGenerating,
  retryLabel,
  exportLabel,
  onRetry,
  onExport
}: {
  vm: LifeReportViewModel;
  hasAiReport: boolean;
  isArticleGenerating: boolean;
  retryLabel: string;
  exportLabel: string;
  onRetry: () => void;
  onExport: () => void;
}) {
  // AI 正文尚未就绪且仍在后台生成：展示生成中占位，避免用户看到一半内容被替换。
  if (!hasAiReport && isArticleGenerating) {
    return (
      <div className="life-game__report-generating">
        <p className="life-game__report-generating-title">AI 正在回顾你的一生…</p>
        <p className="life-game__report-generating-text">报告撰写完成后会自动呈现在这里</p>
      </div>
    );
  }

  return (
    <>
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

      <div className="life-game__report-actions">
        <button className="life-game__secondary-button" onClick={onRetry}>
          {retryLabel}
        </button>
        <button className="life-game__secondary-button" onClick={onExport}>
          {exportLabel}
        </button>
      </div>
    </>
  );
}
