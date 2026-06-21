# CLAUDE.md — agent-mindmap-dashboard

Team service 可视化观测面板 (Vue 3 + TypeScript + Vite)。

## Commands

```bash
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # vue-tsc + vite build
npm run typecheck  # vue-tsc only (fast, no emit)
npm run test       # Vitest single run
npm run test:watch # Vitest watch mode
npm run lint       # ESLint
npm run format     # Prettier --write src/
```

## Architecture

- **Single-page, no vue-router** — v1 是单页 dashboard，多页时再加 router。
- **No Pinia** — 状态用 `src/composables/useTeamService.ts` 的模块级单例 refs。
- **API client** — `src/api/client.ts`，所有 `/v1/*` 需要 `Authorization: Bearer <key>`，`/healthz` 无需认证。
- **Runtime validation** — `expectArray()` / `expectNumber()` 验证 API 返回形状，格式错误抛 `ApiError`。
- **Latency tracking** — 滑动窗口（20 requests），`getLatencyMetrics()` 返回 P50/P99/errorRate。
- **Proxy** — Vite dev 代理默认 `localhost:8080`，可通过 `VITE_TEAM_SERVICE_PROXY_TARGET` 覆盖。

## API Contract Source

TypeScript types in `src/api/client.ts` are hand-aligned with Go structs in `agent-mindmap-team-service/internal/storage/storage.go` and `internal/api/server.go`. Field renames or epoch-millis unit changes will silently break the UI — coordinate across repos.

## Conventions

- **Epoch millis** — 所有时间字段都是 epoch milliseconds（Go: `time.Now().UnixMilli()`）。
- **CSS variables** — 颜色用 `var(--*)` (defined in `src/style.css`)，不在组件内硬编码。
- **Tests** — `src/__tests__/*.test.ts`，优先测试纯函数 (`utils/time.ts`, API error shapes)。
- **No `dist/`** — 不要 commit 构建产物。
