import { db, badRequest, unauthorized, serverError, readJson, resolveStudentFromSession } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { token, isDiagnostic } = body || {}
    if (!token) return badRequest(res, 'Missing token')

    const ctx = await resolveStudentFromSession(token)
    if (!ctx) return unauthorized(res, 'Session invalid')

    const { data, error } = await db
      .from('classroom_practice_sessions')
      .insert({
        student_id: ctx.student.id,
        is_diagnostic: !!isDiagnostic,
      })
      .select('id, started_at, is_diagnostic')
      .single()
    if (error) throw error

    res.status(200).json({ practiceSession: data })
  } catch (err) {
    serverError(res, err)
  }
}
