import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockSb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'
const USER_ID = 'test-user-id'

// Helper reutilizado de T4: getFullCurriculum toca 3 tablas en paralelo
const CURRICULUM = { id: 'c1', name: 'Plan 2024', student_id: USER_ID }
const SUBJECTS = [
  { id: 's1', name: 'Cálculo', code: 'MAT101', credits: 6, semester_number: 1, area_type: 'ciencias', subject_prerequisite: [] },
]

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
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: SUBJECTS, error: null }) }) }
    }
    if (table === 'student_subjects') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: progress, error: null }) }) }
    }
    return {}
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
})

describe('Regresión — bugs corregidos en curriculum-service', () => {

  it('[BUG-001] updateSubjectStatus debe rechazar el estado "reprobado" con 400 sin tocar Supabase', async () => {
    // Bug: la lista de estados válidos no incluía validación exhaustiva; cualquier string
    // pasaba al repository y se hacía un upsert con datos incorrectos en student_subjects.
    // Fix: whitelist explícita ['pendiente','cursando','aprobado','convalidado'] en el service.
    const res = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'reprobado' })

    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('[BUG-002] updateSubjectStatus sin campo "status" en el body retorna 400', async () => {
    // Bug: el service no validaba la presencia de status; pasaba undefined al whitelist
    // check y el upsert escribía undefined en la BD.
    // Fix: validación de campo requerido antes del whitelist check.
    const res = await request(app)
      .patch('/subjects/s1/status')
      .set('Authorization', TOKEN)
      .send({})

    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('[BUG-003] getFullCurriculum asigna estado "pendiente" por defecto a ramos sin registro en student_subjects', async () => {
    // Bug: cuando student_subjects no tenía registro para un ramo, el service retornaba
    // status=undefined en lugar de 'pendiente', lo que rompía el filtro en /subjects/current.
    // Fix: mergeSubjectsWithProgress usa status ?? 'pendiente'.
    mockGetFullCurriculum([])  // sin progreso registrado

    const res = await request(app).get('/').set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.body[0]).toMatchObject({ id: 's1', status: 'pendiente' })
  })

  it('[BUG-004] sin JWT válido el middleware corta el flujo antes de consultar el curriculum', async () => {
    // Bug: requireAuth con user=null continuaba al siguiente middleware, exponiendo datos.
    // Fix: requireAuth retorna 401 inmediatamente si getUser falla o user es null.
    mockSb.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') })

    const res = await request(app).get('/').set('Authorization', 'Bearer invalid')

    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

})
