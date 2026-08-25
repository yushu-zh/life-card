import type { CurrentSessionPointer } from '../../shared/types/ui.ts';

// 当前会话指针在 localStorage 里的 key，保持一致以避免不同版本互相覆盖。
const STORAGE_KEY = 'life-simulator:current-session-pointer';

// localStorage 的简单抽象，方便测试注入。
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// 读取当前会话指针。
export async function loadCurrentSessionPointer(
  storage: StorageLike = getGlobalStorage()
): Promise<CurrentSessionPointer> {
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return { sessionId: null };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === 'object' && 'sessionId' in parsed) {
      const sessionId = (parsed as { sessionId: unknown }).sessionId;
      return { sessionId: typeof sessionId === 'string' ? sessionId : null };
    }
  } catch {
    // JSON 解析失败时当作没有指针。
  }

  return { sessionId: null };
}

// 写入当前会话指针。
export async function saveCurrentSessionPointer(
  pointer: CurrentSessionPointer,
  storage: StorageLike = getGlobalStorage()
): Promise<void> {
  storage.setItem(STORAGE_KEY, JSON.stringify(pointer));
}

// 清空当前会话指针，用于重新开始或清空存档。
export async function clearCurrentSessionPointer(
  storage: StorageLike = getGlobalStorage()
): Promise<void> {
  storage.removeItem(STORAGE_KEY);
}

// 默认使用全局 localStorage；若不存在（如 SSR 或测试环境）则返回内存存储替身。
function getGlobalStorage(): StorageLike {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }

  let memoryValue: string | null = null;

  return {
    getItem() {
      return memoryValue;
    },
    setItem(_key: string, value: string) {
      memoryValue = value;
    },
    removeItem() {
      memoryValue = null;
    }
  };
}
