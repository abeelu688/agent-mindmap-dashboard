// Time formatting utilities — Chinese-friendly relative times.

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/**
 * Format an epoch-millis timestamp as a relative time string in Chinese.
 * Returns "—" for falsy/zero values.
 */
export function relativeTime(epochMs: number | undefined | null): string {
  if (!epochMs) return '—'

  const diff = Date.now() - epochMs
  const abs = Math.abs(diff)

  if (abs < MINUTE) return '刚刚'
  if (abs < HOUR) {
    const mins = Math.floor(abs / MINUTE)
    return `${mins} 分钟前`
  }
  if (abs < DAY) {
    const hours = Math.floor(abs / HOUR)
    return `${hours} 小时前`
  }
  const days = Math.floor(abs / DAY)
  if (days < 30) return `${days} 天前`
  // Fall back to date string
  return formatDate(epochMs)
}

/**
 * Format an epoch-millis timestamp as a locale date string.
 */
export function formatDate(epochMs: number | undefined | null): string {
  if (!epochMs) return '—'
  const d = new Date(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Classify data freshness based on how long since lastAnalyzedAt.
 * Returns 'fresh' | 'stale' | 'critical' | 'none'
 */
export function freshnessLevel(epochMs: number | undefined | null): 'fresh' | 'stale' | 'critical' | 'none' {
  if (!epochMs) return 'none'
  const diff = Date.now() - epochMs
  if (diff < HOUR) return 'fresh'
  if (diff < DAY) return 'stale'
  return 'critical'
}

/**
 * Classify trie lag based on the difference between project revision and trie revision.
 * Spec: lag <= 5 → ok, 5 < lag <= 20 → warning, lag > 20 → critical
 * Returns 'ok' | 'warning' | 'critical'
 */
export function trieLagLevel(lag: number): 'ok' | 'warning' | 'critical' {
  if (lag <= 5) return 'ok'
  if (lag <= 20) return 'warning'
  return 'critical'
}
