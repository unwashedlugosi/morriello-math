import { db, badRequest, unauthorized, serverError, readJson, resolveTeacherFromRequest } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')

    const ctx = await resolveTeacherFromRequest(req)
    if (!ctx || !ctx.teacher) return unauthorized(res, 'Not signed in')

    const body = await readJson(req)
    const { studentId } = body || {}
    if (!studentId) return badRequest(res, 'Missing studentId')

    // Verify the student is in a class owned by this teacher
    const { data: student } = await db
      .from('classroom_students')
      .select('id, class_id, classroom_classes!inner(teacher_id)')
      .eq('id', studentId)
      .maybeSingle()
    if (!student || student.classroom_classes.teacher_id !== ctx.teacher.id) {
      return unauthorized(res, 'Not your student')
    }

    // Clear PIN and kill any live sessions
    await db.from('classroom_students').update({ pin_hash: null }).eq('id', studentId)
    await db.from('classroom_sessions').delete().eq('student_id', studentId)

    res.status(200).json({ ok: true })
  } catch (err) {
    serverError(res, err)
  }
}
