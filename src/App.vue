<script setup lang="ts">
import { onUnmounted } from 'vue'
import { connected, healthOk, disconnect, startPolling, stopPolling } from './composables/useTeamService'
import ConnectionForm from './components/ConnectionForm.vue'
import OverviewCards from './components/OverviewCards.vue'
import ProjectTable from './components/ProjectTable.vue'

function onConnected() {
  startPolling()
}

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
</style>
