import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { loadSession, clearSession } from '../lib/session.js'

export default function StudentHome() {
  const nav = useNavigate()
  const [student, setStudent] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const s = loadSession()
    if (!s?.token) { nav('/', { replace: true }); return }
    api.studentVerifySession(s.token)
      .then((res) => { setStudent(res.student); setStatus('ready') })
      .catch(() => { clearSession(); nav('/', { replace: true }) })
  }, [nav])

  async function signOut() {
    const s = loadSession()
    if (s?.token) await api.studentLogout(s.token).catch(() => {})
    clearSession()
    nav('/', { replace: true })
  }

  if (status === 'loading') {
    return <div className="page"><div className="card"><p className="muted">Loading…</p></div></div>
  }

  return (
    <div className="page">
      <div className="card">
        <div className="row-between" style={{ marginBottom: 18 }}>
          <span className="muted small">Signed in as</span>
          <button className="btn-secondary btn small" onClick={signOut}>Sign out</button>
        </div>
        <h1>Hi, {student?.display_name}</h1>
        <p className="sub">Your practice will show up here once your teacher loads the chapter.</p>
        <div className="alert alert-info">
          We're still setting up the Chapter 12 questions. Check back soon!
        </div>
      </div>
    </div>
  )
}
