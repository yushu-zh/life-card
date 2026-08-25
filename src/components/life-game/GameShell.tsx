import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadInitialStateConfig } from '../../config/loaders/loadInitialStateConfig.ts';
import { loadOpportunityEventConfig } from '../../config/loaders/loadOpportunityEventConfig.ts';
import { loadPhase4PresentationConfig } from '../../config/loaders/loadPhase4PresentationConfig.ts';
import { loadTurnSystemConfig } from '../../config/loaders/loadTurnSystemConfig.ts';
import { createNewGame } from '../../modules/bootstrap/createNewGame.ts';
import { buildFallbackLifeReportViewModel } from '../../modules/report/buildFallbackLifeReportViewModel.ts';
import { buildCreatePlayerViewModel } from '../../modules/setup/buildCreatePlayerViewModel.ts';
import { getOrCreateCurrentTurnOffer } from '../../modules/turn/getOrCreateCurrentTurnOffer.ts';
import { rerollCurrentTurnOffer } from '../../modules/turn/rerollCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../modules/turn/resolveCurrentTurnSelection.ts';
import { buildTurnOverviewViewModel } from '../../modules/turn/buildTurnOverviewViewModel.ts';
import { buildTurnResolutionFlowViewModel } from '../../modules/turn/buildTurnResolutionFlowViewModel.ts';
import { createGameSessionStore } from '../../storage/game-session/store.ts';
import {
  clearCurrentSessionPointer,
  loadCurrentSessionPointer,
  saveCurrentSessionPointer
} from '../../storage/game-session/currentSessionPointer.ts';
import type { CreatePlayerInput } from '../../shared/types/bootstrap.ts';
import type { GameSessionSnapshot } from '../../shared/types/game-session.ts';
import type { Phase4UiState } from '../../shared/types/ui.ts';
import type { TurnResolutionSummary } from '../../shared/types/turn.ts';

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

  // 更新建档草稿。
  const handleDraftChange = useCallback((draft: CreatePlayerInput) => {
    setUiState((prev) => ({ ...prev, draft }));
  }, []);

  // 开始人生：校验、创建新游戏并立即发牌。
  const handleStart = useCallback(async () => {
    setUiState((prev) => ({ ...prev, pending: 'creating' }));
    try {
      const snapshot = await createNewGame(uiState.draft);
      await saveCurrentSessionPointer({ sessionId: snapshot.meta.sessionId });

      // 新快照没有 activeTurn，需要先调用发牌接口才能进入回合总览。
      await getOrCreateCurrentTurnOffer({ sessionId: snapshot.meta.sessionId });

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
  }, [uiState.draft]);

  // 换牌一次。
  const handleReroll = useCallback(async () => {
    if (!uiState.sessionId) return;

    setUiState((prev) => ({ ...prev, pending: 'rerolling' }));
    try {
      const activeTurn = await rerollCurrentTurnOffer({ sessionId: uiState.sessionId });
      if (currentSnapshot) {
        setCurrentSnapshot({ ...currentSnapshot, turnState: { activeTurn } });
      }
      setUiState((prev) => ({ ...prev, pending: null }));
    } catch {
      setUiState((prev) => ({ ...prev, pending: null }));
    }
  }, [uiState.sessionId, currentSnapshot]);

  // 选择卡牌。
  const handleSelectCard = useCallback(
    async (slotIndex: number) => {
      if (!uiState.sessionId) return;

      setUiState((prev) => ({ ...prev, pending: 'resolving' }));
      try {
        const summary = await resolveCurrentTurnSelection({
          sessionId: uiState.sessionId,
          slotIndex: slotIndex as 0 | 1 | 2
        });

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
    [uiState.sessionId]
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
  }, [uiState.sessionId, uiState.resolutionStepIndex, resolutionFlowVm]);

  // 查看人生报告。
  const handleViewReport = useCallback(() => {
    setUiState((prev) => ({ ...prev, phase: 'life-report' }));
  }, []);

  // 重新开始：清空指针并回到建档页。
  const handleRestart = useCallback(async () => {
    await clearCurrentSessionPointer();
    setCurrentSnapshot(null);
    setLastResolution(null);
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
      const vm = buildCreatePlayerViewModel(uiState.draft, initialConfig, presentation);
      return (
        <CreatePlayerScreen
          vm={vm}
          onChange={handleDraftChange}
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
        presentation
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

      const vm = buildFallbackLifeReportViewModel(currentSnapshot, presentation);
      return (
        <LifeReportScreen
          vm={vm}
          restartLabel={presentation.labels.report.restartAction}
          onRestart={handleRestart}
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
