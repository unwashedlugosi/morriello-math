import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { saveSession, loadSession } from '../lib/session.js'
import PinPad from '../components/PinPad.jsx'

const CLASS_SLUG = import.meta.env.VITE_CLASS_SLUG || 'morriello-math'

export default function StudentEntry() {
  const nav = useNavigate()
  const [status, setStatus] = useState('loading')
  const [roster, setRoster] = useState([])
  const [klass, setKlass] = useState(null)
  const [picked, setPicked] = useState(null)
  const [error, setError] = useState(null)
  const [askNameAdd, setAskNameAdd] = useState(false)

  useEffect(() => {
    const existing = loadSession()
    if (existing?.token) {
      api.studentState(existing.token)
        .then(() => nav('/home', { replace: true }))
        .catch(() => { /* stale — fall through to picker */ })
    }
    api.listRoster(CLASS_SLUG)
      .then((data) => {
        setKlass(data.class)
        setRoster(data.students)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [nav])

  async function handlePin(pin) {
    setError(null)
    try {
      const result = picked.has_pin
        ? await api.studentLogin({ studentId: picked.id, pin })
        : await api.studentCreatePin({ studentId: picked.id, pin })
      saveSession(result.token, result.student || { id: picked.id, display_name: picked.display_name })
      nav('/home', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  if (status === 'loading') {
    return <div className="page"><div className="card"><p className="muted">Loading…</p></div></div>
  }
  if (status === 'error') {
    return (
      <div className="page">
        <div className="card">
          <h1>Couldn't load the class</h1>
          <p className="alert alert-error">{error}</p>
          <p className="small muted">Tell your teacher the class isn't set up yet.</p>
        </div>
      </div>
    )
  }

  if (!picked) {
    return (
      <div className="page">
        <div className="card">
          <h1>{klass?.name || 'Morriello Math'}</h1>
          <p className="sub">Tap your name to get started.</p>
          {roster.length === 0 ? (
            <p className="alert alert-info">No students added yet. Your teacher needs to add the roster first.</p>
          ) : (
            <div className="roster-grid">
              {roster.map((s) => (
                <button key={s.id} className="roster-tile" onClick={() => setPicked(s)}>
                  {s.display_name}
                  {!s.has_pin && <span className="needs-pin">First time · make a PIN</span>}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn-secondary btn" onClick={() => setAskNameAdd(true)}>
              My name isn't here
            </button>
          </div>

          {askNameAdd && <NameAddDialog classSlug={CLASS_SLUG} onClose={() => setAskNameAdd(false)} />}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <div className="row-between" style={{ marginBottom: 16 }}>
          <button className="btn-secondary btn" onClick={() => setPicked(null)}>← Back</button>
          <span className="muted small">{picked.display_name}</span>
        </div>
        <h1>{picked.has_pin ? 'Enter your PIN' : 'Make a 4-digit PIN'}</h1>
        <p className="sub">
          {picked.has_pin
            ? 'Type the 4 digits you picked last time.'
            : "Pick 4 digits you'll remember. You'll use this every time you log in."}
        </p>
        <PinPad onSubmit={handlePin} />
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )
}

function NameAddDialog({ classSlug, onClose }) {
  const [name, setName] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  async function submit() {
    if (!name.trim()) return
    setState('sending')
    try {
      await api.requestNameAdd({ classSlug, name })
      setState('sent')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }

  return (
    <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: '#fafbff' }}>
      {state === 'sent' ? (
        <>
          <div className="alert alert-success">Got it. Your teacher will add you.</div>
          <div style={{ marginTop: 10 }}>
            <button className="btn-secondary btn" onClick={onClose}>Close</button>
          </div>
        </>
      ) : (
        <>
          <p className="small muted" style={{ margin: '0 0 10px' }}>Type your full name so your teacher can add you to the roster.</p>
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={submit} disabled={state === 'sending' || !name.trim()}>Send</button>
            <button className="btn-secondary btn" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
