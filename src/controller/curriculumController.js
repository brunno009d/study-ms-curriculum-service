const CurriculumService = require('../service/curriculumService');

class CurriculumController {

    // -> Operaciones curriculum

    async getFullCurriculum(req, res, next) {
        try {
            // El studentId viene del token JWT validado por el middleware de autenticación
            const studentId = req.userId;
            const curriculum = await CurriculumService.getFullCurriculum(studentId);

            if (!curriculum) {
                return res.status(404).json({ message: 'Malla no encontrada para este estudiante.' });
            }

            res.status(200).json(curriculum);
        } catch (error) {
            next(error); // Pasa el error al errorHandler
        }
    }

    async updateCurriculum(req, res, next) {
        try {
            const studentId = req.userId;
            const curriculumData = req.body;

            const updated = await CurriculumService.updateCurriculum(studentId, curriculumData);
            res.status(200).json(updated);
        } catch (error) {
            next(error);
        }
    }

    async deleteCurriculum(req, res, next) {
        try {
            const studentId = req.userId;
            await CurriculumService.deleteCurriculum(studentId);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // -> Operaciones ramos

    async addSubject(req, res, next) {
        try {
            const { curriculumId } = req.params;
            const subjectData = req.body;

            const newSubject = await CurriculumService.addSubject(curriculumId, subjectData);
            res.status(201).json(newSubject);
        } catch (error) {
            next(error);
        }
    }

    async patchSubject(req, res, next) {
        try {
            const { subjectId } = req.params;
            const updateData = req.body;

            const updatedSubject = await CurriculumService.patchSubject(subjectId, updateData);
            res.status(200).json(updatedSubject);
        } catch (error) {
            next(error);
        }
    }

    async removeSubject(req, res, next) {
        try {
            const { subjectId } = req.params;
            await CurriculumService.removeSubject(subjectId);
            // 204 No Content es el estándar REST para borrados exitosos sin body de respuesta
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // -> Operaciones prerrequisitos

    async addPrerequisite(req, res, next) {
        try {
            const { subjectId } = req.params;
            const { prerequisiteId } = req.body;

            const prerequisite = await CurriculumService.addPrerequisite(subjectId, prerequisiteId);
            res.status(201).json(prerequisite);
        } catch (error) {
            // Si el servicio lanza el error de "Un ramo no puede ser prerrequisito de sí mismo"
            if (error.message.includes('sí mismo')) {
                return res.status(400).json({ error: error.message });
            }
            next(error);
        }
    }

    async removePrerequisite(req, res, next) {
        try {
            const { subjectId, prerequisiteId } = req.params;
            await CurriculumService.removePrerequisite(subjectId, prerequisiteId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // -> Operaciones progreso

    async updateSubjectStatus(req, res, next) {
        try {
            const studentId = req.userId;
            const { subjectId } = req.params;
            const { status } = req.body; // 'aprobado', 'cursando', 'pendiente'

            const progressRecord = await CurriculumService.updateSubjectStatus(studentId, subjectId, status);
            res.status(200).json(progressRecord);
        } catch (error) {
            if (error.message.includes('Estado de ramo no válido')) {
                return res.status(400).json({ error: error.message });
            }
            next(error);
        }
    }
}

module.exports = new CurriculumController();