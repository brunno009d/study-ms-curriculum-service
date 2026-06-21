import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repository/curriculumRepository.js', () => ({
  default: {
    getCurriculumByStudentId: vi.fn(),
    patchCurriculum: vi.fn(),
    deleteCurriculum: vi.fn(),
    createCurriculum: vi.fn(),
  }
}))

vi.mock('../../repository/subjectRepository.js', () => ({
  default: {
    getSubjectsByCurriculumId: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    deleteSubject: vi.fn(),
    addPrerequisite: vi.fn(),
    removePrerequisite: vi.fn(),
    bulkCreateSubjects: vi.fn(),
    bulkCreatePrerequisites: vi.fn(),
  }
}))

vi.mock('../../repository/progressRepository.js', () => ({
  default: {
    getStudentProgress: vi.fn(),
    upsertSubjectStatus: vi.fn(),
  }
}))

import CurriculumRepository from '../../repository/curriculumRepository.js'
import SubjectRepository from '../../repository/subjectRepository.js'
import ProgressRepository from '../../repository/progressRepository.js'
import curriculumService from '../../service/curriculumService.js'

beforeEach(() => vi.clearAllMocks())

// ─── getFullCurriculum ───────────────────────────────────────────────────────

describe('curriculumService — getFullCurriculum', () => {
  it('retorna null cuando el estudiante no tiene currículo', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue(null)
    // Act
    const result = await curriculumService.getFullCurriculum('s1')
    // Assert
    expect(result).toBeNull()
  })

  it('combina header, materias y progreso en la estructura correcta', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue({ id: 'c1', name: 'Ing. Civil' })
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      {
        id: 'sub1', name: 'Cálculo', code: 'MAT101', credits: 6,
        semester_number: 1, area_type: 'ciencias',
        subject_prerequisite: []
      }
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([
      { subject_id: 'sub1', status: 'aprobado' }
    ])
    // Act
    const result = await curriculumService.getFullCurriculum('s1')
    // Assert
    expect(result.header).toEqual({ id: 'c1', name: 'Ing. Civil' })
    expect(result.body).toHaveLength(1)
    expect(result.body[0]).toMatchObject({
      id: 'sub1',
      name: 'Cálculo',
      status: 'aprobado',
      prerequisites: []
    })
  })

  it('usa status "pendiente" cuando la materia no tiene registro de progreso', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue({ id: 'c1' })
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      { id: 'sub2', name: 'Física', code: 'FIS101', credits: 5,
        semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] }
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([])
    // Act
    const result = await curriculumService.getFullCurriculum('s1')
    // Assert
    expect(result.body[0].status).toBe('pendiente')
  })

  it('mapea prerrequisitos al arreglo de IDs correctamente', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue({ id: 'c1' })
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      {
        id: 'sub3', name: 'Álgebra', code: 'MAT102', credits: 4,
        semester_number: 2, area_type: 'ciencias',
        subject_prerequisite: [{ prerrequisite_id: 'sub1' }, { prerrequisite_id: 'sub2' }]
      }
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([])
    // Act
    const result = await curriculumService.getFullCurriculum('s1')
    // Assert
    expect(result.body[0].prerequisites).toEqual(['sub1', 'sub2'])
  })
})

// ─── getCurrentSubjects ──────────────────────────────────────────────────────

describe('curriculumService — getCurrentSubjects', () => {
  it('retorna null cuando no hay currículo', async () => {
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue(null)
    const result = await curriculumService.getCurrentSubjects('s1')
    expect(result).toBeNull()
  })

  it('filtra solo materias con status "cursando"', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue({ id: 'c1' })
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      { id: 'sub1', name: 'Cálculo', code: 'MAT101', credits: 6,
        semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] },
      { id: 'sub2', name: 'Física', code: 'FIS101', credits: 5,
        semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] },
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([
      { subject_id: 'sub1', status: 'cursando' },
      { subject_id: 'sub2', status: 'aprobado' },
    ])
    // Act
    const result = await curriculumService.getCurrentSubjects('s1')
    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('sub1')
  })
})

// ─── getSubjectsBySemester ───────────────────────────────────────────────────

describe('curriculumService — getSubjectsBySemester', () => {
  it('filtra materias por número de semestre', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId.mockResolvedValue({ id: 'c1' })
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      { id: 's1', name: 'A', code: 'A1', credits: 3, semester_number: 1, area_type: 'x', subject_prerequisite: [] },
      { id: 's2', name: 'B', code: 'B1', credits: 3, semester_number: 2, area_type: 'x', subject_prerequisite: [] },
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([])
    // Act
    const result = await curriculumService.getSubjectsBySemester('u1', 2)
    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].semester_number).toBe(2)
  })
})

// ─── updateCurriculum ────────────────────────────────────────────────────────

describe('curriculumService — updateCurriculum', () => {
  it('delega al repository y retorna el resultado', async () => {
    // Arrange
    const updated = { id: 'c1', career: 'Ingeniería Civil' }
    CurriculumRepository.patchCurriculum.mockResolvedValue(updated)
    // Act
    const result = await curriculumService.updateCurriculum('s1', { career: 'Ingeniería Civil' })
    // Assert
    expect(CurriculumRepository.patchCurriculum).toHaveBeenCalledWith('s1', { career: 'Ingeniería Civil' })
    expect(result).toEqual(updated)
  })
})

// ─── deleteCurriculum ────────────────────────────────────────────────────────

describe('curriculumService — deleteCurriculum', () => {
  it('delega al repository y retorna true', async () => {
    // Arrange
    CurriculumRepository.deleteCurriculum.mockResolvedValue(true)
    // Act
    const result = await curriculumService.deleteCurriculum('s1')
    // Assert
    expect(CurriculumRepository.deleteCurriculum).toHaveBeenCalledWith('s1')
    expect(result).toBe(true)
  })
})

// ─── addSubject ───────────────────────────────────────────────────────────────

describe('curriculumService — addSubject', () => {
  it('delega al repository con curriculum_id incluido', async () => {
    // Arrange
    const created = { id: 10, name: 'Física', code: 'FIS101', curriculum_id: 'c1' }
    SubjectRepository.createSubject.mockResolvedValue(created)
    // Act
    const result = await curriculumService.addSubject('c1', { name: 'Física', code: 'FIS101' })
    // Assert
    expect(SubjectRepository.createSubject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Física', curriculum_id: 'c1' })
    )
    expect(result).toEqual(created)
  })
})

// ─── patchSubject ─────────────────────────────────────────────────────────────

describe('curriculumService — patchSubject', () => {
  it('delega al repository y retorna el resultado', async () => {
    // Arrange
    const updated = { id: 1, name: 'Cálculo Avanzado' }
    SubjectRepository.updateSubject.mockResolvedValue(updated)
    // Act
    const result = await curriculumService.patchSubject(1, { name: 'Cálculo Avanzado' })
    // Assert
    expect(SubjectRepository.updateSubject).toHaveBeenCalledWith(1, { name: 'Cálculo Avanzado' })
    expect(result).toEqual(updated)
  })
})

// ─── removeSubject ────────────────────────────────────────────────────────────

describe('curriculumService — removeSubject', () => {
  it('delega al repository y retorna true', async () => {
    // Arrange
    SubjectRepository.deleteSubject.mockResolvedValue(true)
    // Act
    const result = await curriculumService.removeSubject(1)
    // Assert
    expect(SubjectRepository.deleteSubject).toHaveBeenCalledWith(1)
    expect(result).toBe(true)
  })
})

// ─── removePrerequisite ───────────────────────────────────────────────────────

describe('curriculumService — removePrerequisite', () => {
  it('delega al repository con los IDs correctos', async () => {
    // Arrange
    SubjectRepository.removePrerequisite.mockResolvedValue(true)
    // Act
    const result = await curriculumService.removePrerequisite('sub1', 'sub2')
    // Assert
    expect(SubjectRepository.removePrerequisite).toHaveBeenCalledWith('sub1', 'sub2')
    expect(result).toBe(true)
  })
})

// ─── importCurriculum — curriculum nuevo ─────────────────────────────────────

describe('curriculumService — importCurriculum (nuevo)', () => {
  it('crea curriculum y materias cuando el estudiante no tiene malla', async () => {
    // Arrange — primera llamada: no existe. Segunda: getFullCurriculum interno
    CurriculumRepository.getCurriculumByStudentId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c2', career: 'Ingeniería' })

    CurriculumRepository.createCurriculum.mockResolvedValue({ id: 'c2' })
    SubjectRepository.bulkCreateSubjects.mockResolvedValue([
      { id: 10, code: 'MAT101' }
    ])
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      { id: 10, name: 'Cálculo', code: 'MAT101', credits: 6,
        semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] }
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([])

    const fullData = {
      curriculum: { career: 'Ingeniería' },
      subjects: [{ name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias', prerequisites: [] }]
    }

    // Act
    const result = await curriculumService.importCurriculum('s1', fullData)

    // Assert
    expect(CurriculumRepository.createCurriculum).toHaveBeenCalledWith('s1', expect.objectContaining({ career: 'Ingeniería' }))
    expect(SubjectRepository.bulkCreateSubjects).toHaveBeenCalled()
    expect(result).toHaveProperty('header')
  })
})

// ─── importCurriculum — curriculum existente ──────────────────────────────────

describe('curriculumService — importCurriculum (existente)', () => {
  it('actualiza materias y limpia prerrequisitos cuando ya existe malla', async () => {
    // Arrange — primera llamada: existe. Segunda y tercera: getSubjectsByCurriculumId. Cuarta: getFullCurriculum
    CurriculumRepository.getCurriculumByStudentId
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce({ id: 'c1', career: 'Ingeniería' })

    CurriculumRepository.patchCurriculum.mockResolvedValue({ id: 'c1' })

    SubjectRepository.getSubjectsByCurriculumId
      .mockResolvedValueOnce([{ id: 1, code: 'MAT101' }])   // primera llamada — existentes
      .mockResolvedValueOnce([{ id: 1, subject_prerequisite: [] }]) // segunda — restantes
      .mockResolvedValueOnce([                               // tercera — getFullCurriculum interno
        { id: 1, name: 'Cálculo', code: 'MAT101', credits: 6,
          semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] }
      ])

    SubjectRepository.updateSubject.mockResolvedValue({ id: 1, name: 'Cálculo' })
    ProgressRepository.getStudentProgress.mockResolvedValue([])

    const fullData = {
      curriculum: { career: 'Ingeniería' },
      subjects: [{ id: 1, name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias', prerequisites: [] }]
    }

    // Act
    const result = await curriculumService.importCurriculum('s1', fullData)

    // Assert
    expect(CurriculumRepository.patchCurriculum).toHaveBeenCalledWith('s1', expect.objectContaining({ career: 'Ingeniería' }))
    expect(SubjectRepository.updateSubject).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Cálculo' }))
    expect(result).toHaveProperty('header')
  })
})

// ─── importCurriculum — nuevo CON prerrequisitos ──────────────────────────────

describe('curriculumService — importCurriculum (nuevo con prerrequisitos)', () => {
  it('llama bulkCreatePrerequisites cuando los subjects tienen prerequisites', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c2' })

    CurriculumRepository.createCurriculum.mockResolvedValue({ id: 'c2' })
    SubjectRepository.bulkCreateSubjects.mockResolvedValue([
      { id: 10, code: 'MAT102' },
      { id: 11, code: 'MAT101' },
    ])
    SubjectRepository.bulkCreatePrerequisites.mockResolvedValue(true)
    SubjectRepository.getSubjectsByCurriculumId.mockResolvedValue([
      { id: 10, name: 'Álgebra', code: 'MAT102', credits: 4,
        semester_number: 2, area_type: 'ciencias', subject_prerequisite: [] },
      { id: 11, name: 'Cálculo', code: 'MAT101', credits: 6,
        semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] },
    ])
    ProgressRepository.getStudentProgress.mockResolvedValue([])

    const fullData = {
      curriculum: { career: 'Ingeniería' },
      subjects: [
        { name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias', prerequisites: [] },
        { name: 'Álgebra', code: 'MAT102', credits: 4, semester_number: 2, area_type: 'ciencias', prerequisites: ['MAT101'] },
      ]
    }

    // Act
    await curriculumService.importCurriculum('s1', fullData)

    // Assert — debe haber llamado bulkCreatePrerequisites por la relación entre materias
    expect(SubjectRepository.bulkCreatePrerequisites).toHaveBeenCalled()
  })
})

// ─── importCurriculum — existente CON prerrequisitos ──────────────────────────

describe('curriculumService — importCurriculum (existente con prerrequisitos)', () => {
  it('llama bulkCreatePrerequisites cuando se actualizan materias con prerequisites', async () => {
    // Arrange
    CurriculumRepository.getCurriculumByStudentId
      .mockResolvedValueOnce({ id: 'c1' })
      .mockResolvedValueOnce({ id: 'c1' })

    CurriculumRepository.patchCurriculum.mockResolvedValue({ id: 'c1' })
    SubjectRepository.getSubjectsByCurriculumId
      .mockResolvedValueOnce([{ id: 1, code: 'MAT101' }, { id: 2, code: 'MAT102' }])
      .mockResolvedValueOnce([
        { id: 1, subject_prerequisite: [{ prerrequisite_id: 999 }] },
        { id: 2, subject_prerequisite: [] },
      ])
      .mockResolvedValueOnce([
        { id: 1, name: 'Cálculo', code: 'MAT101', credits: 6,
          semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] },
        { id: 2, name: 'Álgebra', code: 'MAT102', credits: 4,
          semester_number: 2, area_type: 'ciencias', subject_prerequisite: [] },
      ])

    SubjectRepository.updateSubject.mockResolvedValue({})
    SubjectRepository.removePrerequisite.mockResolvedValue(true)
    SubjectRepository.bulkCreatePrerequisites.mockResolvedValue(true)
    ProgressRepository.getStudentProgress.mockResolvedValue([])

    const fullData = {
      curriculum: { career: 'Ingeniería' },
      subjects: [
        { id: 1, name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias', prerequisites: [] },
        { id: 2, name: 'Álgebra', code: 'MAT102', credits: 4, semester_number: 2, area_type: 'ciencias', prerequisites: ['MAT101'] },
      ]
    }

    // Act
    await curriculumService.importCurriculum('s1', fullData)

    // Assert
    expect(SubjectRepository.removePrerequisite).toHaveBeenCalled()
    expect(SubjectRepository.bulkCreatePrerequisites).toHaveBeenCalled()
  })
})

// ─── addPrerequisite ─────────────────────────────────────────────────────────

describe('curriculumService — addPrerequisite', () => {
  it('lanza error cuando la materia y el prerrequisito son el mismo', async () => {
    const err = await curriculumService.addPrerequisite('sub1', 'sub1').catch(e => e)
    expect(err.message).toMatch(/sí mismo/i)
  })

  it('delega al repository cuando los IDs son distintos', async () => {
    SubjectRepository.addPrerequisite.mockResolvedValue({ subject_id: 'sub1', prerrequisite_id: 'sub2' })
    const result = await curriculumService.addPrerequisite('sub1', 'sub2')
    expect(SubjectRepository.addPrerequisite).toHaveBeenCalledWith('sub1', 'sub2')
    expect(result).toEqual({ subject_id: 'sub1', prerrequisite_id: 'sub2' })
  })
})

// ─── updateSubjectStatus ─────────────────────────────────────────────────────

describe('curriculumService — updateSubjectStatus', () => {
  it('lanza error cuando el estado no es válido', async () => {
    const err = await curriculumService.updateSubjectStatus('u1', 'sub1', 'reprobado').catch(e => e)
    expect(err.message).toMatch(/no válido/i)
  })

  it.each(['aprobado', 'cursando', 'pendiente'])('acepta el estado "%s"', async (status) => {
    ProgressRepository.upsertSubjectStatus.mockResolvedValue({ status })
    await expect(curriculumService.updateSubjectStatus('u1', 'sub1', status)).resolves.not.toThrow()
    expect(ProgressRepository.upsertSubjectStatus).toHaveBeenCalledWith('u1', 'sub1', status)
  })
})
