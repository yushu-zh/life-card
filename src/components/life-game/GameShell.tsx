import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../config/loaders/loadPhase4PresentationConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { loadAiConfig } from '../../config/loaders/loadAiConfig.ts';
import { createNewGame } from '../../modules/bootstrap/createNewGame.ts';
import { buildLifeReportExportText, buildLifeReportViewModel } from '../../modules/report/buildLifeReportViewModel.ts';
import { buildLifeStatsViewModel } from '../../modules/report/buildLifeStatsViewModel.ts';
import { generateLifeReport } from '../../modules/report/generateLifeReport.ts';
import { buildCreatePlayerViewModel } from '../../modules/setup/buildCreatePlayerViewModel.ts';
import { getOrCreateCurrentTurnOffer } from '../../modules/turn/getOrCreateCurrentTurnOffer.ts';
import { rerollCurrentTurnOffer } from '../../modules/turn/rerollCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../modules/turn/resolveCurrentTurnSelection.ts';
import { generateTurnCardNarratives } from '../../modules/turn/generateTurnCardNarratives.ts';
import { buildTurnOverviewViewModel } from '../../modules/turn/buildTurnOverviewViewModel.ts';
import { buildTurnResolutionFlowViewModel } from '../../modules/turn/buildTurnResolutionFlowViewModel.ts';
import {
  createDeepSeekTransport,
  createFridayTransport,
  createMockNarrativeTransport,
  generateEventCardNarrative,
  generateFateNarrative as generateFateNarrativeService,
  generateLifeReportNarrative,
  generateOpportunityResultNarrative,
  generateStatusNarrative as generateStatusNarrativeService,
  resolveAiProvider
} from '../../ai/narrativeService.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import {
  clearCurrentSessionPointer,
  loadCurrentSessionPointer,
  saveCurrentSessionPointer
} from '../../storage/game-session/currentSessionPointer.ts';
import { loadFridayAppId, saveFridayAppId } from '../../storage/friday-app-id.ts';
import { loadDeepSeekApiKey, saveDeepSeekApiKey } from '../../storage/deepseek-api-key.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { Phase4UiState } from '../../shared/types/ui.ts';
import type { TurnResolutionSummary } from '../../shared/types/turn.ts';
import type { CardNarrativeFacts, EventCardNarrative, FateNarrativeFacts, LifeReportFacts, ResultNarrativeFacts, StatusNarrativeFacts } from '../../shared/types/narrative.ts';

import { CreatePlayerScreen } from './CreatePlayerScreen.tsx';
import { GameOverScreen } from './GameOverScreen.tsx';
import { LifeReportScreen } from './LifeReportScreen.tsx';
import { ResultFlowScreen } from './ResultFlowScreen.tsx';
import { RestartControl } from './RestartControl.tsx';
import { RollingOverlay } from './RollingOverlay.tsx';
import { TurnOverviewScreen } from './TurnOverviewScreen.tsx';
import './theme.css';

// 默认空建档输入，作为 UI 初始草稿。
const EMPTY_DRAFT: CreatePlayerInput = {
  profile: {
    nickname: '',
    gender: '',
    skillTags: [],
    education: '',
    industry: '',
    wishes: []
  },
  abilities: {
    cognition: 0,
    execution: 0,
    social: 0,
    creativity: 0,
    adaptability: 0
  }
};

// 各挂起动作的加载文案：加载期间复用骰子转动动画，按具体动作给出更贴切的标题与提示。
const PENDING_COPY: Record<
  NonNullable<Phase4UiState['pending']>,
  { title: string; text: string }
> = {
  creating: { title: '正在创建人物…', text: '人生即将开始...' },
  'loading-turn': { title: '正在加载回合…', text: '命运正在排布...' },
  rerolling: { title: '正在换牌…', text: '重新洗牌中...' },
  resolving: { title: '正在结算回合…', text: '正在判定结果...' },
  'generating-report': { title: '正在生成人生报告…', text: 'AI 正在回顾你的一生...' }
};

// 单页面游戏壳：负责阶段切换、调用 domain 入口、维护 UI 状态与当前快照。
export function GameShell() {
  const presentation = useMemo(() => loadPhase4PresentationConfig(), []);
  const initialConfig = useMemo(() => loadInitialStateConfig(), []);
  const opportunityConfig = useMemo(() => loadOpportunityEventConfig(), []);
  const turnSystemConfig = useMemo(() => loadTurnSystemConfig(), []);

  const [uiState, setUiState] = useState<Phase4UiState>({
    phase: 'create-player',
    pending: null,
    resolutionStepIndex: 0,
    draft: EMPTY_DRAFT,
    sessionId: null
  });

  const [currentSnapshot, setCurrentSnapshot] = useState<GameSessionSnapshot | null>(null);
  const [lastResolution, setLastResolution] = useState<TurnResolutionSummary | null>(null);
  // 「开始人生」失败时的用户可见错误信息：避免报错被静默吞掉，
  // 在低版本浏览器（缺 structuredClone / crypto.randomUUID 等）上表现为「点了没反应」。
  const [startError, setStartError] = useState<string | null>(null);
  // AI 人生报告是否正在后台生成：进入报告页后立即并发请求，
  // 用户浏览第一页数据统计期间第二页文章同步就绪，无需等待。
  const [isReportGenerating, setIsReportGenerating] = useState(false);

  // FRIDAY App ID：建档时用户输入并持久化；挂载时从本地回填，重复创建无需再次输入。
  const [appId, setAppId] = useState('');
  // DeepSeek API Key：与 App ID 二选一，同样持久化并在挂载时回填。
  const [deepseekApiKey, setDeepseekApiKey] = useState('');

  // Phase 6：AI 叙事服务与当前回合事件牌文案缓存。
  const aiConfig = useMemo(() => loadAiConfig(), []);
  // 根据用户填写的凭据决定走美团 FRIDAY 还是 DeepSeek 官方；都填时优先美团，都没填时用 mock 兜底（建档校验会拦截）。
  const narrativeTransport = useMemo(() => {
    const resolved = resolveAiProvider(appId, deepseekApiKey);
    if (!resolved) {
      return createMockNarrativeTransport();
    }
    return resolved.provider === 'friday'
      ? createFridayTransport(aiConfig, resolved.key)
      : createDeepSeekTransport(aiConfig, resolved.key);
  }, [aiConfig, appId, deepseekApiKey]);
  const generateCardNarrative = useCallback(
    (facts: CardNarrativeFacts) => generateEventCardNarrative(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const generateResultNarrative = useCallback(
    (facts: ResultNarrativeFacts) => generateOpportunityResultNarrative(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const generateFateNarrative = useCallback(
    (facts: FateNarrativeFacts) => generateFateNarrativeService(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const generateStatusNarrative = useCallback(
    (facts: StatusNarrativeFacts) => generateStatusNarrativeService(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const generateReportNarrative = useCallback(
    (facts: LifeReportFacts) => generateLifeReportNarrative(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const [cardNarratives, setCardNarratives] = useState<Record<string, EventCardNarrative>>({});

  // 结果流 ViewModel 提为 memo，让“继续”推进逻辑也能拿到总段数。
  const resolutionFlowVm = useMemo(() => {
    if (!lastResolution) return null;
    return buildTurnResolutionFlowViewModel(lastResolution, opportunityConfig, presentation);
  }, [lastResolution, opportunityConfig, presentation]);

  // 页面启动时尝试恢复上一次的会话指针和快照。
  useEffect(() => {
    async function restoreSession() {
      const pointer = await loadCurrentSessionPointer();
      if (!pointer.sessionId) return;

      setUiState((prev) => ({ ...prev, sessionId: pointer.sessionId, pending: 'loading-turn' }));

      try {
        const store = createGameSessionStore();
        let persisted = await store.getGameSession(pointer.sessionId);

        if (!persisted) {
          // 快照丢失时清空指针。
          await clearCurrentSessionPointer();
          setUiState((prev) => ({ ...prev, sessionId: null, pending: null }));
          return;
        }

        // 如果旧快照没有 activeTurn（例如之前异常退出），先补一次发牌。
        if (!persisted.snapshot.turnState.activeTurn) {
          await getOrCreateCurrentTurnOffer({ sessionId: pointer.sessionId });
          persisted = await store.getGameSession(pointer.sessionId);
        }

        setCurrentSnapshot(persisted!.snapshot);
        setUiState((prev) => ({ ...prev, phase: 'turn-overview', pending: null }));
      } catch {
        await clearCurrentSessionPointer();
        setUiState((prev) => ({ ...prev, sessionId: null, pending: null }));
      }
    }

    void restoreSession();
  }, []);

  // 挂载时回填上次保存的 FRIDAY App ID 与 DeepSeek API Key，重复创建角色无需再次输入。
  useEffect(() => {
    void loadFridayAppId().then(setAppId);
    void loadDeepSeekApiKey().then(setDeepseekApiKey);
  }, []);

  // 更新建档草稿。
  const handleDraftChange = useCallback((draft: CreatePlayerInput) => {
    setUiState((prev) => ({ ...prev, draft }));
  }, []);

  // 开始人生：校验、创建新游戏并立即发牌。
  // draftOverride 用于创建界面把未点「添加」的标签文字合并后传入；
  // 若直接用 uiState.draft，会因 React 状态更新异步而丢掉这次合并。
  const handleStart = useCallback(async (draftOverride?: CreatePlayerInput) => {
    const draft = draftOverride ?? uiState.draft;
    // 清空上一次失败遗留的错误提示。
    setStartError(null);
    setUiState((prev) => ({ ...prev, pending: 'creating' }));
    try {
      // 先持久化 App ID 与 DeepSeek API Key，下次创建角色时自动回填。
      await saveFridayAppId(appId);
      await saveDeepSeekApiKey(deepseekApiKey);

      const snapshot = await createNewGame(draft);
      await saveCurrentSessionPointer({ sessionId: snapshot.meta.sessionId });

      // 新快照没有 activeTurn，需要先调用发牌接口才能进入回合总览。
      await getOrCreateCurrentTurnOffer({ sessionId: snapshot.meta.sessionId });

      // 发牌后异步生成三张牌的事件牌文案；失败时映射为空，UI 走 fallback。
      const narratives = await generateTurnCardNarratives(
        { sessionId: snapshot.meta.sessionId },
        { generateCardNarrative }
      );
      setCardNarratives(narratives);

      const store = createGameSessionStore();
      const persisted = await store.getGameSession(snapshot.meta.sessionId);
      setCurrentSnapshot(persisted?.snapshot ?? snapshot);

      setUiState((prev) => ({
        ...prev,
        sessionId: snapshot.meta.sessionId,
        phase: 'turn-overview',
        pending: null
      }));
    } catch (error) {
      setUiState((prev) => ({ ...prev, pending: null }));
      // 不能静默吞错：老浏览器兼容问题、存储不可用等场景，
      // 用户看到的只是「点了没反应」，必须把错误抛到界面上。
      setStartError(
        `开始人生失败：${error instanceof Error ? error.message : String(error)}。请尝试换用 Chrome/Safari 后重试。`
      );
      // eslint-disable-next-line no-console
      console.error('创建游戏失败', error);
    }
  }, [uiState.draft, appId, deepseekApiKey, generateCardNarrative]);

  // 换牌一次。
  const handleReroll = useCallback(async () => {
    if (!uiState.sessionId) return;

    setUiState((prev) => ({ ...prev, pending: 'rerolling' }));
    try {
      const activeTurn = await rerollCurrentTurnOffer({ sessionId: uiState.sessionId });
      if (currentSnapshot) {
        setCurrentSnapshot({ ...currentSnapshot, turnState: { activeTurn } });
      }

      const narratives = await generateTurnCardNarratives(
        { sessionId: uiState.sessionId },
        { generateCardNarrative }
      );
      setCardNarratives(narratives);

      setUiState((prev) => ({ ...prev, pending: null }));
    } catch {
      setUiState((prev) => ({ ...prev, pending: null }));
    }
  }, [uiState.sessionId, currentSnapshot, generateCardNarrative]);

  // 选择卡牌。
  const handleSelectCard = useCallback(
    async (slotIndex: number) => {
      if (!uiState.sessionId) return;

      setUiState((prev) => ({ ...prev, pending: 'resolving' }));
      try {
        // 结算时透传 AI 结果文案能力，并把发牌阶段生成的选中牌文案一并带入（供历史持久化）。
        const selectedCard = currentSnapshot?.turnState.activeTurn?.currentOffer.find(
          (card) => card.slotIndex === (slotIndex as 0 | 1 | 2)
        );
        const selectedCardNarrative = selectedCard ? (cardNarratives[selectedCard.eventId] ?? null) : null;
        const summary = await resolveCurrentTurnSelection(
          {
            sessionId: uiState.sessionId,
            slotIndex: slotIndex as 0 | 1 | 2
          },
          {
            generateResultNarrative,
            generateFateNarrative,
            generateStatusNarrative,
            selectedCardNarrative
          }
        );

        setLastResolution(summary);
        setCurrentSnapshot(summary.updatedSnapshot);

        // 始终先完整展示结果流；若本局结束，结果流末段按钮会把玩家带去终局页。
        setUiState((prev) => ({
          ...prev,
          phase: 'turn-resolution',
          pending: null,
          resolutionStepIndex: 0
        }));
      } catch (error) {
        setUiState((prev) => ({ ...prev, pending: null }));
        // eslint-disable-next-line no-console
        console.error('结算回合失败', error);
      }
    },
    [uiState.sessionId, currentSnapshot, cardNarratives, generateResultNarrative, generateFateNarrative, generateStatusNarrative]
  );

  // 结果流下一步：先逐段推进结果流，全部看完后再进入下一回合。
  const handleResultNext = useCallback(async () => {
    if (!uiState.sessionId) return;

    // 还有未展示的结果段时，仅推进段索引。
    if (
      resolutionFlowVm &&
      uiState.resolutionStepIndex < resolutionFlowVm.steps.length - 1
    ) {
      setUiState((prev) => ({ ...prev, resolutionStepIndex: prev.resolutionStepIndex + 1 }));
      return;
    }

    // 最后一段看完：若本局已结束则进入终局页，否则进入下一回合。
    if (resolutionFlowVm?.nextAction.target === 'game-over') {
      setUiState((prev) => ({ ...prev, phase: 'game-over', pending: null }));
      return;
    }

    setUiState((prev) => ({ ...prev, pending: 'loading-turn' }));
    try {
      await getOrCreateCurrentTurnOffer({ sessionId: uiState.sessionId });

      const narratives = await generateTurnCardNarratives(
        { sessionId: uiState.sessionId },
        { generateCardNarrative }
      );
      setCardNarratives(narratives);

      const store = createGameSessionStore();
      const persisted = await store.getGameSession(uiState.sessionId);

      if (persisted) {
        setCurrentSnapshot(persisted.snapshot);
      }

      setUiState((prev) => ({
        ...prev,
        phase: 'turn-overview',
        pending: null,
        resolutionStepIndex: 0
      }));
    } catch (error) {
      setUiState((prev) => ({ ...prev, pending: null }));
      // eslint-disable-next-line no-console
      console.error('进入下一回合失败', error);
    }
  }, [uiState.sessionId, uiState.resolutionStepIndex, resolutionFlowVm, generateCardNarrative]);

  // 生成并持久化人生报告；失败时保持快照不变，报告页继续走 fallback。
  // force 为 true 时忽略幂等，允许对已生成的报告重新生成。
  const runReportGeneration = useCallback(async (force?: boolean) => {
    if (!uiState.sessionId) return;

    try {
      const snapshot = await generateLifeReport(
        { sessionId: uiState.sessionId },
        { generateReportNarrative, force }
      );
      setCurrentSnapshot(snapshot);
    } catch {
      // 生成/读档失败时保持当前快照不变，报告页继续走 fallback。
    }
  }, [uiState.sessionId, generateReportNarrative]);

  // 查看人生报告：立即进入报告页展示第一页数据统计（无需 AI），
  // AI 文章在后台并发生成——用户浏览数据期间第二页通常已经写好。
  // 生成失败时第二页回退到模板文章，报告页绝不为空。
  const handleViewReport = useCallback(() => {
    if (!uiState.sessionId) return;

    setUiState((prev) => ({ ...prev, phase: 'life-report', pending: null }));
    // 已有生成好的报告时直接复用，不再请求 AI。
    if (currentSnapshot?.lifecycle.finalReportText) return;

    setIsReportGenerating(true);
    void runReportGeneration().finally(() => setIsReportGenerating(false));
  }, [uiState.sessionId, currentSnapshot, runReportGeneration]);

  // 重新生成报告：忽略幂等，强制重新请求 AI，成功后覆盖快照并刷新报告。
  const handleRetryReport = useCallback(async () => {
    setUiState((prev) => ({ ...prev, pending: 'generating-report' }));
    setIsReportGenerating(true);
    await runReportGeneration(true);
    setIsReportGenerating(false);
    setUiState((prev) => ({ ...prev, pending: null }));
  }, [runReportGeneration]);

  // 导出人生记录：把提供给 AI 的结构化事实落成一个纯文本文件。
  const handleExportReport = useCallback(() => {
    if (!currentSnapshot) return;

    const text = buildLifeReportExportText(currentSnapshot, opportunityConfig, presentation);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `人生记录-${currentSnapshot.player.nickname || '匿名'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentSnapshot, opportunityConfig, presentation]);

  // 重新开始：清空指针并回到建档页。
  const handleRestart = useCallback(async () => {
    await clearCurrentSessionPointer();
    setCurrentSnapshot(null);
    setLastResolution(null);
    setCardNarratives({});
    setStartError(null);
    setUiState({
      phase: 'create-player',
      pending: null,
      resolutionStepIndex: 0,
      draft: EMPTY_DRAFT,
      sessionId: null
    });
  }, []);

  // 根据当前阶段渲染内容。
  function renderContent() {
    if (uiState.phase === 'create-player') {
      const vm = buildCreatePlayerViewModel(uiState.draft, appId, deepseekApiKey, initialConfig, presentation);
      return (
        <CreatePlayerScreen
          vm={vm}
          onChange={handleDraftChange}
          onAppIdChange={setAppId}
          onDeepSeekApiKeyChange={setDeepseekApiKey}
          onStart={handleStart}
        />
      );
    }

    if (uiState.phase === 'turn-overview') {
      if (!currentSnapshot || !currentSnapshot.turnState.activeTurn) {
        return (
          <div className="life-game__container">
            <p className="life-game__subtitle">{presentation.labels.common.loadingSessionText}</p>
          </div>
        );
      }

      const vm = buildTurnOverviewViewModel(
        currentSnapshot,
        currentSnapshot.turnState.activeTurn,
        opportunityConfig,
        turnSystemConfig,
        presentation,
        cardNarratives
      );

      return (
        <TurnOverviewScreen
          vm={vm}
          onSelectCard={handleSelectCard}
          onReroll={handleReroll}
        />
      );
    }

    if (uiState.phase === 'turn-resolution') {
      if (!resolutionFlowVm) {
        return (
          <div className="life-game__container">
            <p className="life-game__subtitle">{presentation.labels.common.loadingSessionText}</p>
          </div>
        );
      }

      return (
        <ResultFlowScreen
          vm={resolutionFlowVm}
          stepIndex={uiState.resolutionStepIndex}
          continueLabel={presentation.labels.resultFlow.continueAction}
          descriptionHeading={presentation.labels.resultFlow.descriptionHeading}
          onNext={handleResultNext}
        />
      );
    }

    if (uiState.phase === 'game-over') {
      const endReason = currentSnapshot?.lifecycle.endReason ?? 'age-limit';
      const endReasonLabel = presentation.reportFallback.endReasonLabels[endReason] ?? '人生已结束';

      return (
        <GameOverScreen
          title={presentation.labels.gameOver.title}
          subtitle={presentation.labels.gameOver.subtitle.replace('{reason}', endReasonLabel)}
          reportActionLabel={presentation.labels.gameOver.reportAction}
          onReport={handleViewReport}
        />
      );
    }

    if (uiState.phase === 'life-report') {
      if (!currentSnapshot) {
        return (
          <div className="life-game__container">
            <p className="life-game__subtitle">{presentation.labels.common.loadingSessionText}</p>
          </div>
        );
      }

      const vm = buildLifeReportViewModel(currentSnapshot, presentation);
      // 第一页数据统计 ViewModel：纯本地派生，构建开销可忽略，随渲染现算即可。
      const statsVm = buildLifeStatsViewModel(currentSnapshot, opportunityConfig, turnSystemConfig, presentation);
      return (
        <LifeReportScreen
          vm={vm}
          stats={statsVm}
          hasAiReport={currentSnapshot.lifecycle.finalReportText != null}
          isArticleGenerating={isReportGenerating}
          restartLabel={presentation.labels.report.restartAction}
          retryLabel={presentation.labels.report.retryAction}
          exportLabel={presentation.labels.report.exportAction}
          onRestart={handleRestart}
          onRetry={handleRetryReport}
          onExport={handleExportReport}
        />
      );
    }

    return null;
  }

  return (
    <main className="life-game">
      {/* 左上角重开入口：仅在回合总览 / 结果流阶段展示（建档、掷骰、终局、报告及挂起操作时不显示） */}
      {(uiState.phase === 'turn-overview' || uiState.phase === 'turn-resolution') &&
        uiState.pending === null && (
          <RestartControl
            labels={presentation.labels.restartConfirm}
            onConfirm={handleRestart}
          />
        )}
      {uiState.pending && (
        <RollingOverlay
          title={PENDING_COPY[uiState.pending].title}
          loadingText={PENDING_COPY[uiState.pending].text}
        />
      )}
      {/* 开始人生失败的错误横幅：老浏览器兼容性问题等运行时异常在此可见 */}
      {startError && (
        <div
          className="life-game__container"
          role="alert"
          style={{ padding: 'var(--space-md)', color: '#ff8a80' }}
        >
          {startError}
        </div>
      )}
      {renderContent()}
    </main>
  );
}
