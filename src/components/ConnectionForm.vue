<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getServerUrl,
  setServerUrl,
  getApiKey,
  setApiKey,
  fetchHealth,
  fetchProjects,
} from '../api/client'

const serverUrl = ref('')
const apiKey = ref('')
const connecting = ref(false)
const error = ref('')

const emit = defineEmits<{
  connected: []
}>()

onMounted(() => {
  // Pre-fill from localStorage
  const savedUrl = getServerUrl()
  const savedKey = getApiKey()
  if (savedUrl) serverUrl.value = savedUrl
  if (savedKey) apiKey.value = savedKey
})

async function handleConnect() {
  error.value = ''
  connecting.value = true
  try {
    // Temporarily set values so fetch helpers can use them
    setServerUrl(serverUrl.value.trim())
    setApiKey(apiKey.value.trim())

    // Step 1: health check (unauthenticated)
    await fetchHealth()

    // Step 2: authenticated check — verify API key works
    await fetchProjects()

    emit('connected')
  } catch (err: unknown) {
    const apiErr = err as { status?: number; message?: string }
    if (apiErr.status === 401) {
      error.value = '认证失败：API Key 无效'
    } else if (apiErr.message) {
      error.value = apiErr.message
    } else {
      error.value = '无法连接到服务器'
    }
    // Don't clear stored values on failure — let user retry
  } finally {
    connecting.value = false
  }
}
</script>

<template>
  <div class="connection-form">
    <div class="form-card">
      <h1>🧠 Agent Mind Map</h1>
      <p class="subtitle">Team Dashboard</p>

      <div class="field">
        <label for="server-url">Server URL</label>
        <input
          id="server-url"
          v-model="serverUrl"
          type="text"
          placeholder="http://localhost:8080（留空走 Vite 代理）"
          :disabled="connecting"
          @keyup.enter="handleConnect"
        />
        <span class="hint">开发环境可留空，由 Vite dev server 代理到 localhost:8080</span>
      </div>

      <div class="field">
        <label for="api-key">API Key</label>
        <input
          id="api-key"
          v-model="apiKey"
          type="password"
          placeholder="输入 API Key"
          :disabled="connecting"
          @keyup.enter="handleConnect"
        />
      </div>

      <button class="connect-btn" :disabled="connecting || !apiKey.trim()" @click="handleConnect">
        {{ connecting ? '连接中…' : '连接' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.connection-form {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.form-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0 0 1.5rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.field {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

input:disabled {
  background: var(--bg);
}

.hint {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-light);
}

.connect-btn {
  width: 100%;
  padding: 0.7rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.connect-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 1rem;
  padding: 0.6rem 0.75rem;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 6px;
  font-size: 0.85rem;
}
</style>
