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
  lastBuiltAt: number     // epoch millis
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

async function request<T>(
  path: string,
  options: { auth?: boolean; method?: string; body?: unknown } = {},
): Promise<T> {
  const { auth = true, method = 'GET', body } = options
  const serverUrl = getServerUrl()
  const url = serverUrl ? `${serverUrl}${path}` : path

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }
  if (auth) {
    headers['Authorization'] = `Bearer ${getApiKey()}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const start = performance.now()
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  lastRequestDuration = performance.now() - start

  if (!res.ok) {
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

// ─── API methods ──────────────────────────────────────────────────────────

/** GET /healthz — no auth required */
export async function fetchHealth(): Promise<string> {
  return request<string>('/healthz', { auth: false })
}

/** GET /v1/projects */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const data = await request<ProjectSummary[]>('/v1/projects')
  return data || []
}

/** GET /v1/merges/concept-trie/revision */
export async function fetchTrieRevision(): Promise<ConceptTrieRevision> {
  return request<ConceptTrieRevision>('/v1/merges/concept-trie/revision')
}

/** GET /v1/projects/:slug/revision */
export async function fetchProjectRevision(slug: string): Promise<RevisionResponse> {
  return request<RevisionResponse>(`/v1/projects/${encodeURIComponent(slug)}/revision`)
}

/** GET /v1/projects/:slug/sessions?limit=N */
export async function fetchSessions(slug: string, limit = 20): Promise<SessionRecord[]> {
  const data = await request<SessionRecord[]>(
    `/v1/projects/${encodeURIComponent(slug)}/sessions?limit=${limit}`,
  )
  return data || []
}

/** GET /v1/projects/:slug/equivalences */
export async function fetchEquivalences(slug: string): Promise<EquivalenceData | null> {
  try {
    return await request<EquivalenceData>(`/v1/projects/${encodeURIComponent(slug)}/equivalences`)
  } catch (err) {
    // 404 means no equivalences for this project — not an error
    if ((err as ApiError).status === 404) return null
    throw err
  }
}
