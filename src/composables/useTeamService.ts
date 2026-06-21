// Composable for team service data fetching, 30s polling, and derived metrics.

import { ref, computed } from 'vue'
import {
  fetchHealth,
  fetchProjects,
  fetchTrieRevision,
  fetchSessions,
  fetchEquivalences,
  clearConnection,
  type ProjectSummary as ProjectSummaryType,
  type SessionRecord,
  type EquivalenceData,
} from '../api/client'

// Re-export for components
export type ProjectSummary = ProjectSummaryType
import { relativeTime, freshnessLevel, trieLagLevel } from '../utils/time'

// ─── Reactive state ───────────────────────────────────────────────────────

export const connected = ref(false)
export const healthOk = ref(false)
export const healthError = ref('')
export const projects = ref<ProjectSummary[]>([])
export const trieRevision = ref(0)
export const loading = ref(false)

// Core data error (projects / trie revision fetch)
export const coreError = ref('')

// Expanded project details (lazy-loaded on click)
export const expandedSlug = ref<string | null>(null)
export const sessions = ref<SessionRecord[]>([])
export const equivalences = ref<EquivalenceData | null>(null)
export const detailLoading = ref(false)
export const detailError = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 30_000

// ─── Derived metrics ──────────────────────────────────────────────────────

export const totalSessions = computed(() =>
  projects.value.reduce((sum, p) => sum + p.recordCount, 0),
)

export const latestAnalyzedAt = computed(() => {
  let latest = 0
  for (const p of projects.value) {
    if (p.lastAnalyzedAt && p.lastAnalyzedAt > latest) {
      latest = p.lastAnalyzedAt
    }
  }
  return latest || undefined
})

export const freshnessLabel = computed(() => relativeTime(latestAnalyzedAt.value))

export const freshnessClass = computed(() => freshnessLevel(latestAnalyzedAt.value))

/** Trie lag per project: project.revision - trieRevision */
export function trieLag(project: ProjectSummary): number {
  return project.revision - trieRevision.value
}

export function trieLagClass(project: ProjectSummary): string {
  return trieLagLevel(trieLag(project))
}

export function trieLagLabel(project: ProjectSummary): string {
  const lag = trieLag(project)
  const level = trieLagLevel(lag)
  if (level === 'ok') return `${lag}`
  if (level === 'warning') return `⚠️ ${lag}`
  return `🔴 ${lag}`
}

// ─── Data fetching ────────────────────────────────────────────────────────

async function refreshCore(): Promise<void> {
  // Fetch health
  try {
    await fetchHealth()
    healthOk.value = true
    healthError.value = ''
  } catch (err) {
    healthOk.value = false
    const apiErr = err as { status?: number; message?: string }
    healthError.value = apiErr.message || '连接失败'
    if (apiErr.status === 401) {
      // Session lost — disconnect
      disconnect()
      return
    }
  }

  // Fetch projects + trie revision in parallel
  try {
    const [projData, trieData] = await Promise.all([
      fetchProjects(),
      fetchTrieRevision(),
    ])
    projects.value = projData
    trieRevision.value = trieData.revision
    coreError.value = ''
  } catch (err) {
    const apiErr = err as { status?: number; message?: string }
    if (apiErr.status === 401) {
      disconnect()
      return
    }
    // Keep stale data, show error banner
    coreError.value = apiErr.message || '数据加载失败'
  }
}

async function loadProjectDetail(slug: string): Promise<void> {
  detailLoading.value = true
  detailError.value = ''
  try {
    const [sess, equiv] = await Promise.all([
      fetchSessions(slug),
      fetchEquivalences(slug),
    ])
    sessions.value = sess
    equivalences.value = equiv
  } catch (err) {
    const apiErr = err as { status?: number; message?: string }
    detailError.value = apiErr.message || '详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export function startPolling(): void {
  stopPolling()
  connected.value = true
  loading.value = true
  refreshCore().finally(() => { loading.value = false })

  pollTimer = setInterval(() => {
    refreshCore()
  }, POLL_INTERVAL)
}

export function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function disconnect(): void {
  stopPolling()
  connected.value = false
  healthOk.value = false
  healthError.value = ''
  coreError.value = ''
  projects.value = []
  trieRevision.value = 0
  expandedSlug.value = null
  sessions.value = []
  equivalences.value = null
  detailError.value = ''
  clearConnection()
}

export function toggleExpand(slug: string): void {
  if (expandedSlug.value === slug) {
    expandedSlug.value = null
    sessions.value = []
    equivalences.value = null
  } else {
    expandedSlug.value = slug
    loadProjectDetail(slug)
  }
}
