import { useEffect, useRef, useState } from 'react'

export default function ProblemCard({ problem, onSubmit, locked }) {
  const [numberValue, setNumberValue] = useState('')
  const [frac, setFrac] = useState({ whole: '', num: '', den: '' })
  const [choice, setChoice] = useState(null)
  const firstRef = useRef()

  useEffect(() => {
    setNumberValue('')
    setFrac({ whole: '', num: '', den: '' })
    setChoice(null)
    setTimeout(() => firstRef.current?.focus?.(), 0)
  }, [problem?.id])

  if (!problem) return null

  function submit() {
    if (locked) return
    if (problem.inputType === 'number') {
      if (!numberValue.trim()) return
      onSubmit(numberValue)
    } else if (problem.inputType === 'fraction') {
      onSubmit(frac)
    } else if (problem.inputType === 'choice') {
      if (!choice) return
      onSubmit(choice)
    }
  }

  return (
    <div className="card problem-card">
      <div className="problem-text">{problem.question}</div>

      {problem.inputType === 'number' && (
        <input
          ref={firstRef}
          className="input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={numberValue}
          onChange={(e) => setNumberValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={locked}
          placeholder="Your answer"
          style={{ fontSize: 22, fontWeight: 600, textAlign: 'center' }}
        />
      )}

      {problem.inputType === 'fraction' && (
        <div className="frac-input-group">
          <input
            ref={firstRef}
            className="input frac-cell"
            inputMode="numeric"
            placeholder="whole"
            value={frac.whole}
            onChange={(e) => setFrac({ ...frac, whole: e.target.value.replace(/\D/g, '') })}
            disabled={locked}
          />
          <div className="frac-vertical">
            <input
              className="input frac-cell"
              inputMode="numeric"
              placeholder="num"
              value={frac.num}
              onChange={(e) => setFrac({ ...frac, num: e.target.value.replace(/\D/g, '') })}
              disabled={locked}
            />
            <div className="frac-line" />
            <input
              className="input frac-cell"
              inputMode="numeric"
              placeholder="den"
              value={frac.den}
              onChange={(e) => setFrac({ ...frac, den: e.target.value.replace(/\D/g, '') })}
              disabled={locked}
            />
          </div>
        </div>
      )}

      {problem.inputType === 'choice' && (
        <div className="choice-grid">
          {problem.choices.map((c) => (
            <button
              key={c}
              className={`choice-btn ${choice === c ? 'selected' : ''}`}
              onClick={() => setChoice(c)}
              disabled={locked}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <button
        className="btn"
        style={{ width: '100%', marginTop: 16 }}
        onClick={submit}
        disabled={locked}
      >
        Check answer
      </button>
    </div>
  )
}
