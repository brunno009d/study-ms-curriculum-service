import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — única dependencia externa ────────────────────────────────
const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

// ─── Helper: configura from() para el flujo getFullCurriculum (3 tablas) ─────
// curriculum → subjects → student_subjects (en paralelo en el service)
function mockGetFullCurriculum(progress = []) {
  mockSb.from.mockImplementation((table) => {
    if (table === 'curriculum') {
      const single = vi.fn().mockResolvedValue({ data: CURRICULUM, error: null })
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
          eq: vi.fn().mockResolvedValue({ data: SUBJECTS, error: null }),
        }),
      }
    }
    if (table === 'student_subjects') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: progress, error: null }),
        }),
      }
    }
    return {}
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } }, error: null,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 1: Consultar malla → marcar ramo → verificar actuales
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Flujo: ver malla → cambiar estado → verificar ramos actuales', () => {
  it('el estudiante consulta su malla, marca un ramo como cursando y lo ve en /subjects/current', async () => {

    // ── Paso 1: Malla completa (sin progreso → todos pendiente) ───────────────
    // Arrange
    mockGetFullCurriculum([])
    // Act
    const full = await request(app).get('/').set('Authorization', TOKEN)
    // Assert — service ensamblá header + body con status pendiente por defecto
    expect(full.status).toBe(200)
    expect(full.body.header).toMatchObject({ id: 'c1', name: 'Plan 2024' })
    expect(full.body.body).toHaveLength(2)
    expect(full.body.body[0]).toMatchObject({ id: 's1', status: 'pendiente' })
    expect(full.body.body[1]).toMatchObject({ id: 's2', status: 'pendiente' })
    // Verificar que los 3 repositories tocaron Supabase
    expect(mockSb.from).toHaveBeenCalledWith('curriculum')
    expect(mockSb.from).toHaveBeenCalledWith('subjects')
    expect(mockSb.from).toHaveBeenCalledWith('student_subjects')

    // ── Paso 2: Marcar s1 como "cursando" ─────────────────────────────────────
    // Arrange
    const upsertSingle = vi.fn().mockResolvedValue({
      data: { student_id: 'test-user-id', subject_id: 's1', status: 'cursando' }, error: null,
    })
    mockSb.from.mockImplementation((table) => {
      if (table === 'student_subjects') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: upsertSingle }),
          }),
        }
      }
    })
    // Act
    const statusUp = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'cursando' })
    // Assert — service validó el estado y el repository hizo el upsert
    expect(statusUp.status).toBe(200)
    expect(statusUp.body).toMatchObject({ status: 'cursando' })
    expect(upsertSingle).toHaveBeenCalled()

    // ── Paso 3: Verificar que s1 aparece en /subjects/current ─────────────────
    // Arrange: ahora el progreso refleja s1 como cursando
    mockGetFullCurriculum([{ subject_id: 's1', status: 'cursando' }])
    // Act
    const current = await request(app).get('/subjects/current').set('Authorization', TOKEN)
    // Assert — service filtra: solo las cursando deben aparecer
    expect(current.status).toBe(200)
    expect(current.body).toHaveLength(1)
    expect(current.body[0]).toMatchObject({ id: 's1', status: 'cursando' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 2: Filtro por semestre → estado inválido rechazado por service
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Flujo: filtro por semestre + rechazo de estado inválido', () => {
  it('el estudiante filtra por semestre y el service rechaza estados no permitidos', async () => {

    // ── Paso 1: Ver solo los ramos del semestre 1 ─────────────────────────────
    // Arrange: s1=aprobado, s2=pendiente; semestre 1 solo tiene s1
    mockGetFullCurriculum([{ subject_id: 's1', status: 'aprobado' }])
    // Act
    const sem1 = await request(app).get('/subjects/semester/1').set('Authorization', TOKEN)
    // Assert — service filtra por semester_number
    expect(sem1.status).toBe(200)
    expect(sem1.body).toHaveLength(1)
    expect(sem1.body[0]).toMatchObject({ id: 's1', semester_number: 1, status: 'aprobado' })

    // ── Paso 2: Intentar estado inválido → service bloquea antes de Supabase ──
    // vi.clearAllMocks resetea el historial para poder verificar not.toHaveBeenCalled
    vi.clearAllMocks()
    mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Act
    const bad = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'reprobado' })     // no está en la lista de estados válidos
    // Assert — service rechazó, Supabase no fue tocado
    expect(bad.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})
