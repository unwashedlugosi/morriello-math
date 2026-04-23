import { db, badRequest, serverError, readJson, getClassBySlug } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { classSlug, name } = body || {}
    if (!classSlug || !name) return badRequest(res, 'Missing classSlug or name')
    const cleanName = String(name).trim().slice(0, 80)
    if (!cleanName) return badRequest(res, 'Name cannot be empty')

    const klass = await getClassBySlug(classSlug)
    if (!klass) return res.status(404).json({ error: 'Class not found' })

    const { error } = await db
      .from('classroom_join_requests')
      .insert({ class_id: klass.id, requested_name: cleanName })
    if (error) throw error

    res.status(200).json({ ok: true })
  } catch (err) {
    serverError(res, err)
  }
}
