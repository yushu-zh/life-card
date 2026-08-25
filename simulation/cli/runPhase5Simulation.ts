import { writeFileSync } from 'fs';
import { loadTurnSystemConfig } from '../../src/config/loaders/loadTurnSystemConfig.ts';
import { loadSimulationConfig } from '../config/loadSimulationConfig.ts';
import { buildSimulationComparison } from '../runner/buildSimulationComparison.ts';
import { runSimulationBatch } from '../runner/runSimulationBatch.ts';
import {
  SIMULATION_STAT_KEYS,
  SIMULATION_STRATEGY_IDS,
  type SimulationBatchResult,
  type SimulationComparisonReport,
  type SimulationFinalStats,
  type SimulationStatKey,
  type SimulationStrategyId
} from '../types.ts';

// 终端输出用的中文标签，口径对齐 docs/游戏机制.md，避免直接打印英文键。
const STAT_LABELS: Record<SimulationStatKey, string> = {
  money: '金钱',
  energy: '精力',
  health: '健康',
  happiness: '幸福',
  freedom: '自由',
  experience: '阅历',
  influence: '影响'
};

const STRATEGY_LABELS: Record<SimulationStrategyId, string> = {
  random: '完全随机',
  'prefer-achievement': '优先成就',
  'prefer-relationship': '优先关系',
  'prefer-self': '优先自我',
  'prefer-high-reward': '高收益优先',
  'prefer-low-risk': '低风险优先'
};

// 状态 id 的中文名直接读正式回合系统配置里的 name，保持单一事实源。
const STATUS_LABELS = buildStatusLabels();

// Phase 5 模拟 CLI 入口。用法示例：
//   npm run simulate -- --strategy random --runs 1000 --seed phase5-a
//   npm run simulate -- --all --runs 5000 --output ./simulation-output.json
const args = parseArgs(process.argv.slice(2));
const config = loadSimulationConfig();

const strategyIds = args.strategyId ? [args.strategyId] : config.enabledStrategies;
const runCount = args.runCount ?? config.defaultRunCount;
const baseSeed = args.seed ?? 'phase5-default';

const batches: SimulationBatchResult[] = [];

for (const strategyId of strategyIds) {
  const batch = await runSimulationBatch({ strategyId, runCount, config, baseSeed });

  batches.push(batch);
  printBatchSummary(batch);
}

const comparison = batches.length > 1 ? buildSimulationComparison(batches, config) : null;

if (comparison) {
  printComparison(comparison);
}

if (args.output) {
  const output = comparison ? { batches, comparison } : { batches };

  writeFileSync(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`\n结果数据集已写入 ${args.output}`);
}

function parseArgs(argv: string[]): {
  strategyId: SimulationStrategyId | null;
  runCount: number | null;
  seed: string | null;
  output: string | null;
} {
  let strategyId: SimulationStrategyId | null = null;
  let runCount: number | null = null;
  let seed: string | null = null;
  let output: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--strategy':
        strategyId = readStrategyId(argv, ++i);
        break;
      case '--all':
        // 无 --strategy 时默认就跑全部启用策略，--all 只是显式声明，不改变逻辑。
        break;
      case '--runs':
        runCount = readRunCount(argv, ++i);
        break;
      case '--seed':
        seed = argv[++i];
        break;
      case '--output':
        output = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }

  return { strategyId, runCount, seed, output };
}

function readStrategyId(argv: string[], index: number): SimulationStrategyId {
  const value = argv[index];

  if (!value || !(SIMULATION_STRATEGY_IDS as readonly string[]).includes(value)) {
    throw new Error(`Unknown strategy: ${value ?? '(missing)'}`);
  }

  return value as SimulationStrategyId;
}

function readRunCount(argv: string[], index: number): number {
  const value = Number(argv[index]);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid run count: ${argv[index] ?? '(missing)'}`);
  }

  return value;
}

function printBatchSummary(batch: SimulationBatchResult): void {
  console.log(`\n策略 ${STRATEGY_LABELS[batch.strategyId]}`);
  console.log(`  总局数 ${batch.totalRuns}，有效 ${batch.validRuns}，无效 ${batch.invalidRuns}`);
  console.log(`  平均最终属性: ${formatStats(batch.averages)}`);
  console.log(`  危机触发率: ${formatRates(batch.crisisTriggerRates)}`);
  console.log(`  提前死亡率: ${formatRate(batch.earlyDeathRate)}`);

  if (batch.invalidGames.length > 0) {
    console.log(`  无效局: ${batch.invalidGames.map((game) => `${game.sessionId}(${game.reason})`).join(', ')}`);
  }
}

function printComparison(comparison: SimulationComparisonReport): void {
  console.log(`\n对比基准: ${STRATEGY_LABELS[comparison.baseline]}`);

  for (const entry of comparison.entries) {
    console.log(`  ${STRATEGY_LABELS[entry.strategyId]}`);
    console.log(`    属性差值: ${formatStats(entry.statsDelta)}`);
    console.log(`    危机触发率差值: ${formatRates(entry.crisisTriggerRateDelta)}`);
    console.log(`    提前死亡率差值: ${formatRate(entry.earlyDeathRateDelta)}`);
  }
}

function formatStats(stats: SimulationFinalStats): string {
  return SIMULATION_STAT_KEYS.map((key) => `${STAT_LABELS[key]}=${stats[key].toFixed(2)}`).join(', ');
}

function formatRates(rates: Record<string, number>): string {
  const entries = Object.entries(rates);

  return entries.length === 0
    ? '{}'
    : entries.map(([key, value]) => `${STATUS_LABELS[key] ?? key}=${formatRate(value)}`).join(', ');
}

// 从正式回合系统配置里读取状态 id 对应的中文名，避免在 CLI 里重复维护一份状态名。
function buildStatusLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  const statuses = loadTurnSystemConfig().statuses;

  for (const key of Object.keys(statuses) as Array<keyof typeof statuses>) {
    const status = statuses[key];

    labels[status.id] = status.name;
  }

  return labels;
}

function formatRate(value: number): string {
  return value.toFixed(4);
}
