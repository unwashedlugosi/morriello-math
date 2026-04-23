// Thin wrapper around /api/* serverless endpoints.
// All student-facing data writes go through here — never direct Supabase.

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

async function get(path) {
  const res = await fetch(path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

async function postAuth(path, accessToken, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  listRoster: (classSlug) => get(`/api/roster?class=${encodeURIComponent(classSlug)}`),
  studentLogin: ({ studentId, pin }) => post('/api/student-login', { studentId, pin }),
  studentCreatePin: ({ studentId, pin }) => post('/api/student-create-pin', { studentId, pin }),
  studentVerifySession: (token) => post('/api/student-verify-session', { token }),
  studentLogout: (token) => post('/api/student-logout', { token }),
  requestNameAdd: ({ classSlug, name }) => post('/api/request-name-add', { classSlug, name }),
  teacherInit: (accessToken) => postAuth('/api/teacher-init', accessToken),
  teacherAddStudents: (accessToken, { classId, names }) =>
    postAuth('/api/teacher-add-students', accessToken, { classId, names }),
  teacherResetPin: (accessToken, { studentId }) =>
    postAuth('/api/teacher-reset-pin', accessToken, { studentId }),
  studentState: (token) => post('/api/student-state', { token }),
  startSession: ({ token, isDiagnostic }) => post('/api/start-session', { token, isDiagnostic }),
  submitProblemResult: ({ token, practiceSessionId, result }) =>
    post('/api/submit-problem-result', { token, practiceSessionId, result }),
  endSession: ({ token, practiceSessionId }) =>
    post('/api/end-session', { token, practiceSessionId }),
}
