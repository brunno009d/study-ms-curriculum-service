const express = require('express');
const router = express.Router();
const CurriculumController = require('../controller/curriculumController');
const requireAuth = require('../middleware/requireAuth');

// Aplica el middleware de autenticación a todas las rutas de este router
router.use(requireAuth);

// --- Rutas de Malla (Header y Full Body)
router.get('/', CurriculumController.getFullCurriculum);
router.patch('/', CurriculumController.updateCurriculum);
router.delete('/', CurriculumController.deleteCurriculum);

// --- Rutas de Ramos (Subjects)
router.post('/:curriculumId/subjects', CurriculumController.addSubject);
router.patch('/subjects/:subjectId', CurriculumController.patchSubject);
router.delete('/subjects/:subjectId', CurriculumController.removeSubject);

// --- Rutas de Prerrequisitos
router.post('/subjects/:subjectId/prerequisites', CurriculumController.addPrerequisite);
router.delete('/subjects/:subjectId/prerequisites/:prerequisiteId', CurriculumController.removePrerequisite);

// --- Rutas de Progreso (Student Subjects)
router.patch('/subjects/:subjectId/status', CurriculumController.updateSubjectStatus);

module.exports = router;
