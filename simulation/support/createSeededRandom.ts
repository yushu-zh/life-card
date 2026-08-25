import type { SimulationStrategyId } from '../types.ts';

// 从字符串种子派生一个确定性的伪随机源。
// 返回的 random() 落在 [0, 1)，与 src 各引擎对 random 的约定一致，
// 因此可以同时传给发牌、命运事件、状态检查和策略决策，保证同一局共用一条随机序列。
export function createSeededRandom(seed: string): () => number {
  let state = hashStringToUint32(seed);

  // mulberry32：体积小、足够均匀，适合批量模拟的可复现随机需求。
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 由批次基础种子 + 策略 + 局序号派生出每局唯一的种子字符串。
// 保证同一配置与 seed 下结果可复现，同时不同局之间种子互不相同。
export function deriveGameSeed(baseSeed: string, strategyId: SimulationStrategyId, gameIndex: number): string {
  return `${baseSeed}:${strategyId}:${gameIndex}`;
}

// 用 FNV-1a 把任意字符串折叠成 32 位无符号整数，作为 PRNG 的种子。
function hashStringToUint32(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
