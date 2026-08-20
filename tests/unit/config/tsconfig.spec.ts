import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('tsconfig', () => {
  it('does not require external node type definitions', () => {
    const tsconfig = JSON.parse(
      readFileSync(new URL('../../../tsconfig.json', import.meta.url), 'utf8')
    ) as {
      compilerOptions?: {
        types?: string[];
      };
    };

    assert.equal(
      'types' in (tsconfig.compilerOptions ?? {}),
      false,
      'tsconfig should not explicitly require missing node type definitions'
    );
  });
});
