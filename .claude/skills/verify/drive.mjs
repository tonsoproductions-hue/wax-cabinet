// Drives every status message in the running app and checks what it shows.
// Usage: node drive.mjs <playwright index.mjs> <out dir> <base url> [scenario filter]
// <out dir> must hold big-photo.jpg and photo.heic from fixtures.py; screenshots go there too.
import fs from 'fs'
const [, , PW, OUT, BASE, ONLY] = process.argv
const { chromium, devices } = await import(PW)
const PHOTO = OUT + '/big-photo.jpg'
const HEIC = OUT + '/photo.heic'

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600
const user = { id: '11111111-1111-1111-1111-111111111111', email: 'me@example.com', aud: 'authenticated', role: 'authenticated' }
const jwt = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: user.id, exp, role: 'authenticated', aud: 'authenticated' }), 'sig'].join('.')
const SESSION = JSON.stringify({ access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user })
const RECORDS = [
  { id: 'a', owner_id: user.id, artist: 'Miles Davis', title: 'Kind of Blue', year: 1959, genre: 'Jazz', discogs_id: 123, tracklist: [], created_at: '2026-01-01' },
  { id: 'b', owner_id: user.id, artist: 'Pink Floyd', title: 'Animals', year: 1977, genre: 'Rock', tracklist: [], created_at: '2026-01-01' },
]
const CLAUDE_OK = { artist: 'Miles Davis', title: 'Kind of Blue', year: '1959', genre: 'Jazz', label: 'Columbia', identifiedBy: 'Claude Haiku 5.5' }
const CLAUDE_EMPTY = { artist: '', title: '', year: '', genre: 'Other', label: '' }
const RESULTS = { results: [
  { id: 1, title: 'Miles Davis - Kind Of Blue', country: 'US', year: '1959', label: ['Columbia'] },
  { id: 2, title: 'Miles Davis - Kind Of Blue', country: 'UK', year: '1959', label: ['Fontana'] }] }
const RELEASE = { title: 'Kind Of Blue', year: 1959, artists: [{ name: 'Miles Davis' }], labels: [{ name: 'Columbia', catno: 'CL 1355' }], lowest_price: 24.5,
  tracklist: [{ position: 'A1', title: 'So What', duration: '9:22' }, { position: 'A2', title: 'Freddie Freeloader', duration: '9:46' }] }

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Records every status the page shows, so states that flash by are caught too.
const RECORDER = () => {
  window.__seen = []
  const seen = new Set()
  const snap = () => {
    for (const el of document.querySelectorAll('.status-step')) {
      const state = [...el.classList].find(c => ['busy', 'done', 'fail', 'note'].includes(c))
      const key = state + ' | ' + el.innerText.replace(/\s*\n\s*/g, ' / ').replace(/^[✓✕–]\s*\/?\s*/, '')
      if (!seen.has(key)) { seen.add(key); window.__seen.push(key) }
    }
    for (const [sel, kind] of [['.hud', 'HUD'], ['.alert', 'ALERT'], ['.dark-note', 'NOTE']]) {
      const el = document.querySelector(sel)
      if (el) {
        const key = kind + ' | ' + el.innerText.replace(/\s*\n\s*/g, ' / ')
        if (!seen.has(key)) { seen.add(key); window.__seen.push(key) }
      }
    }
  }
  new MutationObserver(snap).observe(document, { subtree: true, childList: true, characterData: true, attributes: true })
}

const results = []
async function scenario(name, opts, drive) {
  if (ONLY && !name.includes(ONLY)) return
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...(opts.device ?? devices['iPhone 13']), ...(opts.ctx ?? {}) })
  if (opts.signedIn !== false) await ctx.addInitScript(s => localStorage.setItem('sb-example-auth-token', s), SESSION)
  await ctx.addInitScript(RECORDER)
  if (opts.init) await ctx.addInitScript(opts.init)
  const page = await ctx.newPage()
  if (opts.clock) await page.clock.install()
  const api = {
    claude: () => json(CLAUDE_OK), discogsQ: () => json(RESULTS), release: () => json(RELEASE),
    tracks: () => json(RELEASE), upload: () => json({ url: 'https://example.com/c.jpg' }),
    insert: () => json([{ ...RECORDS[0], id: 'new' }], 201), del: () => json([{ id: 'b' }]),
    otp: () => json({}), ...opts.api,
  }
  const handle = async (route, fn) => {
    const r = await fn(route.request())
    if (r === 'abort') return route.abort('internetdisconnected')
    if (r === 'hang') return
    if (r?.delay) await sleep(r.delay)
    return route.fulfill(r?.reply ?? r)
  }
  await page.route('https://example.supabase.co/**', route => {
    const req = route.request(), url = req.url()
    if (url.includes('/rest/v1/vinyl_records') && req.method() === 'DELETE') return handle(route, api.del)
    if (url.includes('/rest/v1/vinyl_records') && req.method() === 'POST') return handle(route, api.insert)
    if (url.includes('/rest/v1/vinyl_records')) return route.fulfill(json(RECORDS))
    if (url.includes('/auth/v1/otp')) return handle(route, api.otp)
    if (url.includes('/auth/v1/user')) return route.fulfill(json(user))
    return route.fulfill(json({}))
  })
  await page.route('**/api/claude', route => handle(route, api.claude))
  await page.route('**/api/discogs?q=**', route => handle(route, api.discogsQ))
  await page.route('**/api/discogs?id=123', route => handle(route, api.tracks))
  await page.route('**/api/discogs?id=1', route => handle(route, api.release))
  await page.route('**/api/upload', route => handle(route, api.upload))

  const out = { name, checks: [], seen: [] }
  const expectSeen = async (text, why) => {
    let ok = false
    for (let i = 0; i < 40 && !ok; i++) {
      out.seen = await page.evaluate(() => window.__seen)
      ok = out.seen.some(s => s.includes(text))
      if (!ok) await sleep(100)
    }
    out.checks.push({ ok, text, why })
    return ok
  }
  const expectNotSeen = async (text, why) => {
    out.seen = await page.evaluate(() => window.__seen)
    out.checks.push({ ok: !out.seen.some(s => s.includes(text)), text: 'NOT ' + text, why })
  }
  try {
    await page.goto(BASE)
    await page.waitForSelector('.album-row, .empty, .alert', { timeout: 15000 })
    await drive({ page, ctx, api, expectSeen, expectNotSeen, shot: n => page.screenshot({ path: `${OUT}/${n}.png` }) })
  } catch (err) {
    out.checks.push({ ok: false, text: 'scenario crashed', why: err.message.split('\n')[0] })
  }
  out.seen = await page.evaluate(() => window.__seen).catch(() => out.seen)
  results.push(out)
  await browser.close()
}

const toImport = async page => page.getByRole('button', { name: 'Import' }).click()
const pickPhoto = (page, file = PHOTO) => page.setInputFiles('input[type=file]', file)
const searchText = async (page, q) => {
  await page.fill('input[placeholder="Artist, album or a description"]', q)
  await page.getByRole('button', { name: 'Find' }).click()
}

// ── Import: photo ─────────────────────────────────────────────
await scenario('photo: unreadable format', {}, async ({ page, expectSeen, expectNotSeen, shot }) => {
  await toImport(page)
  await page.setInputFiles('input[type=file]', { name: 'IMG_0042.heic', mimeType: 'image/heic', buffer: fs.readFileSync(HEIC) })
  await expectSeen('busy | Preparing photo… / IMG_0042.heic', 'shows the file being prepared')
  await expectSeen('fail | Couldn’t open that photo / HEIC photos can’t be read here. Try a JPEG or PNG, or a screenshot of the photo.', 'names the format and what to do')
  await expectNotSeen('Claude', 'does not go on to ask Claude')
  await shot('01-photo-unreadable')
})

await scenario('photo: happy path to Added', {}, async ({ page, api, expectSeen, shot }) => {
  api.claude = () => ({ delay: 800, reply: json(CLAUDE_OK) })
  api.upload = () => ({ delay: 800, reply: json({ url: 'https://example.com/c.jpg' }) })
  api.insert = () => ({ delay: 800, reply: json([{ ...RECORDS[0], id: 'new' }], 201) })
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Photo ready / Resized from 23.8 MB to', 'reports original and resized size')
  await expectSeen('busy | Claude is reading the cover…', 'shows Claude working')
  await expectSeen('done | Identified: Kind of Blue / Miles Davis · 1959 · read by Claude Haiku 5.5', 'names the answer and model')
  await expectSeen('busy | Searching Discogs for pressings… / “Miles Davis Kind of Blue”', 'shows the Discogs query')
  await expectSeen('done | Found 2 pressings on Discogs / Pick yours below', 'counts the pressings')
  await shot('02-identified')
  await page.locator('button.cell', { hasText: '#1' }).click()
  await expectSeen('done | Details filled in from Discogs / Columbia CL 1355 · 1959 · 2 tracks', 'summarises the pressing')
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('busy | Uploading the cover photo… / 267 KB', 'shows upload with size')
  await expectSeen('busy | Saving to your collection…', 'shows the save')
  await expectSeen('HUD | ✓ / Added / Kind of Blue', 'badge confirms the add')
  await page.waitForTimeout(150)
  await shot('03-added')
  await page.waitForTimeout(2000)
  const hud = await page.locator('.hud').count()
  if (hud) throw new Error('badge still showing after 2.1s')
})

await scenario('photo: Claude cannot read, then Ask Again', {}, async ({ page, api, expectSeen, shot }) => {
  api.claude = () => json(CLAUDE_EMPTY)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('fail | Claude couldn’t read the cover / Tap Ask Again for a closer look, or fill in the details below.', 'first miss points at Ask Again')
  await page.getByRole('button', { name: /Wrong Album/ }).click()
  await expectSeen('busy | Claude is taking a closer look… / Using a stronger model', 'retry says it uses a stronger model')
  await expectSeen('fail | Claude couldn’t read the cover / Add a hint like the label or year, or search Discogs below.', 'second miss suggests a hint')
  await shot('04-claude-unreadable-retry')
})

await scenario('photo: Claude repeats a rejected answer', {}, async ({ page, api, expectSeen }) => {
  let n = 0
  api.claude = () => json(n++ ? { ...CLAUDE_OK, repeated: true } : CLAUDE_OK)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'first answer accepted')
  await page.getByRole('button', { name: /Wrong Album/ }).click()
  await expectSeen('note | Claude still thinks it’s Kind of Blue / Add a hint or search Discogs yourself below.', 'grey note, not an error')
})

await scenario('photo: Claude server error', {}, async ({ page, api, expectSeen }) => {
  api.claude = () => json({ ...CLAUDE_EMPTY, error: 'Could not identify the cover' }, 502)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('fail | Couldn’t ask Claude / Could not identify the cover. Try again in a moment. You can still fill in the details yourself.', 'server reason + next step')
})

await scenario('photo: Claude signed-out 401', {}, async ({ page, api, expectSeen }) => {
  api.claude = () => json({ error: 'Sign in to do that' }, 401)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('fail | Couldn’t ask Claude / Your sign-in has expired. Sign in again from Settings.', 'tells you to sign in again')
})

await scenario('photo: Claude timeout (45s)', { clock: true }, async ({ page, api, expectSeen, shot }) => {
  api.claude = () => 'hang'
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('busy | Claude is reading the cover…', 'waiting on Claude')
  await page.clock.fastForward(46_000)
  await expectSeen('fail | Claude took too long to answer / Tap Ask Again to retry, or search Discogs yourself below.', 'timeout message')
  await shot('05-claude-timeout')
})

// ── Import: text search ───────────────────────────────────────
await scenario('text: found, Discogs empty', {}, async ({ page, api, expectSeen, shot }) => {
  api.claude = () => ({ delay: 500, reply: json(CLAUDE_OK) })
  api.discogsQ = () => json({ results: [] })
  await toImport(page)
  await searchText(page, 'trumpet modal jazz 1959')
  await expectSeen('busy | Claude is working out which record that is… / “trumpet modal jazz 1959”', 'echoes the search')
  await expectSeen('note | No pressings found on Discogs / Try a different search below, or fill in the details yourself.', 'grey note for no matches')
  await shot('06-text-no-pressings')
})

await scenario('text: Claude cannot work it out', {}, async ({ page, api, expectSeen }) => {
  api.claude = () => json(CLAUDE_EMPTY)
  await toImport(page)
  await searchText(page, 'asdfgh')
  await expectSeen('fail | Claude couldn’t work out that record / Try other words, or search Discogs yourself below.', 'text-specific wording')
})

// ── Import: Discogs ───────────────────────────────────────────
await scenario('discogs: rate limited', {}, async ({ page, api, expectSeen }) => {
  api.discogsQ = () => json({ error: 'Discogs returned 429', results: [] }, 502)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('fail | Couldn’t search Discogs / Discogs is getting too many lookups right now. Wait a minute and try again. You can fill in the details yourself.', '429 in plain words')
})

await scenario('discogs: network drop', {}, async ({ page, api, expectSeen }) => {
  api.discogsQ = () => 'abort'
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('fail | Couldn’t search Discogs / Couldn’t reach Vinyl Crate’s server. Check your connection.', 'network failure')
})

await scenario('discogs: timeout (15s)', { clock: true }, async ({ page, api, expectSeen }) => {
  api.discogsQ = () => 'hang'
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('busy | Searching Discogs', 'waiting on Discogs')
  await page.clock.fastForward(16_000)
  await expectSeen('fail | Discogs took too long to answer / Try the search again below, or fill in the details yourself.', 'timeout message')
})

await scenario('discogs: pressing details missing (404)', {}, async ({ page, api, expectSeen, shot }) => {
  api.release = () => json({ error: 'Discogs returned 404', results: [] }, 502)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'search ok')
  await page.locator('button.cell', { hasText: '#1' }).click()
  await expectSeen('busy | Loading the pressing’s details… / Miles Davis - Kind Of Blue', 'loading names the pressing')
  await expectSeen('fail | Couldn’t load the pressing’s details / Discogs doesn’t have that release any more. Tap the pressing to try again.', '404 in plain words')
  await shot('07-release-404')
})

// ── Import: saving ────────────────────────────────────────────
await scenario('save: upload drops, then Try Again', {}, async ({ page, api, expectSeen, shot }) => {
  api.upload = () => 'abort'
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'ready to save')
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('fail | The cover photo didn’t upload / Couldn’t reach Vinyl Crate’s server. Check your connection. Your details are kept, so you can try again.', 'upload failure')
  const btn = await page.locator('.big-btn').last().innerText()
  if (btn !== 'Try Again') throw new Error(`button says "${btn}"`)
  const artist = await page.locator('.field', { hasText: 'Artist' }).locator('input').inputValue()
  if (artist !== 'Miles Davis') throw new Error(`details lost: artist="${artist}"`)
  await page.waitForTimeout(600)
  await shot('08-upload-failed')
  api.upload = () => json({ url: 'https://example.com/c.jpg' })
  await page.getByRole('button', { name: 'Try Again' }).click()
  await expectSeen('HUD | ✓ / Added / Kind of Blue', 'retry succeeds')
})

await scenario('save: offline', {}, async ({ page, ctx, api, expectSeen }) => {
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'ready to save')
  // Faked replies ignore offline mode, so drop the request as well.
  await ctx.setOffline(true)
  api.upload = () => 'abort'
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('fail | The cover photo didn’t upload / You’re offline. Check your Wi-Fi or mobile data.', 'offline wording')
})

await scenario('save: database unreachable', {}, async ({ page, api, expectSeen }) => {
  api.insert = () => 'abort'
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'ready to save')
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('fail | The record didn’t save / Couldn’t reach Vinyl Crate’s server. Check your connection.', 'network wording, not TypeError')
})

await scenario('save: database refuses (RLS 42501)', {}, async ({ page, api, expectSeen }) => {
  api.insert = () => json({ code: '42501', message: 'new row violates row-level security policy for table "vinyl_records"', details: null, hint: null }, 403)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'ready to save')
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('fail | The record didn’t save / You don’t have permission to change that record. Your details are kept, so you can try again.', 'permission wording, says record not photo')
})

await scenario('save: upload session expired (401)', {}, async ({ page, api, expectSeen }) => {
  api.upload = () => json({ error: 'Sign in to do that' }, 401)
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('done | Found 2 pressings', 'ready to save')
  await page.getByRole('button', { name: 'Add to Collection' }).click()
  await expectSeen('fail | The cover photo didn’t upload / Your sign-in has expired. Sign in again from Settings.', 'expired sign-in')
})

await scenario('import: Start Over mid-request ignores the late answer', {}, async ({ page, api, expectSeen, expectNotSeen }) => {
  api.claude = () => ({ delay: 1500, reply: json(CLAUDE_OK) })
  await toImport(page)
  await pickPhoto(page)
  await expectSeen('busy | Claude is reading the cover…', 'in flight')
  await page.getByRole('button', { name: 'Start Over' }).click()
  await page.waitForTimeout(2000)
  const steps = await page.locator('.status-step').count()
  if (steps) throw new Error(`${steps} steps still showing after Start Over`)
  await expectNotSeen('Identified', 'late Claude answer is dropped')
})

// ── Settings: export and share ────────────────────────────────
const toSettings = async page => page.getByLabel('Settings').click()
const exportBtn = page => page.getByRole('button', { name: /Download Spreadsheet/ })

await scenario('export: desktop download', { device: { viewport: { width: 1000, height: 1000 } } }, async ({ page, expectSeen, shot }) => {
  await toSettings(page)
  const dl = page.waitForEvent('download')
  await exportBtn(page).click()
  const file = await dl
  await expectSeen('done | Created vinyl-crate-', 'names the file')
  await expectSeen('2 albums · 1 KB', 'counts albums and size')
  await expectSeen('done | Spreadsheet downloaded / Look in your Downloads folder.', 'download confirmed')
  if (!/^vinyl-crate-\d{4}-\d\d-\d\d\.csv$/.test(file.suggestedFilename())) throw new Error('download name ' + file.suggestedFilename())
  await shot('09-export-desktop')
})

const shareStub = behaviour => `
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  Object.defineProperty(navigator, 'share', { configurable: true, value: () => new Promise((res, rej) => setTimeout(() => {
    ${behaviour}
  }, 400)) })`

await scenario('export: phone share sheet used', { init: shareStub('res()') }, async ({ page, expectSeen, shot }) => {
  await toSettings(page)
  await exportBtn(page).click()
  await expectSeen('busy | Saving the file…', 'busy while the sheet is open')
  await expectSeen('done | Spreadsheet shared / It’s wherever you sent it, e.g. Files or Mail.', 'shared')
  await shot('10-export-shared')
})

await scenario('export: phone share sheet closed', { init: shareStub("rej(new DOMException('x', 'AbortError'))") }, async ({ page, expectSeen, shot }) => {
  await toSettings(page)
  await exportBtn(page).click()
  await expectSeen('note | Share sheet closed, nothing saved / Tap Download Spreadsheet to try again, then choose Save to Files.', 'cancel is a grey note')
  await shot('11-export-cancelled')
})

await scenario('export: phone share refused falls back to download', { init: shareStub("rej(new DOMException('x', 'NotAllowedError'))") }, async ({ page, expectSeen }) => {
  await toSettings(page)
  await exportBtn(page).click()
  await expectSeen('done | Spreadsheet downloaded', 'falls back to a download')
})

await scenario('export: saving throws', { device: { viewport: { width: 1000, height: 1000 } }, init: () => { URL.createObjectURL = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError') } } },
  async ({ page, expectSeen, shot }) => {
    await toSettings(page)
    await exportBtn(page).click()
    await expectSeen('fail | Couldn’t save the spreadsheet / Your device is out of storage space. Tap Download Spreadsheet to try again.', 'storage wording')
    await shot('12-export-failed')
  })

await scenario('export: run twice replaces the steps', { device: { viewport: { width: 1000, height: 1000 } } }, async ({ page }) => {
  await toSettings(page)
  await exportBtn(page).click()
  await page.waitForTimeout(500)
  await exportBtn(page).click()
  await page.waitForTimeout(500)
  const n = await page.locator('.status-step').count()
  if (n !== 2) throw new Error(`${n} export steps after two runs`)
})

await scenario('share: link copied', { ctx: { permissions: ['clipboard-read', 'clipboard-write'] }, init: () => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) } },
  async ({ page, expectSeen, shot }) => {
    await toSettings(page)
    await page.getByRole('button', { name: 'Share Collection Link' }).click()
    await expectSeen('HUD | ✓ / Link Copied / Paste it anywhere to share', 'copied badge')
    await page.waitForTimeout(200)
    await shot('13-link-copied')
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    if (!clip.includes('?c=11111111')) throw new Error('clipboard has ' + clip)
  })

await scenario('share: no share or clipboard', { init: () => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true })
} }, async ({ page, expectSeen, shot }) => {
  await toSettings(page)
  await page.getByRole('button', { name: 'Share Collection Link' }).click()
  await expectSeen('ALERT | Copy This Link / Sharing isn’t available here, so copy the link to share it: http', 'alert shows the link')
  await shot('14-share-unavailable')
})

// ── Albums: remove, tracklist ─────────────────────────────────
const removeAnimals = async page => {
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.locator('.album-row', { hasText: 'Animals' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
}

await scenario('remove: success', {}, async ({ page, expectSeen, shot }) => {
  await removeAnimals(page)
  await expectSeen('HUD | ✓ / Removed / Animals', 'removed badge')
  await page.waitForTimeout(200)
  await shot('15-removed')
})

await scenario('remove: not yours', {}, async ({ page, api, expectSeen }) => {
  api.del = () => json([])
  await removeAnimals(page)
  await expectSeen('ALERT | Couldn’t Remove Album / You can only remove records you added.', 'explains why')
})

await scenario('remove: network drop', {}, async ({ page, api, expectSeen, shot }) => {
  api.del = () => 'abort'
  await removeAnimals(page)
  await expectSeen('ALERT | Couldn’t Remove Album / Couldn’t reach Vinyl Crate’s server. Check your connection.', 'network wording, not TypeError')
  await shot('18-remove-network')
})

await scenario('tracklist: fails, then Try Again', {}, async ({ page, api, expectSeen, shot }) => {
  api.tracks = () => json({ error: 'Discogs returned 429', results: [] }, 502)
  await page.locator('.album-row', { hasText: 'Kind of Blue' }).click()
  await expectSeen('NOTE | Couldn’t load the tracklist from Discogs. Discogs is getting too many lookups right now. Wait a minute and try again. / Try Again', 'plain reason + button')
  await page.waitForTimeout(700)
  await shot('16-tracklist-failed')
  api.tracks = () => json(RELEASE)
  await page.getByRole('button', { name: 'Try Again' }).click()
  await page.waitForSelector('text=So What')
  if (await page.locator('.dark-note').count()) throw new Error('note still showing after retry')
})

// ── Sign in ───────────────────────────────────────────────────
const toSignIn = async page => {
  await page.getByLabel('Settings').click()
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.fill('input[type=email]', 'nobody@example.com')
  await page.getByRole('button', { name: /Send Sign-In/ }).click()
}
await scenario('sign-in: unknown email', { signedIn: false }, async ({ page, api, expectSeen }) => {
  api.otp = () => json({ code: 'otp_disabled', msg: 'Signups not allowed for otp' }, 422)
  await toSignIn(page)
  await expectSeen('ALERT | Couldn’t Send Link / That email isn’t set up for Vinyl Crate yet. Accounts are by invitation for now.', 'invitation wording')
})
await scenario('sign-in: network drop', { signedIn: false }, async ({ page, api, expectSeen }) => {
  api.otp = () => 'abort'
  await toSignIn(page)
  await expectSeen('ALERT | Couldn’t Send Link / Couldn’t reach Vinyl Crate’s server. Check your connection.', 'network wording')
})
await scenario('sign-in: server error', { signedIn: false }, async ({ page, api, expectSeen, shot }) => {
  api.otp = () => json({ code: 'unexpected_failure', msg: 'Error sending magic link email' }, 500)
  await toSignIn(page)
  await expectSeen('ALERT | Couldn’t Send Link / ', 'explains')
  await shot('17-signin-500')
})

// ── Report ────────────────────────────────────────────────────
let failed = 0
for (const r of results) {
  const bad = r.checks.filter(c => !c.ok)
  failed += bad.length
  console.log(`\n${bad.length ? '❌' : '✅'} ${r.name}`)
  for (const c of r.checks) console.log(`   ${c.ok ? '✓' : '✗'} ${c.why}: ${c.text}`)
  if (bad.length || process.env.SHOW_SEEN) for (const s of r.seen) console.log(`      seen: ${s}`)
}
console.log(`\n${results.length} scenarios, ${failed} failed checks`)
