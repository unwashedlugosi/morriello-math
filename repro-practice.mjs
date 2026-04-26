import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGE: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

// Inject Max's session before app loads
await ctx.addInitScript((token) => {
  localStorage.setItem('mm-student-session', JSON.stringify({
    token,
    student: { id: 'd08ed713-1236-4888-836e-9bc71066b435', display_name: 'Max' },
    savedAt: Date.now(),
  }))
}, '8a329aa2-ac5e-4a79-9000-61240006416e')

await page.goto('https://morriello-math.vercel.app/?class=max-practice', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)

console.log('URL:', page.url())
console.log('TITLE:', await page.title())
console.log('BODY snippet:', (await page.textContent('body')).slice(0, 500))

// Look for "Start practice" button and click
const btn = await page.$('button:has-text("Start practice")')
if (btn) {
  console.log('Clicking Start practice...')
  await btn.click()
  await page.waitForTimeout(3000)
  console.log('AFTER CLICK BODY:', (await page.textContent('body')).slice(0, 1000))
} else {
  console.log('No Start practice button found')
}

console.log('--- ERRORS ---')
errors.forEach(e => console.log(e))
await browser.close()
