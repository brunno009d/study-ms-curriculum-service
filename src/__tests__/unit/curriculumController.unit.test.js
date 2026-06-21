import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/curriculumService.js', () => ({
  default: {
    getFullCurriculum: vi.fn(),
    updateCurriculum: vi.fn(),
    deleteCurriculum: vi.fn(),
    importCurriculum: vi.fn(),
    getCurrentSubjects: vi.fn(),
    getSubjectsBySemester: vi.fn(),
    addSubject: vi.fn(),
    patchSubject: vi.fn(),
    removeSubject: vi.fn(),
    addPrerequisite: vi.fn(),
    removePrerequisite: vi.fn(),
    updateSubjectStatus: vi.fn(),
  }
}))

import CurriculumService from '../../service/curriculumService.js'
import controller from '../../controller/curriculumController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── getFullCurriculum ───────────────────────────────────────────────────────

describe('curriculumController — getFullCurriculum', () => {
  it('responde 404 cuando el servicio devuelve null', async () => {
    CurriculumService.getFullCurriculum.mockResolvedValue(null)
    const req = { userId: 'u1' }
    const res = mockRes()
    await controller.getFullCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('responde 200 con la malla cuando existe', async () => {
    // Arrange
    const curriculum = { header: { id: 'c1' }, body: [] }
    CurriculumService.getFullCurriculum.mockResolvedValue(curriculum)
    const req = { userId: 'u1' }
    const res = mockRes()
    // Act
    await controller.getFullCurriculum(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(curriculum)
  })

  it('delega a next en error inesperado', async () => {
    const err = new Error('DB fail')
    CurriculumService.getFullCurriculum.mockRejectedValue(err)
    const next = vi.fn()
    await controller.getFullCurriculum({ userId: 'u1' }, mockRes(), next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── updateCurriculum ────────────────────────────────────────────────────────

describe('curriculumController — updateCurriculum', () => {
  it('responde 400 cuando el body está vacío', async () => {
    const req = { userId: 'u1', body: {} }
    const res = mockRes()
    await controller.updateCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 200 con la malla actualizada', async () => {
    CurriculumService.updateCurriculum.mockResolvedValue({ id: 'c1', name: 'Ing' })
    const req = { userId: 'u1', body: { name: 'Ing' } }
    const res = mockRes()
    await controller.updateCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

// ─── importCurriculum ────────────────────────────────────────────────────────

describe('curriculumController — importCurriculum', () => {
  it('responde 400 cuando falta curriculum o subjects en el body', async () => {
    const req = { userId: 'u1', body: { curriculum: {} } } // sin subjects
    const res = mockRes()
    await controller.importCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/curriculum.*subjects/i) }))
  })

  it('responde 201 con el currículo importado', async () => {
    CurriculumService.importCurriculum.mockResolvedValue({ header: {}, body: [] })
    const req = { userId: 'u1', body: { curriculum: { name: 'Ing' }, subjects: [] } }
    const res = mockRes()
    await controller.importCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

// ─── getSubjectsBySemester ───────────────────────────────────────────────────

describe('curriculumController — getSubjectsBySemester', () => {
  it('responde 400 cuando semesterId no es un número', async () => {
    const req = { userId: 'u1', params: { semesterId: 'abc' } }
    const res = mockRes()
    await controller.getSubjectsBySemester(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 200 con las materias del semestre', async () => {
    CurriculumService.getSubjectsBySemester.mockResolvedValue([{ id: 's1' }])
    const req = { userId: 'u1', params: { semesterId: '2' } }
    const res = mockRes()
    await controller.getSubjectsBySemester(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(CurriculumService.getSubjectsBySemester).toHaveBeenCalledWith('u1', 2)
  })
})

// ─── addSubject ──────────────────────────────────────────────────────────────

describe('curriculumController — addSubject', () => {
  it('responde 400 cuando faltan name o code', async () => {
    const req = { params: { curriculumId: 'c1' }, body: { name: 'Cálculo' } } // sin code
    const res = mockRes()
    await controller.addSubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 201 con la materia creada', async () => {
    CurriculumService.addSubject.mockResolvedValue({ id: 's1', name: 'Cálculo' })
    const req = { params: { curriculumId: 'c1' }, body: { name: 'Cálculo', code: 'MAT101' } }
    const res = mockRes()
    await controller.addSubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

// ─── getCurrentSubjects ──────────────────────────────────────────────────────

describe('curriculumController — getCurrentSubjects', () => {
  it('responde 404 cuando el servicio devuelve null', async () => {
    CurriculumService.getCurrentSubjects.mockResolvedValue(null)
    const req = { userId: 'u1' }
    const res = mockRes()
    await controller.getCurrentSubjects(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('responde 200 con las materias actuales', async () => {
    CurriculumService.getCurrentSubjects.mockResolvedValue([{ id: 's1' }])
    const req = { userId: 'u1' }
    const res = mockRes()
    await controller.getCurrentSubjects(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

// ─── patchSubject ────────────────────────────────────────────────────────────

describe('curriculumController — patchSubject', () => {
  it('responde 400 cuando el body está vacío', async () => {
    const req = { params: { subjectId: 's1' }, body: {} }
    const res = mockRes()
    await controller.patchSubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 200 con la materia actualizada', async () => {
    CurriculumService.patchSubject.mockResolvedValue({ id: 's1', name: 'Cálculo II' })
    const req = { params: { subjectId: 's1' }, body: { name: 'Cálculo II' } }
    const res = mockRes()
    await controller.patchSubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('delega a next en error inesperado', async () => {
    const err = new Error('DB fail')
    CurriculumService.patchSubject.mockRejectedValue(err)
    const next = vi.fn()
    await controller.patchSubject({ params: { subjectId: 's1' }, body: { name: 'X' } }, mockRes(), next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── removeSubject ───────────────────────────────────────────────────────────

describe('curriculumController — removeSubject', () => {
  it('responde 204 al eliminar exitosamente', async () => {
    CurriculumService.removeSubject.mockResolvedValue(true)
    const req = { params: { subjectId: 's1' } }
    const res = mockRes()
    await controller.removeSubject(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })

  it('delega a next en error inesperado', async () => {
    const err = new Error('DB fail')
    CurriculumService.removeSubject.mockRejectedValue(err)
    const next = vi.fn()
    await controller.removeSubject({ params: { subjectId: 's1' } }, mockRes(), next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── removePrerequisite ──────────────────────────────────────────────────────

describe('curriculumController — removePrerequisite', () => {
  it('responde 204 al eliminar el prerrequisito', async () => {
    CurriculumService.removePrerequisite.mockResolvedValue(true)
    const req = { params: { subjectId: 's1', prerequisiteId: 's2' } }
    const res = mockRes()
    await controller.removePrerequisite(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })

  it('delega a next en error inesperado', async () => {
    const err = new Error('DB fail')
    CurriculumService.removePrerequisite.mockRejectedValue(err)
    const next = vi.fn()
    await controller.removePrerequisite({ params: { subjectId: 's1', prerequisiteId: 's2' } }, mockRes(), next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── addPrerequisite ─────────────────────────────────────────────────────────

describe('curriculumController — addPrerequisite', () => {
  it('responde 400 cuando falta prerequisiteId', async () => {
    const req = { params: { subjectId: 's1' }, body: {} }
    const res = mockRes()
    await controller.addPrerequisite(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 400 cuando el service lanza error "sí mismo"', async () => {
    CurriculumService.addPrerequisite.mockRejectedValue(new Error('Un ramo no puede ser prerrequisito de sí mismo'))
    const req = { params: { subjectId: 's1' }, body: { prerequisiteId: 's1' } }
    const res = mockRes()
    await controller.addPrerequisite(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 201 con el prerrequisito creado', async () => {
    CurriculumService.addPrerequisite.mockResolvedValue({ subject_id: 's1', prerrequisite_id: 's2' })
    const req = { params: { subjectId: 's1' }, body: { prerequisiteId: 's2' } }
    const res = mockRes()
    await controller.addPrerequisite(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

// ─── updateSubjectStatus ─────────────────────────────────────────────────────

describe('curriculumController — updateSubjectStatus', () => {
  it('responde 400 cuando falta status', async () => {
    const req = { userId: 'u1', params: { subjectId: 's1' }, body: {} }
    const res = mockRes()
    await controller.updateSubjectStatus(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 400 cuando el service lanza error de estado no válido', async () => {
    CurriculumService.updateSubjectStatus.mockRejectedValue(new Error('Estado de ramo no válido'))
    const req = { userId: 'u1', params: { subjectId: 's1' }, body: { status: 'reprobado' } }
    const res = mockRes()
    await controller.updateSubjectStatus(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 200 con el registro de progreso', async () => {
    CurriculumService.updateSubjectStatus.mockResolvedValue({ status: 'aprobado' })
    const req = { userId: 'u1', params: { subjectId: 's1' }, body: { status: 'aprobado' } }
    const res = mockRes()
    await controller.updateSubjectStatus(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

// ─── deleteCurriculum ────────────────────────────────────────────────────────

describe('curriculumController — deleteCurriculum', () => {
  it('responde 204 al eliminar exitosamente', async () => {
    CurriculumService.deleteCurriculum.mockResolvedValue(undefined)
    const req = { userId: 'u1' }
    const res = mockRes()
    await controller.deleteCurriculum(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })
})
