// DeepSeek API Key 在 localStorage 里的 key，保持一致以避免不同版本互相覆盖。
const STORAGE_KEY = 'life-simulator:deepseek-api-key';

// localStorage 的简单抽象，方便测试注入。
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// 读取上次保存的 DeepSeek API Key；没有保存过时返回空串。
export async function loadDeepSeekApiKey(
  storage: StorageLike = getGlobalStorage()
): Promise<string> {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ?? '';
}

// 保存 DeepSeek API Key（去首尾空白），供下次创建角色时自动回填。
export async function saveDeepSeekApiKey(
  apiKey: string,
  storage: StorageLike = getGlobalStorage()
): Promise<void> {
  storage.setItem(STORAGE_KEY, apiKey.trim());
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
