// Called after a teacher completes magic-link sign-in. Creates their
// teacher record and class if they don't already exist. Idempotent.
import { db, unauthorized, serverError, resolveTeacherFromRequest } from './_utils.js'

const DEFAULT_CLASS_SLUG = 'morriello-math'
const DEFAULT_CLASS_NAME = "Ms. Morriello's 5th Grade Math"

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(400).json({ error: 'POST only' })

    const ctx = await resolveTeacherFromRequest(req)
    if (!ctx) return unauthorized(res, 'Not signed in')

    let teacher = ctx.teacher
    if (!teacher) {
      const { data, error } = await db
        .from('classroom_teachers')
        .insert({
          auth_user_id: ctx.authUser.id,
          email: ctx.authUser.email,
          display_name: ctx.authUser.user_metadata?.full_name || null,
        })
        .select('id, auth_user_id, email, display_name')
        .single()
      if (error) throw error
      teacher = data
    }

    // Ensure a class exists for this teacher. MVP: one per teacher.
    let { data: klass, error: classErr } = await db
      .from('classroom_classes')
      .select('id, slug, name')
      .eq('teacher_id', teacher.id)
      .maybeSingle()
    if (classErr) throw classErr
    if (!klass) {
      const { data, error } = await db
        .from('classroom_classes')
        .insert({
          teacher_id: teacher.id,
          slug: DEFAULT_CLASS_SLUG,
          name: DEFAULT_CLASS_NAME,
        })
        .select('id, slug, name')
        .single()
      if (error) throw error
      klass = data
    }

    res.status(200).json({ teacher, class: klass })
  } catch (err) {
    serverError(res, err)
  }
}
