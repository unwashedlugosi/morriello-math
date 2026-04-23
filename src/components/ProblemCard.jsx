import { useEffect, useRef, useState } from 'react'
import CoordinateGrid from './CoordinateGrid.jsx'
import DataTable from './DataTable.jsx'
import LineGraph from './LineGraph.jsx'

export default function ProblemCard({ problem, onSubmit, locked }) {
  const [numberValue, setNumberValue] = useState('')
  const [orderedPair, setOrderedPair] = useState({ x: '', y: '' })
  const [plottedPoint, setPlottedPoint] = useState(null)
  const [choice, setChoice] = useState(null)
  const firstRef = useRef()

  useEffect(() => {
    setNumberValue('')
    setOrderedPair({ x: '', y: '' })
    setPlottedPoint(null)
    setChoice(null)
    setTimeout(() => firstRef.current?.focus?.(), 0)
  }, [problem?.id])

  if (!problem) return null

  function submit() {
    if (locked) return
    if (problem.inputType === 'number') {
      if (!numberValue.trim()) return
      onSubmit(numberValue)
    } else if (problem.inputType === 'ordered-pair') {
      const x = parseInt(orderedPair.x)
      const y = parseInt(orderedPair.y)
      if (isNaN(x) || isNaN(y)) return
      onSubmit({ x, y })
    } else if (problem.inputType === 'coordinate') {
      if (!plottedPoint) return
      onSubmit(plottedPoint)
    } else if (problem.inputType === 'choice') {
      if (!choice) return
      onSubmit(choice)
    }
  }

  return (
    <div className="card problem-card">
      <div className="problem-text">{problem.question}</div>

      {/* Visual aids */}
      {problem.grid && (
        <CoordinateGrid
          range={problem.grid.range}
          points={problem.grid.points || []}
          connect={problem.grid.connect || []}
          interactive={problem.inputType === 'coordinate' && !locked}
          plottedPoint={plottedPoint}
          onPlot={setPlottedPoint}
        />
      )}
      {problem.table && (
        <DataTable xLabel={problem.table.xLabel} yLabel={problem.table.yLabel} rows={problem.table.rows} />
      )}
      {problem.lineGraph && (
        <LineGraph {...problem.lineGraph} />
      )}

      {/* Inputs */}
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

      {problem.inputType === 'ordered-pair' && (
        <div className="ordered-pair-group">
          <span className="paren">(</span>
          <input
            ref={firstRef}
            className="input pair-cell"
            inputMode="numeric"
            placeholder="x"
            value={orderedPair.x}
            onChange={(e) => setOrderedPair({ ...orderedPair, x: e.target.value.replace(/\D/g, '') })}
            disabled={locked}
          />
          <span className="paren">,</span>
          <input
            className="input pair-cell"
            inputMode="numeric"
            placeholder="y"
            value={orderedPair.y}
            onChange={(e) => setOrderedPair({ ...orderedPair, y: e.target.value.replace(/\D/g, '') })}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={locked}
          />
          <span className="paren">)</span>
        </div>
      )}

      {problem.inputType === 'coordinate' && (
        <div className="coord-helper">
          {plottedPoint
            ? <span className="muted small">Tap the grid again to move the point.</span>
            : <span className="muted small">Tap a grid intersection to plot.</span>}
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
