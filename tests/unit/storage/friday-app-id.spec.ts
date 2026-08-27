import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFridayAppId, saveFridayAppId } from '../../../src/storage/friday-app-id.ts';

describe('fridayAppId', () => {
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
    const appId = await loadFridayAppId(storage);

    assert.strictEqual(appId, '');
  });

  it('saves and loads the app id', async () => {
    const storage = createMemoryStorage();
    await saveFridayAppId('app-id-123', storage);
    const appId = await loadFridayAppId(storage);

    assert.strictEqual(appId, 'app-id-123');
  });

  it('trims whitespace before saving', async () => {
    const storage = createMemoryStorage();
    await saveFridayAppId('  app-id-456  ', storage);
    const appId = await loadFridayAppId(storage);

    assert.strictEqual(appId, 'app-id-456');
  });
});
