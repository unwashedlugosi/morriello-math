import { useEffect, useRef, useState } from 'react'

export default function PinPad({ onSubmit }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const refs = [useRef(), useRef(), useRef(), useRef()]
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { refs[0].current?.focus() }, [])

  function setDigit(i, v) {
    if (!/^[0-9]?$/.test(v)) return
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 3) refs[i + 1].current?.focus()
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
    if (e.key === 'Enter') submit()
  }

  async function submit() {
    if (submitting) return
    const pin = digits.join('')
    if (pin.length !== 4) return
    setSubmitting(true)
    try {
      await onSubmit(pin)
    } finally {
      setSubmitting(false)
    }
  }

  const complete = digits.every((d) => /^\d$/.test(d))

  return (
    <div>
      <div className="pin-entry">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
            onKeyDown={(e) => onKeyDown(i, e)}
          />
        ))}
      </div>
      <button className="btn" style={{ width: '100%' }} onClick={submit} disabled={!complete || submitting}>
        {submitting ? 'Checking…' : 'Continue'}
      </button>
    </div>
  )
}
