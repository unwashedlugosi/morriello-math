// Dev/preview page: shows a sample of every problem variant the engine
// can generate, so we can visually verify rendering at a glance and spot
// any that look broken before kids see them.

import { useState } from 'react'
import { TOPICS, TOPIC_LIST, generateSessionProblem, updateTopicHistory } from '../engine.js'
import ProblemCard from '../components/ProblemCard.jsx'

const SAMPLES_PER_TOPIC = 12

function generateSamples(topic) {
  // Build up history so the harder variants are reachable, then sample
  // a mix of easy + hard runs. We dedupe by question text so the page
  // doesn't get cluttered with near-duplicates.
  let history = {}
  const samples = []
  const seenQuestions = new Set()
  let attempts = 0
  while (samples.length < SAMPLES_PER_TOPIC && attempts < SAMPLES_PER_TOPIC * 6) {
    attempts += 1
    // Roll history to mix difficulty selection
    const correct = Math.random() < 0.6
    history = updateTopicHistory(history, topic, correct, samples.length % 2 === 0 ? 1 : 2)
    const p = generateSessionProblem(topic, history)
    const key = p.question.replace(/\d+/g, '#').slice(0, 80)
    if (seenQuestions.has(key)) continue
    seenQuestions.add(key)
    samples.push(p)
  }
  return samples
}

export default function DevPreview() {
  const [topicSamples, setTopicSamples] = useState(() => {
    const out = {}
    TOPIC_LIST.forEach((t) => { out[t] = generateSamples(t) })
    return out
  })

  function regenerate(topic) {
    setTopicSamples((prev) => ({ ...prev, [topic]: generateSamples(topic) }))
  }

  function regenerateAll() {
    const out = {}
    TOPIC_LIST.forEach((t) => { out[t] = generateSamples(t) })
    setTopicSamples(out)
  }

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <div className="topbar">
        <h2>Engine preview · all variants</h2>
        <div className="right row">
          <span className="small muted">Dev only — not linked from the app</span>
          <button className="btn-secondary btn small" onClick={regenerateAll}>Regenerate all</button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 720 }}>
        {TOPIC_LIST.map((topic) => (
          <div key={topic} className="card" style={{ marginBottom: 24, maxWidth: 'none' }}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h1 style={{ fontSize: 18, margin: 0 }}>{TOPICS[topic].name}</h1>
              <div className="row" style={{ gap: 8 }}>
                <span className="muted small">{topicSamples[topic].length} samples</span>
                <button className="btn-secondary btn small" onClick={() => regenerate(topic)}>Regenerate</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {topicSamples[topic].map((p) => (
                <PreviewProblem key={p.id} problem={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewProblem({ problem }) {
  const expected = Array.isArray(problem.answer)
    ? `e.g. (${problem.answer[0]?.x}, ${problem.answer[0]?.y})`
    : typeof problem.answer === 'object'
    ? `(${problem.answer.x}, ${problem.answer.y})`
    : String(problem.answer)

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fafbff' }}>
      <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        <span className="progress-pill" style={{ fontSize: 10 }}>diff {problem.difficulty}</span>
        <span className="progress-pill" style={{ fontSize: 10 }}>{problem.inputType}</span>
        <span className="progress-pill" style={{ fontSize: 10 }}>{problem.type}</span>
      </div>
      <ProblemCard problem={problem} onSubmit={() => {}} locked={true} />
      <div className="small muted" style={{ marginTop: 8 }}>
        <strong>Answer:</strong> {expected}
      </div>
    </div>
  )
}
