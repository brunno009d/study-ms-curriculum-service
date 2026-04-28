const supabase = require('../config/supabase');

class SubjectRepository {

    // Cargar la malla con los ramos completamente
    async getSubjectsByCurriculumId(curriculumId) {
        const { data, error } = await supabase
            .from('subjects')
            .select(`
                id,
                name,
                code,
                credits,
                semester_number,
                area_type,
                subject_prerequisite!subject_id (
                    prerrequisite_id
                )
            `)
            .eq('curriculum_id', curriculumId);

        if (error) {
            throw new Error(`Error en BD [getSubjectsByCurriculumId]: ${error.message}`);
        }
        return data || [];
    }

    // --- operaciones de Ramos ---

    // Crea un ramo
    async createSubject(subjectData) {
        const { data, error } = await supabase
            .from('subjects')
            .insert([subjectData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Elimina un ramo
    async deleteSubject(subjectId) {
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subjectId);

        if (error) throw error;
        return true;
    }

    // Actualiza un ramo
    async updateSubject(subjectId, updateData) {
        const { data, error } = await supabase
            .from('subjects')
            .update(updateData)
            .eq('id', subjectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // --- Prerrequisitos ---

    // Agrega un prerrequisito
    async addPrerequisite(subjectId, prerequisiteId) {
        const { data, error } = await supabase
            .from('subject_prerequisite')
            .insert([{ subject_id: subjectId, prerrequisite_id: prerequisiteId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Elimina un prerrequisito
    async removePrerequisite(subjectId, prerequisiteId) {
        const { error } = await supabase
            .from('subject_prerequisite')
            .delete()
            .match({ subject_id: subjectId, prerrequisite_id: prerequisiteId });

        if (error) throw error;
        return true;
    }

}

module.exports = new SubjectRepository();