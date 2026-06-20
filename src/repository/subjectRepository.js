import supabase from '../config/supabase.js'

class SubjectRepository {

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
            .eq('curriculum_id', curriculumId)

        if (error) {
            throw new Error(`Error en BD [getSubjectsByCurriculumId]: ${error.message}`)
        }
        return data || []
    }

    async createSubject(subjectData) {
        const { data, error } = await supabase
            .from('subjects')
            .insert([subjectData])
            .select()
            .single()

        if (error) throw error
        return data
    }

    async bulkCreateSubjects(subjects) {
        const { data, error } = await supabase
            .from('subjects')
            .insert(subjects)
            .select()

        if (error) throw error
        return data
    }

    async deleteSubject(subjectId) {
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subjectId)

        if (error) throw error
        return true
    }

    async updateSubject(subjectId, updateData) {
        const { data, error } = await supabase
            .from('subjects')
            .update(updateData)
            .eq('id', subjectId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async addPrerequisite(subjectId, prerequisiteId) {
        const { data, error } = await supabase
            .from('subject_prerequisite')
            .insert([{ subject_id: subjectId, prerrequisite_id: prerequisiteId }])
            .select()
            .single()

        if (error) throw error
        return data
    }

    async bulkCreatePrerequisites(prerequisites) {
        const { data, error } = await supabase
            .from('subject_prerequisite')
            .insert(prerequisites)

        if (error) throw error
        return true
    }

    async removePrerequisite(subjectId, prerequisiteId) {
        const { error } = await supabase
            .from('subject_prerequisite')
            .delete()
            .match({ subject_id: subjectId, prerrequisite_id: prerequisiteId })

        if (error) throw error
        return true
    }
}

export default new SubjectRepository()
