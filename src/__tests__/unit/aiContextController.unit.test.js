import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/curriculumService.js', () => ({
  default: {
    getFullCurriculum: vi.fn(),
    getCurrentSubjects: vi.fn(),
  }
}))

import curriculumService from '../../service/curriculumService.js'
import { getContext, getCurrentContext } from '../../controller/aiContextController.js'

const makeRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res
}

const makeReq = (userId = 'u1') => ({ userId })

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// ─── getContext ────────────────────────────────────────────────────────────────

describe('aiContextController — getContext', () => {
  it('200 — retorna el currículo completo cuando existe', async () => {
    // Arrange
    const fakeCurriculum = { header: { id: 'c1' }, body: [] }
    curriculumService.getFullCurriculum.mockResolvedValue(fakeCurriculum)
    const req = makeReq()
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fakeCurriculum)
  })

  it('200 — retorna mensaje cuando el estudiante no tiene malla', async () => {
    // Arrange
    curriculumService.getFullCurriculum.mockResolvedValue(null)
    const req = makeReq()
    const res = makeRes()
    // Act
    await getContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ curriculum: null })
    )
  })

  it('llama a next(error) cuando el service lanza', async () => {
    // Arrange
    const err = new Error('fallo inesperado')
    curriculumService.getFullCurriculum.mockRejectedValue(err)
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    // Act
    await getContext(req, res, next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── getCurrentContext ─────────────────────────────────────────────────────────

describe('aiContextController — getCurrentContext', () => {
  it('200 — retorna las materias actuales cuando existen', async () => {
    // Arrange
    const subjects = [{ id: 'sub1', name: 'Cálculo', status: 'cursando' }]
    curriculumService.getCurrentSubjects.mockResolvedValue(subjects)
    const req = makeReq()
    const res = makeRes()
    // Act
    await getCurrentContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ current_subjects: subjects })
  })

  it('200 — retorna mensaje cuando el estudiante no tiene malla', async () => {
    // Arrange
    curriculumService.getCurrentSubjects.mockResolvedValue(null)
    const req = makeReq()
    const res = makeRes()
    // Act
    await getCurrentContext(req, res, vi.fn())
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ current_subjects: [] })
    )
  })

  it('llama a next(error) cuando el service lanza', async () => {
    // Arrange
    const err = new Error('error en service')
    curriculumService.getCurrentSubjects.mockRejectedValue(err)
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    // Act
    await getCurrentContext(req, res, next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })
})
