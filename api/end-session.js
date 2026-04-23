import { db, badRequest, unauthorized, serverError, readJson, resolveStudentFromSession } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { token, practiceSessionId } = body || {}
    if (!token || !practiceSessionId) return badRequest(res, 'Missing token or practiceSessionId')

    const ctx = await resolveStudentFromSession(token)
    if (!ctx) return unauthorized(res, 'Session invalid')

    const { data: ps } = await db
      .from('classroom_practice_sessions')
      .select('id, student_id, is_diagnostic')
      .eq('id', practiceSessionId)
      .maybeSingle()
    if (!ps || ps.student_id !== ctx.student.id) return unauthorized(res, 'Not your session')

    const nowIso = new Date().toISOString()
    await db
      .from('classroom_practice_sessions')
      .update({ ended_at: nowIso })
      .eq('id', practiceSessionId)

    // If it was the diagnostic, mark stats.diagnostic_completed
    if (ps.is_diagnostic) {
      await db
        .from('classroom_student_stats')
        .upsert(
          { student_id: ctx.student.id, diagnostic_completed: true, diagnostic_completed_at: nowIso, updated_at: nowIso },
          { onConflict: 'student_id' }
        )
    }

    const { data: summary } = await db
      .from('classroom_practice_sessions')
      .select('id, problems_count, correct_count, xp_earned, started_at, ended_at, is_diagnostic')
      .eq('id', practiceSessionId)
      .single()

    res.status(200).json({ summary })
  } catch (err) {
    serverError(res, err)
  }
}
