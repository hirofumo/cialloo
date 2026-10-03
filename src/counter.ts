import { json } from "./http";

const COUNT_KEY = "ciallo_count";

/**
 * 全站 Ciallo 计数器。
 *
 * Durable Object 的输入门（input gate）保证单个实例的事件串行处理。把读—改—写
 * 整段包进 blockConcurrencyWhile，这段区间内不会有其他事件插入，自增因此是原子的。
 */
export class Counter {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === "POST") {
      const count = await this.state.blockConcurrencyWhile(async () => {
        const current = (await this.state.storage.get<number>(COUNT_KEY)) ?? 0;
        const next = current + 1;
        await this.state.storage.put(COUNT_KEY, next);
        return next;
      });
      return json({ count });
    }

    if (request.method === "GET") {
      const count = (await this.state.storage.get<number>(COUNT_KEY)) ?? 0;
      return json({ count });
    }

    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
  }
}