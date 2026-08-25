import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearCurrentSessionPointer,
  loadCurrentSessionPointer,
  saveCurrentSessionPointer
} from '../../../src/storage/game-session/currentSessionPointer.ts';

describe('currentSessionPointer', () => {
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

  it('returns null when no pointer is saved', async () => {
    const storage = createMemoryStorage();
    const pointer = await loadCurrentSessionPointer(storage);

    assert.strictEqual(pointer.sessionId, null);
  });

  it('saves and loads the current session id', async () => {
    const storage = createMemoryStorage();
    await saveCurrentSessionPointer({ sessionId: 'session-123' }, storage);
    const pointer = await loadCurrentSessionPointer(storage);

    assert.strictEqual(pointer.sessionId, 'session-123');
  });

  it('clears the current session id', async () => {
    const storage = createMemoryStorage();
    await saveCurrentSessionPointer({ sessionId: 'session-123' }, storage);
    await clearCurrentSessionPointer(storage);
    const pointer = await loadCurrentSessionPointer(storage);

    assert.strictEqual(pointer.sessionId, null);
  });
});
