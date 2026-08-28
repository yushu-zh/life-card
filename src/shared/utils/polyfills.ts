// 老内核浏览器运行时兜底：在应用入口处 import 一次即可。
// 生产构建时 @vitejs/plugin-legacy 会注入 core-js 覆盖大部分 API，
// 但 dev 模式（如手机通过 `vite --host` 局域网调试）下 legacy 不生效，
// 这里对几个「构建不报错、运行时直接 throw」的 API 手动补一层兜底。

// structuredClone（Chrome 98+ / Safari 15.4+ 才有）。
// 本项目被克隆的数据都是纯 JSON 结构（快照、配置最终都要落 IndexedDB/网络），
// 因此 JSON 深拷贝在语义上是等价的。
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}

// crypto.randomUUID（Chrome 92+ 且需要安全上下文即 HTTPS/localhost）。
// 手机通过局域网 http://IP 访问时不算安全上下文，此函数会是 undefined。
// 优先退到老的 crypto.getRandomValues（Chrome 11+），再退 Math.random 兜底。
if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID !== 'function') {
  const hex = Array.from({ length: 16 }, (_, index) => index.toString(16));

  globalThis.crypto.randomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
    let bytes: ArrayLike<number>;

    if (typeof globalThis.crypto.getRandomValues === 'function') {
      bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    } else {
      // 极端老内核连 getRandomValues 都没有时的最后兜底（弱随机，仅用于本地会话 ID）。
      bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    }

    const value = Array.from(bytes, (byte) => hex[byte >> 4] + hex[byte & 15]).join('');
    const uuid = `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-a${value.slice(17, 20)}-${value.slice(20, 32)}`;
    return uuid as `${string}-${string}-${string}-${string}-${string}`;
  };
}
