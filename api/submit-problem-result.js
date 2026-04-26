import { db, badRequest, unauthorized, serverError, readJson, resolveStudentFromSession } from './_utils.js'

const LEVELS = [0, 30, 75, 150, 250, 400, 600, 850, 1200]
const SI_THRESHOLDS = [5, 10, 15, 20, 25]

function computeLevel(xp) {
  let level = 1
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i + 1
  return level
}

function computeMastery(last8) {
  if (!Array.isArray(last8) || last8.length < 3) return 'untested'
  const last5 = last8.slice(-5)
  const correct5 = last5.filter((e) => e.correct).length
  const hardCorrect = last8.filter((e) => e.correct && e.difficulty >= 2).length
  if (correct5 >= 4 && hardCorrect >= 1) return 'mastered'
  if (correct5 >= 3) return 'learning'
  if (correct5 <= 1) return 'needs-work'
  return 'learning'
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return badRequest(res, 'POST only')
    const body = await readJson(req)
    const { token, practiceSessionId, result } = body || {}
    if (!token || !practiceSessionId || !result) return badRequest(res, 'Missing token, practiceSessionId, or result')
    const ctx = await resolveStudentFromSession(token)
    if (!ctx) return unauthorized(res, 'Session invalid')

    // Verify practice session belongs to this student
    const { data: ps } = await db
      .from('classroom_practice_sessions')
      .select('id, student_id, problems_count, correct_count, xp_earned, is_diagnostic')
      .eq('id', practiceSessionId)
      .maybeSingle()
    if (!ps || ps.student_id !== ctx.student.id) return unauthorized(res, 'Not your session')

    const xpAwarded = Number(result.xpAwarded) || 0

    // Insert problem result
    await db.from('classroom_problem_results').insert({
      practice_session_id: practiceSessionId,
      student_id: ctx.student.id,
      topic: result.topic,
      difficulty: result.difficulty,
      problem_text: result.problemText || '',
      correct_answer: String(result.correctAnswer ?? ''),
      given_answer: result.givenAnswer != null ? String(result.givenAnswer) : null,
      correct: !!result.correct,
      first_try: result.firstTry !== false,
      time_spent_ms: result.timeMs ?? null,
      xp_awarded: xpAwarded,
    })

    // Update practice_session aggregates
    await db
      .from('classroom_practice_sessions')
      .update({
        problems_count: (ps.problems_count || 0) + 1,
        correct_count: (ps.correct_count || 0) + (result.correct ? 1 : 0),
        xp_earned: (ps.xp_earned || 0) + xpAwarded,
      })
      .eq('id', practiceSessionId)

    // Update per-topic progress (sliding window)
    const { data: existingProgress } = await db
      .from('classroom_student_progress')
      .select('*')
      .eq('student_id', ctx.student.id)
      .eq('topic', result.topic)
      .maybeSingle()

    const prev = existingProgress || {
      attempts: 0,
      correct_attempts: 0,
      last_8_results: [],
      total_xp: 0,
    }
    const nextEntry = {
      correct: !!result.correct,
      difficulty: result.difficulty,
      firstTry: result.firstTry !== false,
      at: new Date().toISOString(),
    }
    const last8 = [...(prev.last_8_results || []), nextEntry].slice(-8)
    const mastery = computeMastery(last8)
    await db.from('classroom_student_progress').upsert(
      {
        student_id: ctx.student.id,
        topic: result.topic,
        attempts: (prev.attempts || 0) + 1,
        correct_attempts: (prev.correct_attempts || 0) + (result.correct ? 1 : 0),
        last_8_results: last8,
        mastery,
        total_xp: (prev.total_xp || 0) + xpAwarded,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,topic' }
    )

    // Update overall stats
    const { data: stats } = await db
      .from('classroom_student_stats')
      .select('*')
      .eq('student_id', ctx.student.id)
      .maybeSingle()
    const prevStats = stats || {
      total_xp: 0,
      level: 1,
      current_streak: 0,
      best_streak: 0,
      space_invader_unlocks: 0,
      next_space_invader_threshold: 5,
    }
    const newStreak = result.correct ? (prevStats.current_streak || 0) + 1 : 0
    const newTotalXp = (prevStats.total_xp || 0) + xpAwarded
    const newLevel = computeLevel(newTotalXp)
    const newBest = Math.max(prevStats.best_streak || 0, newStreak)

    // Space Invaders unlock logic — milestone-based on the CURRENT streak.
    // SI fires whenever the current streak crosses 5, 10, 15, 20, or 25.
    // Reset is automatic: when streak breaks, the next 5-in-a-row earns SI again.
    // (No persistent "lifetime cap" — the old threshold counter was getting
    //  pinned at 999 and silently blocking SI forever after a long run.)
    let unlocks = prevStats.space_invader_unlocks || 0
    let spaceInvaderUnlock = false
    if (!ps.is_diagnostic && result.correct && SI_THRESHOLDS.includes(newStreak)) {
      spaceInvaderUnlock = true
      unlocks += 1
    }
    // nextThreshold powers the "X more to unlock 👾" hint on the practice header.
    let nextThreshold = 999
    for (const m of SI_THRESHOLDS) { if (m > newStreak) { nextThreshold = m; break } }

    await db.from('classroom_student_stats').upsert(
      {
        student_id: ctx.student.id,
        total_xp: newTotalXp,
        level: newLevel,
        current_streak: newStreak,
        best_streak: newBest,
        space_invader_unlocks: unlocks,
        next_space_invader_threshold: nextThreshold,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' }
    )

    res.status(200).json({
      stats: {
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: newStreak,
        bestStreak: newBest,
        nextSpaceInvaderThreshold: nextThreshold,
      },
      topic: { topic: result.topic, mastery, last8 },
      spaceInvaderUnlock,
    })
  } catch (err) {
    serverError(res, err)
  }
}
