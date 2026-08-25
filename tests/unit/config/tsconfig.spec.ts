import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('tsconfig', () => {
  // TypeScript 7 的 Bundler 解析下不再自动包含 @types/node，因此 tsconfig 里显式声明 node 类型。
  it('explicitly includes node type definitions', () => {
    const raw = readFileSync(new URL('../../../tsconfig.json', import.meta.url), 'utf8');

    assert.match(
      raw,
      /"types"\s*:\s*\[[^\]]*"node"[^\]]*\]/,
      'tsconfig should include node type definitions'
    );
  });
});
