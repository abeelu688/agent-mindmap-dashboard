# Agent Mind Map — Team Dashboard

Team service 可视化观测面板，用于监控服务健康、数据覆盖度、知识库构建状态。

## 开发

```bash
npm install
npm run dev        # → http://localhost:5173
npm run test       # → Vitest 单次运行
npm run lint       # → ESLint
npm run format     # → Prettier
npm run typecheck  # → vue-tsc
```

开发时 Vite 代理 `/v1` 和 `/healthz` 到 `http://localhost:8080`（team-service 默认端口），无需额外配置即可连接本地服务。可通过环境变量 `VITE_TEAM_SERVICE_PROXY_TARGET` 覆盖代理目标。

## 使用

1. 确保 team-service 运行（`docker compose up` 或直接启动 `teamd`）
2. 打开 `http://localhost:5173`
3. 输入 API Key（默认 `changeme`），Server URL 留空走代理
4. 点击"连接"进入 Dashboard

## 功能

- **服务健康**：30s 轮询 `/healthz`，实时状态指示
- **数据总览**：项目数、总会话数、Trie Revision、数据新鲜度
- **知识库构建**：Trie 滞后着色（>5 ⚠️ / >20 🔴），项目 Rev 追踪
- **项目详情**：点击展开查看会话列表 + Equivalences 状态

## 技术栈

- Vue 3 + Composition API + `<script setup>`
- TypeScript（strict mode）
- Vite（dev proxy）
- 原生 CSS，无 UI 库依赖
