'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { csvFile, saveFile, fileSize, shareUrl, shareLink } from '@/lib/export'
import { explain } from '@/lib/errors'
import { NavBar, Chevron, Spinner, StatusSteps } from '@/components/ui'

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
      ask('Couldn’t Send Link', unknown ? 'That email isn’t set up for Vinyl Crate yet. Accounts are by invitation for now.' : explain(error))
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

export default function SettingsScreen({ user, view, setView, onClose, albums, shareOwnerId, ask, notify }) {
  const [shareGenre, setShareGenre] = useState('All')
  const [signingOut, setSigningOut] = useState(false)
  const [exportSteps, setExportSteps] = useState([])

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
    const result = await shareLink({ title: 'Vinyl Crate', text: `Browse my ${what} on Vinyl Crate`, url })
    if (result === 'copied') notify('Link Copied', 'Paste it anywhere to share')
    else if (result === 'failed') ask('Copy This Link', `Sharing isn’t available here, so copy the link to share it: ${url}`)
  }

  // Shows each step of the export as it happens. Nothing may be awaited
  // before saveFile(): phones only open the share sheet straight after a tap.
  async function exportCsv() {
    let file
    try {
      file = csvFile(albums)
    } catch (err) {
      setExportSteps([{ id: 'make', state: 'fail', label: 'Couldn’t create the spreadsheet', detail: explain(err) }])
      return
    }
    const made = { id: 'make', state: 'done', label: `Created ${file.name}`, detail: `${albums.length} ${albums.length === 1 ? 'album' : 'albums'} · ${fileSize(file.size)}` }
    setExportSteps([made, { id: 'save', state: 'busy', label: 'Saving the file…' }])
    let last
    try {
      last = {
        shared: { state: 'done', label: 'Spreadsheet shared', detail: 'It’s wherever you sent it, e.g. Files or Mail.' },
        cancelled: { state: 'note', label: 'Share sheet closed, nothing saved', detail: 'Tap Download Spreadsheet to try again, then choose Save to Files.' },
        downloaded: { state: 'done', label: 'Spreadsheet downloaded', detail: 'Look in your Downloads folder.' },
      }[await saveFile(file)]
    } catch (err) {
      last = { state: 'fail', label: 'Couldn’t save the spreadsheet', detail: `${explain(err)} Tap Download Spreadsheet to try again.` }
    }
    setExportSteps([made, { id: 'save', ...last }])
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
          <button className="cell" onClick={exportCsv} disabled={albums.length === 0}>
            <span className="grow">
              Download Spreadsheet
              <small>CSV · {albums.length} {albums.length === 1 ? 'album' : 'albums'}</small>
            </span>
            <Chevron />
          </button>
        </div>
        {exportSteps.length > 0 && <StatusSteps steps={exportSteps} />}
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
          Vinyl Crate · Covers read by Claude · Pressings from Discogs
        </div>
      </div>
    </>
  )
}
