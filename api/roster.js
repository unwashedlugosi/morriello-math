import { db, badRequest, serverError, getClassBySlug } from './_utils.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return badRequest(res, 'GET only')
    const slug = req.query?.class
    if (!slug) return badRequest(res, 'Missing class slug')

    const klass = await getClassBySlug(slug)
    if (!klass) return res.status(404).json({ error: 'Class not found' })

    const { data, error } = await db
      .from('classroom_students')
      .select('id, display_name, pin_hash')
      .eq('class_id', klass.id)
      .is('archived_at', null)
      .order('display_name', { ascending: true })
    if (error) throw error

    // Never leak the pin_hash itself — but kids need to know whether they
    // need to create a PIN (first login) or enter one (returning).
    const students = (data || []).map((s) => ({
      id: s.id,
      display_name: s.display_name,
      has_pin: !!s.pin_hash,
    }))

    res.status(200).json({
      class: { id: klass.id, slug: klass.slug, name: klass.name },
      students,
    })
  } catch (err) {
    serverError(res, err)
  }
}
