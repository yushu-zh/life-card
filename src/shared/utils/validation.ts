export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function sumNumbers(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function assertMaxLength(value: string[], max: number, label: string): void {
  if (value.length > max) {
    throw new Error(`${label} cannot exceed ${max} items`);
  }
}
