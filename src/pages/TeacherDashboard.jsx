import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export default function TeacherDashboard() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [teacher, setTeacher] = useState(null)
  const [klass, setKlass] = useState(null)
  const [roster, setRoster] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const refreshRoster = useCallback(async (slug) => {
    const data = await api.listRoster(slug)
    setRoster(data.students)
  }, [])

  useEffect(() => {
    async function boot() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { nav('/teacher', { replace: true }); return }
      setSession(session)
      try {
        const init = await api.teacherInit(session.access_token)
        setTeacher(init.teacher)
        setKlass(init.class)
        await refreshRoster(init.class.slug)
        setStatus('ready')
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }
    boot()
  }, [nav, refreshRoster])

  async function signOut() {
    await supabase.auth.signOut()
    nav('/teacher', { replace: true })
  }

  async function handleResetPin(studentId) {
    if (!confirm('Reset this student\'s PIN? They\'ll pick a new one next time they log in.')) return
    try {
      await api.teacherResetPin(session.access_token, { studentId })
      await refreshRoster(klass.slug)
    } catch (err) {
      alert(err.message)
    }
  }

  if (status === 'loading') {
    return <div className="page"><p className="muted">Loading dashboard…</p></div>
  }
  if (status === 'error') {
    return (
      <div className="page">
        <div className="card">
          <h1>Something went wrong</h1>
          <div className="alert alert-error">{error}</div>
        </div>
      </div>
    )
  }

  const studentUrl = `${window.location.origin}/`

  return (
    <div className="page">
      <div className="topbar">
        <h2>{klass.name}</h2>
        <div className="right row">
          <span className="small muted">{teacher.email}</span>
          <button className="btn-secondary btn small" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="dashboard">
        <div className="card">
          <div className="row-between">
            <h1 style={{ fontSize: 18, margin: 0 }}>Roster ({roster.length})</h1>
            <button className="btn" onClick={() => setShowAdd(true)}>+ Add students</button>
          </div>
          <p className="sub" style={{ marginTop: 4 }}>Click Reset PIN if a student forgets.</p>
          {roster.length === 0 ? (
            <p className="alert alert-info">No students yet. Click "Add students" to paste your class list.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>PIN</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td>{s.display_name}</td>
                    <td>{s.has_pin ? <span className="muted small">set</span> : <span className="small" style={{ color: 'var(--warn)' }}>not set</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      {s.has_pin && (
                        <button className="btn-danger btn small" onClick={() => handleResetPin(s.id)}>Reset PIN</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h1 style={{ fontSize: 18, margin: 0 }}>Share with your class</h1>
          <p className="sub" style={{ marginTop: 4 }}>Students go here to sign in.</p>
          <div className="mono" style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: '#fafbff', wordBreak: 'break-all' }}>
            {studentUrl}
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigator.clipboard?.writeText(studentUrl)}>Copy link</button>

          <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 4 }}>Progress</h2>
          <p className="sub">Coming when students start practicing.</p>
        </div>
      </div>

      {showAdd && (
        <AddStudentsDialog
          classId={klass.id}
          accessToken={session.access_token}
          onDone={async () => { setShowAdd(false); await refreshRoster(klass.slug) }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AddStudentsDialog({ classId, accessToken, onDone, onCancel }) {
  const [text, setText] = useState('Student A\nStudent B\nStudent C\nStudent D\nStudent E\nStudent F\nStudent G\nStudent H\nStudent I\nStudent J\nStudent K\nStudent L\nStudent M\nStudent N')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    setBusy(true); setError(null)
    const names = text.split('\n').map((n) => n.trim()).filter(Boolean)
    try {
      await api.teacherAddStudents(accessToken, { classId, names })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
      <div className="card" style={{ maxWidth: 560 }}>
        <h1>Add students</h1>
        <p className="sub">Paste names, one per line.</p>
        <textarea
          className="input"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14 }}
        />
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn-secondary btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
