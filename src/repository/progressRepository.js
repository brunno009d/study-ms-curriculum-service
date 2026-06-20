import supabase from '../config/supabase.js'

class ProgressRepository {

    async getStudentProgress(studentId) {
        const { data, error } = await supabase
            .from('student_subjects')
            .select('subject_id, status')
            .eq('student_id', studentId)

        if (error) throw error
        return data
    }

    async upsertSubjectStatus(studentId, subjectId, status) {
        const { data, error } = await supabase
            .from('student_subjects')
            .upsert(
                { student_id: studentId, subject_id: subjectId, status: status },
                { onConflict: 'student_id, subject_id' }
            )
            .select()
            .single()

        if (error) throw error
        return data
    }
}

export default new ProgressRepository()
