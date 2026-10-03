import { json } from "./http";

// Durable Object 由同一个入口导出，wrangler 会把它连同默认导出的 Worker 一起打包。
export { Counter } from "./counter";

/**
 * 全站只有一条计数记录，用固定名字寻址到同一个 Durable Object 实例。
 * 换名字会开出一个新计数器，计数从 0 重新开始。
 */
const COUNTER_INSTANCE = "cialloo-counter";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // run_worker_first 只把 /api/* 放进 Worker，所以进到这里的第一件事就是分流 API。
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname !== "/api/counter") {
        return json({ error: "Not found" }, 404);
      }

      if (request.method !== "GET" && request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
      }

      const id = env.COUNTER.idFromName(COUNTER_INSTANCE);
      const stub = env.COUNTER.get(id);
      return stub.fetch("https://counter.internal/api/counter", {
        method: request.method,
      });
    }

    // 静态资源默认由 Assets 先行匹配，走到这里说明配置变了，这里兜底。
    return env.ASSETS.fetch(request);
  },
};