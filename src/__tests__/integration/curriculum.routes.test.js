import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock supabase (requireAuth) ──────────────────────────────────────────────
const mockSb = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))
vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

// ─── Mock servicio ────────────────────────────────────────────────────────────
vi.mock('../../service/curriculumService.js', () => ({
  default: {
    getFullCurriculum:   vi.fn(),
    updateCurriculum:    vi.fn(),
    deleteCurriculum:    vi.fn(),
    importCurriculum:    vi.fn(),
    getCurrentSubjects:  vi.fn(),
    getSubjectsBySemester: vi.fn(),
    addSubject:          vi.fn(),
    addPrerequisite:     vi.fn(),
    updateSubjectStatus: vi.fn(),
  }
}))

import curriculumService from '../../service/curriculumService.js'
import app from '../../app.js'

const AUTH = { Authorization: 'Bearer test-token' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
})

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth — rutas protegidas', () => {
  it('retorna 401 sin header de autorización', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'unauthorized')
  })

  it('retorna 401 con token inválido', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') })
    const res = await request(app).get('/').set(AUTH)
    expect(res.status).toBe(401)
  })
})

// ─── GET / — currículo completo ────────────────────────────────────────────────

describe('GET /', () => {
  it('retorna 404 cuando el estudiante no tiene currículo', async () => {
    curriculumService.getFullCurriculum.mockResolvedValue(null)
    const res = await request(app).get('/').set(AUTH)
    expect(res.status).toBe(404)
  })

  it('retorna 200 con el currículo del estudiante', async () => {
    curriculumService.getFullCurriculum.mockResolvedValue({
      id: 'c1', name: 'Plan 2024', subjects: []
    })
    const res = await request(app).get('/').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', 'c1')
  })
})

// ─── POST /import ─────────────────────────────────────────────────────────────

describe('POST /import', () => {
  it('retorna 400 cuando faltan campos obligatorios', async () => {
    const res = await request(app).post('/import').set(AUTH).send({ curriculum: {} })
    expect(res.status).toBe(400)
  })

  it('retorna 201 al importar el currículo correctamente', async () => {
    curriculumService.importCurriculum.mockResolvedValue({ id: 'c1' })
    const res = await request(app).post('/import').set(AUTH).send({
      curriculum: { name: 'Plan', institution: 'UNAB', career: 'Ing', total_credits: 240, total_semester: 10 },
      subjects: [{ name: 'Cálculo', code: 'MAT101', semester_number: 1, credits: 6 }]
    })
    expect(res.status).toBe(201)
    expect(curriculumService.importCurriculum).toHaveBeenCalledWith(
      'test-user-id',
      expect.objectContaining({ curriculum: expect.any(Object), subjects: expect.any(Array) })
    )
  })
})

// ─── GET /subjects/current ────────────────────────────────────────────────────

describe('GET /subjects/current', () => {
  it('retorna 200 con las materias en curso', async () => {
    curriculumService.getCurrentSubjects.mockResolvedValue([
      { id: 1, name: 'Cálculo', status: 'cursando' }
    ])
    const res = await request(app).get('/subjects/current').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

// ─── PATCH /subjects/:subjectId/status ───────────────────────────────────────

describe('PATCH /subjects/:subjectId/status', () => {
  it('retorna 400 cuando faltan campos', async () => {
    const res = await request(app).patch('/subjects/5/status').set(AUTH).send({})
    expect(res.status).toBe(400)
  })

  it('retorna 200 al actualizar el estado correctamente', async () => {
    curriculumService.updateSubjectStatus.mockResolvedValue({ id: 5, status: 'aprobado' })
    const res = await request(app).patch('/subjects/5/status').set(AUTH).send({ status: 'aprobado' })
    expect(res.status).toBe(200)
    expect(curriculumService.updateSubjectStatus).toHaveBeenCalledWith('test-user-id', '5', 'aprobado')
  })
})

// ─── GET /subjects/semester/:semesterId ──────────────────────────────────────

describe('GET /subjects/semester/:semesterId', () => {
  it('retorna 400 cuando semesterId no es número', async () => {
    const res = await request(app).get('/subjects/semester/abc').set(AUTH)
    expect(res.status).toBe(400)
  })

  it('retorna 200 con las materias del semestre', async () => {
    curriculumService.getSubjectsBySemester.mockResolvedValue([{ id: 1, name: 'Cálculo' }])
    const res = await request(app).get('/subjects/semester/1').set(AUTH)
    expect(res.status).toBe(200)
    expect(curriculumService.getSubjectsBySemester).toHaveBeenCalledWith('test-user-id', 1)
  })
})
