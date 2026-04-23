import bcrypt from 'bcryptjs'
import { db, badRequest, serverError, readJson } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { studentId, pin } = body || {}
    if (!studentId || !pin) return badRequest(res, 'Missing studentId or pin')
    if (!/^\d{4}$/.test(String(pin))) return badRequest(res, 'PIN must be 4 digits')

    const { data: student, error: findErr } = await db
      .from('classroom_students')
      .select('id, pin_hash, archived_at')
      .eq('id', studentId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!student || student.archived_at) return res.status(404).json({ error: 'Student not found' })
    if (student.pin_hash) return res.status(409).json({ error: 'PIN already set — ask your teacher to reset it' })

    const pinHash = await bcrypt.hash(String(pin), 10)
    const { error: updErr } = await db
      .from('classroom_students')
      .update({ pin_hash: pinHash })
      .eq('id', studentId)
    if (updErr) throw updErr

    // Ensure stats row exists (level starts at 1, not 0)
    await db.from('classroom_student_stats').upsert(
      { student_id: studentId, level: 1, last_active: new Date().toISOString() },
      { onConflict: 'student_id' }
    )

    // Create a session token
    const { data: session, error: sessErr } = await db
      .from('classroom_sessions')
      .insert({ student_id: studentId })
      .select('token')
      .single()
    if (sessErr) throw sessErr

    res.status(200).json({ token: session.token, studentId })
  } catch (err) {
    serverError(res, err)
  }
}
