# Review PR Plan — agent-mindmap-dashboard (correctness & foundation)

> **Source**: Codebase review conducted 2026-06-21 across the Vue 3 + TS dashboard repo.
>
> **Scope**: Correctness fixes for the connection/auth flow, error visibility, threshold bugs, and foundational test/lint/tooling. These extend the existing `PR_PLAN.md` (whose D1–D7 are now largely implemented but still marked `⬜ not started` — P D0.1 syncs status).
>
> **Convention**: PRs numbered `D<phase>.<sequence>`. Every PR keeps `npm run build` green.
>
> **Status legend**: ✅ landed · 🔶 in progress · ⬜ not started

---

## Findings → PR mapping

| PR | Severity | Area | Summary |
|----|----------|------|---------|
| D1.1 | 高 | auth | Connection check hits unauthenticated `/healthz`; bad API key still enters dashboard |
| D1.2 | 高 | correctness | Trie lag threshold wrong (`>5` warning, `>20` critical) — current code makes lag 6 critical |
| D1.3 | 高 | errors | API errors silently swallowed; dashboard shows stale/empty data with no feedback |
| D1.4 | 高 | config | Vite proxy hardcoded to `192.168.1.70:18080`; diverges from README/PR_PLAN, breaks others |
| D2.1 | 中 | lifecycle | `onUnmounted` called at module top-level of singleton composable; cleanup unreliable |
| D2.2 | 中 | state | Module-level global refs; split connection / core / detail state |
| D2.3 | 中 | auth | No auto-restore connection from localStorage on refresh |
| D2.4 | 中 | contract | API types hand-copied from Go; no schema/fixture parity check |
| D2.5 | 中 | runtime | `request<T>()` blind-casts JSON; no runtime validation |
| D2.6 | 中 | network | No fetch timeout / AbortController; connect button & polling can hang |
| D2.7 | 中 | contract | Session list can't reliably show Session ID (not embedded in JSON) |
| D2.8 | 中 | tests | No test setup (vitest) at all |
| D2.9 | 中 | tooling | No ESLint/Prettier; only `vue-tsc` in build |
| D2.10 | 中 | scope | DASHBOARD.md requires API latency P50/P99 + error rate; unimplemented |
| D3.1 | 低 | router | No vue-router (acceptable for v1 — document it) |
| D3.2 | 低 | docs | Sync `PR_PLAN.md` status + `README` proxy line; add `CLAUDE.md` |
| D3.3 | 低 | ui | Hardcoded colors vs CSS vars; favicon 404; table responsive; future-time `relativeTime` |
| D3.4 | 低 | tooling | Add standalone `typecheck` script |

---

## Phase D1 — High-severity correctness

### P D1.1 — Authenticate connection check ⬜

- **Files**: `src/components/ConnectionForm.vue` (~L31-36), `src/api/client.ts` (~L134-137, `fetchHealth` `auth:false`), `src/composables/useTeamService.ts` (~L92-102)
- **Problem**: `handleConnect()` only calls `fetchHealth()`, which hits unauthenticated `/healthz`. A wrong API key still `emit('connected')`. Subsequent 401s from `fetchProjects`/`fetchTrieRevision` are silently caught → empty dashboard, no auth feedback. Contradicts README:18-19 and PR_PLAN:34.
- **Approach**:
  - On connect, also call a lightweight authenticated endpoint (e.g. `GET /v1/projects` or `GET /v1/merges/concept-trie/revision`).
  - Surface 401 as an explicit auth error on the connection form.
- **Deps**: D1.3 (error state) to actually show the 401.
- **Risk**: low.

### P D1.2 — Fix trie lag threshold ⬜

- **Files**: `src/utils/time.ts` (~L58-61), `src/composables/useTeamService.ts` (~L67-71); spec `docs/DASHBOARD.md` (~L141-144) in hub, `PR_PLAN.md` (~L63-65), `README.md` (~L25)
- **Problem**: Spec: `>5` warning, `>20` critical. Current impl: `lag <= 5` → `warning`, `lag > 5` → `critical`. So lag 1–5 shows warning, lag 6 is already critical — `>20` never distinct.
- **Approach**: `lag <= 5` → ok; `5 < lag <= 20` → warning; `lag > 20` → critical. Fix `trieLagLabel()` accordingly.
- **Deps**: none.
- **Risk**: low; guard with D2.8 tests.

### P D1.3 — Surface API errors instead of swallowing ⬜

- **Files**: `src/composables/useTeamService.ts` (~L92-118)
- **Problem**: `fetchProjects` / `fetchTrieRevision` / `fetchSessions` / `fetchEquivalences` failures hit `catch {}` and vanish. User can't tell "no data" vs 401 vs 5xx vs network down — bad for an observability dashboard.
- **Approach**:
  - Add `coreError` / `detailError` reactive state.
  - 401 → disconnect / back to connection page with auth error.
  - 5xx / network → keep last data, show stale/error banner.
  - Detail fetch failure → local error state, not just empty list.
- **Deps**: none.
- **Risk**: low-medium.

### P D1.4 — De-hardcode Vite proxy target ⬜

- **Files**: `vite.config.ts` (~L7-12), `README.md` (~L12), `PR_PLAN.md` (~L12-13)
- **Problem**: Proxy hardcoded to `http://192.168.1.70:18080`; README/PR_PLAN say `http://localhost:8080`. Local working-tree change diverges from the init commit. Breaks other devs / risks hitting a shared environment.
- **Approach**: default `localhost:8080`, overridable via `VITE_TEAM_SERVICE_PROXY_TARGET`; README documents override.
- **Deps**: none.
- **Risk**: low.

---

## Phase D2 — Foundation (reliability, contract, tooling)

### P D2.1 — Fix composable lifecycle ⬜

- **Files**: `src/composables/useTeamService.ts` (~L3, L164-167)
- **Problem**: `onUnmounted()` is called at module top-level of a singleton module — not bound to a component instance, so polling cleanup is unreliable. `startPolling()` also doesn't `stopPolling()` first → duplicate intervals possible.
- **Approach**: either make it a real `useTeamService()` composable with `onUnmounted(stopPolling)` inside, or keep singleton but remove top-level `onUnmounted` and have `App.vue` call `stopPolling()` in its lifecycle. `startPolling()` should stop first.
- **Deps**: none.
- **Risk**: low.

### P D2.2 — Split state into connection / core / detail ⬜

- **Files**: `src/composables/useTeamService.ts` (~L22-36), `src/App.vue` (~L2-9)
- **Problem**: All state (`connected`, `projects`, `sessions`, `expandedSlug`, …) is one module-level singleton coupling connection, health/core, detail cache, and config. Fine for v1 single page, but blocks multi-page/feature growth.
- **Approach**: v1 can stay Pinia-free, but split into connection state / core metrics / project-detail state. Decide and document singleton-vs-composable.
- **Deps**: D2.1.
- **Risk**: low.

### P D2.3 — Auto-restore connection from localStorage ⬜

- **Files**: `src/components/ConnectionForm.vue` (~L20-26), `src/App.vue` (~L14)
- **Problem**: Form prefills stored URL/key, but after refresh the user must click Connect again. Observability dashboards usually resume polling.
- **Approach**: on mount, if a stored key exists, run authenticated check; success → `startPolling()`; failure → stay on connection page with error.
- **Deps**: D1.1, D1.3.
- **Risk**: low.

### P D2.4 — API contract parity check ⬜

- **Files**: `src/api/client.ts` (~L11-45); counterpart `agent-mindmap-team-service/internal/storage/storage.go` (~L56-64, `ProjectSummary mirrors the TypeScript ProjectSummary`)
- **Problem**: Dashboard types are hand-copied; team-service even has a comment saying it mirrors the TS type. Field renames / unit changes (epoch millis) silently break UI.
- **Approach**:
  - Short term: fixture/contract tests covering `/v1/projects`, trie revision, sessions, equivalences.
  - Long term: team-service emits OpenAPI schema → dashboard generates TS types.
  - Document epoch-millis units in both repos.
- **Deps**: D2.8 (test infra).
- **Risk**: low.

### P D2.5 — Runtime-validate API responses ⬜

- **Files**: `src/api/client.ts` (`request<T>`, ~L86-130, L140-148)
- **Problem**: `request<T>()` blind-casts JSON to `T`. Wrong shapes (`{error}`, array↔object, type drift) render as 0 / `—` / empty with no signal.
- **Approach**: light validation on key responses (`Array.isArray`, `typeof n === 'number'`); optionally zod/valibot. Malformed → error state.
- **Deps**: D1.3.
- **Risk**: low.

### P D2.6 — Fetch timeout / AbortController ⬜

- **Files**: `src/api/client.ts` (~L104-109), `src/components/ConnectionForm.vue` (~L28-49)
- **Problem**: Native `fetch` has no timeout. Unreachable server URL → `connecting` stays true indefinitely; polling can stack unfinished requests.
- **Approach**: `AbortController` + default timeout (5–10s) in `request()`; guard polling against overlapping refreshes.
- **Deps**: none.
- **Risk**: low.

### P D2.7 — Session ID in list endpoint ⬜

- **Files**: `src/components/ProjectDetail.vue` (~L13-25); contract `agent-mindmap-team-service/internal/api/server.go` (~L318-333)
- **Problem**: list-sessions returns raw SessionRecord JSON; the session ID is the storage map key, not embedded. Dashboard falls back through `sessionId`/`id`/`meta.sessionId` and shows `—`. Code comment admits "session_id isn't embedded in the JSON".
- **Approach**: prefer contract change — list returns `{ sessionId, record }` (or `{ sessionId, analyzedAt, ... }`). If backend can't change, document that Session ID may be unavailable and don't promise it in UI.
- **Deps**: cross-repo — coordinate with team-service (add to its review plan if taken).
- **Risk**: low-medium.

### P D2.8 — Add Vitest test setup ⬜

- **Files**: `package.json` (~L6-10), new `vitest.config.ts`, tests under `src/`
- **Problem**: No tests at all. Threshold bug (D1.2) shows these rules need protection.
- **Approach**: add Vitest; prioritize `freshnessLevel()`, `trieLagLevel()`, API error parsing, 401 connection handling. Later: component / e2e smoke.
- **Deps**: none.
- **Risk**: low.

### P D2.9 — Add ESLint + Prettier ⬜

- **Files**: `package.json` (~L6-20), `tsconfig.app.json` (~L7-12)
- **Problem**: TypeScript strict is on (good), but no ESLint/Prettier/Vue lint script. SFC style, unhandled promises, lifecycle misuse, a11y go uncaught.
- **Approach**: Vue official ESLint preset + TS ESLint + Prettier; `lint` / `format` / `typecheck` scripts.
- **Deps**: none.
- **Risk**: low.

### P D2.10 — API latency / error-rate metrics (or descope) ⬜

- **Files**: `docs/DASHBOARD.md` (~L20-22) in hub, `src/api/client.ts` (~L80-84), `src/components/OverviewCards.vue` (~L15-50)
- **Problem**: Design lists API latency P50/P99 + error rate as service-health metrics. Only `lastRequestDuration` exists, not shown, no P50/P99 or error rate.
- **Approach**: either implement (track last-N latencies, status-code buckets, error rate, surface in OverviewCards) or update design/PR_PLAN to descope v1.
- **Deps**: none.
- **Risk**: low.

---

## Phase D3 — Low-severity cleanup

### P D3.1 — Document v1 no-router stance ⬜

- **Files**: `package.json` (~L11-13), `src/main.ts`, `src/App.vue`
- **Problem**: No `vue-router`. Fine for v1 single page, but undocumented.
- **Approach**: PR_PLAN states "v1 single page, no vue-router"; add router skeleton only when multi-page work starts.

### P D3.2 — Sync docs + add CLAUDE.md ⬜

- **Files**: `PR_PLAN.md` (D1–D7 all `⬜` but implemented), `README.md` (proxy line), new `CLAUDE.md`
- **Problem**: PR_PLAN status stale; README proxy line wrong; no repo `CLAUDE.md`.
- **Approach**: update D1–D7 status, fold these review findings into next-round plan; fix README; add `CLAUDE.md` (project role, commands, API-contract source, no-`dist`, v1 router/Pinia stance, test/lint conventions).

### P D3.3 — UI polish ⬜

- **Files**: `src/style.css`, `src/components/*.vue`, `index.html` (~L5 favicon), `src/utils/time.ts` (~L11-30 relativeTime/freshnessLevel)
- **Problem**: hardcoded colors vs existing CSS vars; `index.html` references `/favicon.svg` but only `public/icons.svg` exists (404); `ProjectTable` not responsive on narrow screens; `relativeTime` shows "x ago" for future timestamps (clock skew).
- **Approach**: converge colors to `var(--*)`; add/use favicon; `overflow-x:auto` + ellipsis on table; handle `diff < 0` ("just now" / clock-skew).

### P D3.4 — Standalone `typecheck` script ⬜

- **Files**: `package.json` (~L6-10)
- **Problem**: `build` runs `vue-tsc -b && vite build`; no fast typecheck-only path for CI/dev.
- **Approach**: add `typecheck: vue-tsc -b`.

---

## Sequencing

```
D1.1 (auth) ─┬─> D1.3 (errors) ─┬─> D2.3 (auto-restore)
D1.2         │                  ├─> D2.5 (runtime validate)
D1.4         │                  │
             └──────────────────┘
D2.1 (lifecycle) ─> D2.2 (split state)
D2.6, D2.8, D2.9 — parallel (foundation)
D2.4 (contract) — after D2.8
D2.7 — cross-repo coordinate
D2.10 — independent
D3.* — parallel, low priority
```

Do D1 (correctness) first. D2.8/D2.9 (test + lint foundation) should land early so D1.2/D1.3 are test-protected. D2.7 needs team-service coordination.
