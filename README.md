# cialloo.cc

「Ciallo～(∠・ω< )⌒★」互动问候小站。部署在 Cloudflare Workers 上：静态资源由
Workers Assets 提供，全站计数器由一个 Durable Object 持有。前端无构建步骤，原生
ES module 直接出图。

线上地址：<https://cialloo.cc>

## 功能

- 点击按钮随机展示 315 条 Ciallo 谐音诗
- 展示全站累计 Ciallo 次数
- 展示本机累计次数（localStorage，刷新后保留）
- 计数接口不可用时降级显示，站点其余部分照常工作
- 响应式布局，尊重系统的「减弱动态效果」偏好
- 自定义 404 页

## 技术栈

| 项 | 选型 |
| --- | --- |
| 运行时 | Cloudflare Workers |
| 静态资源 | Workers Assets |
| 计数器 | Durable Objects（SQLite 后端） |
| 语言 | TypeScript（Worker）+ 原生 ES module（前端） |
| 工具链 | wrangler 4、TypeScript 5 |
| 域名 | cialloo.cc（zone 内 Worker 路由） |

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `src/index.ts` | Worker 入口。分流 `/api/*`，其余请求交给静态资源。 |
| `src/counter.ts` | Durable Object。持有全站唯一一条计数记录。 |
| `src/http.ts` | JSON 响应辅助函数。 |
| `public/index.html` | 首页。 |
| `public/404.html` | 404 页。 |
| `public/poems.js` | 315 条 Ciallo 诗库，以 ES module 导出。 |
| `public/app.js` | 前端交互逻辑，ES module。 |
| `public/styles.css` | 样式。 |
| `package.json` | 依赖与脚本。 |
| `wrangler.jsonc` | Cloudflare 部署配置。 |
| `tsconfig.json` | 类型检查配置。 |
| `public/.assetsignore` | 上传静态资源时忽略的文件模式。 |
| `.gitignore` | 忽略生成物与本地配置。 |
| `.gitattributes` | 统一仓库内换行符为 LF。 |

## 请求链路

```
浏览器 ─┬─ /api/counter ─▶ Worker ─▶ Durable Object (Counter) ─▶ 存储
        ├─ /api/* 其他   ─▶ Worker ─▶ 404 JSON
        └─ 其它路径    ─▶ Workers Assets (public/) ─▶ 未命中则 404.html
```

分流由 `wrangler.jsonc` 的 `assets.run_worker_first: ["/api/*"]` 控制：只有 `/api/*`
先进 Worker，其余路径由静态资源先行匹配，Worker 里的 `env.ASSETS.fetch()` 是兜底。
`assets.binding` 显式声明为 `"ASSETS"`。

## API

### `GET /api/counter`

返回全站累计次数。

```json
{ "count": 771 }
```

### `POST /api/counter`

计数加一，返回加一后的值。读—改—写整段包在 Durable Object 的
`blockConcurrencyWhile` 内，并发请求被串行化，不会丢更新。

```json
{ "count": 772 }
```

其它 HTTP 方法返回 `405` 并带 `Allow: GET, POST`；`/api/` 下的其它路径返回 `404`。

## 开发

```bash
npm install

npm run dev         # 本地开发，默认 http://localhost:8787
npm run typecheck   # 生成绑定类型并做类型检查
npm run deploy      # 部署到 Cloudflare
```

`npm run typecheck` 会先跑 `wrangler types` 生成 `worker-configuration.d.ts`（该文件
不纳入版本管理），再执行 `tsc --noEmit`。改动 `wrangler.jsonc` 后需要重新执行。

`src/index.ts` 里的 `COUNTER_INSTANCE` 是计数器的寻址名，改动它会开出新实例，计数从
0 重新开始。

本地计数器与线上相互独立，本地计数从 0 开始。

## License

[MIT](LICENSE)