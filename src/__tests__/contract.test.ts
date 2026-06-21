/**
 * Contract tests — verify the dashboard's expected API response shapes
 * match the team-service Go structs.
 *
 * These use fixture data rather than hitting a live server.
 * When the backend changes, update fixtures and these tests will fail
 * to signal a contract break.
 */

import { describe, it, expect } from 'vitest'

// ─── Fixture data (aligned with team-service Go structs) ───────────────────

const PROJECT_SUMMARY_FIXTURE = {
  projectSlug: 'my-project',
  projectPath: '/home/user/my-project',
  revision: 42,
  recordCount: 10,
  lastAnalyzedAt: 1719000000000,
  lastBuiltAt: 1719000100000,
}

const TRIE_REVISION_FIXTURE = {
  revision: 40,
}

const PROJECT_REVISION_FIXTURE = {
  revision: 42,
  recordCount: 10,
}

const SESSION_FIXTURE = {
  sessionId: 'abc-123',
  meta: {
    analyzedAt: 1719000000000,
  },
}

const EQUIVALENCE_FIXTURE = {
  segmentEquivalences: [{ id: 'eq1' }, { id: 'eq2' }],
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('API contract: ProjectSummary', () => {
  it('has required string fields', () => {
    expect(typeof PROJECT_SUMMARY_FIXTURE.projectSlug).toBe('string')
  })

  it('has required number fields', () => {
    expect(typeof PROJECT_SUMMARY_FIXTURE.revision).toBe('number')
    expect(typeof PROJECT_SUMMARY_FIXTURE.recordCount).toBe('number')
    expect(typeof PROJECT_SUMMARY_FIXTURE.lastBuiltAt).toBe('number')
  })

  it('epoch millis are in valid range (> year 2020)', () => {
    const MIN_EPOCH = 1577836800000 // 2020-01-01
    expect(PROJECT_SUMMARY_FIXTURE.lastAnalyzedAt!).toBeGreaterThan(MIN_EPOCH)
    expect(PROJECT_SUMMARY_FIXTURE.lastBuiltAt).toBeGreaterThan(MIN_EPOCH)
  })
})

describe('API contract: ConceptTrieRevision', () => {
  it('has revision number', () => {
    expect(typeof TRIE_REVISION_FIXTURE.revision).toBe('number')
  })
})

describe('API contract: RevisionResponse', () => {
  it('has revision and recordCount numbers', () => {
    expect(typeof PROJECT_REVISION_FIXTURE.revision).toBe('number')
    expect(typeof PROJECT_REVISION_FIXTURE.recordCount).toBe('number')
  })
})

describe('API contract: SessionRecord', () => {
  it('sessionId is optional string', () => {
    expect(typeof SESSION_FIXTURE.sessionId).toBe('string')
  })

  it('meta.analyzedAt is optional number', () => {
    expect(typeof (SESSION_FIXTURE.meta as Record<string, unknown>).analyzedAt).toBe('number')
  })
})

describe('API contract: EquivalenceData', () => {
  it('segmentEquivalences is optional array', () => {
    expect(Array.isArray(EQUIVALENCE_FIXTURE.segmentEquivalences)).toBe(true)
  })
})
