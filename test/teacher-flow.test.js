// Teacher magic-link flow test.
//
// Generates a real Supabase magic link via the admin API (no email sent),
// drives Chromium through the redirect → dashboard → roster paste → share
// link verification. Cleans up the test teacher afterward so the
// 'morriello-math' slug stays free for Ginger's first sign-in.
//
// Run with `npm run test:teacher`.

import { chromium } from 'playwright'

const BASE = process.env.E2E_BASE || 'https://morriello-math.vercel.app'
const SUPABASE_URL = 'https://dhwllgdxpeucldtmzhme.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRod2xsZ2R4cGV1Y2xkdG16aG1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzMjY1MywiZXhwIjoyMDg1ODA4NjUzfQ.CWaeSdJgqYFVNq4EQLYTo9w9WCXrW9qDhRQ4J8GUV5g'

const TEST_EMAIL = `teacher-flow-${Date.now()}@test.local`

let pass = 0, fail = 0
const failures = []
function check(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(`${label}: ${detail || ''}`); console.log(`  ✗ ${label} — ${detail || ''}`) }
}

async function adminFetch(path, body, method = 'POST') {
  const r = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`${method} ${path} -> ${r.status}: ${t}`)
  }
  return r.status === 204 ? null : await r.json()
}

async function pgRest(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  return await r.json()
}

async function deleteCascading(authId) {
  // Delete the auth user; classroom_teachers cascades, then class, students, etc.
  await adminFetch(`/admin/users/${authId}`, null, 'DELETE')
}

async function runTest() {
  console.log(`Generating magic link for ${TEST_EMAIL}…`)
  // Create user first (admin API doesn't auto-create on generate_link sometimes)
  const user = await adminFetch('/admin/users', {
    email: TEST_EMAIL,
    password: 'TestPwd123!',
    email_confirm: true,
  })
  const authId = user.id
  console.log(`  user: ${authId}`)

  // Generate a magic link redirect to the dashboard.
  // Supabase admin API expects redirect_to at the top level (not nested in options).
  const linkResp = await adminFetch('/admin/generate_link', {
    type: 'magiclink',
    email: TEST_EMAIL,
    redirect_to: `${BASE}/teacher/dashboard`,
  })
  const actionLink = linkResp?.action_link || linkResp?.properties?.action_link
  if (!actionLink) {
    console.error('No action link in response:', linkResp)
    await deleteCascading(authId)
    process.exit(1)
  }
  console.log(`  link: ${actionLink.slice(0, 60)}…`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  try {
    console.log('\nClicking magic link…')
    await page.goto(actionLink)
    // Wait for either dashboard load or error
    await page.waitForURL(/\/teacher\/dashboard/, { timeout: 15000 })
    check('Magic link redirected to /teacher/dashboard', page.url().includes('/teacher/dashboard'))

    console.log('\nWaiting for dashboard to boot…')
    await page.waitForSelector('.topbar h2', { timeout: 15000 })
    const className = await page.locator('.topbar h2').textContent()
    check('Class name appears in topbar', !!className && className.length > 0, `class name: "${className}"`)

    console.log('\nChecking welcome card…')
    const welcomeVisible = await page.locator('.welcome-card').count()
    check('Welcome card shown on first load', welcomeVisible === 1)

    console.log('\nAdding test roster (3 students)…')
    await page.locator('.btn').filter({ hasText: /\+ Add students/i }).click()
    await page.waitForSelector('textarea.input', { timeout: 5000 })
    await page.locator('textarea.input').fill('Alpha\nBeta\nGamma')
    await page.locator('.btn').filter({ hasText: /Save/i }).click()
    await page.waitForTimeout(1500)
    const rowCount = await page.locator('.progress-table tbody tr').count()
    check('Roster table shows 3 students after add', rowCount === 3, `actually had ${rowCount} rows`)

    console.log('\nVerifying share URL block is present…')
    const shareBlock = await page.locator('.mono').first().textContent()
    check('Share URL is shown', shareBlock.startsWith(BASE), `URL: ${shareBlock}`)

    console.log('\nClicking a student row to drill in…')
    await page.locator('.progress-table tbody tr').first().click()
    await page.waitForSelector('.modal-card', { timeout: 5000 })
    check('Student detail modal opens', true)
    await page.locator('.modal-card .btn-secondary').filter({ hasText: /Close/i }).first().click()

    check('No console errors during run', consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(' | '))
  } finally {
    await browser.close()
    console.log('\nCleaning up test teacher (cascades to class + students + sessions)…')
    await deleteCascading(authId)
    // Verify cleanup
    const remaining = await pgRest('classroom_teachers', `email=eq.${encodeURIComponent(TEST_EMAIL)}`)
    console.log(`  remaining teacher rows for test email: ${remaining.length}`)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Pass: ${pass}    Fail: ${fail}`)
  if (fail > 0) {
    console.log('\nFAILURES:')
    failures.forEach((f) => console.log(`  ✗ ${f}`))
    process.exit(1)
  }
  console.log('\nTeacher flow OK ✓')
}

runTest().catch((err) => {
  console.error('Test crashed:', err)
  process.exit(1)
})
