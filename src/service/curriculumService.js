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

    // Importa una malla completa (Header + Subjects + Prerequisites)

    async importCurriculum(studentId, fullData) {
        const { curriculum, subjects } = fullData;

        // Verificar si ya existe una malla para el estudiante
        const existing = await CurriculumRepository.getCurriculumByStudentId(studentId);

        if (existing) {
            // -- MODO SINCRONIZACIÓN (Preserva progreso y IDs) --
            const curriculumId = existing.id;
            
            // Actualizar header
            await CurriculumRepository.patchCurriculum(studentId, curriculum);

            // Obtener ramos actuales
            const existingSubjects = await SubjectRepository.getSubjectsByCurriculumId(curriculumId);
            const existingSubjectIds = existingSubjects.map(s => s.id);

            // Determinar qué ramos vienen con un ID numérico válido
            const incomingIds = subjects.filter(s => typeof s.id === 'number').map(s => s.id);

            // Borrar ramos que ya no están (se borrarán en cascada sus notas/prerrequisitos)
            const idsToDelete = existingSubjectIds.filter(id => !incomingIds.includes(id));
            for (const id of idsToDelete) {
                await SubjectRepository.deleteSubject(id);
            }

            // Upsert ramos
            const codeToIdMap = {};
            for (const s of subjects) {
                const subjectData = {
                    name: s.name,
                    code: s.code,
                    credits: s.credits,
                    semester_number: s.semester_number,
                    area_type: s.area_type
                };

                if (s.id && typeof s.id === 'number' && existingSubjectIds.includes(s.id)) {
                    await SubjectRepository.updateSubject(s.id, subjectData);
                    codeToIdMap[s.code] = s.id;
                } else {
                    const newSub = await SubjectRepository.createSubject({
                        ...subjectData,
                        curriculum_id: curriculumId
                    });
                    s.id = newSub.id;
                    codeToIdMap[s.code] = newSub.id;
                }
            }

            // Sincronizar prerrequisitos: Borramos los actuales de los ramos que sobrevivieron
            // La base de datos es Supabase, como no tenemos un bulk delete, iteramos.
            const remainingSubjects = await SubjectRepository.getSubjectsByCurriculumId(curriculumId);
            for (const s of remainingSubjects) {
                if (s.subject_prerequisite && s.subject_prerequisite.length > 0) {
                    for (const pre of s.subject_prerequisite) {
                        await SubjectRepository.removePrerequisite(s.id, pre.prerrequisite_id);
                    }
                }
            }

            // Insertar los nuevos prerrequisitos
            const prerequisitesToInsert = [];
            for (const s of subjects) {
                if (s.prerequisites && s.prerequisites.length > 0) {
                    const subjectId = codeToIdMap[s.code];
                    for (const preCode of s.prerequisites) {
                        const preId = codeToIdMap[preCode];
                        if (preId) {
                            prerequisitesToInsert.push({
                                subject_id: subjectId,
                                prerrequisite_id: preId
                            });
                        }
                    }
                }
            }

            if (prerequisitesToInsert.length > 0) {
                await SubjectRepository.bulkCreatePrerequisites(prerequisitesToInsert);
            }

            return await this.getFullCurriculum(studentId);

        } else {
            // -- MODO CREACIÓN (Desde cero) --
            const newCurriculum = await CurriculumRepository.createCurriculum(studentId, {
                ...curriculum,
                student_id: studentId
            });

            const curriculumId = newCurriculum.id;

            const subjectsToInsert = subjects.map(s => ({
                curriculum_id: curriculumId,
                name: s.name,
                code: s.code,
                credits: s.credits,
                semester_number: s.semester_number,
                area_type: s.area_type
            }));

            const insertedSubjects = await SubjectRepository.bulkCreateSubjects(subjectsToInsert);

            const codeToIdMap = {};
            insertedSubjects.forEach(s => {
                codeToIdMap[s.code] = s.id;
            });

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

            return await this.getFullCurriculum(studentId);
        }
    }

    // -> Operaciones de Ramos

    async getCurrentSubjects(studentId) {
        const fullCurriculum = await this.getFullCurriculum(studentId);
        if (!fullCurriculum) return null;

        return fullCurriculum.body.filter(subject => subject.status === 'cursando');
    }

    async getSubjectsBySemester(studentId, semesterId) {
        const fullCurriculum = await this.getFullCurriculum(studentId);
        if (!fullCurriculum) return null;

        return fullCurriculum.body.filter(subject => subject.semester_number === semesterId);
    }

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
