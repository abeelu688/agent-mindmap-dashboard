<script setup lang="ts">
import {
  projects,
  expandedSlug,
  toggleExpand,
  trieLagClass,
  trieLagLabel,
  loading,
  type ProjectSummary,
} from '../composables/useTeamService'
import { relativeTime } from '../utils/time'
import ProjectDetail from './ProjectDetail.vue'

function lagCellClass(project: ProjectSummary): string {
  const cls = trieLagClass(project)
  if (cls === 'critical') return 'lag-critical'
  if (cls === 'warning') return 'lag-warning'
  return 'lag-ok'
}
</script>

<template>
  <div class="project-table-wrapper">
    <h2 class="section-title">知识库构建状态</h2>

    <div v-if="loading && projects.length === 0" class="empty-state">加载中…</div>

    <div v-else-if="projects.length === 0" class="empty-state">暂无项目数据</div>

    <table v-else class="project-table">
      <thead>
        <tr>
          <th class="col-expand" />
          <th class="col-slug">Slug</th>
          <th class="col-num">会话数</th>
          <th class="col-num">项目 Rev</th>
          <th class="col-num">Trie 滞后</th>
          <th class="col-time">最后分析</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="project in projects" :key="project.projectSlug">
          <tr
            class="project-row"
            :class="{ 'project-row--expanded': expandedSlug === project.projectSlug }"
            @click="toggleExpand(project.projectSlug)"
          >
            <td class="col-expand">
              <span class="expand-icon">{{ expandedSlug === project.projectSlug ? '▾' : '▸' }}</span>
            </td>
            <td class="col-slug">{{ project.projectSlug }}</td>
            <td class="col-num">{{ project.recordCount }}</td>
            <td class="col-num">{{ project.revision }}</td>
            <td class="col-num" :class="lagCellClass(project)">
              {{ trieLagLabel(project) }}
            </td>
            <td class="col-time">{{ relativeTime(project.lastAnalyzedAt) }}</td>
          </tr>
          <tr v-if="expandedSlug === project.projectSlug" class="detail-row">
            <td colspan="6">
              <ProjectDetail :slug="project.projectSlug" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.95rem;
}

.project-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

thead th {
  background: #f9fafb;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.65rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.col-expand { width: 32px; }
.col-slug { min-width: 140px; }
.col-num { width: 90px; text-align: right; }
.col-time { width: 120px; }

.project-row {
  cursor: pointer;
  transition: background 0.1s;
}

.project-row:hover {
  background: #f3f4f6;
}

.project-row--expanded {
  background: #eef2ff;
}

.project-row td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.88rem;
  color: #374151;
}

.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.expand-icon {
  color: #9ca3af;
  font-size: 0.8rem;
}

/* Trie lag coloring */
.lag-ok { color: #22c55e; font-weight: 600; }
.lag-warning { color: #f59e0b; font-weight: 600; }
.lag-critical { color: #ef4444; font-weight: 700; }

.detail-row td {
  padding: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #f8faff;
}
</style>
