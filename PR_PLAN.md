# Dashboard — PR Plan

> **Repo**: `agent-mindmap-dashboard/`（独立 Vue 3 + Vite 项目，与 agent-mindmap、agent-mindmap-team-service 同级）
> **设计文档**: [`docs/DASHBOARD.md`](../docs/DASHBOARD.md)
> **依赖**: team-service REST API 已部署可用
> **状态 legend**: ✅ landed · 🔶 in progress · ⬜ not started

---

## D1 — 项目脚手架 ✅

- `npm create vite@latest . -- --template vue-ts` 初始化
- 配置 `vite.config.ts`：开发代理 `/v1` → `http://localhost:8080`，`/healthz` → 同
- `tsconfig.json` 严格模式
- `.gitignore`，`README.md`
- 验证：`npm run dev` 能启动，`npm run build` 能通过

## D2 — API client ✅

- `src/api/client.ts`：封装 `fetch`
  - 从 `localStorage` 读取 serverUrl + apiKey
  - 自动附加 `Authorization: Bearer <key>` header
  - 统一错误处理：401 → 标记未连接，5xx → 显示错误信息
  - 请求计时（采样延迟）
- 类型定义：`ProjectSummary`，`SearchHit` 等与 team-service API 对齐
- 验证：手动在控制台调用 client 能拿到数据

## D3 — 连接配置组件 ✅

- `src/components/ConnectionForm.vue`：Server URL + API Key 输入 + 连接按钮
- 连接逻辑：`GET /healthz` 验证连通性
- 连接成功后存入 `localStorage`，切换到 dashboard 视图
- 断线检测：轮询失败时显示重连提示，保留配置
- 验证：输入错误 key → 401 提示；正确 key → 进入 dashboard

## D4 — 数据获取 composable ✅

- `src/composables/useTeamService.ts`：
  - `fetchHealth()`：`GET /healthz`
  - `fetchProjects()`：`GET /v1/projects`
  - `fetchTrieRevision()`：`GET /v1/merges/concept-trie/revision`
  - `fetchSessions(slug)`：`GET /v1/projects/:slug/sessions?limit=20`
  - `fetchEquivalences(slug)`：`GET /v1/projects/:slug/equivalences`
  - 30s 自动轮询（health + projects + trie revision）
  - 响应式数据（`ref`）
  - 指标派生计算：Trie 滞后、数据新鲜度
- `src/utils/time.ts`：时间格式化（相对时间，中文友好："5 分钟前"）
- 验证：composable 返回正确的响应式数据

## D5 — 总览卡片组件 ✅

- `src/components/OverviewCards.vue`：5 个统计卡片
  - 服务状态（● 绿/红）
  - 项目数
  - 总会话数
  - Trie Revision
  - 数据新鲜度（最近 lastAnalyzedAt 的相对时间）
- 卡片样式：阴影、状态色标
- 验证：连接后卡片显示正确数值

## D6 — 项目列表 + 知识库构建状态 ✅

- `src/components/ProjectTable.vue`：项目列表表格
  - 列：Slug、会话数、项目 Rev、Trie 滞后、最后分析时间
  - Trie 滞后着色：0 正常，>5 ⚠️ 黄色，>20 🔴 红色
  - 点击行展开/收起
- `src/components/ProjectDetail.vue`：展开详情
  - 最近 20 条会话列表（Session ID + 分析时间）
  - Equivalences 状态（有数据显示 group 数量，无显示 "—"）
- 验证：点击项目行展开，看到会话列表和 equivalences

## D7 — 样式打磨 ✅

- 全局样式 `src/style.css`：现代简洁风格
- 加载状态（skeleton / spinner）
- 错误状态展示
- 空数据提示
- 响应式布局（桌面端为主）
- 验证：各状态（加载中、错误、空数据、正常数据）视觉正确

---

## 依赖图

```
D1 → D2 → D3 → D4 → D5 → D6 → D7
```

线性依赖，每一步在前一步基础上构建。

## 验证方式

1. `docker compose up` 在 team-service 目录启动 Postgres + teamd
2. `cd agent-mindmap-dashboard && npm run dev` 启动 dashboard
3. 浏览器访问 `http://localhost:5173`
4. 输入 API Key `changeme`（Server URL 留空走 Vite 代理）
5. 验证完整流程：连接 → 健康检查 → 项目列表 → 展开 → 会话 + equivalences
