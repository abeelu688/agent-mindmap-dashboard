// API client for the agent-mindmap team service.
//
// All /v1/* routes require Authorization: Bearer <key>.
// /healthz is unauthenticated.
//
// Server URL and API key are read from localStorage on each call so the
// user can change them at runtime without reloading.

// ─── Types (aligned with team-service Go structs) ──────────────────────────

export interface ProjectSummary {
  projectSlug: string
  projectPath?: string
  revision: number
  recordCount: number
  lastAnalyzedAt?: number // epoch millis, 0 = never
  lastBuiltAt: number // epoch millis
}

export interface ConceptTrieRevision {
  revision: number
}

export interface RevisionResponse {
  revision: number
  recordCount: number
}

// Sessions are returned as raw JSON objects — the shape varies per version.
// We only extract a few known fields for display.
export interface SessionRecord {
  sessionId?: string
  meta?: {
    analyzedAt?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Equivalences are returned as raw JSON — we only need to know if they exist
// and count groups for display.
export interface EquivalenceData {
  segmentEquivalences?: unknown[]
  [key: string]: unknown
}

export interface ApiError {
  status: number
  message: string
}

// ─── Connection config helpers ────────────────────────────────────────────

const STORAGE_KEY_URL = 'amm_server_url'
const STORAGE_KEY_APIKEY = 'amm_api_key'

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || ''
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url)
}

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY_APIKEY) || ''
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_APIKEY, key)
}

export function clearConnection(): void {
  localStorage.removeItem(STORAGE_KEY_URL)
  localStorage.removeItem(STORAGE_KEY_APIKEY)
}

// ─── Low-level fetch wrapper ──────────────────────────────────────────────

let lastRequestDuration = 0

export function getLastRequestDuration(): number {
  return lastRequestDuration
}

// ─── Latency / error tracking (sliding window of last 20 requests) ───────

const WINDOW_SIZE = 20
const latencyWindow: number[] = []
let errorCount = 0
let totalRequests = 0

function recordLatency(ms: number): void {
  latencyWindow.push(ms)
  if (latencyWindow.length > WINDOW_SIZE) latencyWindow.shift()
  totalRequests++
}

function recordError(): void {
  errorCount++
  totalRequests++
}

export interface LatencyMetrics {
  p50: number
  p99: number
  errorRate: number
  totalRequests: number
}

export function getLatencyMetrics(): LatencyMetrics {
  if (latencyWindow.length === 0) {
    return { p50: 0, p99: 0, errorRate: 0, totalRequests: 0 }
  }
  const sorted = [...latencyWindow].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p99 = sorted[Math.floor(sorted.length * 0.99)]
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0
  return { p50, p99, errorRate, totalRequests }
}

const DEFAULT_TIMEOUT_MS = 10_000

async function request<T>(
  path: string,
  options: { auth?: boolean; method?: string; body?: unknown; timeout?: number } = {},
): Promise<T> {
  const { auth = true, method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS } = options
  const serverUrl = getServerUrl()
  const url = serverUrl ? `${serverUrl}${path}` : path

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (auth) {
    headers['Authorization'] = `Bearer ${getApiKey()}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const start = performance.now()
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      recordError()
      const apiErr: ApiError = { status: 0, message: `请求超时 (${timeout}ms)` }
      throw apiErr
    }
    recordError()
    throw err
  } finally {
    clearTimeout(timer)
  }
  lastRequestDuration = performance.now() - start
  recordLatency(lastRequestDuration)

  if (!res.ok) {
    recordError()
    let message = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody.error) message = errBody.error
    } catch {
      // ignore JSON parse errors on error responses
    }
    const apiErr: ApiError = { status: res.status, message }
    throw apiErr
  }

  // /healthz returns plain text "ok"
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return (await res.text()) as unknown as T
}

// ─── Runtime validation helpers ────────────────────────────────────────────

/** Validate that a value is an array; throw ApiError if not. */
function expectArray(data: unknown, label: string): asserts data is unknown[] {
  if (!Array.isArray(data)) {
    const apiErr: ApiError = { status: 0, message: `API 返回数据格式错误：${label} 应为数组` }
    throw apiErr
  }
}

/** Validate that a value is a number; throw ApiError if not. */
function expectNumber(data: unknown, label: string): asserts data is number {
  if (typeof data !== 'number') {
    const apiErr: ApiError = { status: 0, message: `API 返回数据格式错误：${label} 应为数字` }
    throw apiErr
  }
}

// ─── API methods ──────────────────────────────────────────────────────────

/** GET /healthz — no auth required */
export async function fetchHealth(): Promise<string> {
  return request<string>('/healthz', { auth: false })
}

/** GET /v1/projects */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const data = await request<unknown>('/v1/projects')
  expectArray(data, 'projects')
  return data as ProjectSummary[]
}

/** GET /v1/merges/concept-trie/revision */
export async function fetchTrieRevision(): Promise<ConceptTrieRevision> {
  const data = await request<unknown>('/v1/merges/concept-trie/revision')
  if (typeof data !== 'object' || data === null) {
    const apiErr: ApiError = { status: 0, message: 'API 返回数据格式错误：trie revision 应为对象' }
    throw apiErr
  }
  const obj = data as Record<string, unknown>
  expectNumber(obj.revision, 'revision')
  return data as ConceptTrieRevision
}

/** GET /v1/projects/:slug/revision */
export async function fetchProjectRevision(slug: string): Promise<RevisionResponse> {
  const data = await request<unknown>(`/v1/projects/${encodeURIComponent(slug)}/revision`)
  if (typeof data !== 'object' || data === null) {
    const apiErr: ApiError = {
      status: 0,
      message: 'API 返回数据格式错误：project revision 应为对象',
    }
    throw apiErr
  }
  const obj = data as Record<string, unknown>
  expectNumber(obj.revision, 'revision')
  expectNumber(obj.recordCount, 'recordCount')
  return data as RevisionResponse
}

/** GET /v1/projects/:slug/sessions?limit=N */
export async function fetchSessions(slug: string, limit = 20): Promise<SessionRecord[]> {
  const data = await request<unknown>(
    `/v1/projects/${encodeURIComponent(slug)}/sessions?limit=${limit}`,
  )
  expectArray(data, 'sessions')
  return data as SessionRecord[]
}

/** GET /v1/projects/:slug/equivalences */
export async function fetchEquivalences(slug: string): Promise<EquivalenceData | null> {
  try {
    const data = await request<unknown>(`/v1/projects/${encodeURIComponent(slug)}/equivalences`)
    if (typeof data !== 'object' || data === null) {
      const apiErr: ApiError = { status: 0, message: 'API 返回数据格式错误：equivalences 应为对象' }
      throw apiErr
    }
    return data as EquivalenceData
  } catch (err) {
    // 404 means no equivalences for this project — not an error
    if ((err as ApiError).status === 404) return null
    throw err
  }
}
