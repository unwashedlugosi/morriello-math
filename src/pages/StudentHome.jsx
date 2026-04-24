import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { loadSession, clearSession } from '../lib/session.js'
import { TOPICS, TOPIC_LIST } from '../engine.js'
import PracticeFlow from '../components/PracticeFlow.jsx'

const MASTERY_COLOR = {
  mastered: '#15803d',
  learning: '#b45309',
  'needs-work': '#b91c1c',
  untested: '#9ca3af',
}
const MASTERY_LABEL = {
  mastered: 'Got it 💪',
  learning: 'Getting there',
  'needs-work': 'Keep practicing',
  untested: 'Haven\'t tried yet',
}

export default function StudentHome() {
  const nav = useNavigate()
  const [state, setState] = useState(null)
  const [token, setToken] = useState(null)
  const [mode, setMode] = useState('home') // home | diagnostic | practice

  useEffect(() => {
    const s = loadSession()
    if (!s?.token) { nav('/', { replace: true }); return }
    setToken(s.token)
    api.studentState(s.token)
      .then((res) => setState(res))
      .catch(() => { clearSession(); nav('/', { replace: true }) })
  }, [nav])

  async function signOut() {
    if (token) await api.studentLogout(token).catch(() => {})
    clearSession()
    nav('/', { replace: true })
  }

  if (!state) {
    return <div className="page"><p className="muted">Loading…</p></div>
  }

  if (mode === 'diagnostic') {
    return (
      <PracticeFlow
        token={token}
        isDiagnostic={true}
        student={state.student}
        initialState={state}
        onDone={async () => {
          const res = await api.studentState(token)
          setState(res)
          setMode('home')
        }}
      />
    )
  }

  if (mode === 'practice') {
    return (
      <PracticeFlow
        token={token}
        isDiagnostic={false}
        student={state.student}
        initialState={state}
        onDone={async () => {
          const res = await api.studentState(token)
          setState(res)
          setMode('home')
        }}
      />
    )
  }

  const diagDone = state.stats?.diagnostic_completed
  const totalXp = state.stats?.total_xp || 0
  const level = state.stats?.level || 1
  const best = state.stats?.best_streak || 0

  return (
    <div className="page">
      <div className="card">
        <div className="row-between" style={{ marginBottom: 18 }}>
          <span className="muted small">Hi, {state.student.display_name} 👋</span>
        </div>

        {!diagDone ? (
          <>
            <h1>Let's see where you are.</h1>
            <p className="sub">12 quick questions — don't worry about getting them all right. This helps us pick the right practice for you.</p>
            <button className="btn big-btn" style={{ width: '100%' }} onClick={() => setMode('diagnostic')}>
              Let's go →
            </button>
          </>
        ) : (
          <>
            <h1>Ready to practice?</h1>
            <p className="sub">Every problem makes you stronger. Aim for a streak — 5 in a row unlocks a surprise.</p>
            <div className="stats-row">
              <Stat label="Level" value={level} />
              <Stat label="XP" value={totalXp} />
              <Stat label="Best streak" value={best} />
            </div>
            <button className="btn big-btn" style={{ width: '100%', marginTop: 16 }} onClick={() => setMode('practice')}>
              Start practice →
            </button>
            <ProgressSummary topicProgress={state.topicProgress || {}} />
          </>
        )}

        <button className="btn-secondary btn done-btn" onClick={signOut}>
          I'm done — sign out
        </button>
      </div>
    </div>
  )
}

function ProgressSummary({ topicProgress }) {
  const rows = TOPIC_LIST.map((t) => {
    const p = topicProgress[t]
    return {
      topic: t,
      name: TOPICS[t].name,
      mastery: p?.mastery || 'untested',
      attempts: p?.attempts || 0,
      correct: p?.correct_attempts || 0,
    }
  })

  const mastered = rows.filter((r) => r.mastery === 'mastered')
  const needsWork = rows.filter((r) => r.mastery === 'needs-work')
  const totalProblems = rows.reduce((s, r) => s + r.attempts, 0)

  if (totalProblems === 0) {
    return null // nothing meaningful to show before they've practiced
  }

  return (
    <div className="progress-summary">
      <h2 className="progress-summary-h">How am I doing?</h2>

      {(mastered.length > 0 || needsWork.length > 0) && (
        <div className="progress-blurb">
          {mastered.length > 0 && (
            <p>
              <strong>You've got it 💪 :</strong>{' '}
              {mastered.map((r) => r.name).join(', ')}.
            </p>
          )}
          {needsWork.length > 0 && (
            <p>
              <strong>Keep practicing:</strong>{' '}
              {needsWork.map((r) => r.name).join(', ')}.
            </p>
          )}
        </div>
      )}

      <ul className="topic-progress-list">
        {rows.map((r) => (
          <li key={r.topic}>
            <span className="mastery-chip" style={{ background: MASTERY_COLOR[r.mastery] }}></span>
            <span className="topic-name">{r.name}</span>
            <span className="topic-status muted small">{MASTERY_LABEL[r.mastery]}{r.attempts > 0 ? ` · ${r.correct}/${r.attempts}` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat-cell">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
