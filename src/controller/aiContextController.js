const curriculumService = require('../service/curriculumService');

// Endpoints de contexto para la IA.


// Devuelve la malla curricular COMPLETA: header + todos los ramos con
// prerrequisitos y estado (aprobado/cursando/pendiente).
const getContext = async (req, res, next) => {
    try {
        const fullCurriculum = await curriculumService.getFullCurriculum(req.userId);

        if (!fullCurriculum) {
            return res.status(200).json({
                curriculum: null,
                message: 'El estudiante no tiene malla curricular cargada.'
            });
        }

        res.status(200).json(fullCurriculum);
    } catch (error) {
        next(error);
    }
};

// Devuelve SOLO las materias que el estudiante está cursando actualmente.
const getCurrentContext = async (req, res, next) => {
    try {
        const currentSubjects = await curriculumService.getCurrentSubjects(req.userId);

        if (!currentSubjects) {
            return res.status(200).json({
                current_subjects: [],
                message: 'El estudiante no tiene malla curricular cargada.'
            });
        }

        res.status(200).json({ current_subjects: currentSubjects });
    } catch (error) {
        next(error);
    }
};

module.exports = { getContext, getCurrentContext };
