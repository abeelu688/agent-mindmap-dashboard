<script setup lang="ts">
import {
  healthOk,
  healthError,
  projects,
  trieRevision,
  totalSessions,
  freshnessLabel,
  freshnessClass,
  loading,
} from '../composables/useTeamService'
import { getLatencyMetrics } from '../api/client'
import { computed } from 'vue'

const metrics = computed(() => getLatencyMetrics())

function formatMs(ms: number): string {
  if (ms === 0) return '—'
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

function formatRate(rate: number): string {
  if (rate === 0) return '0%'
  return `${(rate * 100).toFixed(0)}%`
}
</script>

<template>
  <div class="overview-cards">
    <!-- Service health -->
    <div class="card" :class="{ 'card--ok': healthOk, 'card--err': !healthOk && !loading }">
      <span class="card-label">服务状态</span>
      <span class="card-value">
        <span v-if="loading" class="status-dot status-dot--loading" />
        <span v-else-if="healthOk" class="status-dot status-dot--ok" />
        <span v-else class="status-dot status-dot--err" />
        {{ loading ? '检测中' : healthOk ? '正常' : '异常' }}
      </span>
      <span v-if="healthError && !healthOk" class="card-detail error-text">{{ healthError }}</span>
    </div>

    <!-- Project count -->
    <div class="card">
      <span class="card-label">项目数</span>
      <span class="card-value">{{ loading ? '—' : projects.length }}</span>
    </div>

    <!-- Total sessions -->
    <div class="card">
      <span class="card-label">总会话数</span>
      <span class="card-value">{{ loading ? '—' : totalSessions }}</span>
    </div>

    <!-- Trie revision -->
    <div class="card">
      <span class="card-label">Trie Revision</span>
      <span class="card-value">{{ loading ? '—' : trieRevision }}</span>
    </div>

    <!-- Data freshness -->
    <div
      class="card"
      :class="{
        'card--fresh': freshnessClass === 'fresh',
        'card--stale': freshnessClass === 'stale',
        'card--critical': freshnessClass === 'critical',
      }"
    >
      <span class="card-label">数据新鲜度</span>
      <span class="card-value">{{ loading ? '—' : freshnessLabel }}</span>
    </div>

    <!-- API latency -->
    <div class="card">
      <span class="card-label">API 延迟</span>
      <span class="card-value">{{ formatMs(metrics.p50) }}</span>
      <span class="card-detail">P50 / P99 {{ formatMs(metrics.p99) }}</span>
    </div>

    <!-- Error rate -->
    <div
      class="card"
      :class="{
        'card--ok': metrics.errorRate === 0 && metrics.totalRequests > 0,
        'card--err': metrics.errorRate > 0,
      }"
    >
      <span class="card-label">错误率</span>
      <span class="card-value">{{ formatRate(metrics.errorRate) }}</span>
      <span class="card-detail">{{ metrics.totalRequests }} 请求</span>
    </div>
  </div>
</template>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 4px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: border-color 0.2s;
}

.card--ok {
  border-left-color: var(--ok);
}
.card--err {
  border-left-color: var(--err);
}
.card--fresh {
  border-left-color: var(--ok);
}
.card--stale {
  border-left-color: var(--warn);
}
.card--critical {
  border-left-color: var(--err);
}

.card-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.card-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.card-detail {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.error-text {
  color: #b91c1c;
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot--ok {
  background: var(--ok);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.status-dot--err {
  background: var(--err);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.status-dot--loading {
  background: var(--text-light);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>
