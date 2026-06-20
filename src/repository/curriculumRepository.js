import supabase from '../config/supabase.js'

class CurriculumRepository {

    async getCurriculumByStudentId(studentId) {
        const { data, error } = await supabase
            .from('curriculum')
            .select('*')
            .eq('student_id', studentId)
            .single()

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Error en BD [getCurriculumHeader]: ${error.message}`)
        }
        return data
    }

    async createCurriculum(studentId, curriculumData) {
        const { data, error } = await supabase
            .from('curriculum')
            .insert([curriculumData])
            .select()
            .single()

        if (error) throw error
        return data
    }

    async patchCurriculum(studentId, curriculumData) {
        const { data, error } = await supabase
            .from('curriculum')
            .update(curriculumData)
            .eq('student_id', studentId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteCurriculum(studentId) {
        const { error } = await supabase
            .from('curriculum')
            .delete()
            .eq('student_id', studentId)

        if (error) throw error
        return true
    }
}

export default new CurriculumRepository()
