'use client'
// The public home page: what Vinyl Sleeve is, shown around the live app.
// On a computer the real app runs in the device frame beside the copy; on a
// phone the buttons open it full screen. Styles are in app/landing.css, and
// lib/landing.js decides who sees this page.

const STEPS = [
  ['Snap the sleeve', 'Photograph the cover, or type what you remember. Even “the one with the prism on the front” works.'],
  ['Pick your pressing', 'Vinyl Sleeve names the record and lists matching pressings from Discogs, with label, year and tracklist.'],
  ['File it', 'It joins your collection, ready to browse, flip through, shuffle and share.'],
]

// [icon, title, text]; icons are the paths in ICONS below.
const FEATURES = [
  ['camera', 'No barcode needed', 'Older pressings, imports and private labels never had one. Vinyl Sleeve reads the artwork itself.'],
  ['retry', 'Wrong match? Ask again', 'A stronger model takes a closer look. Add a hint, or search Discogs yourself.'],
  ['tag', 'Pressing details and value', 'Each record brings its label, year, tracklist and Discogs’ lowest listed price, so your collection adds up to an estimated value.'],
  ['star', 'Favorites and shuffle', 'Star the ones you love. Can’t decide what to play? Shuffle, or shake your phone.'],
  ['bookmark', 'A wish list', 'Keep the records you’re hunting for in one place. Found one? Tap Got It and it moves into your collection.'],
  ['share', 'Share with a link', 'Send your whole collection or one genre. Friends can browse, shuffle and see your wish list without an account.'],
  ['swatch', 'Pick your look', 'From a pinstriped click-wheel classic to a walnut hi-fi with a turntable.'],
  ['lock', 'Yours to keep', 'No ads, no analytics, no tracking. Export a spreadsheet or delete your account whenever you like.'],
]

const FAQ = [
  ['Is it free?', 'Yes. Each account gets 40 lookups a day, which is plenty for an afternoon of filing records.'],
  ['Do I need an account?', 'Not to look around: the demo and shared collections open without one. To build your own collection, sign in with your email. We send a link and a 6-digit code, so there’s no password to remember.'],
  ['How does it know which record it is?', 'Claude, an AI model made by Anthropic, reads the cover photo or your description. Discogs supplies the pressings, tracklists and prices.'],
  ['What if my record has no barcode?', 'That’s what the photo is for. If the cover is worn or obscure, type the name or a description instead, or search Discogs directly.'],
  ['Is there an app?', 'Vinyl Sleeve runs in the browser on iPhone, Android and computers. Add it to your phone’s home screen and it opens full screen like an app. A native iPhone app is in the works.'],
  ['Who can see my collection?', 'Anyone you send your link to. Turn off Public Collection in Settings and only you can see it.'],
]

const ICONS = {
  camera: <path d="M4 8h3l1.6-2.5h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8zm8 2.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z" fillRule="evenodd" />,
  retry: <path d="M12 4a8 8 0 1 1-7.4 5h2.3A5.9 5.9 0 1 0 12 6.1v2.6L7.6 5 12 1.4V4z" />,
  tag: <path d="M3 3h8.2l9.5 9.5a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0L3 11.2V3zm4.5 2.8a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z" fillRule="evenodd" />,
  star: <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />,
  bookmark: <path d="M6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-7-4.6L5 21V4.5A1.5 1.5 0 0 1 6.5 3z" />,
  share: <path d="M12 2l4.5 4.5-1.5 1.4-2-2V14h-2V5.9l-2 2-1.5-1.4L12 2zM5 10h3v2H6v7h12v-7h-2v-2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />,
  swatch: <path d="M4 3h7v18H6.5A2.5 2.5 0 0 1 4 18.5V3zm3.5 14a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM13 7.3l3.3-3.3 4.9 4.9L13 17.1V7.3zm0 12.6L18.9 14H21v7h-8v-1.1z" fillRule="evenodd" />,
  lock: <path d="M12 2a5 5 0 0 1 5 5v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10H7V7a5 5 0 0 1 5-5zm0 2.2A2.8 2.8 0 0 0 9.2 7v3h5.6V7A2.8 2.8 0 0 0 12 4.2z" fillRule="evenodd" />,
}

// A record sliding out of its sleeve; the hero picture where the live app
// isn't beside the copy (phones and tablets).
function SleeveArt() {
  return (
    <svg className="lp-art" viewBox="0 0 300 220" aria-hidden="true">
      <defs>
        <linearGradient id="lp-sleeve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c6d8" />
          <stop offset="1" stopColor="#6a81a0" />
        </linearGradient>
        <linearGradient id="lp-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc56b" />
          <stop offset="1" stopColor="#e2761b" />
        </linearGradient>
        <radialGradient id="lp-sheen" cx=".5" cy=".5" r=".5">
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset=".8" stopColor="#fff" stopOpacity=".1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="186" cy="110" r="96" fill="#0d0d0d" />
      {[84, 72, 60, 48].map(r => <circle key={r} cx="186" cy="110" r={r} fill="none" stroke="#2a2a2a" strokeWidth="1" />)}
      <circle cx="186" cy="110" r="96" fill="url(#lp-sheen)" />
      <circle cx="186" cy="110" r="32" fill="url(#lp-label)" />
      <circle cx="186" cy="110" r="4" fill="#0d0d0d" />
      <rect x="8" y="10" width="200" height="200" rx="6" fill="url(#lp-sleeve)" stroke="#3d4c61" strokeWidth="2" />
      <path d="M10 12h196v84C140 112 76 112 10 96z" fill="#fff" opacity=".16" />
    </svg>
  )
}

export default function Landing({ active, featured, onSignIn, onDemo, onBrowse, children }) {
  return (
    <div className="lp-root">
      {active && (
        <>
          <header className="lp-copy lp-top">
            <span className="lp-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" width="36" height="36" />
              Vinyl Sleeve
            </span>
            <button className="lp-btn small" onClick={onSignIn}>Sign In</button>
          </header>

          <section className="lp-copy lp-hero">
            <SleeveArt />
            <p className="lp-eyebrow">Your record collection, sorted</p>
            <h1>Snap the sleeve. Know the record.</h1>
            <p className="lp-lede">
              Photograph any record cover and Vinyl Sleeve names it, finds the exact pressing on Discogs and files it in your collection. No barcode needed.
            </p>
            <div className="lp-actions">
              <button className="lp-btn primary" onClick={onSignIn}>Create Free Account</button>
              <button className="lp-btn" onClick={onDemo}>Try the Demo</button>
            </div>
            <p className="lp-note">
              Free. Nothing to download. Works on any phone or computer.
              {featured && <> Or <button className="lp-link" onClick={onBrowse}>browse a real collection</button>.</>}
            </p>
            <p className="lp-live wide">That phone is the real app, running live. Go on, click around.</p>
            <p className="lp-live mid">The real app is running just below. Go on, tap around.</p>
          </section>
        </>
      )}

      <div className="lp-stage">{children}</div>

      {active && (
        <>
          <main className="lp-copy lp-main">
            <section>
              <p className="lp-eyebrow">How it works</p>
              <h2>Three taps from shelf to screen</h2>
              <ol className="lp-panel lp-steps">
                {STEPS.map(([title, text], i) => (
                  <li key={title}>
                    <span className="lp-num" aria-hidden="true">{i + 1}</span>
                    <span><strong>{title}</strong>{text}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <p className="lp-eyebrow">What you get</p>
              <h2>Built for people who buy records</h2>
              <ul className="lp-features">
                {FEATURES.map(([icon, title, text]) => (
                  <li key={title}>
                    <span className="lp-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{ICONS[icon]}</svg></span>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="lp-eyebrow">Questions</p>
              <h2>Good to know</h2>
              <div className="lp-panel lp-faq">
                {FAQ.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="lp-close">
              <h2>Put your shelf in your pocket</h2>
              <div className="lp-actions">
                <button className="lp-btn primary" onClick={onSignIn}>Create Free Account</button>
                <button className="lp-btn" onClick={onDemo}>Try the Demo</button>
              </div>
            </section>
          </main>

          <footer className="lp-copy lp-foot">
            <nav>
              <a href="/support/">Support</a>
              <a href="/privacy/">Privacy</a>
              <a href="/terms/">Terms</a>
              <a href="/delete-account/">Delete Your Account</a>
            </nav>
            <p>
              Vinyl Sleeve by Tonso Productions. Covers read by Claude, pressings from Discogs. Discogs and Claude are marks of their respective owners; Vinyl Sleeve is not affiliated with or endorsed by Discogs, Anthropic or Apple.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
