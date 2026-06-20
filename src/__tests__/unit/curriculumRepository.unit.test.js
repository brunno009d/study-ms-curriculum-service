import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

// Mocking the config file (not the package) — this is what intercepts CJS require()
vi.mock('../../config/supabase.js', () => ({ default: mockSupabase }))

import curriculumRepository from '../../repository/curriculumRepository.js'

const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'delete', 'eq', 'order', 'is', 'in'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

// ─── getCurriculumByStudentId ──────────────────────────────────────────────

describe('curriculumRepository — getCurriculumByStudentId', () => {
  it('retorna la malla cuando el estudiante la tiene', async () => {
    // Arrange
    const fakeCurriculum = { id: 1, student_id: 'u1', career: 'Ingeniería' }
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeCurriculum, error: null }))

    // Act
    const result = await curriculumRepository.getCurriculumByStudentId('u1')

    // Assert
    expect(result).toEqual(fakeCurriculum)
    expect(mockSupabase.from).toHaveBeenCalledWith('curriculum')
  })

  it('retorna null cuando no existe malla (error PGRST116 ignorado)', async () => {
    // Arrange — PGRST116 es "row not found", el repo lo ignora
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { code: 'PGRST116' } }))

    // Act
    const result = await curriculumRepository.getCurriculumByStudentId('u1')

    // Assert — debe retornar null, NO lanzar
    expect(result).toBeNull()
  })

  it('lanza el error para cualquier otro código de error de BD', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { code: '500', message: 'Error interno' } }))

    // Act & Assert
    await expect(curriculumRepository.getCurriculumByStudentId('u1')).rejects.toThrow()
  })
})

// ─── createCurriculum ──────────────────────────────────────────────────────

describe('curriculumRepository — createCurriculum', () => {
  it('retorna la malla creada', async () => {
    // Arrange
    const newCurriculum = { student_id: 'u1', career: 'Ingeniería' }
    const created = { id: 1, ...newCurriculum }
    mockSupabase.from.mockReturnValue(mockChain({ data: created, error: null }))

    // Act
    const result = await curriculumRepository.createCurriculum('u1', newCurriculum)

    // Assert
    expect(result).toEqual(created)
  })

  it('lanza el error cuando falla la inserción', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('Falla en insert') }))

    // Act & Assert
    await expect(curriculumRepository.createCurriculum('u1', {})).rejects.toThrow('Falla en insert')
  })
})

// ─── patchCurriculum ───────────────────────────────────────────────────────

describe('curriculumRepository — patchCurriculum', () => {
  it('retorna la malla actualizada', async () => {
    // Arrange
    const updated = { id: 1, student_id: 'u1', career: 'Ingeniería Civil' }
    mockSupabase.from.mockReturnValue(mockChain({ data: updated, error: null }))

    // Act
    const result = await curriculumRepository.patchCurriculum('u1', { career: 'Ingeniería Civil' })

    // Assert
    expect(result).toEqual(updated)
  })
})

// ─── deleteCurriculum ──────────────────────────────────────────────────────

describe('curriculumRepository — deleteCurriculum', () => {
  it('retorna true al eliminar exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))

    // Act
    const result = await curriculumRepository.deleteCurriculum('u1')

    // Assert
    expect(result).toBe(true)
  })

  it('lanza el error cuando falla la eliminación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('No se pudo eliminar') }))

    // Act & Assert
    await expect(curriculumRepository.deleteCurriculum('u1')).rejects.toThrow('No se pudo eliminar')
  })
})
