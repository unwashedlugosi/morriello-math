import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function TeacherLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/teacher/dashboard', { replace: true })
    })
  }, [nav])

  async function send(e) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/teacher/dashboard` },
    })
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <div className="page">
        <div className="card">
          <h1>Check your email</h1>
          <p className="sub">We sent a sign-in link to <strong>{email}</strong>. Click it to open the dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Teacher sign-in</h1>
        <p className="sub">Enter your school email — we'll send a one-tap sign-in link.</p>
        <form onSubmit={send} className="stack">
          <input
            className="input"
            type="email"
            placeholder="you@greenvaleschool.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn" type="submit" disabled={status === 'sending' || !email}>
            {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
      </div>
    </div>
  )
}
