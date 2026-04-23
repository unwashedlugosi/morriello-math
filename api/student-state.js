import { db, badRequest, unauthorized, serverError, resolveStudentFromSession } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    // Body may or may not be parsed depending on runtime
    let token = null
    try {
      let body = req.body
      if (!body || typeof body === 'string') {
        body = await new Promise((resolve, reject) => {
          let raw = ''; req.on('data', (c) => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) } }); req.on('error', reject)
        })
      }
      token = body?.token
    } catch {
      return badRequest(res, 'Bad body')
    }
    if (!token) return badRequest(res, 'Missing token')
    const ctx = await resolveStudentFromSession(token)
    if (!ctx) return unauthorized(res, 'Session invalid')

    const [{ data: stats }, { data: progress }] = await Promise.all([
      db.from('classroom_student_stats').select('*').eq('student_id', ctx.student.id).maybeSingle(),
      db.from('classroom_student_progress').select('topic, attempts, correct_attempts, last_8_results, mastery, total_xp').eq('student_id', ctx.student.id),
    ])

    const topicProgress = {}
    ;(progress || []).forEach((p) => { topicProgress[p.topic] = p })

    res.status(200).json({
      student: { id: ctx.student.id, display_name: ctx.student.display_name },
      stats: stats || null,
      topicProgress,
    })
  } catch (err) {
    serverError(res, err)
  }
}
