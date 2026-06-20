import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — única dependencia externa ────────────────────────────────
// Solo se mockea el cliente de Supabase. Todo el código real de
// controller → service → repository (x3) se ejecuta sin cambios.
const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'

// ─── Fixtures reutilizables ────────────────────────────────────────────────────
const CURRICULUM = { id: 'c1', name: 'Plan 2024', student_id: 'test-user-id' }
const SUBJECTS = [
  {
    id: 's1', name: 'Cálculo', code: 'MAT101', credits: 6,
    semester_number: 1, area_type: 'ciencias', subject_prerequisite: [],
  },
  {
    id: 's2', name: 'Física', code: 'FIS101', credits: 5,
    semester_number: 2, area_type: 'ciencias', subject_prerequisite: [],
  },
]
const PROGRESS = [
  { subject_id: 's1', status: 'cursando' },
  { subject_id: 's2', status: 'aprobado' },
]

// ─── Helper: configura from() para el flujo de getFullCurriculum (3 tablas) ────
// La cadena más compleja del servicio: curriculum → subjects → student_subjects.
// Cada llamada a from(table) devuelve chains que soportan .select().eq() (array)
// y .select().eq().single() (fila única) según el repository que lo use.
function mockGetFullCurriculumChain({
  curriculum = CURRICULUM,
  subjects = SUBJECTS,
  progress = PROGRESS,
} = {}) {
  mockSb.from.mockImplementation((table) => {
    if (table === 'curriculum') {
      const single = vi.fn().mockResolvedValue(
        curriculum
          ? { data: curriculum, error: null }
          : { data: null, error: { code: 'PGRST116' } }
      )
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve({ data: null, error: null }), { single })
          ),
        }),
      }
    }
    if (table === 'subjects') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            // getSubjectsByCurriculumId no llama .single() — resuelve directo desde .eq()
            Promise.resolve({ data: subjects, error: null })
          ),
        }),
      }
    }
    if (table === 'student_subjects') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(
            // getStudentProgress no llama .single() — resuelve directo desde .eq()
            Promise.resolve({ data: progress, error: null })
          ),
        }),
      }
    }
    return { select: vi.fn(), insert: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})

  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } }, error: null,
  })
})

// ─── requireAuth — middleware chain ───────────────────────────────────────────

describe('requireAuth — middleware chain', () => {
  it('401 — sin header la petición no llega ni a controller ni a Supabase', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('401 — token inválido: Supabase auth rechaza y nada más se ejecuta', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') })
    const res = await request(app).get('/').set('Authorization', TOKEN)
    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── GET / — getFullCurriculum ─────────────────────────────────────────────────

describe('GET /', () => {
  it('200 — cadena de 3 repositories: curriculum → subjects → student_subjects → service ensambla', async () => {
    // Arrange
    mockGetFullCurriculumChain()
    // Act
    const res = await request(app).get('/').set('Authorization', TOKEN)
    // Assert — service ensamblará header + body con status de cada materia
    expect(res.status).toBe(200)
    expect(res.body.header).toMatchObject({ id: 'c1', name: 'Plan 2024' })
    expect(res.body.body).toHaveLength(2)
    expect(res.body.body[0]).toMatchObject({ id: 's1', status: 'cursando' })
    expect(res.body.body[1]).toMatchObject({ id: 's2', status: 'aprobado' })
    // Verificamos que los 3 repositories llegaron a Supabase
    expect(mockSb.from).toHaveBeenCalledWith('curriculum')
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).toHaveBeenCalledWith('student_subjects')
  })

  it('200 — materia sin registro de progreso recibe status "pendiente" por defecto', async () => {
    // Arrange: subjects con s2 sin entrada en progress
    mockGetFullCurriculumChain({ progress: [{ subject_id: 's1', status: 'cursando' }] })
    // Act
    const res = await request(app).get('/').set('Authorization', TOKEN)
    // Assert — service asigna "pendiente" cuando no hay registro en student_subjects
    expect(res.status).toBe(200)
    expect(res.body.body[1]).toMatchObject({ id: 's2', status: 'pendiente' })
  })

  it('404 — sin currículo: repository devuelve null (PGRST116) y service retorna null', async () => {
    // Arrange: Supabase devuelve PGRST116 → repository lo absorbe → service devuelve null
    mockGetFullCurriculumChain({ curriculum: null, subjects: [], progress: [] })
    // Act
    const res = await request(app).get('/').set('Authorization', TOKEN)
    // Assert — controller traduce null a 404
    expect(res.status).toBe(404)
  })
})

// ─── GET /subjects/current ────────────────────────────────────────────────────

describe('GET /subjects/current', () => {
  it('200 — reutiliza la cadena getFullCurriculum y filtra solo las materias "cursando"', async () => {
    // Arrange: s1=cursando, s2=aprobado
    mockGetFullCurriculumChain()
    // Act
    const res = await request(app).get('/subjects/current').set('Authorization', TOKEN)
    // Assert — service filtra: solo debe llegar s1
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ id: 's1', status: 'cursando' })
  })

  it('404 — sin currículo el service devuelve null y el controller retorna 404', async () => {
    mockGetFullCurriculumChain({ curriculum: null, subjects: [], progress: [] })
    const res = await request(app).get('/subjects/current').set('Authorization', TOKEN)
    expect(res.status).toBe(404)
  })
})

// ─── GET /subjects/semester/:semesterId ──────────────────────────────────────

describe('GET /subjects/semester/:semesterId', () => {
  it('200 — filtra materias por semestre y solo devuelve las del semestre indicado', async () => {
    // Arrange: s1=semestre 1, s2=semestre 2
    mockGetFullCurriculumChain()
    // Act: pedir semestre 2
    const res = await request(app).get('/subjects/semester/2').set('Authorization', TOKEN)
    // Assert — service filtra por semester_number === 2
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ id: 's2', semester_number: 2 })
  })

  it('400 — controller rechaza semesterId no numérico antes de llamar al service', async () => {
    // Act
    const res = await request(app).get('/subjects/semester/abc').set('Authorization', TOKEN)
    // Assert — controller detecta isNaN y Supabase no se invoca
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── PATCH /subjects/:subjectId/status ───────────────────────────────────────

describe('PATCH /subjects/:subjectId/status', () => {
  it('200 — service valida status y llama upsert en student_subjects', async () => {
    // Arrange: upsert devuelve el registro actualizado
    const upsertSingle = vi.fn().mockResolvedValue({
      data: { student_id: 'test-user-id', subject_id: 's1', status: 'aprobado' }, error: null,
    })
    mockSb.from.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: upsertSingle }),
      }),
    })
    // Act
    const res = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'aprobado' })
    // Assert — Supabase recibió el upsert y el resultado llegó al cliente
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'aprobado' })
    expect(mockSb.from).toHaveBeenCalledWith('student_subjects')
    expect(upsertSingle).toHaveBeenCalled()
  })

  it('400 — service rechaza status inválido antes de llamar a Supabase', async () => {
    // Act: "reprobado" no es un status válido según la lógica del service
    const res = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'reprobado' })
    // Assert — validación de service actúa antes del repository
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('400 — controller rechaza body sin status antes de llegar al service', async () => {
    const res = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({})
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── POST /import ─────────────────────────────────────────────────────────────

describe('POST /import', () => {
  it('400 — controller rechaza body sin "curriculum" o "subjects" antes de llamar al service', async () => {
    // Arrange: body incompleto
    // Act
    const res = await request(app)
      .post('/import')
      .set('Authorization', TOKEN)
      .send({ curriculum: { name: 'Plan' } })  // falta subjects
    // Assert — validación de controller; Supabase no se invoca
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('201 — nuevo currículo: service crea en curriculum + bulkSubjects y devuelve la malla completa', async () => {
    // Arrange: primera llamada → no hay currículo existente (import branch "nuevo")
    let curriculumCallCount = 0
    mockSb.from.mockImplementation((table) => {
      if (table === 'curriculum') {
        curriculumCallCount++
        if (curriculumCallCount === 1) {
          // getCurriculumByStudentId → no existe
          const notFound = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(
                Object.assign(Promise.resolve({ data: null, error: null }), { single: notFound })
              ),
            }),
          }
        }
        // Llamadas posteriores (getFullCurriculum al final del import)
        const found = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Plan' }, error: null })
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(
              Object.assign(Promise.resolve({ data: null, error: null }), { single: found })
            ),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(
              Object.assign(Promise.resolve({ data: null, error: null }), { single: found })
            ),
          }),
        }
      }
      if (table === 'subjects') {
        const inserted = [{ id: 's1', code: 'MAT101', name: 'Cálculo', credits: 6,
          semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] }]
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(Promise.resolve({ data: inserted, error: null })),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(Promise.resolve({ data: inserted, error: null })),
          }),
        }
      }
      if (table === 'student_subjects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
          }),
        }
      }
      return { select: vi.fn(), insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) }) }
    })

    // Act
    const res = await request(app)
      .post('/import')
      .set('Authorization', TOKEN)
      .send({
        curriculum: { name: 'Plan', institution: 'UNAB', career: 'Ing. Civil', total_credits: 240, total_semester: 10 },
        subjects: [{ name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias' }],
      })

    // Assert — service creó el currículo y devolvió la malla ensamblada
    expect(res.status).toBe(201)
    expect(mockSb.from).toHaveBeenCalledWith('curriculum')
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
  })
})

// ─── PATCH / — updateCurriculum ───────────────────────────────────────────────

describe('PATCH /', () => {
  it('400 — controller rechaza body vacío antes de llamar al service', async () => {
    const res = await request(app).patch('/').set('Authorization', TOKEN).send({})
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('200 — service delega al repository y llama update en curriculum', async () => {
    // Arrange
    const patchSingle = vi.fn().mockResolvedValue({
      data: { id: 'c1', name: 'Plan Actualizado' }, error: null,
    })
    mockSb.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: patchSingle }),
        }),
      }),
    })
    // Act
    const res = await request(app).patch('/').set('Authorization', TOKEN).send({ name: 'Plan Actualizado' })
    // Assert
    expect(res.status).toBe(200)
    expect(mockSb.from).toHaveBeenCalledWith('curriculum')
    expect(patchSingle).toHaveBeenCalled()
  })
})
