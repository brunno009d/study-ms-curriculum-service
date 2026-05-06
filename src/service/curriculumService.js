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

    /**
    Importa una malla completa (Header + Subjects + Prerequisites)
    Estructura esperada:
    {
      curriculum: { name, university, career, total_credits, total_semesters },
      subjects: [ { name, code, credits, semester_number, area_type, prerequisites: [code1, code2] } ]
    }
     */
    async importCurriculum(studentId, fullData) {
        const { curriculum, subjects } = fullData;

        // Verificar si ya existe una malla para el estudiante y borrarla (opcional, según flujo)
        // Por ahora, si existe, la borramos para re-importar la nueva corregida
        const existing = await CurriculumRepository.getCurriculumByStudentId(studentId);
        if (existing) {
            await CurriculumRepository.deleteCurriculum(studentId);
        }

        // Crear el header de la malla
        const newCurriculum = await CurriculumRepository.createCurriculum(studentId, {
            ...curriculum,
            student_id: studentId
        });

        const curriculumId = newCurriculum.id;

        // Preparar los ramos para inserción masiva (sin prerrequisitos aún)
        const subjectsToInsert = subjects.map(s => ({
            curriculum_id: curriculumId,
            name: s.name,
            code: s.code,
            credits: s.credits,
            semester_number: s.semester_number,
            area_type: s.area_type
        }));

        const insertedSubjects = await SubjectRepository.bulkCreateSubjects(subjectsToInsert);

        // Mapear Código -> ID de BD para resolver prerrequisitos
        const codeToIdMap = {};
        insertedSubjects.forEach(s => {
            codeToIdMap[s.code] = s.id;
        });

        // Preparar y crear prerrequisitos
        const prerequisitesToInsert = [];
        subjects.forEach(s => {
            if (s.prerequisites && s.prerequisites.length > 0) {
                const subjectId = codeToIdMap[s.code];
                s.prerequisites.forEach(preCode => {
                    const preId = codeToIdMap[preCode];
                    if (preId) {
                        prerequisitesToInsert.push({
                            subject_id: subjectId,
                            prerrequisite_id: preId
                        });
                    }
                });
            }
        });

        if (prerequisitesToInsert.length > 0) {
            await SubjectRepository.bulkCreatePrerequisites(prerequisitesToInsert);
        }

        // Retornar la malla completa recién creada
        return await this.getFullCurriculum(studentId);
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
