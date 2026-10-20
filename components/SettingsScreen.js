'use client'
import { useEffect, useState } from 'react'
import { supabase, authHeaders, apiUrl } from '@/lib/supabase'
import { downloadCsv, shareUrl, shareLink } from '@/lib/export'
import { authRedirectUrl } from '@/lib/native'
import { NavBar, Chevron, Spinner } from '@/components/ui'

// Email sign-in: a link (and a 6-digit code, for the app) that also creates
// the account on first use. Password sign-in exists for accounts that were
// given one, such as the App Review demo account.
function SignInForm({ onBack, backLabel = 'Settings', ask }) {
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('email') // email → code, or password
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const address = email.trim()

  async function sendLink(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
    })
    setBusy(false)
    if (error) {
      ask('Couldn’t Send Email', /rate limit/i.test(error.message) ? 'Too many sign-in emails just now. Wait a minute and try again.' : error.message)
      return
    }
    setStage('code')
  }

  async function verifyCode(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email: address, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) ask('Code Didn’t Work', 'Check the code in the email, or tap the link instead.')
    else onBack()
  }

  async function signInWithPassword(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: address, password })
    setBusy(false)
    if (error) ask('Couldn’t Sign In', 'That email and password don’t match.')
    else onBack()
  }

  const emailCell = (
    <label className="cell field">
      <span className="field-label">Email</span>
      <input type="email" required autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={stage === 'code'} />
    </label>
  )

  return (
    <>
      <NavBar title="Sign In" left={<button className="bar-btn back" onClick={onBack}>{backLabel}</button>} />
      {stage === 'code' ? (
        <form className="scroll pinstripes" onSubmit={verifyCode}>
          <div className="group-label">Check Your Email</div>
          <div className="group">
            {emailCell}
            <label className="cell field">
              <span className="field-label">Code</span>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" />
            </label>
          </div>
          <div className="group-footer">We sent a sign-in link and code to {address}. Tap the link on this device, or type the code here.</div>
          <button className="big-btn" type="submit" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Sign In'}</button>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button type="button" className="gloss-btn" onClick={() => { setStage('email'); setCode('') }}>Use a Different Email</button>
          </div>
        </form>
      ) : stage === 'password' ? (
        <form className="scroll pinstripes" onSubmit={signInWithPassword}>
          <div className="group-label">Sign In with Password</div>
          <div className="group">
            {emailCell}
            <label className="cell field">
              <span className="field-label">Password</span>
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
          </div>
          <button className="big-btn" type="submit" disabled={busy || !address.includes('@') || !password}>{busy ? 'Signing In…' : 'Sign In'}</button>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button type="button" className="gloss-btn" onClick={() => setStage('email')}>Email Me a Link Instead</button>
          </div>
        </form>
      ) : (
        <form className="scroll pinstripes" onSubmit={sendLink}>
          <div className="group-label">Sign In or Create Account</div>
          <div className="group">{emailCell}</div>
          <div className="group-footer">We’ll email you a link and a code. No password needed. New here? This creates your account.</div>
          <button className="big-btn" type="submit" disabled={busy || !address.includes('@')}>{busy ? 'Sending…' : 'Continue'}</button>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button type="button" className="gloss-btn" onClick={() => setStage('password')}>Use a Password</button>
          </div>
        </form>
      )}
    </>
  )
}

function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`ios-switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} disabled={disabled}>
      <span className="ios-switch-track"><span>ON</span><span>OFF</span></span>
      <span className="ios-switch-knob" />
    </button>
  )
}

// signInOnly: opened from a share link, where Sign In is all Settings offers
// and Back returns to the shared crate.
export default function SettingsScreen({ user, view, setView, onClose, albums, shareOwnerId, ask, signInOnly }) {
  const [shareGenre, setShareGenre] = useState('All')
  const [busy, setBusy] = useState(null) // 'signout' | 'delete' | 'public'
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('profiles').select('collection_public').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setProfile(data ?? { collection_public: true }) })
    return () => { cancelled = true }
  }, [user])

  if (signInOnly) return <SignInForm onBack={onClose} backLabel="Back" ask={ask} />
  if (view === 'signin') return <SignInForm onBack={() => setView('main')} ask={ask} />

  const genres = ['All', ...[...new Set(albums.map(a => a.genre).filter(Boolean))].sort()]
  const isPublic = profile?.collection_public ?? true

  async function signOut() {
    setBusy('signout')
    await supabase.auth.signOut()
    setBusy(null)
  }

  async function setPublic(value) {
    setBusy('public')
    const { error } = await supabase.from('profiles').update({ collection_public: value }).eq('id', user.id)
    setBusy(null)
    if (error) ask('Couldn’t Save', error.message)
    else setProfile(p => ({ ...p, collection_public: value }))
  }

  async function deleteAccount() {
    const choice = await ask(
      'Delete Account?',
      `This permanently deletes your account, your ${albums.length} ${albums.length === 1 ? 'record' : 'records'} and their cover photos. It can’t be undone.`,
      ['Cancel', 'Delete']
    )
    if (choice !== 'Delete') return
    setBusy('delete')
    try {
      const resp = await fetch(apiUrl('/api/account'), { method: 'DELETE', headers: await authHeaders() })
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || `Error ${resp.status}`)
      await supabase.auth.signOut()
      await ask('Account Deleted', 'Your account and records have been removed.')
    } catch (err) {
      ask('Couldn’t Delete Account', err.message)
    } finally {
      setBusy(null)
    }
  }

  async function share() {
    if (user && !isPublic) {
      ask('Collection Is Private', 'Turn on Public Collection so people with your link can see it.')
      return
    }
    const url = shareUrl(shareOwnerId, shareGenre)
    const what = shareGenre === 'All' ? 'vinyl collection' : `${shareGenre} records`
    const result = await shareLink({ title: 'Vinyl Crate', text: `Browse my ${what} on Vinyl Crate`, url })
    if (result === 'copied') ask('Link Copied', url)
    else if (result === 'failed') ask('Share Link', url)
  }

  return (
    <>
      <NavBar title="Settings" right={<button className="bar-btn done" onClick={onClose}>Done</button>} />
      <div className="scroll pinstripes">
        <div className="group-label">Account</div>
        {user ? (
          <>
            <div className="group">
              <div className="cell">
                <span className="field-label">Signed In</span>
                <span className="grow ellipsis" style={{ textAlign: 'right', fontWeight: 'normal', color: 'var(--value-blue)' }}>{user.email}</span>
              </div>
              <div className="cell">
                <span className="grow">Public Collection</span>
                <Switch on={isPublic} onChange={setPublic} disabled={!profile || busy === 'public'} />
              </div>
              <button className="cell" style={{ justifyContent: 'center', color: '#c41f1f' }} onClick={signOut} disabled={!!busy}>
                {busy === 'signout' ? <Spinner /> : 'Sign Out'}
              </button>
            </div>
            <div className="group-footer">
              {isPublic ? 'Anyone with your share link can browse your collection.' : 'Only you can see your collection. Share links won’t work while it’s private.'}
            </div>
          </>
        ) : (
          <>
            <div className="group">
              <button className="cell" onClick={() => setView('signin')}>
                <span className="grow">Sign In or Create Account</span>
                <Chevron />
              </button>
            </div>
            <div className="group-footer">Sign in to build your own crate.</div>
          </>
        )}

        <div className="group-label">Export</div>
        <div className="group">
          <button className="cell" onClick={() => downloadCsv(albums)} disabled={albums.length === 0}>
            <span className="grow">
              Export Spreadsheet
              <small>CSV · {albums.length} {albums.length === 1 ? 'album' : 'albums'}</small>
            </span>
            <Chevron />
          </button>
        </div>
        <div className="group-footer">Opens in Excel, Numbers or Google Sheets.</div>

        <div className="group-label">Share</div>
        <div className="group">
          <label className="cell field">
            <span className="field-label">Genre</span>
            <select value={shareGenre} onChange={e => setShareGenre(e.target.value)}>
              {genres.map(g => <option key={g} value={g}>{g === 'All' ? 'Whole Collection' : g}</option>)}
            </select>
            <Chevron />
          </label>
          <button className="cell" onClick={share} disabled={albums.length === 0 || !shareOwnerId}>
            <span className="grow">Share Collection Link</span>
            <Chevron />
          </button>
        </div>
        <div className="group-footer">The link opens just your Albums list. Anyone with it can browse and shuffle, but can’t change anything.</div>

        <div className="group-label">About</div>
        <div className="group">
          <a className="cell" href={`${process.env.NEXT_PUBLIC_SITE_URL || ''}/privacy/`} target="_blank" rel="noreferrer">
            <span className="grow">Privacy Policy</span><Chevron />
          </a>
          <a className="cell" href={`${process.env.NEXT_PUBLIC_SITE_URL || ''}/support/`} target="_blank" rel="noreferrer">
            <span className="grow">Support</span><Chevron />
          </a>
        </div>

        {user && (
          <>
            <div className="group" style={{ marginTop: 24 }}>
              <button className="cell" style={{ justifyContent: 'center', color: '#c41f1f' }} onClick={deleteAccount} disabled={!!busy}>
                {busy === 'delete' ? <Spinner /> : 'Delete Account'}
              </button>
            </div>
            <div className="group-footer">Permanently removes your account, records and cover photos.</div>
          </>
        )}

        <div className="group-footer" style={{ marginTop: 8 }}>
          Vinyl Crate · Covers read by Claude · Pressings from Discogs
        </div>
      </div>
    </>
  )
}
