'use client'
import { useSyncExternalStore } from 'react'

function subscribeToClock(onChange) {
  const timer = setInterval(onChange, 10000)
  return () => clearInterval(timer)
}
const readClock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function StatusBar() {
  const time = useSyncExternalStore(subscribeToClock, readClock, () => '')
  return (
    <div className="status-bar">
      <span className="status-carrier">
        <span className="signal">{[3, 5, 7, 9, 10].map(h => <i key={h} style={{ height: h }} />)}</span>
        Vinyl
      </span>
      <span>{time}</span>
      <span className="status-right"><span className="battery"><i /></span></span>
    </div>
  )
}

export function NavBar({ title, left, right, variant }) {
  return (
    <div className={`nav-bar${variant ? ' ' + variant : ''}`}>
      <div className="nav-side">{left}</div>
      <h1>{title}</h1>
      <div className="nav-side right">{right}</div>
    </div>
  )
}

// Eight-tooth gear centred in a 30×30 box, with a hole in the middle.
function gearPath() {
  const pts = []
  for (let i = 0; i < 32; i++) {
    const r = i % 4 < 2 ? 13 : 9.5
    const a = ((i + 0.5) / 32) * Math.PI * 2
    pts.push(`${(15 + r * Math.cos(a)).toFixed(2)} ${(15 + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}z M15 10.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z`
}

const TAB_ICONS = {
  import: (
    <path fillRule="evenodd" d="M5 9h3.2l2-3h7.6l2 3H23a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 23 23H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 9zm9 2.5a5 5 0 1 0 0 10a5 5 0 1 0 0-10zm0 2.3a2.7 2.7 0 1 1 0 5.4a2.7 2.7 0 1 1 0-5.4z" />
  ),
  albums: (
    <path fillRule="evenodd" d="M15 3a12 12 0 1 1 0 24a12 12 0 1 1 0-24zm0 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zm0 2.2a.8.8 0 1 1 0 1.6a.8.8 0 1 1 0-1.6z" />
  ),
  coverflow: (
    <path d="M2 8.5l6 2v9l-6 2zM10 6h10v18H10zM28 8.5l-6 2v9l6 2z" />
  ),
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <nav className="tab-bar">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="tab-on" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d6ecff" />
            <stop offset=".5" stopColor="#5ab4ff" />
            <stop offset=".5" stopColor="#1e8cf5" />
            <stop offset="1" stopColor="#0d6fd8" />
          </linearGradient>
          <linearGradient id="tab-off" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7a7a7" />
            <stop offset="1" stopColor="#5e5e5e" />
          </linearGradient>
        </defs>
      </svg>
      {tabs.map(t => (
        <button key={t.id} className={`tab-item${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          <svg viewBox="0 0 30 30" fill={`url(#${active === t.id ? 'tab-on' : 'tab-off'})`}>{TAB_ICONS[t.id]}</svg>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export function GearIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="#fff" aria-hidden="true" style={{ filter: 'drop-shadow(0 -1px 0 rgba(0,0,0,.45))' }}>
      <path fillRule="evenodd" d={gearPath()} />
    </svg>
  )
}

export function Chevron({ color = '#8c8c8c' }) {
  return (
    <svg className="chevron" viewBox="0 0 9 14" aria-hidden="true">
      <path d="M1.5 1.5L7 7l-5.5 5.5" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShuffleIcon({ color = 'currentColor', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5h3c3 0 4 10 7 10h5M2 15h3c1.4 0 2.3-2 3-4M11.5 7c.7-1.2 1.4-2 2.5-2h3" />
      <path d="M15 2.5L17.5 5 15 7.5M15 12.5l2.5 2.5-2.5 2.5" />
    </svg>
  )
}

export function Spinner({ light }) {
  return (
    <span className={`spinner${light ? ' light' : ''}`} aria-label="Loading">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ transform: `rotate(${i * 30}deg)`, opacity: 0.25 + (i / 12) * 0.75 }} />
      ))}
    </span>
  )
}

export function CoverArt({ album }) {
  return album?.image_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={album.image_url} alt="" draggable={false} />
    : <div className="art-ph" />
}

export function AlertView({ alert, onChoose }) {
  if (!alert) return null
  return (
    <div className="alert-backdrop" role="alertdialog" aria-labelledby="alert-title">
      <div className="alert">
        <h2 id="alert-title">{alert.title}</h2>
        {alert.message && <p>{alert.message}</p>}
        <div className="alert-buttons">
          {alert.buttons.map((b, i) => (
            <button key={b} className={i === alert.buttons.length - 1 ? 'primary' : ''} onClick={() => onChoose(b)}>{b}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
