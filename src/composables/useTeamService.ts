// Composable for team service data fetching, 30s polling, and derived metrics.

import { ref, computed, onUnmounted } from 'vue'
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

// Expanded project details (lazy-loaded on click)
export const expandedSlug = ref<string | null>(null)
export const sessions = ref<SessionRecord[]>([])
export const equivalences = ref<EquivalenceData | null>(null)
export const detailLoading = ref(false)

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
  if (lag <= 0) return '0'
  return `⚠️ ${lag}`
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
  } catch {
    // Individual fetch failures are tolerated; stale data stays displayed
  }
}

async function loadProjectDetail(slug: string): Promise<void> {
  detailLoading.value = true
  try {
    const [sess, equiv] = await Promise.all([
      fetchSessions(slug),
      fetchEquivalences(slug),
    ])
    sessions.value = sess
    equivalences.value = equiv
  } catch {
    // Show whatever we got
  } finally {
    detailLoading.value = false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export function startPolling(): void {
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
  projects.value = []
  trieRevision.value = 0
  expandedSlug.value = null
  sessions.value = []
  equivalences.value = null
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

// Auto-cleanup on component unmount
onUnmounted(() => {
  stopPolling()
})
