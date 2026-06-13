import CurriculumRepository from '../repository/curriculumRepository.js'
import SubjectRepository from '../repository/subjectRepository.js'
import ProgressRepository from '../repository/progressRepository.js'

class CurriculumService {

    async getFullCurriculum(studentId) {
        const curriculumHeader = await CurriculumRepository.getCurriculumByStudentId(studentId)

        if (!curriculumHeader) {
            return null
        }

        const [subjects, progress] = await Promise.all([
            SubjectRepository.getSubjectsByCurriculumId(curriculumHeader.id),
            ProgressRepository.getStudentProgress(studentId)
        ])

        const formattedSubjects = subjects.map(subject => {
            const statusRecord = progress.find(p => p.subject_id === subject.id)
            const prerequisites = subject.subject_prerequisite.map(pr => pr.prerrequisite_id)

            return {
                id: subject.id,
                name: subject.name,
                code: subject.code,
                credits: subject.credits,
                semester_number: subject.semester_number,
                area_type: subject.area_type,
                prerequisites: prerequisites,
                status: statusRecord ? statusRecord.status : 'pendiente'
            }
        })

        return {
            header: curriculumHeader,
            body: formattedSubjects
        }
    }

    async updateCurriculum(studentId, curriculumData) {
        return await CurriculumRepository.patchCurriculum(studentId, curriculumData)
    }

    async deleteCurriculum(studentId) {
        return await CurriculumRepository.deleteCurriculum(studentId)
    }

    async importCurriculum(studentId, fullData) {
        const { curriculum, subjects } = fullData

        const existing = await CurriculumRepository.getCurriculumByStudentId(studentId)

        if (existing) {
            const curriculumId = existing.id

            await CurriculumRepository.patchCurriculum(studentId, curriculum)

            const existingSubjects = await SubjectRepository.getSubjectsByCurriculumId(curriculumId)
            const existingSubjectIds = existingSubjects.map(s => s.id)

            const incomingIds = subjects.filter(s => typeof s.id === 'number').map(s => s.id)
            const idsToDelete = existingSubjectIds.filter(id => !incomingIds.includes(id))

            for (const id of idsToDelete) {
                await SubjectRepository.deleteSubject(id)
            }

            const codeToIdMap = {}
            for (const s of subjects) {
                const subjectData = {
                    name: s.name, code: s.code, credits: s.credits,
                    semester_number: s.semester_number, area_type: s.area_type
                }

                if (s.id && typeof s.id === 'number' && existingSubjectIds.includes(s.id)) {
                    await SubjectRepository.updateSubject(s.id, subjectData)
                    codeToIdMap[s.code] = s.id
                } else {
                    const newSub = await SubjectRepository.createSubject({ ...subjectData, curriculum_id: curriculumId })
                    s.id = newSub.id
                    codeToIdMap[s.code] = newSub.id
                }
            }

            const remainingSubjects = await SubjectRepository.getSubjectsByCurriculumId(curriculumId)
            for (const s of remainingSubjects) {
                if (s.subject_prerequisite && s.subject_prerequisite.length > 0) {
                    for (const pre of s.subject_prerequisite) {
                        await SubjectRepository.removePrerequisite(s.id, pre.prerrequisite_id)
                    }
                }
            }

            const prerequisitesToInsert = []
            for (const s of subjects) {
                if (s.prerequisites && s.prerequisites.length > 0) {
                    const subjectId = codeToIdMap[s.code]
                    for (const preCode of s.prerequisites) {
                        const preId = codeToIdMap[preCode]
                        if (preId) {
                            prerequisitesToInsert.push({ subject_id: subjectId, prerrequisite_id: preId })
                        }
                    }
                }
            }

            if (prerequisitesToInsert.length > 0) {
                await SubjectRepository.bulkCreatePrerequisites(prerequisitesToInsert)
            }

            return await this.getFullCurriculum(studentId)
        } else {
            const newCurriculum = await CurriculumRepository.createCurriculum(studentId, {
                ...curriculum,
                student_id: studentId
            })

            const curriculumId = newCurriculum.id

            const subjectsToInsert = subjects.map(s => ({
                curriculum_id: curriculumId,
                name: s.name, code: s.code, credits: s.credits,
                semester_number: s.semester_number, area_type: s.area_type
            }))

            const insertedSubjects = await SubjectRepository.bulkCreateSubjects(subjectsToInsert)

            const codeToIdMap = {}
            insertedSubjects.forEach(s => { codeToIdMap[s.code] = s.id })

            const prerequisitesToInsert = []
            subjects.forEach(s => {
                if (s.prerequisites && s.prerequisites.length > 0) {
                    const subjectId = codeToIdMap[s.code]
                    s.prerequisites.forEach(preCode => {
                        const preId = codeToIdMap[preCode]
                        if (preId) {
                            prerequisitesToInsert.push({ subject_id: subjectId, prerrequisite_id: preId })
                        }
                    })
                }
            })

            if (prerequisitesToInsert.length > 0) {
                await SubjectRepository.bulkCreatePrerequisites(prerequisitesToInsert)
            }

            return await this.getFullCurriculum(studentId)
        }
    }

    async getCurrentSubjects(studentId) {
        const fullCurriculum = await this.getFullCurriculum(studentId)
        if (!fullCurriculum) return null
        return fullCurriculum.body.filter(subject => subject.status === 'cursando')
    }

    async getSubjectsBySemester(studentId, semesterId) {
        const fullCurriculum = await this.getFullCurriculum(studentId)
        if (!fullCurriculum) return null
        return fullCurriculum.body.filter(subject => subject.semester_number === semesterId)
    }

    async addSubject(curriculumId, subjectData) {
        return await SubjectRepository.createSubject({ ...subjectData, curriculum_id: curriculumId })
    }

    async patchSubject(subjectId, updateData) {
        return await SubjectRepository.updateSubject(subjectId, updateData)
    }

    async removeSubject(subjectId) {
        return await SubjectRepository.deleteSubject(subjectId)
    }

    async addPrerequisite(subjectId, prerequisiteId) {
        if (subjectId === prerequisiteId) {
            throw new Error('Un ramo no puede ser prerrequisito de sí mismo')
        }
        return await SubjectRepository.addPrerequisite(subjectId, prerequisiteId)
    }

    async removePrerequisite(subjectId, prerequisiteId) {
        return await SubjectRepository.removePrerequisite(subjectId, prerequisiteId)
    }

    async updateSubjectStatus(studentId, subjectId, status) {
        const validStatuses = ['aprobado', 'cursando', 'pendiente']
        if (!validStatuses.includes(status)) {
            throw new Error('Estado de ramo no válido')
        }
        return await ProgressRepository.upsertSubjectStatus(studentId, subjectId, status)
    }
}

export default new CurriculumService()
