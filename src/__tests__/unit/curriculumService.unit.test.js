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
