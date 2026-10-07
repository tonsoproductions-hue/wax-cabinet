'use client'
import { useRef } from 'react'
import { CoverArt } from '@/components/ui'

export const NANO_COLORS = {
  silver: '#d4d6d8',
  black: '#2b2b2d',
  blue: '#3f7fc8',
  green: '#7ab648',
  pink: '#e2649f',
  red: '#c8102e',
}

const STEP_DEGREES = 22

let audio
function click() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'square'
    osc.frequency.value = 2400
    gain.gain.setValueAtTime(0.03, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.012)
    osc.connect(gain).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + 0.015)
  } catch {
    // Sound is decoration; ignore browsers that block it.
  }
}

function CoverFlow({ albums, index, setIndex, onSelect }) {
  const size = 104
  const drag = useRef(null)
  const wheelAcc = useRef(0)

  function go(i) {
    const next = Math.max(0, Math.min(albums.length - 1, i))
    if (next !== index) { setIndex(next); click() }
  }

  function onPointerDown(e) {
    drag.current = { x: e.clientX, start: index, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    go(drag.current.start - Math.round(dx / (size * 0.32)))
  }
  function onPointerUp(e) {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    // Pointer capture retargets the event to the container, so hit-test the point.
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-i]')
    if (!target) return
    const i = Number(target.dataset.i)
    if (i === index) onSelect(albums[i])
    else go(i)
  }
  function onWheel(e) {
    wheelAcc.current += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(wheelAcc.current) >= 40) {
      go(index + Math.sign(wheelAcc.current))
      wheelAcc.current = 0
    }
  }
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') go(index - 1)
    else if (e.key === 'ArrowRight') go(index + 1)
    else if (e.key === 'Enter' && albums[index]) onSelect(albums[index])
  }

  if (albums.length === 0) return <div className="coverflow"><div className="cf-empty">No Albums</div></div>

  const current = albums[index]
  return (
    <div
      className="coverflow"
      style={{ '--cf-size': `${size}px` }}
      tabIndex={0}
      aria-label="Cover Flow"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null }}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      {albums.map((a, i) => {
        const d = i - index
        if (Math.abs(d) > 7) return null
        const s = Math.sign(d)
        const x = d === 0 ? 0 : s * (size * 0.68 + (Math.abs(d) - 1) * size * 0.26)
        const transform = d === 0
          ? 'translateZ(30px)'
          : `translateX(${x}px) translateZ(-60px) rotateY(${-s * 68}deg)`
        return (
          <div key={a.id} data-i={i} className="cf-item" style={{ transform, zIndex: 50 - Math.abs(d), filter: d === 0 ? 'none' : 'brightness(.72)' }}>
            <CoverArt album={a} />
            <div className="reflection" aria-hidden="true"><CoverArt album={a} /></div>
          </div>
        )
      })}
      <div className="cf-caption">
        <strong>{current.title}</strong>
        <span>{current.artist}</span>
      </div>
    </div>
  )
}

function ClickWheel({ onStep, onMenu, onPrev, onNext, onPlay, onCenter }) {
  const ref = useRef(null)
  const state = useRef(null)
  const wheelAcc = useRef(0)

  function angleOf(e) {
    const r = ref.current.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI
  }

  function onPointerDown(e) {
    if (e.target.closest('.wheel-center')) return
    ref.current.setPointerCapture(e.pointerId)
    const a = angleOf(e)
    state.current = { last: a, start: a, acc: 0, travel: 0 }
  }
  function onPointerMove(e) {
    const s = state.current
    if (!s) return
    const a = angleOf(e)
    let delta = a - s.last
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    s.last = a
    s.acc += delta
    s.travel += Math.abs(delta)
    while (s.acc >= STEP_DEGREES) { onStep(1); s.acc -= STEP_DEGREES }
    while (s.acc <= -STEP_DEGREES) { onStep(-1); s.acc += STEP_DEGREES }
  }
  function onPointerUp() {
    const s = state.current
    state.current = null
    if (!s || s.travel > 10) return
    // A tap rather than a spin: press the button under the finger.
    const a = s.start
    if (a > -135 && a < -45) onMenu()
    else if (a >= -45 && a <= 45) onNext()
    else if (a > 45 && a < 135) onPlay()
    else onPrev()
  }
  function onWheel(e) {
    wheelAcc.current += e.deltaY
    if (Math.abs(wheelAcc.current) >= 40) {
      onStep(Math.sign(wheelAcc.current))
      wheelAcc.current = 0
    }
  }

  return (
    <div
      className="wheel"
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { state.current = null }}
      onWheel={onWheel}
      role="group"
      aria-label="Click wheel"
    >
      <span className="wheel-label top">MENU</span>
      <span className="wheel-label left"><svg viewBox="0 0 18 12" fill="currentColor"><path d="M2 1h2v10H2zM10 1v10L4 6zM17 1v10l-6-5z" /></svg></span>
      <span className="wheel-label right"><svg viewBox="0 0 18 12" fill="currentColor"><path d="M1 1v10l6-5zM8 1v10l6-5zM14 1h2v10h-2z" /></svg></span>
      <span className="wheel-label bottom"><svg viewBox="0 0 18 12" fill="currentColor"><path d="M2 1v10l6-5zM11 1h2.2v10H11zM14.8 1H17v10h-2.2z" /></svg></span>
      <button className="wheel-center" aria-label="Select" onClick={onCenter} />
    </div>
  )
}

export default function Nano({ albums, index, setIndex, color, setColor, onSelect, onMenu }) {
  const step = dir => {
    const next = Math.max(0, Math.min(albums.length - 1, index + dir))
    if (next !== index) { setIndex(next); click() }
  }
  const shuffle = () => {
    if (albums.length > 1) { setIndex(Math.floor(Math.random() * albums.length)); click() }
  }
  const current = albums[index]

  return (
    <div className="nano-stage">
      <div className={`nano${color === 'black' ? ' black' : ''}`} style={{ '--nano': NANO_COLORS[color] }}>
        <div className="nano-screen">
          <div className="nano-header">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 0v8l7-4z" fill="#1a6fd8" /></svg>
            <span>Cover Flow</span>
            <span className="battery"><i /></span>
          </div>
          <CoverFlow albums={albums} index={index} setIndex={setIndex} onSelect={onSelect} />
        </div>
        <ClickWheel
          onStep={step}
          onMenu={onMenu}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onPlay={shuffle}
          onCenter={() => current && onSelect(current)}
        />
      </div>
      <div className="swatches">
        {Object.entries(NANO_COLORS).map(([name, hex]) => (
          <button key={name} className={`swatch${name === color ? ' on' : ''}`} style={{ background: hex }} aria-label={`${name} nano`} onClick={() => setColor(name)} />
        ))}
      </div>
      <div className="nano-hint">Spin the wheel or drag the covers. Center button opens an album, ▶❙❙ shuffles, MENU goes back to Albums.</div>
    </div>
  )
}
