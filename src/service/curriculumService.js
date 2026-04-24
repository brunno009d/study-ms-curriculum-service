const CurriculumRepository = require('../repository/curriculumRepository');
const SubjectRepository = require('../repository/subjectRepository');
const ProgressRepository = require('../repository/progressRepository');

class CurriculumService {
    // obtener todo: malla, ramos, prerrequsitos, estados de ramos

    async getFullCurriculum(studentId) {
        // Obtener el header
        const curriculumHeader = await CurriculumRepository.getCurriculumByStudentId(studentId);

        if (!curriculumHeader) {
            return null;
        }

        // Obtener los ramos y el progreso del estudiante al mismo tiempo
        const [subjects, progress] = await Promise.all([
            SubjectRepository.getSubjectsByCurriculumId(curriculumHeader.id),
            ProgressRepository.getStudentProgress(studentId)
        ]);

        const formattedSubjects = subjects.map(subject => {
            // Buscamos si el estudiante ya interactuó con este ramo
            const statusRecord = progress.find(p => p.subject_id === subject.id);

            // Formateamos los prerrequisitos para que sea un array plano de IDs
            const prerequisites = subject.subject_prerequisite.map(pr => pr.prerrequisite_id);

            return {
                id: subject.id,
                name: subject.name,
                code: subject.code,
                credits: subject.credits,
                semester_number: subject.semester_number,
                area_type: subject.area_type,
                prerequisites: prerequisites,
                status: statusRecord ? statusRecord.status : 'pendiente' // Por defecto es pendiente
            };
        });

        // Retornar el objeto consolidado
        return {
            header: curriculumHeader,
            body: formattedSubjects
        };
    }

    // -> Operaciones de la Malla

    async updateCurriculum(studentId, curriculumData) {
        return await CurriculumRepository.patchCurriculum(studentId, curriculumData);
    }

    async deleteCurriculum(studentId) {
        // Como ya activamos ON DELETE CASCADE en la BD, esto limpiará todo automáticamente
        return await CurriculumRepository.deleteCurriculum(studentId);
    }

    // -> Operaciones de Ramos

    async addSubject(curriculumId, subjectData) {
        // Aquí podrías validar que los créditos no sean negativos, etc.
        return await SubjectRepository.createSubject({ ...subjectData, curriculum_id: curriculumId });
    }

    async patchSubject(subjectId, updateData) {
        // Actualiza semestre, nombre, créditos, etc.
        return await SubjectRepository.updateSubject(subjectId, updateData);
    }

    async removeSubject(subjectId) {
        return await SubjectRepository.deleteSubject(subjectId);
    }

    // -> Operaciones de Prerrequisitos

    async addPrerequisite(subjectId, prerequisiteId) {
        if (subjectId === prerequisiteId) {
            throw new Error("Un ramo no puede ser prerrequisito de sí mismo"); // Regla de negocio
        }
        return await SubjectRepository.addPrerequisite(subjectId, prerequisiteId);
    }

    async removePrerequisite(subjectId, prerequisiteId) {
        return await SubjectRepository.removePrerequisite(subjectId, prerequisiteId);
    }

    // -> Operaciones de Progreso

    async updateSubjectStatus(studentId, subjectId, status) {
        // Validar que el estado sea válido
        const validStatuses = ['aprobado', 'cursando', 'pendiente'];
        if (!validStatuses.includes(status)) {
            throw new Error("Estado de ramo no válido");
        }
        return await ProgressRepository.upsertSubjectStatus(studentId, subjectId, status);
    }
}

module.exports = new CurriculumService();
