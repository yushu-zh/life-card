declare module 'node:assert/strict' {
  const assert: {
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    doesNotThrow(block: () => unknown, message?: string): void;
    throws(block: () => unknown, error?: Error | RegExp): void;
  };

  export default assert;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:fs' {
  export function readFileSync(path: URL | string, encoding: string): string;
}
