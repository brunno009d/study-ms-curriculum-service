const supabase = require('../config/supabase');

class ProgressRepository {

    // Obtiene todos los estados de los ramos de un estudiante.
    async getStudentProgress(studentId) {
        const { data, error } = await supabase
            .from('student_subjects')
            .select('subject_id, status')
            .eq('student_id', studentId);

        if (error) throw error;
        return data;
    }

    // Inserta o actualiza el estado de un ramo con Upsert.
    async upsertSubjectStatus(studentId, subjectId, status) {
        const { data, error } = await supabase
            .from('student_subjects')
            .upsert(
                { student_id: studentId, subject_id: subjectId, status: status },
                { onConflict: 'student_id, subject_id' } // Utiliza la restricción UNIQUE que tiene la BD
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    }

}

module.exports = new ProgressRepository();