import CurriculumService from '../service/curriculumService.js'

class CurriculumController {

    async getFullCurriculum(req, res, next) {
        try {
            const studentId = req.userId
            const curriculum = await CurriculumService.getFullCurriculum(studentId)

            if (!curriculum) {
                return res.status(404).json({ message: 'Malla no encontrada para este estudiante.' })
            }

            res.status(200).json(curriculum)
        } catch (error) {
            next(error)
        }
    }

    async updateCurriculum(req, res, next) {
        try {
            const studentId = req.userId
            const curriculumData = req.body

            if (!curriculumData || Object.keys(curriculumData).length === 0) {
                return res.status(400).json({ message: 'Se debe proporcionar al menos un campo para actualizar' })
            }

            const updated = await CurriculumService.updateCurriculum(studentId, curriculumData)
            res.status(200).json(updated)
        } catch (error) {
            next(error)
        }
    }

    async deleteCurriculum(req, res, next) {
        try {
            const studentId = req.userId
            await CurriculumService.deleteCurriculum(studentId)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    async importCurriculum(req, res, next) {
        try {
            const studentId = req.userId
            const fullData = req.body

            if (!fullData.curriculum || !fullData.subjects) {
                return res.status(400).json({ message: 'Formato de importación inválido. Se requiere "curriculum" y "subjects".' })
            }

            const imported = await CurriculumService.importCurriculum(studentId, fullData)
            res.status(201).json(imported)
        } catch (error) {
            next(error)
        }
    }

    async getCurrentSubjects(req, res, next) {
        try {
            const studentId = req.userId
            const subjects = await CurriculumService.getCurrentSubjects(studentId)

            if (!subjects) {
                return res.status(404).json({ message: 'Malla no encontrada para este estudiante.' })
            }

            res.status(200).json(subjects)
        } catch (error) {
            next(error)
        }
    }

    async getSubjectsBySemester(req, res, next) {
        try {
            const studentId = req.userId
            const { semesterId } = req.params

            const parsedSemesterId = parseInt(semesterId, 10)
            if (isNaN(parsedSemesterId)) {
                return res.status(400).json({ message: 'El id del semestre debe ser un número válido.' })
            }

            const subjects = await CurriculumService.getSubjectsBySemester(studentId, parsedSemesterId)

            if (!subjects) {
                return res.status(404).json({ message: 'Malla no encontrada para este estudiante.' })
            }

            res.status(200).json(subjects)
        } catch (error) {
            next(error)
        }
    }

    async addSubject(req, res, next) {
        try {
            const { curriculumId } = req.params
            const subjectData = req.body

            if (!subjectData.name || subjectData.code === undefined) {
                return res.status(400).json({ message: 'Campos requeridos faltantes: name y code' })
            }

            const newSubject = await CurriculumService.addSubject(curriculumId, subjectData)
            res.status(201).json(newSubject)
        } catch (error) {
            next(error)
        }
    }

    async patchSubject(req, res, next) {
        try {
            const { subjectId } = req.params
            const updateData = req.body

            if (!updateData || Object.keys(updateData).length === 0) {
                return res.status(400).json({ message: 'Se debe proporcionar al menos un campo para actualizar' })
            }

            const updatedSubject = await CurriculumService.patchSubject(subjectId, updateData)
            res.status(200).json(updatedSubject)
        } catch (error) {
            next(error)
        }
    }

    async removeSubject(req, res, next) {
        try {
            const { subjectId } = req.params
            await CurriculumService.removeSubject(subjectId)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    async addPrerequisite(req, res, next) {
        try {
            const { subjectId } = req.params
            const { prerequisiteId } = req.body

            if (!prerequisiteId) {
                return res.status(400).json({ message: 'Campo requerido faltante: prerequisiteId' })
            }

            const prerequisite = await CurriculumService.addPrerequisite(subjectId, prerequisiteId)
            res.status(201).json(prerequisite)
        } catch (error) {
            if (error.message.includes('sí mismo')) {
                return res.status(400).json({ error: error.message })
            }
            next(error)
        }
    }

    async removePrerequisite(req, res, next) {
        try {
            const { subjectId, prerequisiteId } = req.params
            await CurriculumService.removePrerequisite(subjectId, prerequisiteId)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    async updateSubjectStatus(req, res, next) {
        try {
            const studentId = req.userId
            const { subjectId } = req.params
            const { status } = req.body

            if (!status) {
                return res.status(400).json({ message: 'Campo requerido faltante: status' })
            }

            const progressRecord = await CurriculumService.updateSubjectStatus(studentId, subjectId, status)
            res.status(200).json(progressRecord)
        } catch (error) {
            if (error.message.includes('Estado de ramo no válido')) {
                return res.status(400).json({ error: error.message })
            }
            next(error)
        }
    }
}

export default new CurriculumController()
