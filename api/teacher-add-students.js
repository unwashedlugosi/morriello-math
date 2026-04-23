import { db, badRequest, unauthorized, serverError, readJson, resolveTeacherFromRequest } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')

    const ctx = await resolveTeacherFromRequest(req)
    if (!ctx || !ctx.teacher) return unauthorized(res, 'Not signed in')

    const body = await readJson(req)
    const { classId, names } = body || {}
    if (!classId || !Array.isArray(names)) return badRequest(res, 'Missing classId or names[]')

    // Confirm class belongs to this teacher
    const { data: klass } = await db
      .from('classroom_classes')
      .select('id, teacher_id')
      .eq('id', classId)
      .maybeSingle()
    if (!klass || klass.teacher_id !== ctx.teacher.id) return unauthorized(res, 'Not your class')

    const cleaned = names
      .map((n) => String(n || '').trim())
      .filter(Boolean)
      .map((n) => n.slice(0, 80))
    if (cleaned.length === 0) return badRequest(res, 'No valid names')

    const rows = cleaned.map((display_name) => ({ class_id: classId, display_name }))
    const { data, error } = await db
      .from('classroom_students')
      .insert(rows)
      .select('id, display_name')
    if (error) throw error

    res.status(200).json({ added: data })
  } catch (err) {
    serverError(res, err)
  }
}
