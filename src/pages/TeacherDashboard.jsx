import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { TOPICS, TOPIC_LIST } from '../engine.js'

const MASTERY_COLOR = {
  mastered: '#15803d',
  learning: '#b45309',
  'needs-work': '#b91c1c',
  untested: '#9ca3af',
}
const MASTERY_LABEL = {
  mastered: 'Mastered',
  learning: 'Learning',
  'needs-work': 'Needs work',
  untested: '—',
}

export default function TeacherDashboard() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [teacher, setTeacher] = useState(null)
  const [klass, setKlass] = useState(null)
  const [roster, setRoster] = useState([])
  const [statsByStudent, setStatsByStudent] = useState({})
  const [progressByStudent, setProgressByStudent] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [drillStudent, setDrillStudent] = useState(null)

  const refreshRoster = useCallback(async (slug) => {
    const data = await api.listRoster(slug)
    setRoster(data.students)
  }, [])

  const refreshProgress = useCallback(async (classId) => {
    // Teacher RLS lets us read stats + progress for students in the class.
    // Fetch students then grab their stats + progress rows.
    const { data: studentRows } = await supabase
      .from('classroom_students')
      .select('id')
      .eq('class_id', classId)
      .is('archived_at', null)
    const ids = (studentRows || []).map((s) => s.id)
    if (ids.length === 0) { setStatsByStudent({}); setProgressByStudent({}); return }

    const [{ data: stats }, { data: progress }] = await Promise.all([
      supabase.from('classroom_student_stats').select('*').in('student_id', ids),
      supabase.from('classroom_student_progress').select('student_id, topic, mastery, attempts, correct_attempts, total_xp').in('student_id', ids),
    ])

    const statsMap = {}
    ;(stats || []).forEach((s) => { statsMap[s.student_id] = s })
    setStatsByStudent(statsMap)

    const progMap = {}
    ;(progress || []).forEach((p) => {
      if (!progMap[p.student_id]) progMap[p.student_id] = {}
      progMap[p.student_id][p.topic] = p
    })
    setProgressByStudent(progMap)
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
        await Promise.all([refreshRoster(init.class.slug), refreshProgress(init.class.id)])
        setStatus('ready')
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }
    boot()
  }, [nav, refreshRoster, refreshProgress])

  async function signOut() {
    await supabase.auth.signOut()
    nav('/teacher', { replace: true })
  }

  async function handleResetPin(studentId, name) {
    if (!confirm(`Reset ${name}'s PIN? They'll pick a new one next time they log in.`)) return
    try {
      await api.teacherResetPin(session.access_token, { studentId })
      await refreshRoster(klass.slug)
    } catch (err) { alert(err.message) }
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
  const classSummary = buildClassSummary(roster, statsByStudent, progressByStudent)
  const showWelcome = typeof window !== 'undefined' && localStorage.getItem('mm-welcome-dismissed') !== '1'

  function dismissWelcome() {
    localStorage.setItem('mm-welcome-dismissed', '1')
    // Force re-render
    setShowAdd((s) => s)
    setTeacher((t) => ({ ...t }))
  }

  return (
    <div className="page">
      <div className="topbar">
        <h2>{klass.name}</h2>
        <div className="right row">
          <span className="small muted">{teacher.email}</span>
          <button className="btn-secondary btn small" onClick={signOut}>Sign out</button>
        </div>
      </div>

      {showWelcome && (
        <div className="card welcome-card" style={{ maxWidth: 960, marginBottom: 20 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 18 }}>👋 Welcome to your class dashboard</h1>
            <button className="btn-secondary btn small" onClick={dismissWelcome}>Got it</button>
          </div>
          <ol className="welcome-steps">
            <li><strong>Add your students.</strong> Click "+ Add students" on the roster card and paste your class list, one name per line.</li>
            <li><strong>Share the link.</strong> Copy the student URL ({studentUrl}) and send it to your class — Google Classroom, email, write on the board. Kids tap their name and pick a 4-digit PIN the first time.</li>
            <li><strong>Watch progress.</strong> The "Student progress" table shows each kid's level, streak, and a color chip per topic: <span className="mastery-chip" style={{ background: '#15803d' }}></span> mastered, <span className="mastery-chip" style={{ background: '#b45309' }}></span> learning, <span className="mastery-chip" style={{ background: '#b91c1c' }}></span> needs work, <span className="mastery-chip" style={{ background: '#9ca3af' }}></span> hasn't tried yet.</li>
            <li><strong>Click any student row</strong> to see their mastery in detail and every problem they've answered today (great for parent conferences).</li>
            <li><strong>If a kid forgets their PIN</strong>, click "Reset PIN" on their row — they'll pick a new one next time they log in.</li>
          </ol>
        </div>
      )}

      <div className="dashboard">
        <div className="card">
          <div className="row-between">
            <h1 style={{ fontSize: 18, margin: 0 }}>Roster ({roster.length})</h1>
            <button className="btn" onClick={() => setShowAdd(true)}>+ Add students</button>
          </div>
          <p className="sub" style={{ marginTop: 4 }}>Click "Reset PIN" if a kid forgets theirs.</p>
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
                        <button className="btn-danger btn small" onClick={() => handleResetPin(s.id, s.display_name)}>Reset PIN</button>
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

          <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 4 }}>Class summary</h2>
          <ClassSummary summary={classSummary} total={roster.length} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 960, width: '100%', marginTop: 20 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Student progress</h1>
        <p className="sub" style={{ marginTop: 4 }}>Click a row for details and problem-by-problem history.</p>
        {roster.length === 0 ? (
          <p className="muted small">No students yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table progress-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Level</th>
                  <th>XP</th>
                  <th>Streak</th>
                  <th>Diagnostic</th>
                  {TOPIC_LIST.map((t) => (
                    <th key={t} title={TOPICS[t].name}>{TOPICS[t].name.split(' ')[0]}</th>
                  ))}
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => {
                  const st = statsByStudent[s.id]
                  const pr = progressByStudent[s.id] || {}
                  return (
                    <tr key={s.id} onClick={() => setDrillStudent({ ...s, stats: st, progress: pr })} style={{ cursor: 'pointer' }}>
                      <td>{s.display_name}</td>
                      <td>{st?.level ?? '—'}</td>
                      <td>{st?.total_xp ?? 0}</td>
                      <td>{st?.current_streak ?? 0} <span className="muted small">(best {st?.best_streak ?? 0})</span></td>
                      <td>
                        {st?.diagnostic_completed
                          ? <span style={{ color: 'var(--good)', fontSize: 13 }}>✓</span>
                          : <span className="muted small">—</span>}
                      </td>
                      {TOPIC_LIST.map((t) => {
                        const mastery = pr[t]?.mastery || 'untested'
                        return (
                          <td key={t}>
                            <span className="mastery-chip" style={{ background: MASTERY_COLOR[mastery] }} title={`${TOPICS[t].name}: ${MASTERY_LABEL[mastery]}`}></span>
                          </td>
                        )
                      })}
                      <td className="muted small">{st?.last_active ? formatRelative(st.last_active) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mastery-legend">
              <span><span className="mastery-chip" style={{ background: MASTERY_COLOR.mastered }}></span> mastered</span>
              <span><span className="mastery-chip" style={{ background: MASTERY_COLOR.learning }}></span> learning</span>
              <span><span className="mastery-chip" style={{ background: MASTERY_COLOR['needs-work'] }}></span> needs work</span>
              <span><span className="mastery-chip" style={{ background: MASTERY_COLOR.untested }}></span> untested</span>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentsDialog
          classId={klass.id}
          accessToken={session.access_token}
          onDone={async () => { setShowAdd(false); await refreshRoster(klass.slug) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {drillStudent && (
        <StudentDetailModal
          student={drillStudent}
          onClose={() => setDrillStudent(null)}
          onResetPin={async () => { await handleResetPin(drillStudent.id, drillStudent.display_name); setDrillStudent(null) }}
        />
      )}
    </div>
  )
}

function ClassSummary({ summary, total }) {
  if (total === 0) {
    return <p className="muted small">Will appear when your students start practicing.</p>
  }
  return (
    <div>
      <div className="stats-row">
        <div className="stat-cell">
          <div className="stat-value">{summary.diagnosticCompleted}/{total}</div>
          <div className="stat-label">Check-ins done</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{summary.totalXP}</div>
          <div className="stat-label">Total class XP</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{summary.active}</div>
          <div className="stat-label">Started practicing</div>
        </div>
      </div>
      {summary.weakTopics.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>Topics the class is struggling with:</div>
          <div className="row" style={{ gap: 6 }}>
            {summary.weakTopics.map((t) => (
              <span key={t.topic} className="topic-chip">
                {TOPICS[t.topic]?.name} <span className="muted">({t.struggling}/{total})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StudentDetailModal({ student, onClose, onResetPin }) {
  const [problems, setProblems] = useState(null)

  useEffect(() => {
    supabase
      .from('classroom_problem_results')
      .select('*')
      .eq('student_id', student.id)
      .order('answered_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setProblems(data || []))
  }, [student.id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h1 style={{ margin: 0 }}>{student.display_name}</h1>
          <button className="btn-secondary btn small" onClick={onClose}>Close</button>
        </div>
        <p className="sub" style={{ marginTop: 4 }}>
          Level {student.stats?.level ?? 1} · {student.stats?.total_xp ?? 0} XP · Best streak {student.stats?.best_streak ?? 0}
        </p>

        <h2 style={{ fontSize: 15, marginTop: 20, marginBottom: 8 }}>Topic mastery</h2>
        <div className="mastery-bars">
          {TOPIC_LIST.map((t) => {
            const p = student.progress[t]
            const mastery = p?.mastery || 'untested'
            const attempts = p?.attempts || 0
            const correct = p?.correct_attempts || 0
            const pct = attempts > 0 ? Math.round((correct / attempts) * 100) : 0
            return (
              <div key={t} className="mastery-bar-row">
                <div className="mastery-bar-label">{TOPICS[t].name}</div>
                <div className="mastery-bar-track">
                  <div className="mastery-bar-fill" style={{ width: `${pct}%`, background: MASTERY_COLOR[mastery] }} />
                </div>
                <div className="mastery-bar-meta small muted">
                  {attempts === 0 ? 'no attempts' : `${correct}/${attempts} (${pct}%) · ${MASTERY_LABEL[mastery].toLowerCase()}`}
                </div>
              </div>
            )
          })}
        </div>

        <h2 style={{ fontSize: 15, marginTop: 22, marginBottom: 8 }}>Recent problems ({problems?.length ?? 0})</h2>
        {problems === null ? (
          <p className="muted small">Loading…</p>
        ) : problems.length === 0 ? (
          <p className="muted small">No problems yet.</p>
        ) : (
          <div className="replay-list">
            {problems.map((p) => (
              <div key={p.id} className={`replay-item ${p.correct ? 'correct' : 'wrong'}`}>
                <div className="replay-header">
                  <span className="mark">{p.correct ? '✓' : '✗'}</span>
                  <span className="replay-topic">{TOPICS[p.topic]?.name || p.topic}</span>
                  <span className="muted small">{formatRelative(p.answered_at)}</span>
                </div>
                <div className="replay-q">{p.problem_text}</div>
                <div className="replay-ans">
                  {p.correct ? (
                    <>Answered <strong>{p.given_answer}</strong></>
                  ) : (
                    <>Said <strong>{p.given_answer || '—'}</strong>, correct was <strong>{p.correct_answer}</strong></>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          {student.has_pin && (
            <button className="btn-danger btn" onClick={onResetPin}>Reset PIN</button>
          )}
          <button className="btn-secondary btn" onClick={onClose}>Close</button>
        </div>
      </div>
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
    <div className="modal-overlay">
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

function buildClassSummary(roster, statsByStudent, progressByStudent) {
  let diagnosticCompleted = 0, totalXP = 0, active = 0
  const topicStruggling = {}
  TOPIC_LIST.forEach((t) => { topicStruggling[t] = 0 })

  roster.forEach((s) => {
    const st = statsByStudent[s.id]
    if (st?.diagnostic_completed) diagnosticCompleted += 1
    if (st?.last_active) active += 1
    if (st?.total_xp) totalXP += st.total_xp

    const pr = progressByStudent[s.id] || {}
    TOPIC_LIST.forEach((t) => {
      const m = pr[t]?.mastery
      if (m === 'needs-work') topicStruggling[t] += 1
    })
  })

  const weakTopics = TOPIC_LIST
    .map((t) => ({ topic: t, struggling: topicStruggling[t] }))
    .filter((x) => x.struggling >= Math.max(2, Math.ceil(roster.length * 0.3)))
    .sort((a, b) => b.struggling - a.struggling)

  return { diagnosticCompleted, totalXP, active, weakTopics }
}

function formatRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  return `${days}d ago`
}
