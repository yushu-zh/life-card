import { loadOpportunityEventConfig } from '../../src/config/loaders/loadOpportunityEventConfig.ts';
import { loadTurnSystemConfig } from '../../src/config/loaders/loadTurnSystemConfig.ts';
import { createNewGame } from '../../src/modules/bootstrap/createNewGame.ts';
import { getOrCreateCurrentTurnOffer } from '../../src/modules/turn/getOrCreateCurrentTurnOffer.ts';
import { resolveCurrentTurnSelection } from '../../src/modules/turn/resolveCurrentTurnSelection.ts';
import type { GameSessionSnapshot } from '../../src/shared/types/game-session.ts';
import type { TurnOfferCard, TurnOfferSlotIndex } from '../../src/shared/types/turn.ts';
import { createSeededRandom } from '../support/createSeededRandom.ts';
import { createSimulationSessionStore } from '../support/createSimulationSessionStore.ts';
import { selectTurnCard, type SimulationStrategyContext } from '../strategies/selectTurnCard.ts';
import type {
  SimulationConfig,
  SimulationFinalStats,
  SimulationGameResult,
  SimulationStrategyDefinition,
  SimulationStrategyId
} from '../types.ts';

// invalid 局没有有效终局，用全 0 占位；批次统计只取 valid 局，不会误读这些值。
const ZERO_STATS: SimulationFinalStats = {
  money: 0,
  energy: 0,
  health: 0,
  happiness: 0,
  freedom: 0,
  experience: 0,
  influence: 0
};

// 运行一局完整人生模拟，全程复用正式游戏模块，不做任何模拟专属的规则改写。
export async function runSingleSimulationGame(input: {
  strategyId: SimulationStrategyId;
  gameIndex: number;
  config: SimulationConfig;
  seed: string;
  // 可选注入：替换默认的策略选择器，用于测试“策略返回非法选择”等异常路径。
  selectCard?: (offer: TurnOfferCard[], context: SimulationStrategyContext) => TurnOfferSlotIndex;
}): Promise<SimulationGameResult> {
  const { strategyId, gameIndex, config, seed } = input;
  const strategy = config.strategies[strategyId];

  if (!strategy) {
    throw new Error(`Simulation config is missing a definition for strategy ${strategyId}`);
  }

  const store = createSimulationSessionStore();
  const random = createSeededRandom(seed);
  const eventConfig = loadOpportunityEventConfig();
  const turnSystemConfig = loadTurnSystemConfig();
  const sessionId = `${strategyId}-${gameIndex}`;
  const selectCard = input.selectCard ?? selectTurnCard;

  // 开局：用模拟角色模板创建初始快照并保存到内存 store。
  let snapshot = await createNewGame(config.playerPreset, { sessionId, store });

  // 主循环：发牌 -> 策略选牌 -> 整回合结算，直到终局或提前死亡。
  while (!snapshot.lifecycle.isEnded) {
    const offer = await getOrCreateCurrentTurnOffer({ sessionId }, { store, random });

    const slotIndex = chooseSlotOrInvalid(
      snapshot,
      offer.currentOffer,
      strategy,
      eventConfig,
      turnSystemConfig.energyRules,
      random,
      selectCard
    );

    if (slotIndex === null) {
      return buildInvalidResult(strategyId, sessionId, '策略无法从当前牌组作出有效选择');
    }

    // 正式模块结算整回合；这里不传 rollDice / resolveStatuses，
    // 让 resolveCurrentTurnSelection 用同一随机源内部生成骰子并走正式状态引擎。
    const summary = await resolveCurrentTurnSelection({ sessionId, slotIndex }, { store, random });

    snapshot = summary.updatedSnapshot;
  }

  return {
    strategyId,
    sessionId,
    ended: snapshot.lifecycle.isEnded,
    earlyDeath: snapshot.lifecycle.isEnded && snapshot.progression.age < turnSystemConfig.endAgeExclusive,
    endReason: snapshot.lifecycle.endReason,
    invalid: false,
    invalidReason: null,
    finalStats: extractFinalStats(snapshot),
    triggeredStatuses: collectTriggeredStatuses(snapshot)
  };
}

// 执行策略决策，并把策略相关的失败归一为 null（记为 invalid 局），而不是直接抛错。
function chooseSlotOrInvalid(
  snapshot: GameSessionSnapshot,
  currentOffer: TurnOfferCard[],
  strategy: SimulationStrategyDefinition,
  eventConfig: ReturnType<typeof loadOpportunityEventConfig>,
  energyRules: ReturnType<typeof loadTurnSystemConfig>['energyRules'],
  random: () => number,
  selectCard: (offer: TurnOfferCard[], context: SimulationStrategyContext) => TurnOfferSlotIndex
): TurnOfferSlotIndex | null {
  let slotIndex: TurnOfferSlotIndex;

  try {
    slotIndex = selectCard(currentOffer, { strategy, snapshot, eventConfig, energyRules, random });
  } catch {
    return null;
  }

  const isValidSlot = slotIndex === 0 || slotIndex === 1 || slotIndex === 2;
  const cardExists = currentOffer.some((card) => card.slotIndex === slotIndex);

  return isValidSlot && cardExists ? slotIndex : null;
}

function buildInvalidResult(
  strategyId: SimulationStrategyId,
  sessionId: string,
  reason: string
): SimulationGameResult {
  return {
    strategyId,
    sessionId,
    ended: false,
    earlyDeath: false,
    endReason: null,
    invalid: true,
    invalidReason: reason,
    finalStats: ZERO_STATS,
    triggeredStatuses: []
  };
}

function extractFinalStats(snapshot: GameSessionSnapshot): SimulationFinalStats {
  return {
    money: snapshot.stats.resources.money,
    energy: snapshot.stats.resources.energy,
    health: snapshot.stats.outcomes.health,
    happiness: snapshot.stats.outcomes.happiness,
    freedom: snapshot.stats.outcomes.freedom,
    experience: snapshot.stats.outcomes.experience,
    influence: snapshot.stats.outcomes.influence
  };
}

// 从整回合历史里收集本局触发过的所有状态 id（含一次性状态与死亡风险状态）。
function collectTriggeredStatuses(snapshot: GameSessionSnapshot): string[] {
  const ids = new Set<string>();

  for (const entry of snapshot.records.lifeHistory) {
    for (const status of entry.statuses) {
      ids.add(status.id);
    }
  }

  return Array.from(ids);
}
