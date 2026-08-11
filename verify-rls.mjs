// Verify the RLS read policies: an employee must not be able to read data
// outside their own projects via a direct database connection, AND the
// platform itself must still work normally for every role.
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'd:/Work/Samnan'
const BASE = 'https://samnan-platform.vercel.app'
const USERS = {
  admin: { email: 'test-rls-admin@tfco.sa', pass: 'RlsChk#2026a', role: 'admin', name: 'RLS Admin' },
  coordinator: { email: 'test-rls-pm@tfco.sa', pass: 'RlsChk#2026c', role: 'coordinator', name: 'RLS PM' },
  sales: { email: 'test-rls-sales@tfco.sa', pass: 'RlsChk#2026s', role: 'sales_engineer', name: 'RLS Sales' },
  install: { email: 'test-rls-inst@tfco.sa', pass: 'RlsChk#2026i', role: 'installation', name: 'RLS Inst' },
}

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS ' : 'FAIL '} ${name}${detail ? ' — ' + detail : ''}`)
}

async function drop(email) {
  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 })
  const u = data?.users?.find(x => x.email === email)
  if (!u) return
  await svc.from('activity_log').delete().eq('user_id', u.id)
  await svc.from('profiles').delete().eq('id', u.id)
  await svc.auth.admin.deleteUser(u.id)
}
async function mk(u) {
  await drop(u.email)
  const { data } = await svc.auth.admin.createUser({
    email: u.email, password: u.pass, email_confirm: true,
    user_metadata: { full_name: u.name, role: u.role },
  })
  await svc.from('profiles').upsert({ id: data.user.id, full_name: u.name, role: u.role, is_active: true })
  return data.user.id
}

const ids = {}
for (const [k, u] of Object.entries(USERS)) ids[k] = await mk(u)

// Two temp projects: one assigned to the sales user, one to nobody
const { data: mine } = await svc.from('projects').insert({
  client_name: 'rls-mine-client', project_name: 'rls-mine-project',
  status: 'active', total_amount: 500, sales_engineer_id: ids.sales,
}).select('id').single()
const { data: theirs } = await svc.from('projects').insert({
  client_name: 'rls-other-client', project_name: 'rls-other-project',
  status: 'active', total_amount: 900,
}).select('id').single()
await svc.from('payments').insert([
  { project_id: mine.id, type: 'upfront', amount: 500, paid_amount: 0, status: 'pending' },
  { project_id: theirs.id, type: 'upfront', amount: 900, paid_amount: 0, status: 'pending' },
])
const tempProjects = [mine.id, theirs.id]

const browser = await chromium.launch({ channel: 'chrome' })
try {
  // ── A. Direct database access as a sales engineer ──
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  await anon.auth.signInWithPassword({ email: USERS.sales.email, password: USERS.sales.pass })

  const projRead = await anon.from('projects').select('id, project_name')
  const names = (projRead.data ?? []).map(p => p.project_name)
  check('sales: direct read returns ONLY their own projects',
    names.includes('rls-mine-project') && !names.includes('rls-other-project'),
    `${names.length} project(s) visible`)

  const payRead = await anon.from('payments').select('id, project_id')
  const foreign = (payRead.data ?? []).filter(p => p.project_id === theirs.id).length
  check('sales: cannot read another project\'s payments', foreign === 0,
    `${payRead.data?.length ?? 0} payment(s) visible, ${foreign} foreign`)

  const notesRead = await anon.from('personal_notes').select('id, owner_id')
  const othersNotes = (notesRead.data ?? []).filter(n => n.owner_id !== ids.sales).length
  check('sales: cannot read other people\'s personal notebooks', othersNotes === 0)

  // ── B. Manager still sees everything (must not be over-restricted) ──
  const anonPm = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  await anonPm.auth.signInWithPassword({ email: USERS.coordinator.email, password: USERS.coordinator.pass })
  const pmProjects = await anonPm.from('projects').select('id')
  check('coordinator: still reads the whole portfolio', (pmProjects.data?.length ?? 0) >= 35,
    `${pmProjects.data?.length ?? 0} projects`)

  // ── C. The platform itself still works for every role ──
  for (const [key, u] of Object.entries(USERS)) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message.slice(0, 80)))
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', u.email)
    await page.locator('#password').fill(u.pass)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(4000)
    const landed = page.url().replace(BASE, '')
    const body = await page.evaluate(() => document.body.innerText)
    const loggedIn = !landed.includes('/login') && body.length > 200
    check(`${key}: signs in and lands on a working page`, loggedIn, landed)

    // projects list renders
    await page.goto(BASE + '/projects', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const listText = await page.evaluate(() => document.body.innerText)
    const listOk = !listText.includes('Application error') && !listText.includes('حدث خطأ')
    check(`${key}: projects page renders without error`, listOk)

    if (key === 'sales') {
      // must NOT be able to open a project that isn't theirs
      const r = await page.goto(`${BASE}/projects/${theirs.id}`, { waitUntil: 'networkidle' })
      const t = await page.evaluate(() => document.body.innerText)
      check('sales: blocked from an unassigned project detail page',
        r.status() === 404 || !t.includes('rls-other-client'), `status ${r.status()}`)
      // and MUST be able to open their own
      await page.goto(`${BASE}/projects/${mine.id}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      const own = await page.evaluate(() => document.body.innerText)
      check('sales: CAN open their own project', own.includes('rls-mine-project'))
    }
    if (errors.length) console.log(`   (${key} console errors: ${errors.slice(0, 2).join(' | ')})`)
    await ctx.close()
  }
} finally {
  await browser.close()
  for (const pid of tempProjects) {
    await svc.from('payments').delete().eq('project_id', pid)
    for (const t of ['activity_log', 'documents', 'materials', 'installations', 'project_notes', 'app_notifications'])
      await svc.from(t).delete().eq('project_id', pid).then(() => {}, () => {})
    await svc.from('projects').delete().eq('id', pid)
  }
  for (const u of Object.values(USERS)) await drop(u.email)
  const failed = results.filter(r => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  // confirm nothing of the client's was touched
  const { count } = await svc.from('projects').select('*', { count: 'exact', head: true })
  console.log('client projects still present:', count)
}
