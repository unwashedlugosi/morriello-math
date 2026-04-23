import bcrypt from 'bcryptjs'
import { db, badRequest, unauthorized, serverError, readJson } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { studentId, pin } = body || {}
    if (!studentId || !pin) return badRequest(res, 'Missing studentId or pin')

    const { data: student, error: findErr } = await db
      .from('classroom_students')
      .select('id, display_name, pin_hash, archived_at, class_id')
      .eq('id', studentId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!student || student.archived_at) return res.status(404).json({ error: 'Student not found' })
    if (!student.pin_hash) return res.status(409).json({ error: 'PIN not set yet' })

    const ok = await bcrypt.compare(String(pin), student.pin_hash)
    if (!ok) return unauthorized(res, 'Wrong PIN')

    const { data: session, error: sessErr } = await db
      .from('classroom_sessions')
      .insert({ student_id: studentId })
      .select('token')
      .single()
    if (sessErr) throw sessErr

    await db.from('classroom_student_stats').upsert(
      { student_id: studentId, last_active: new Date().toISOString() },
      { onConflict: 'student_id' }
    )

    res.status(200).json({
      token: session.token,
      student: { id: student.id, display_name: student.display_name },
    })
  } catch (err) {
    serverError(res, err)
  }
}
