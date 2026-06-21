<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  connected,
  healthOk,
  coreError,
  disconnect,
  startPolling,
  stopPolling,
} from './composables/useTeamService'
import { getApiKey, fetchHealth, fetchProjects } from './api/client'
import ConnectionForm from './components/ConnectionForm.vue'
import OverviewCards from './components/OverviewCards.vue'
import ProjectTable from './components/ProjectTable.vue'

function onConnected() {
  startPolling()
}

onMounted(async () => {
  const savedKey = getApiKey()
  if (!savedKey) return
  try {
    await fetchHealth()
    await fetchProjects()
    startPolling()
  } catch {
    // Auto-restore failed — stay on connection form with prefilled values
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <ConnectionForm v-if="!connected" @connected="onConnected" />

  <div v-else class="dashboard">
    <header class="dashboard-header">
      <h1>🧠 Agent Mind Map — Team Dashboard</h1>
      <div class="header-actions">
        <span class="connection-badge" :class="{ 'connection-badge--err': !healthOk }">
          <span class="status-dot" :class="healthOk ? 'status-dot--ok' : 'status-dot--err'" />
          {{ healthOk ? 'Connected' : 'Disconnected' }}
        </span>
        <button class="disconnect-btn" @click="disconnect">断开</button>
      </div>
    </header>

    <div v-if="coreError" class="error-banner">⚠️ {{ coreError }}</div>

    <OverviewCards />
    <ProjectTable />
  </div>
</template>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot--ok {
  background: var(--ok);
  box-shadow: 0 0 4px rgba(34, 197, 94, 0.4);
}

.status-dot--err {
  background: var(--err);
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
}

.error-banner {
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 6px;
  font-size: 0.85rem;
}
</style>
