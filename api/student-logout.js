import { db, badRequest, serverError, readJson } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { token } = body || {}
    if (token) {
      await db.from('classroom_sessions').delete().eq('token', token)
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    serverError(res, err)
  }
}
