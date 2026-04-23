// Engine sanity test — runs every variant many times and validates shape +
// answer-checking. No external test framework; just runs and exits with
// non-zero on failure so it works in CI / npm scripts.
//
// Usage: node test/engine.test.js

import {
  TOPICS, TOPIC_LIST,
  generateDiagnostic, generateSessionProblem,
  checkProblemAnswer,
  calculateXP, getLevelForXP, getXPProgress, getStreakMessage,
  selectSessionTopic, updateTopicHistory, checkSlidingMastery,
} from '../src/engine.js'

const RUNS_PER_VARIANT = 50

let pass = 0, fail = 0
const failures = []

function check(label, cond, detail) {
  if (cond) {
    pass += 1
  } else {
    fail += 1
    failures.push(`${label}: ${detail || 'failed'}`)
  }
}

function validateProblemShape(p, label) {
  check(`${label}: has id`, typeof p?.id === 'string', `id was ${p?.id}`)
  check(`${label}: has topic`, TOPIC_LIST.includes(p?.topic), `topic was ${p?.topic}`)
  check(`${label}: has type`, typeof p?.type === 'string', `type was ${p?.type}`)
  check(`${label}: has difficulty 1 or 2`, [1, 2].includes(p?.difficulty), `difficulty was ${p?.difficulty}`)
  check(`${label}: has non-empty question`, typeof p?.question === 'string' && p.question.length > 0, `question was "${p?.question}"`)
  check(`${label}: explanation is array`, Array.isArray(p?.explanation), `explanation was ${typeof p?.explanation}`)
  check(`${label}: hint is string`, typeof p?.hint === 'string', `hint was ${p?.hint}`)

  const validInputs = ['number', 'choice', 'ordered-pair', 'coordinate']
  check(`${label}: inputType is valid`, validInputs.includes(p?.inputType), `inputType was ${p?.inputType}`)

  if (p?.inputType === 'choice') {
    check(`${label}: choice has choices array`, Array.isArray(p.choices) && p.choices.length >= 2, `choices was ${JSON.stringify(p.choices)}`)
    check(`${label}: answer is in choices`, p.choices?.includes(p.answer), `answer "${p.answer}" not in [${p.choices?.join(', ')}]`)
  }

  if (p?.inputType === 'number') {
    check(`${label}: answer is a number`, typeof p.answer === 'number' && !isNaN(p.answer), `answer was ${p.answer}`)
  }

  if (p?.inputType === 'ordered-pair' || p?.inputType === 'coordinate') {
    if (Array.isArray(p.answer)) {
      check(`${label}: array answer non-empty`, p.answer.length > 0, `array length ${p.answer.length}`)
      check(`${label}: array answer items have x/y`,
        p.answer.every((a) => typeof a?.x === 'number' && typeof a?.y === 'number'),
        `bad item: ${JSON.stringify(p.answer[0])}`)
    } else {
      check(`${label}: answer is {x,y}`,
        typeof p.answer?.x === 'number' && typeof p.answer?.y === 'number',
        `answer was ${JSON.stringify(p.answer)}`)
    }
  }
}

function validateAnswerChecker(p, label) {
  // The "correct" answer should pass
  let correctInput
  if (p.inputType === 'number') correctInput = String(p.answer)
  else if (p.inputType === 'choice') correctInput = p.answer
  else if (p.inputType === 'ordered-pair' || p.inputType === 'coordinate') {
    correctInput = Array.isArray(p.answer) ? p.answer[0] : p.answer
  }

  const correctResult = checkProblemAnswer(p, correctInput)
  check(`${label}: correct answer passes checkProblemAnswer`,
    correctResult === true, `got ${JSON.stringify(correctResult)} for ${JSON.stringify(correctInput)}`)

  // A clearly-wrong answer should not pass
  let wrongInput
  if (p.inputType === 'number') wrongInput = String((p.answer || 0) + 99999)
  else if (p.inputType === 'choice') {
    const others = p.choices.filter((c) => c !== p.answer)
    wrongInput = others[0] || 'NEVER_MATCHES'
  }
  else if (p.inputType === 'ordered-pair' || p.inputType === 'coordinate') {
    const expected = Array.isArray(p.answer) ? p.answer[0] : p.answer
    // Pick a far-off point not in any valid answer set
    let attempt = { x: -99, y: -99 }
    if (Array.isArray(p.answer)) {
      for (let i = 0; i < 100; i++) {
        const cand = { x: Math.floor(Math.random() * 100) + 50, y: Math.floor(Math.random() * 100) + 50 }
        if (!p.answer.some((a) => a.x === cand.x && a.y === cand.y)) { attempt = cand; break }
      }
    } else {
      attempt = { x: expected.x + 99, y: expected.y + 99 }
    }
    wrongInput = attempt
  }

  if (wrongInput != null) {
    const wrongResult = checkProblemAnswer(p, wrongInput)
    check(`${label}: wrong answer fails checkProblemAnswer`,
      wrongResult === false, `got ${JSON.stringify(wrongResult)} for ${JSON.stringify(wrongInput)}`)
  }
}

console.log('Engine sanity test\n')

// 1. Generators × variants × random seeds
for (const topic of TOPIC_LIST) {
  console.log(`Testing topic: ${topic} (${TOPICS[topic].name})`)
  // History fed in to simulate practice session state
  let history = {}
  for (let i = 0; i < RUNS_PER_VARIANT; i++) {
    for (const hard of [false, true]) {
      const p = generateSessionProblem(topic, history)
      const label = `${topic}/${hard ? 'hard' : 'easy'}/run${i}`
      validateProblemShape(p, label)
      validateAnswerChecker(p, label)
      // Roll history forward so deeper variants are exercised
      history = updateTopicHistory(history, topic, Math.random() < 0.7, hard ? 2 : 1)
    }
  }
}

// 2. Diagnostic
console.log('\nTesting diagnostic generation')
for (let i = 0; i < 10; i++) {
  const probs = generateDiagnostic()
  check(`diagnostic[${i}]: returns array`, Array.isArray(probs))
  check(`diagnostic[${i}]: covers all topics`,
    new Set(probs.map((p) => p.topic)).size === TOPIC_LIST.length,
    `topics: ${[...new Set(probs.map((p) => p.topic))].join(',')}`)
  probs.forEach((p, j) => {
    validateProblemShape(p, `diagnostic[${i}].problem[${j}]`)
    validateAnswerChecker(p, `diagnostic[${i}].problem[${j}]`)
  })
}

// 3. XP/Level/Streak helpers
console.log('\nTesting XP/Level/Streak helpers')
check('XP: correct first-try easy gives >= 5', calculateXP({ correct: true, difficulty: 1, firstTry: true, timeMs: 5000, streak: 1 }) >= 5)
check('XP: wrong gives 1', calculateXP({ correct: false, difficulty: 1, firstTry: true, timeMs: 5000, streak: 1 }) === 1)
check('Level for 0 XP is 1', getLevelForXP(0).level === 1)
check('Level for 30 XP is 2', getLevelForXP(30).level === 2)
check('Level for 1500 XP is Sage (9)', getLevelForXP(1500).level === 9)
check('XP progress at 0 has next', getXPProgress(0).next != null)
check('Streak msg at 5 = "On fire!"', getStreakMessage(5) === 'On fire!')
check('Streak msg at 0 = null', getStreakMessage(0) === null)

// 4. Mastery
console.log('\nTesting mastery transitions')
let h = {}
for (let i = 0; i < 8; i++) h = updateTopicHistory(h, 'plot-points', true, i % 2 === 0 ? 1 : 2)
check('Mastery after 8 correct (incl hard) = mastered', checkSlidingMastery(h, 'plot-points') === 'mastered')

let hWeak = {}
for (let i = 0; i < 5; i++) hWeak = updateTopicHistory(hWeak, 'plot-points', false, 1)
check('Mastery after 5 wrong = needs-work', checkSlidingMastery(hWeak, 'plot-points') === 'needs-work')

// 5. Topic selection
console.log('\nTesting topic selection')
const allUntested = {}
TOPIC_LIST.forEach((t) => { allUntested[t] = 'untested' })
const picks = new Set()
for (let i = 0; i < 50; i++) picks.add(selectSessionTopic(allUntested, {}, []))
check('Topic selector picks multiple topics over 50 runs', picks.size >= 3, `only saw ${picks.size}: ${[...picks].join(',')}`)

// REPORT
console.log(`\n${'─'.repeat(60)}`)
console.log(`Pass: ${pass}    Fail: ${fail}`)
if (fail > 0) {
  console.log('\nFAILURES:')
  failures.slice(0, 30).forEach((f) => console.log(`  ✗ ${f}`))
  if (failures.length > 30) console.log(`  ... and ${failures.length - 30} more`)
  process.exit(1)
}
console.log('\nAll checks passed ✓')
