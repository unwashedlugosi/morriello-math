// End-to-end browser test for the student flow.
//
// Seeds a temporary class via the Supabase admin API, drives a real
// Chromium browser through pick-name → make-PIN → diagnostic, answers
// problems correctly using the test hook (window.__mm_currentProblem),
// then cleans up. Run with `npm run test:e2e`.

import { chromium } from 'playwright'

const BASE = process.env.E2E_BASE || 'https://morriello-math.vercel.app'
const SUPABASE_URL = 'https://dhwllgdxpeucldtmzhme.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRod2xsZ2R4cGV1Y2xkdG16aG1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzMjY1MywiZXhwIjoyMDg1ODA4NjUzfQ.CWaeSdJgqYFVNq4EQLYTo9w9WCXrW9qDhRQ4J8GUV5g'

const TEST_SLUG = `e2e-test-${Date.now()}`

async function pgRest(table, body, method = 'POST', returning = 'representation') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: `return=${returning}`,
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`${method} /rest/v1/${table} -> ${r.status}: ${t}`)
  }
  return r.status === 204 ? null : await r.json()
}

let pass = 0, fail = 0
const failures = []
function check(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(`${label}: ${detail || ''}`); console.log(`  ✗ ${label} — ${detail || ''}`) }
}

async function seedClass() {
  const email = `${TEST_SLUG}@test.local`
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPwd123!', email_confirm: true }),
  })
  if (!userResp.ok) throw new Error(`Auth user create failed: ${await userResp.text()}`)
  const user = await userResp.json()
  const authId = user.id

  const [teacher] = await pgRest('classroom_teachers', { auth_user_id: authId, email, display_name: 'E2E Test' })
  const [klass] = await pgRest('classroom_classes', { teacher_id: teacher.id, slug: TEST_SLUG, name: 'E2E Test Class' })
  await pgRest('classroom_students', [
    { class_id: klass.id, display_name: 'Alice E2E' },
    { class_id: klass.id, display_name: 'Bob E2E' },
  ])
  return { authId, slug: TEST_SLUG }
}

async function cleanup(authId) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
}

// Submit the correct answer based on the test-hook problem
async function submitCorrect(page) {
  const problem = await page.evaluate(() => window.__mm_currentProblem)
  if (!problem) throw new Error('No current problem on window — test hook not firing')
  const ans = problem.answer

  if (problem.inputType === 'number') {
    await page.fill('.problem-card input.input', String(ans))
  } else if (problem.inputType === 'choice') {
    await page.locator('.choice-btn').filter({ hasText: ans }).first().click()
  } else if (problem.inputType === 'ordered-pair') {
    const target = Array.isArray(ans) ? ans[0] : ans
    const inputs = page.locator('.pair-cell')
    await inputs.nth(0).fill(String(target.x))
    await inputs.nth(1).fill(String(target.y))
  } else if (problem.inputType === 'coordinate') {
    const target = Array.isArray(ans) ? ans[0] : ans
    // Compute click position from grid SVG (range × CELL pixels in viewBox)
    const range = problem.grid?.range || 8
    const box = await page.locator('.coord-grid').boundingBox()
    const PAD_LEFT_RATIO = 32 / (32 + range * 32 + 12)
    const PAD_TOP_RATIO = 12 / (12 + range * 32 + 28)
    const cellW = box.width * (32 / (32 + range * 32 + 12))
    const cellH = box.height * (32 / (12 + range * 32 + 28))
    const cx = box.x + box.width * PAD_LEFT_RATIO + target.x * cellW
    const cy = box.y + box.height * PAD_TOP_RATIO + (range - target.y) * cellH
    await page.mouse.click(cx, cy)
  }

  await page.locator('.problem-card .btn').filter({ hasText: /Check answer/i }).click()
  await page.waitForSelector('.feedback-card', { timeout: 5000 })
}

async function clickNext(page) {
  await page.locator('.feedback-card .btn').filter({ hasText: /Next/i }).click()
}

async function runTest() {
  console.log('Seeding test class…')
  const { authId, slug } = await seedClass()
  console.log(`  class slug: ${slug}, auth user: ${authId}`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  try {
    console.log('\nLoading student URL…')
    await page.goto(`${BASE}/?class=${slug}&test=1`)
    await page.waitForSelector('.roster-tile', { timeout: 10000 })
    check('Roster tiles render', (await page.locator('.roster-tile').count()) >= 2)

    console.log('\nPicking student + creating PIN…')
    await page.locator('.roster-tile').first().click()
    await page.waitForSelector('.pin-entry input', { timeout: 5000 })
    const pinInputs = page.locator('.pin-entry input')
    for (const d of '1234') await pinInputs.nth('1234'.indexOf(d)).fill(d)
    await page.locator('.btn').filter({ hasText: /Continue/i }).click()
    await page.waitForURL(/\/home/, { timeout: 10000 })
    check('After PIN setup, lands on /home', page.url().endsWith('/home'))

    console.log('\nStarting check-in (diagnostic)…')
    await page.locator('.btn').filter({ hasText: /Start check-in/i }).click()
    await page.waitForFunction(() => !!window.__mm_currentProblem, null, { timeout: 10000 })
    check('Diagnostic problem appears on screen', true)

    console.log('\nAnswering 3 diagnostic problems correctly…')
    for (let i = 0; i < 3; i++) {
      await submitCorrect(page)
      const fb = await page.evaluate(() => window.__mm_currentFeedback)
      check(`Problem ${i + 1}: feedback says correct`, fb?.correct === true, `feedback was ${JSON.stringify(fb)}`)
      await clickNext(page)
      await page.waitForTimeout(150)
    }

    console.log('\nReturning home (skip the rest of diagnostic)…')
    // Diagnostic auto-ends after 12 problems; for speed we just verify it's
    // still progressing by checking another problem appeared
    const stillRunning = await page.evaluate(() => !!window.__mm_currentProblem)
    check('Diagnostic still progressing after 3 correct', stillRunning)

    check('No console errors during run', consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(' | '))
  } finally {
    await browser.close()
    console.log('\nCleaning up test data…')
    await cleanup(authId)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Pass: ${pass}    Fail: ${fail}`)
  if (fail > 0) {
    console.log('\nFAILURES:')
    failures.forEach((f) => console.log(`  ✗ ${f}`))
    process.exit(1)
  }
  console.log('\nAll e2e checks passed ✓')
}

runTest().catch((err) => {
  console.error('Test crashed:', err)
  process.exit(1)
})
