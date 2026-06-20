import curriculumService from '../service/curriculumService.js'

const getContext = async (req, res, next) => {
    try {
        const fullCurriculum = await curriculumService.getFullCurriculum(req.userId)

        if (!fullCurriculum) {
            return res.status(200).json({
                curriculum: null,
                message: 'El estudiante no tiene malla curricular cargada.'
            })
        }

        res.status(200).json(fullCurriculum)
    } catch (error) {
        next(error)
    }
}

const getCurrentContext = async (req, res, next) => {
    try {
        const currentSubjects = await curriculumService.getCurrentSubjects(req.userId)

        if (!currentSubjects) {
            return res.status(200).json({
                current_subjects: [],
                message: 'El estudiante no tiene malla curricular cargada.'
            })
        }

        res.status(200).json({ current_subjects: currentSubjects })
    } catch (error) {
        next(error)
    }
}

export { getContext, getCurrentContext }
