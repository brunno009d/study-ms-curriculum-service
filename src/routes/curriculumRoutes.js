import express from 'express'
import CurriculumController from '../controller/curriculumController.js'
import { getContext, getCurrentContext } from '../controller/aiContextController.js'
import requireAuth from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/ai-context/current', getCurrentContext)
router.get('/ai-context', getContext)

router.get('/', CurriculumController.getFullCurriculum)
router.patch('/', CurriculumController.updateCurriculum)
router.delete('/', CurriculumController.deleteCurriculum)
router.post('/import', CurriculumController.importCurriculum)

router.get('/subjects/current', CurriculumController.getCurrentSubjects)
router.get('/subjects/semester/:semesterId', CurriculumController.getSubjectsBySemester)
router.post('/:curriculumId/subjects', CurriculumController.addSubject)
router.patch('/subjects/:subjectId', CurriculumController.patchSubject)
router.delete('/subjects/:subjectId', CurriculumController.removeSubject)

router.post('/subjects/:subjectId/prerequisites', CurriculumController.addPrerequisite)
router.delete('/subjects/:subjectId/prerequisites/:prerequisiteId', CurriculumController.removePrerequisite)

router.patch('/subjects/:subjectId/status', CurriculumController.updateSubjectStatus)

export default router
