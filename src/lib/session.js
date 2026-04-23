// Student session token lives in localStorage.
// This is the ONLY thing we keep in localStorage — all other state
// (progress, XP, mastery) is server-side only.

const KEY = 'mm-student-session'

export function saveSession(token, student) {
  localStorage.setItem(KEY, JSON.stringify({ token, student, savedAt: Date.now() }))
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
