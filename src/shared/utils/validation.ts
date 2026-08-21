// 判断一个值是不是非负整数。
export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

// 判断一个值是不是落在指定范围内的整数。
export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

// 检查一个值是不是指定范围内的整数；不符合时直接抛错。
export function assertIntegerInRange(value: unknown, min: number, max: number, label: string): asserts value is number {
  if (!isIntegerInRange(value, min, max)) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
}

// 把一组数字加起来。
export function sumNumbers(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// 检查数组长度有没有超过上限。
export function assertMaxLength(value: string[], max: number, label: string): void {
  if (value.length > max) {
    throw new Error(`${label} cannot exceed ${max} items`);
  }
}

// 统计某个字符串在数组里出现了几次。
export function countOccurrences(values: string[], target: string): number {
  return values.filter((value) => value === target).length;
}

// 把同一个 key 的数值变化先合并起来。
export function combineStatDeltas<T extends { key: string; amount: number }>(deltas: T[]): T[] {
  const totals = new Map<string, number>();

  for (const delta of deltas) {
    totals.set(delta.key, (totals.get(delta.key) ?? 0) + delta.amount);
  }

  return Array.from(totals.entries()).map(([key, amount]) => ({ key, amount } as T));
}
