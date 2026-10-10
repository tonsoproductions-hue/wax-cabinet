'use client'
import { useState, useRef } from 'react'
import { Chevron, CoverArt, ShuffleIcon } from '@/components/ui'
import { sortKey } from '@/lib/albums'

function sectionLetter(album) {
  // Accented letters file under their base letter: Édith Piaf goes in E.
  const c = sortKey(album).normalize('NFD').charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : '#'
}

export default function AlbumList({ albums, initialGenre, editing, onOpen, onDelete, onShuffle }) {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState(initialGenre || 'All')
  const [armed, setArmed] = useState(null)
  const scrollRef = useRef(null)

  const genres = ['All', ...[...new Set(albums.map(a => a.genre).filter(Boolean))].sort()]
  const q = search.trim().toLowerCase()
  const visible = albums
    .filter(a => genre === 'All' || a.genre === genre)
    .filter(a => !q || [a.artist, a.title, a.genre, a.label].join(' ').toLowerCase().includes(q))

  // One section per letter. Everything under # (numbers, other alphabets)
  // shares a section even when the sort puts it in more than one place.
  const sections = []
  const byLetter = new Map()
  for (const album of visible) {
    const letter = sectionLetter(album)
    if (!byLetter.has(letter)) {
      byLetter.set(letter, { letter, albums: [] })
      sections.push(byLetter.get(letter))
    }
    byLetter.get(letter).albums.push(album)
  }

  const artistCount = new Set(albums.map(a => a.artist)).size
  const totalValue = albums.reduce((s, a) => s + (Number(a.market_value) || 0), 0)

  const showIndex = !q && !editing && sections.length > 4

  function jumpTo(letter) {
    scrollRef.current?.querySelector(`[data-letter="${letter}"]`)?.scrollIntoView({ block: 'start' })
  }

  if (albums.length === 0) {
    return (
      <div className="scroll albums">
        <div className="empty">
          <strong>No Albums</strong>
          <small>Add a record from the Import tab. Photograph the cover and Vinyl Crate looks up the pressing for you.</small>
        </div>
      </div>
    )
  }

  return (
    <div className="albums-wrap">
      <div className={`scroll albums${showIndex ? ' indexed' : ''}`} ref={scrollRef}>
        <div className="search-bar">
          <div className="search-field">
            <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4.2" fill="none" stroke="#8a8a8a" strokeWidth="1.8" /><path d="M8.6 8.6L13 13" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" /></svg>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
          </div>
        </div>
        {genres.length > 2 && (
          <div className="scope-bar">
            {genres.map(g => <button key={g} className={g === genre ? 'on' : ''} onClick={() => setGenre(g)}>{g}</button>)}
          </div>
        )}

        {visible.length > 1 && !editing && (
          <button className="shuffle-row" onClick={() => onShuffle(visible)}>
            Shuffle{genre !== 'All' ? ` ${genre}` : q ? ' Results' : ''}
            <ShuffleIcon color="#385487" />
          </button>
        )}

        {sections.map(s => (
          <section key={s.letter}>
            <div className="section-header" data-letter={s.letter}>{s.letter}</div>
            {s.albums.map(a => (
              <div key={a.id} style={{ position: 'relative' }}>
                <button
                  className="album-row"
                  onClick={() => editing ? setArmed(armed === a.id ? null : a.id) : onOpen(a)}
                >
                  {editing && <span className={`minus-btn${armed === a.id ? ' armed' : ''}`} />}
                  <CoverArt album={a} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{a.title || 'Untitled'}</strong>
                    <small>{[a.artist, a.year].filter(Boolean).join(' — ')}</small>
                  </span>
                  {!editing && <Chevron />}
                </button>
                {editing && armed === a.id && (
                  <button className="delete-btn" onClick={() => { setArmed(null); onDelete(a) }}>Delete</button>
                )}
              </div>
            ))}
          </section>
        ))}

        {visible.length === 0 && <div className="empty"><strong>No Results</strong></div>}

        <div className="list-footer">
          {albums.length} {albums.length === 1 ? 'Album' : 'Albums'}
          <small>{artistCount} {artistCount === 1 ? 'Artist' : 'Artists'}{totalValue > 0 ? ` · $${totalValue.toFixed(0)} est. value` : ''}</small>
          {albums.length > 1 && <small className="shake-tip">Shake your phone to shuffle</small>}
        </div>
      </div>
      {showIndex && (
        <div className="section-index">
          {sections.map(s => <button key={s.letter} onClick={() => jumpTo(s.letter)}>{s.letter}</button>)}
        </div>
      )}
    </div>
  )
}
