import { describe, it, expect } from 'vitest'
import type { ApiError } from '../api/client'

// Unit tests for API error shape — the runtime validation functions
// are tested indirectly through integration; here we verify the type.

describe('ApiError', () => {
  it('has status and message fields', () => {
    const err: ApiError = { status: 401, message: 'Unauthorized' }
    expect(err.status).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('status 0 indicates network/timeout error', () => {
    const err: ApiError = { status: 0, message: '请求超时 (10000ms)' }
    expect(err.status).toBe(0)
    expect(err.message).toContain('超时')
  })
})
