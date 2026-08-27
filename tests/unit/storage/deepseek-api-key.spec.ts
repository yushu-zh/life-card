import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadDeepSeekApiKey, saveDeepSeekApiKey } from '../../../src/storage/deepseek-api-key.ts';

describe('deepSeekApiKey', () => {
  function createMemoryStorage(): {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  } {
    let value: string | null = null;

    return {
      getItem() {
        return value;
      },
      setItem(_key: string, newValue: string) {
        value = newValue;
      },
      removeItem() {
        value = null;
      }
    };
  }

  it('returns empty string when nothing is saved', async () => {
    const storage = createMemoryStorage();
    const apiKey = await loadDeepSeekApiKey(storage);

    assert.strictEqual(apiKey, '');
  });

  it('saves and loads the api key', async () => {
    const storage = createMemoryStorage();
    await saveDeepSeekApiKey('sk-abc123', storage);
    const apiKey = await loadDeepSeekApiKey(storage);

    assert.strictEqual(apiKey, 'sk-abc123');
  });

  it('trims whitespace before saving', async () => {
    const storage = createMemoryStorage();
    await saveDeepSeekApiKey('  sk-def456  ', storage);
    const apiKey = await loadDeepSeekApiKey(storage);

    assert.strictEqual(apiKey, 'sk-def456');
  });
});
