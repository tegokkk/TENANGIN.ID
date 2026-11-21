export async function getActiveCounselorAssignments(db, counselorUserId, schoolId) {
  return db('counselor_assignments')
    .where({
      counselor_user_id: counselorUserId,
      school_id: schoolId,
      is_active: true,
    })
    .select('id', 'grade_group', 'period_label');
}

export function extractAssignedGroups(assignments) {
  return assignments.map((a) => a.grade_group);
}

export function isStudentInAssignedScope(studentGradeGroup, assignedGroups) {
  if (!assignedGroups || assignedGroups.length === 0) return false;
  if (assignedGroups.includes('Semua Siswa')) return true;
  return assignedGroups.includes(studentGradeGroup);
}
