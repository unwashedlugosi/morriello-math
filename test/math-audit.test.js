import {
  TOPIC_LIST, generateSessionProblem, checkProblemAnswer,
} from '/Users/davekoch/Documents/Claude Code Projects/Current/morriello-math/src/engine.js'

let total = 0, bad = 0
const SAMPLES = 1000
for (const topic of TOPIC_LIST) {
  for (const hard of [false, true]) {
    for (let i = 0; i < SAMPLES; i++) {
      const p = generateSessionProblem(topic, hard ? { [topic]: { results: [true,true,true], easy_correct: 5, hard_correct: 3, total: 8 } } : {})
      total++
      // For array-answer problems, validate ONE element. For others, pass answer directly.
      let probe = p.answer
      if (Array.isArray(p.answer)) probe = p.answer[0]
      const passed = checkProblemAnswer(p, probe)
      if (passed !== true) {
        console.log(`[${topic}/${hard?'hard':'easy'}] CHECK FAIL: q="${(p.question||'').slice(0,80)}" answer=${JSON.stringify(p.answer)} probe=${JSON.stringify(probe)}`)
        bad++
      }
    }
  }
}
console.log(`\n${total} problems audited. Failures: ${bad}.`)
