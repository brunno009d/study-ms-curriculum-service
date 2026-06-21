import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../config/supabase.js', () => ({ default: mockSupabase }))

import subjectRepository from '../../repository/subjectRepository.js'

// Simula la cadena de métodos de Supabase
const mockChain = (finalValue) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(finalValue).then(resolve, reject),
  }
  ;['select', 'update', 'insert', 'delete', 'eq', 'order', 'is', 'in', 'match'].forEach(
    (m) => { chain[m] = vi.fn().mockReturnValue(chain) }
  )
  chain.single      = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  return chain
}

beforeEach(() => vi.clearAllMocks())

// ─── getSubjectsByCurriculumId ─────────────────────────────────────────────────

describe('subjectRepository — getSubjectsByCurriculumId', () => {
  it('retorna array de materias cuando existen', async () => {
    // Arrange
    const fakeSubjects = [{ id: 1, name: 'Cálculo', code: 'MAT101' }]
    mockSupabase.from.mockReturnValue(mockChain({ data: fakeSubjects, error: null }))
    // Act
    const result = await subjectRepository.getSubjectsByCurriculumId('c1')
    // Assert
    expect(result).toEqual(fakeSubjects)
    expect(mockSupabase.from).toHaveBeenCalledWith('subjects')
  })

  it('retorna [] cuando no hay materias (data null)', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))
    // Act
    const result = await subjectRepository.getSubjectsByCurriculumId('c1')
    // Assert
    expect(result).toEqual([])
  })

  it('lanza error con mensaje descriptivo cuando falla la BD', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'falla conexión' } }))
    // Act & Assert
    await expect(subjectRepository.getSubjectsByCurriculumId('c1'))
      .rejects.toThrow('Error en BD [getSubjectsByCurriculumId]')
  })
})

// ─── createSubject ─────────────────────────────────────────────────────────────

describe('subjectRepository — createSubject', () => {
  it('retorna la materia creada', async () => {
    // Arrange
    const created = { id: 1, name: 'Cálculo', code: 'MAT101', curriculum_id: 'c1' }
    mockSupabase.from.mockReturnValue(mockChain({ data: created, error: null }))
    // Act
    const result = await subjectRepository.createSubject({ name: 'Cálculo', code: 'MAT101', curriculum_id: 'c1' })
    // Assert
    expect(result).toEqual(created)
    expect(mockSupabase.from).toHaveBeenCalledWith('subjects')
  })

  it('lanza error cuando falla la inserción', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('insert failed') }))
    // Act & Assert
    await expect(subjectRepository.createSubject({})).rejects.toThrow('insert failed')
  })
})

// ─── bulkCreateSubjects ────────────────────────────────────────────────────────

describe('subjectRepository — bulkCreateSubjects', () => {
  it('retorna el array de materias creadas', async () => {
    // Arrange
    const subjects = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
    mockSupabase.from.mockReturnValue(mockChain({ data: subjects, error: null }))
    // Act
    const result = await subjectRepository.bulkCreateSubjects([{ name: 'A' }, { name: 'B' }])
    // Assert
    expect(result).toEqual(subjects)
  })

  it('lanza error cuando falla la inserción masiva', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('bulk failed') }))
    // Act & Assert
    await expect(subjectRepository.bulkCreateSubjects([])).rejects.toThrow('bulk failed')
  })
})

// ─── deleteSubject ─────────────────────────────────────────────────────────────

describe('subjectRepository — deleteSubject', () => {
  it('retorna true al eliminar exitosamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))
    // Act
    const result = await subjectRepository.deleteSubject(1)
    // Assert
    expect(result).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('subjects')
  })

  it('lanza error cuando falla la eliminación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('delete failed') }))
    // Act & Assert
    await expect(subjectRepository.deleteSubject(1)).rejects.toThrow('delete failed')
  })
})

// ─── updateSubject ─────────────────────────────────────────────────────────────

describe('subjectRepository — updateSubject', () => {
  it('retorna la materia actualizada', async () => {
    // Arrange
    const updated = { id: 1, name: 'Cálculo II' }
    mockSupabase.from.mockReturnValue(mockChain({ data: updated, error: null }))
    // Act
    const result = await subjectRepository.updateSubject(1, { name: 'Cálculo II' })
    // Assert
    expect(result).toEqual(updated)
  })

  it('lanza error cuando falla la actualización', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('update failed') }))
    // Act & Assert
    await expect(subjectRepository.updateSubject(1, {})).rejects.toThrow('update failed')
  })
})

// ─── addPrerequisite ───────────────────────────────────────────────────────────

describe('subjectRepository — addPrerequisite', () => {
  it('retorna el registro de prerrequisito creado', async () => {
    // Arrange
    const pr = { subject_id: 1, prerrequisite_id: 2 }
    mockSupabase.from.mockReturnValue(mockChain({ data: pr, error: null }))
    // Act
    const result = await subjectRepository.addPrerequisite(1, 2)
    // Assert
    expect(result).toEqual(pr)
    expect(mockSupabase.from).toHaveBeenCalledWith('subject_prerequisite')
  })

  it('lanza error cuando falla la inserción', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: new Error('pr failed') }))
    // Act & Assert
    await expect(subjectRepository.addPrerequisite(1, 2)).rejects.toThrow('pr failed')
  })
})

// ─── bulkCreatePrerequisites ───────────────────────────────────────────────────

describe('subjectRepository — bulkCreatePrerequisites', () => {
  it('retorna true al insertar prerrequisitos masivamente', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))
    // Act
    const result = await subjectRepository.bulkCreatePrerequisites([
      { subject_id: 1, prerrequisite_id: 2 }
    ])
    // Assert
    expect(result).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('subject_prerequisite')
  })

  it('lanza error cuando falla la inserción masiva', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('bulk pr failed') }))
    // Act & Assert
    await expect(subjectRepository.bulkCreatePrerequisites([])).rejects.toThrow('bulk pr failed')
  })
})

// ─── removePrerequisite ────────────────────────────────────────────────────────

describe('subjectRepository — removePrerequisite', () => {
  it('retorna true al eliminar el prerrequisito', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: null }))
    // Act
    const result = await subjectRepository.removePrerequisite(1, 2)
    // Assert
    expect(result).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('subject_prerequisite')
  })

  it('lanza error cuando falla la eliminación', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue(mockChain({ error: new Error('remove pr failed') }))
    // Act & Assert
    await expect(subjectRepository.removePrerequisite(1, 2)).rejects.toThrow('remove pr failed')
  })
})
