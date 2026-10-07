'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { downloadCsv, shareUrl, shareLink } from '@/lib/export'
import { VISION_MODEL } from '@/lib/models'
import { NavBar, Chevron, Spinner } from '@/components/ui'

function SignInForm({ onBack, ask }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  async function sendLink(e) {
    e.preventDefault()
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Accounts are created in Supabase for now, so unknown emails can't sign up here.
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    })
    setSending(false)
    if (error) {
      const unknown = /signups? not allowed|not found/i.test(error.message)
      ask('Couldn’t Send Link', unknown ? 'That email isn’t set up for Wax Cabinet yet.' : error.message)
      return
    }
    await ask('Check Your Email', `We sent a sign-in link to ${email.trim()}. Open it on this device to sign in.`)
    onBack()
  }

  return (
    <>
      <NavBar title="Sign In" left={<button className="bar-btn back" onClick={onBack}>Settings</button>} />
      <form className="scroll pinstripes" onSubmit={sendLink}>
        <div className="group-label">Owner Account</div>
        <div className="group">
          <label className="cell field">
            <span className="field-label">Email</span>
            <input type="email" required autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
        </div>
        <div className="group-footer">We’ll email you a link. No password needed.</div>
        <button className="big-btn" type="submit" disabled={sending || !email.includes('@')}>
          {sending ? 'Sending…' : 'Send Sign-In Link'}
        </button>
      </form>
    </>
  )
}

export default function SettingsScreen({ user, view, setView, onClose, albums, shareOwnerId, ask }) {
  const [shareGenre, setShareGenre] = useState('All')
  const [signingOut, setSigningOut] = useState(false)

  if (view === 'signin') return <SignInForm onBack={() => setView('main')} ask={ask} />

  const genres = ['All', ...[...new Set(albums.map(a => a.genre).filter(Boolean))].sort()]

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
  }

  async function share() {
    const url = shareUrl(shareOwnerId, shareGenre)
    const what = shareGenre === 'All' ? 'vinyl collection' : `${shareGenre} records`
    const result = await shareLink({ title: 'Wax Cabinet', text: `Browse my ${what} on Wax Cabinet`, url })
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
              <button className="cell" style={{ justifyContent: 'center', color: '#c41f1f' }} onClick={signOut} disabled={signingOut}>
                {signingOut ? <Spinner /> : 'Sign Out'}
              </button>
            </div>
            <div className="group-footer">You can add, edit and remove records.</div>
          </>
        ) : (
          <>
            <div className="group">
              <button className="cell" onClick={() => setView('signin')}>
                <span className="grow">Sign In</span>
                <Chevron />
              </button>
            </div>
            <div className="group-footer">Visitors can browse. Sign in to add or remove records.</div>
          </>
        )}

        <div className="group-label">Export</div>
        <div className="group">
          <button className="cell" onClick={() => downloadCsv(albums)} disabled={albums.length === 0}>
            <span className="grow">
              Download Spreadsheet
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
          <button className="cell" onClick={share} disabled={albums.length === 0}>
            <span className="grow">Share Collection Link</span>
            <Chevron />
          </button>
        </div>
        <div className="group-footer">The link opens just your Albums list. Anyone with it can browse and shuffle, but can’t change anything.</div>

        <div className="group-footer" style={{ marginTop: 8 }}>
          Wax Cabinet · Covers read by {VISION_MODEL.name} · Pressings from Discogs
        </div>
      </div>
    </>
  )
}
