'use client'
import { useState } from 'react'
import { CoverArt, ShuffleIcon } from '@/components/ui'
import { CoverFlow, click, useSpin } from '@/components/Nano'

// The Wood Hi-Fi theme's browse screen: a walnut turntable. The record on
// the platter wears the current album's cover as its label; flip through the
// sleeves in the crate below it, or turn the brass knob. Takes the same props
// as Nano (the iPod theme's browse screen) so app/page.js can swap them.
export default function Deck({ albums, index, setIndex, onSelect, onMenu, onShuffle }) {
  // How far the knob has been turned, for its pointer mark.
  const [turn, setTurn] = useState(0)
  const current = albums[index]

  const step = dir => {
    setTurn(t => t + dir * 22)
    const next = Math.max(0, Math.min(albums.length - 1, index + dir))
    if (next !== index) { setIndex(next); click() }
  }
  const shuffle = () => {
    const pick = onShuffle()
    if (pick) { setIndex(albums.indexOf(pick)); setTurn(t => t + 132); click() }
  }

  const { ref, handlers } = useSpin({ onStep: step, onTap: () => current && onSelect(current) })

  return (
    <div className="deck-stage">
      <div className="deck">
        <div className="deck-top">
          <button
            className="deck-platter"
            aria-label={current ? `Open ${current.title}` : 'No albums'}
            disabled={!current}
            onClick={() => current && onSelect(current)}
          >
            {/* Keyed so each record drops onto the platter afresh. */}
            <span className="deck-record" key={current?.id ?? 'empty'}>
              <span className="deck-label">{current && <CoverArt album={current} />}</span>
              <span className="deck-spindle" />
            </span>
          </button>
          <span className="deck-arm" aria-hidden="true"><i /></span>
        </div>

        <div className="deck-plate">
          <strong>{current?.title || (albums.length ? 'Untitled' : 'No Albums')}</strong>
          <span>{current ? [current.artist, current.year].filter(Boolean).join(' · ') : 'Add a record from the Import tab'}</span>
        </div>

        <div className="deck-crate">
          <CoverFlow albums={albums} index={index} setIndex={setIndex} onSelect={onSelect} size={84} label="Record crate" />
        </div>

        <div className="deck-controls">
          <button className="deck-key" onClick={onMenu}>Albums</button>
          <div className="deck-knob" ref={ref} {...handlers} role="slider" aria-label="Browse records" aria-valuemin={1} aria-valuemax={Math.max(1, albums.length)} aria-valuenow={index + 1} tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1)
              else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1)
              else if (e.key === 'Enter' && current) onSelect(current)
            }}
          >
            <span className="deck-knob-cap" style={{ transform: `rotate(${turn}deg)` }}><i /></span>
          </div>
          <button className="deck-key" onClick={shuffle} disabled={albums.length < 2}><ShuffleIcon size={14} />Shuffle</button>
        </div>
      </div>
      <div className="deck-hint">Turn the knob or drag the sleeves. Tap the record to open it.</div>
    </div>
  )
}
