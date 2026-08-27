import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../config/loaders/loadPhase4PresentationConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { loadAiConfig } from '../../config/loaders/loadAiConfig.ts';
import { createNewGame } from '../../modules/bootstrap/createNewGame.ts';
import { buildLifeReportExportText, buildLifeReportViewModel } from '../../modules/report/buildLifeReportViewModel.ts';
import { generateLifeReport } from '../../modules/report/generateLifeReport.ts';
import { buildCreatePlayerViewModel } from '../../modules/setup/buildCreatePlayerViewModel.ts';
import { getOrCreateCurrentTurnOffer } from '../../modules/turn/getOrCreateCurrentTurnOffer.ts';
import { rerollCurrentTurnOffer } from '../../modules/turn/rerollCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../modules/turn/resolveCurrentTurnSelection.ts';
import { generateTurnCardNarratives } from '../../modules/turn/generateTurnCardNarratives.ts';
import { buildTurnOverviewViewModel } from '../../modules/turn/buildTurnOverviewViewModel.ts';
import { buildTurnResolutionFlowViewModel } from '../../modules/turn/buildTurnResolutionFlowViewModel.ts';
import { createFridayTransport, generateEventCardNarrative, generateLifeReportNarrative, generateOpportunityResultNarrative } from '../../ai/narrativeService.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import {
  clearCurrentSessionPointer,
  loadCurrentSessionPointer,
  saveCurrentSessionPointer
} from '../../storage/game-session/currentSessionPointer.ts';
import { loadFridayAppId, saveFridayAppId } from '../../storage/friday-app-id.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { Phase4UiState } from '../../shared/types/ui.ts';
import type { TurnResolutionSummary } from '../../shared/types/turn.ts';
import type { CardNarrativeFacts, EventCardNarrative, LifeReportFacts, ResultNarrativeFacts } from '../../shared/types/narrative.ts';

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

  // FRIDAY App ID：建档时用户输入并持久化；挂载时从本地回填，重复创建无需再次输入。
  const [appId, setAppId] = useState('');

  // Phase 6：AI 叙事服务与当前回合事件牌文案缓存。
  const aiConfig = useMemo(() => loadAiConfig(), []);
  const narrativeTransport = useMemo(() => createFridayTransport(aiConfig, appId), [aiConfig, appId]);
  const generateCardNarrative = useCallback(
    (facts: CardNarrativeFacts) => generateEventCardNarrative(facts, aiConfig, narrativeTransport),
    [aiConfig, narrativeTransport]
  );
  const generateResultNarrative = useCallback(
    (facts: ResultNarrativeFacts) => generateOpportunityResultNarrative(facts, aiConfig, narrativeTransport),
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

  // 挂载时回填上次保存的 FRIDAY App ID，重复创建角色无需再次输入。
  useEffect(() => {
    void loadFridayAppId().then(setAppId);
  }, []);

  // 更新建档草稿。
  const handleDraftChange = useCallback((draft: CreatePlayerInput) => {
    setUiState((prev) => ({ ...prev, draft }));
  }, []);

  // 开始人生：校验、创建新游戏并立即发牌。
  const handleStart = useCallback(async () => {
    setUiState((prev) => ({ ...prev, pending: 'creating' }));
    try {
      // 先持久化 App ID，下次创建角色时自动回填。
      await saveFridayAppId(appId);

      const snapshot = await createNewGame(uiState.draft);
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
      // eslint-disable-next-line no-console
      console.error('创建游戏失败', error);
    }
  }, [uiState.draft, appId, generateCardNarrative]);

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
            selectedCardNarrative
          }
        );

        setLastResolution(summary);
        setCurrentSnapshot(summary.updatedSnapshot);

        // 若机会事件需要检定，先显示掷骰过渡。
        if (summary.opportunity.resolutionKind === 'checked') {
          setUiState((prev) => ({ ...prev, phase: 'rolling' }));
          await new Promise((resolve) => setTimeout(resolve, 700));
        }

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
    [uiState.sessionId, currentSnapshot, cardNarratives, generateResultNarrative]
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

  // 查看人生报告：先按需生成并持久化报告，再进入报告页。
  // 生成失败时仍进入报告页，展示 fallback 总结，结束页绝不为空。
  const handleViewReport = useCallback(async () => {
    if (!uiState.sessionId) return;

    setUiState((prev) => ({ ...prev, pending: 'generating-report' }));
    await runReportGeneration();
    setUiState((prev) => ({ ...prev, phase: 'life-report', pending: null }));
  }, [uiState.sessionId, runReportGeneration]);

  // 重新生成报告：忽略幂等，强制重新请求 AI，成功后覆盖快照并刷新报告。
  const handleRetryReport = useCallback(async () => {
    setUiState((prev) => ({ ...prev, pending: 'generating-report' }));
    await runReportGeneration(true);
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
      const vm = buildCreatePlayerViewModel(uiState.draft, appId, initialConfig, presentation);
      return (
        <CreatePlayerScreen
          vm={vm}
          onChange={handleDraftChange}
          onAppIdChange={setAppId}
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

    if (uiState.phase === 'rolling') {
      return (
        <RollingOverlay
          title={lastResolution?.opportunity.event.name ?? presentation.labels.rolling.title}
          loadingText={presentation.labels.rolling.title}
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
      return (
        <LifeReportScreen
          vm={vm}
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
      {uiState.pending && uiState.phase !== 'rolling' && (
        <div className="life-game__rolling-overlay" role="status">
          <p className="life-game__rolling-text">{presentation.labels.common.loadingSessionText}</p>
        </div>
      )}
      {renderContent()}
    </main>
  );
}
