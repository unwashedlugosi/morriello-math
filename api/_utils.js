import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

// Service-role client bypasses RLS. Only used in API routes.
export const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export function badRequest(res, message) {
  res.status(400).json({ error: message })
}

export function unauthorized(res, message = 'Not authorized') {
  res.status(401).json({ error: message })
}

export function serverError(res, err) {
  // eslint-disable-next-line no-console
  console.error(err)
  res.status(500).json({ error: err?.message || 'Internal error' })
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export async function resolveStudentFromSession(token) {
  if (!token) return null
  const { data, error } = await db
    .from('classroom_sessions')
    .select('id, student_id, expires_at, classroom_students(id, display_name, class_id, archived_at)')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return null
  if (new Date(data.expires_at) < new Date()) return null
  if (!data.classroom_students || data.classroom_students.archived_at) return null
  // Bump last_seen_at (fire and forget)
  db.from('classroom_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})
  return {
    sessionId: data.id,
    student: data.classroom_students,
  }
}

export async function resolveTeacherFromRequest(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || !header.startsWith('Bearer ')) return null
  const accessToken = header.slice('Bearer '.length)
  const { data, error } = await db.auth.getUser(accessToken)
  if (error || !data?.user) return null
  const authUserId = data.user.id

  const { data: teacher, error: teacherErr } = await db
    .from('classroom_teachers')
    .select('id, auth_user_id, email, display_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (teacherErr) throw teacherErr

  return { authUser: data.user, teacher }
}

export async function getClassBySlug(slug) {
  const { data, error } = await db
    .from('classroom_classes')
    .select('id, slug, name, teacher_id')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}
