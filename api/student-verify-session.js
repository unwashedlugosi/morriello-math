import { badRequest, unauthorized, serverError, readJson, resolveStudentFromSession } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { token } = body || {}
    if (!token) return badRequest(res, 'Missing token')
    const ctx = await resolveStudentFromSession(token)
    if (!ctx) return unauthorized(res, 'Session invalid or expired')
    res.status(200).json({
      student: { id: ctx.student.id, display_name: ctx.student.display_name },
    })
  } catch (err) {
    serverError(res, err)
  }
}
