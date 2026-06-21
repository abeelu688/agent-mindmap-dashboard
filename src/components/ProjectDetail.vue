<script setup lang="ts">
import { sessions, equivalences, detailLoading, detailError } from '../composables/useTeamService'
import { formatDate } from '../utils/time'

defineProps<{
  slug: string
}>()

/** Try to extract a session ID from a SessionRecord.
 *  The actual shape varies, but we try common paths. */
function sessionId(record: Record<string, unknown>): string {
  // The team-service returns records from sessions table; the session_id
  // isn't embedded in the JSON — it's the map key. For the list endpoint
  // we get raw JSON, so try to find an ID field.
  if (typeof record.sessionId === 'string') return record.sessionId
  if (typeof record.id === 'string') return record.id
  if (record.meta && typeof (record.meta as Record<string, unknown>).sessionId === 'string') {
    return (record.meta as Record<string, unknown>).sessionId as string
  }
  return '—'
}

/** Extract analyzedAt from meta if present. */
function analyzedAt(record: Record<string, unknown>): number | undefined {
  const meta = record.meta as Record<string, unknown> | undefined
  if (meta && typeof meta.analyzedAt === 'number') return meta.analyzedAt
  return undefined
}

/** Count equivalence groups if present. */
function equivGroupCount(): string {
  if (!equivalences.value) return '—'
  const groups = equivalences.value.segmentEquivalences
  if (Array.isArray(groups)) return `${groups.length} groups`
  // Try other known shapes
  const keys = Object.keys(equivalences.value)
  for (const k of keys) {
    const val = (equivalences.value as Record<string, unknown>)[k]
    if (Array.isArray(val) && k.toLowerCase().includes('equiv')) return `${val.length} groups`
  }
  return '✅'
}
</script>

<template>
  <div class="project-detail">
    <div v-if="detailLoading" class="detail-loading">加载中…</div>

    <template v-else>
      <div v-if="detailError" class="detail-error">⚠️ {{ detailError }}</div>
      <!-- Equivalences status -->
      <div class="detail-section">
        <h4>Equivalences</h4>
        <span class="equiv-badge">{{ equivGroupCount() }}</span>
      </div>

      <!-- Session list -->
      <div class="detail-section">
        <h4>最近会话</h4>
        <div v-if="sessions.length === 0" class="detail-empty">暂无会话数据</div>
        <table v-else class="session-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>分析时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sess, i) in sessions" :key="i">
              <td class="monospace">{{ sessionId(sess) }}</td>
              <td>{{ formatDate(analyzedAt(sess)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.project-detail {
  padding: 1rem 1.25rem;
}

.detail-loading {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
}

.detail-section {
  margin-bottom: 1rem;
}

.detail-section h4 {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.5rem;
}

.equiv-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 600;
  background: #ecfdf5;
  color: #059669;
}

.detail-empty {
  color: #9ca3af;
  font-size: 0.85rem;
}

.detail-error {
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.75rem;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 4px;
  font-size: 0.82rem;
}

.session-table {
  width: 100%;
  border-collapse: collapse;
}

.session-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.session-table td {
  font-size: 0.82rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

.monospace {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 0.78rem;
}
</style>
