import { useEffect, useState } from 'react'
import {
  TOPICS, TOPIC_LIST,
  generateDiagnostic, generateSessionProblem, selectSessionTopic,
  checkProblemAnswer, calculateXP, getStreakMessage,
} from '../engine.js'
import { api } from '../lib/api.js'
import ProblemCard from './ProblemCard.jsx'
import { launchSpaceInvaders } from '../space-invaders.js'

function formatAnswer(problem, raw) {
  if (!problem) return String(raw ?? '')
  if (problem.inputType === 'ordered-pair' || problem.inputType === 'coordinate') {
    if (raw && typeof raw === 'object' && raw.x != null) return `(${raw.x}, ${raw.y})`
    return String(raw)
  }
  return String(raw ?? '')
}

const SESSION_CAP = 15 // regular session length

export default function PracticeFlow({ token, isDiagnostic, student, initialState, onDone }) {
  const [practiceSessionId, setPracticeSessionId] = useState(null)
  const [problem, setProblem] = useState(null)
  const [started, setStarted] = useState(Date.now())
  const [streak, setStreak] = useState(0)
  const [xpGained, setXpGained] = useState(0)
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null) // { correct, explanation, streakMsg, problemShown }
  const [diagProblems, setDiagProblems] = useState([])
  const [diagIdx, setDiagIdx] = useState(0)
  const [recentTopics, setRecentTopics] = useState([])
  const [topicHistory, setTopicHistory] = useState({})
  const [topicMastery, setTopicMastery] = useState({})
  const [error, setError] = useState(null)
  const [finished, setFinished] = useState(false)

  // Seed mastery + history from server state (for practice, not diagnostic)
  useEffect(() => {
    if (!initialState?.topicProgress) return
    const mastery = {}
    const history = {}
    TOPIC_LIST.forEach((t) => {
      const tp = initialState.topicProgress[t]
      mastery[t] = tp?.mastery || 'untested'
      if (tp) {
        const results = (tp.last_8_results || []).map((r) => !!r.correct)
        let easy = 0, hard = 0
        ;(tp.last_8_results || []).forEach((r) => {
          if (r.correct) { if (r.difficulty >= 2) hard += 1; else easy += 1 }
        })
        history[t] = {
          results,
          easy_correct: easy,
          hard_correct: hard,
          total: tp.attempts || 0,
        }
      }
    })
    setTopicMastery(mastery)
    setTopicHistory(history)
  }, [initialState])

  // Kick off the session
  useEffect(() => {
    async function go() {
      try {
        const { practiceSession } = await api.startSession({ token, isDiagnostic })
        setPracticeSessionId(practiceSession.id)
        if (isDiagnostic) {
          const probs = generateDiagnostic()
          setDiagProblems(probs)
          setProblem(probs[0])
        } else {
          nextPracticeProblem({}, {})
        }
        setStarted(Date.now())
      } catch (err) {
        setError(err.message)
      }
    }
    go()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isDiagnostic])

  function nextPracticeProblem(historyNow, recentNow) {
    const history = historyNow && Object.keys(historyNow).length ? historyNow : topicHistory
    const recent = recentNow || recentTopics
    const mastery = topicMastery
    const topic = selectSessionTopic(mastery, history, recent)
    const p = generateSessionProblem(topic, history)
    setProblem(p)
    setStarted(Date.now())
    setRecentTopics([...recent, topic].slice(-4))
  }

  async function handleSubmit(answerRaw) {
    if (!problem || feedback) return
    const timeMs = Date.now() - started
    const checkResult = checkProblemAnswer(problem, answerRaw)
    const correct = checkResult === true
    const difficulty = problem.difficulty || 1
    const firstTry = true
    const newStreak = correct ? streak + 1 : 0

    const xpAwarded = isDiagnostic
      ? 0
      : calculateXP({ correct, difficulty, firstTry, timeMs, streak: newStreak })

    const displayAnswer = formatAnswer(problem, answerRaw)
    const displayCorrect = formatAnswer(problem, problem.answer)

    // Send to server
    let apiRes = null
    try {
      apiRes = await api.submitProblemResult({
        token,
        practiceSessionId,
        result: {
          topic: problem.topic,
          difficulty,
          problemText: problem.question,
          correctAnswer: displayCorrect,
          givenAnswer: displayAnswer,
          correct,
          firstTry,
          timeMs,
          xpAwarded,
        },
      })
    } catch (err) {
      setError(err.message)
      return
    }

    // Update local state
    setStreak(newStreak)
    setXpGained(xpGained + xpAwarded)
    const nextResults = [...results, { topic: problem.topic, correct }]
    setResults(nextResults)

    // Update topic history locally for next practice pick
    const updatedHistory = { ...topicHistory }
    const t = problem.topic
    const prev = updatedHistory[t] || { results: [], easy_correct: 0, hard_correct: 0, total: 0 }
    updatedHistory[t] = {
      results: [...prev.results.slice(-9), correct],
      easy_correct: prev.easy_correct + (correct && difficulty < 2 ? 1 : 0),
      hard_correct: prev.hard_correct + (correct && difficulty >= 2 ? 1 : 0),
      total: prev.total + 1,
    }
    setTopicHistory(updatedHistory)

    setFeedback({
      correct,
      checkResult,
      explanation: problem.explanation,
      hint: problem.hint,
      streakMsg: getStreakMessage(newStreak),
      shown: displayAnswer,
      correctAns: displayCorrect,
      spaceInvaderUnlock: apiRes?.spaceInvaderUnlock,
    })
  }

  async function handleContinue() {
    const triggerSI = !isDiagnostic && feedback?.spaceInvaderUnlock
    const siStreak = streak

    function proceed() {
      if (isDiagnostic) {
        const nextIdx = diagIdx + 1
        if (nextIdx >= diagProblems.length) {
          return endSession()
        }
        setDiagIdx(nextIdx)
        setProblem(diagProblems[nextIdx])
        setStarted(Date.now())
        return
      }
      if (results.length >= SESSION_CAP) {
        return endSession()
      }
      nextPracticeProblem(topicHistory, recentTopics)
    }

    setFeedback(null)

    if (triggerSI) {
      const label = `${siStreak}-IN-A-ROW!`
      launchSpaceInvaders(() => proceed(), label, student?.id)
      return
    }
    proceed()
  }

  async function endSession() {
    setProblem(null)
    setFinished(true)
    try {
      await api.endSession({ token, practiceSessionId })
    } catch (err) {
      // non-fatal for UI
    }
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h1>Something went wrong</h1>
          <div className="alert alert-error">{error}</div>
          <button className="btn" onClick={onDone}>Back</button>
        </div>
      </div>
    )
  }

  if (finished) {
    const total = results.length
    const correct = results.filter((r) => r.correct).length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="page">
        <div className="card">
          <h1>{isDiagnostic ? 'Check-in complete!' : 'Nice work.'}</h1>
          <p className="sub">
            {correct} out of {total} correct ({pct}%).
            {!isDiagnostic && xpGained > 0 ? ` Earned ${xpGained} XP.` : ''}
          </p>
          <button className="btn" style={{ width: '100%' }} onClick={onDone}>Back home</button>
        </div>
      </div>
    )
  }

  const progress = isDiagnostic
    ? `${diagIdx + 1} of ${diagProblems.length || '…'}`
    : `${results.length + 1} of ${SESSION_CAP}`

  return (
    <div className="page">
      <div className="practice-header">
        <div className="progress-pill">{progress}</div>
        {!isDiagnostic && (
          <>
            <div className="progress-pill">🔥 {streak}</div>
            <div className="progress-pill">+{xpGained} XP</div>
          </>
        )}
        {problem && (
          <div className="progress-pill topic-pill">
            {TOPICS[problem.topic]?.name || problem.topic}
          </div>
        )}
      </div>

      {feedback ? (
        <FeedbackCard feedback={feedback} onContinue={handleContinue} />
      ) : (
        <ProblemCard problem={problem} onSubmit={handleSubmit} locked={false} />
      )}
    </div>
  )
}

function FeedbackCard({ feedback, onContinue }) {
  const heading = feedback.correct ? (feedback.streakMsg || 'Correct!') : 'Not quite.'
  return (
    <div className={`card feedback-card ${feedback.correct ? 'correct' : 'wrong'}`}>
      <h1>{heading}</h1>
      {!feedback.correct && (
        <p className="sub">
          You answered <strong>{feedback.shown}</strong>. The correct answer is <strong>{feedback.correctAns}</strong>.
        </p>
      )}
      {feedback.explanation && feedback.explanation.length > 0 && (
        <div className="explanation-box">
          {feedback.explanation.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={onContinue}>
        Next
      </button>
    </div>
  )
}
