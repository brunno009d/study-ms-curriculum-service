import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../config/supabase.js', () => ({ default: mockSupabase }))

import progressRepository from '../../repository/progressRepository.js'

const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'upsert', 'delete', 'eq', 'order', 'is', 'in'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

// ─── upsertSubjectStatus ───────────────────────────────────────────────────────

describe('progressRepository — upsertSubjectStatus', () => {
  it('retorna el registro upserted cuando tiene éxito', async () => {
    // Arrange
    const record = { student_id: 'u1', subject_id: 'sub1', status: 'aprobado' }
    mockSupabase.from.mockReturnValue(mockChain({ data: record, error: null }))
    // Act
    const result = await progressRepository.upsertSubjectStatus('u1', 'sub1', 'aprobado')
    // Assert
    expect(result).toEqual(record)
    expect(mockSupabase.from).toHaveBeenCalledWith('student_subjects')
  })

  it('lanza error cuando falla el upsert', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('upsert failed') }))
    // Act & Assert
    await expect(progressRepository.upsertSubjectStatus('u1', 'sub1', 'cursando'))
      .rejects.toThrow('upsert failed')
  })
})
