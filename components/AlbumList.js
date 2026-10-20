'use client'
import { useState, useRef } from 'react'
import { Chevron, CoverArt, ShuffleIcon } from '@/components/ui'
import { sortKey } from '@/lib/albums'

function sectionLetter(album) {
  const c = sortKey(album).charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : '#'
}

// The Favorites filter sits in the genre bar but matches starred records.
const FAVORITES = '★ Favorites'

// kind="wishlist" lists a wish list: no shuffle, favorites or shake tip.
// readOnly: someone else's, seen from a share link.
export default function AlbumList({ albums, kind = 'albums', readOnly, initialGenre, editing, onOpen, onDelete, onShuffle }) {
  const wishes = kind === 'wishlist'
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState(initialGenre || 'All')
  const [armed, setArmed] = useState(null)
  const scrollRef = useRef(null)

  const hasFavorites = !wishes && albums.some(a => a.favorite)
  const genreList = [...new Set(albums.map(a => a.genre).filter(Boolean))].sort()
  const genres = ['All', ...(hasFavorites ? [FAVORITES] : []), ...genreList]
  // A filter that no longer matches anything (the last favorite unstarred) falls back to All.
  const scope = genres.includes(genre) ? genre : 'All'
  const q = search.trim().toLowerCase()
  const visible = albums
    .filter(a => scope === 'All' || (scope === FAVORITES ? a.favorite : a.genre === scope))
    .filter(a => !q || [a.artist, a.title, a.genre, a.label].join(' ').toLowerCase().includes(q))

  const sections = []
  for (const album of visible) {
    const letter = sectionLetter(album)
    if (sections.at(-1)?.letter !== letter) sections.push({ letter, albums: [] })
    sections.at(-1).albums.push(album)
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
          {wishes && readOnly ? (
            <>
              <strong>Nothing on This Wish List</strong>
              <small>This collector hasn’t added any records they’re hunting for yet.</small>
            </>
          ) : wishes ? (
            <>
              <strong>Your Wish List Is Empty</strong>
              <small>Find a record on the Import tab, then tap Add to Wish List. When you buy it, tap Got It to move it into your collection.</small>
            </>
          ) : (
            <>
              <strong>No Albums</strong>
              <small>Add a record from the Import tab. Photograph the cover and Vinyl Crate looks up the pressing for you.</small>
            </>
          )}
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
            {genres.map(g => <button key={g} className={g === scope ? 'on' : ''} onClick={() => setGenre(g)}>{g}</button>)}
          </div>
        )}

        {!wishes && visible.length > 1 && !editing && (
          <button className="shuffle-row" onClick={() => onShuffle(visible)}>
            Shuffle{scope === FAVORITES ? ' Favorites' : scope !== 'All' ? ` ${scope}` : q ? ' Results' : ''}
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
                    <strong>{!wishes && a.favorite && <span className="fav-star" aria-label="Favorite">★</span>}{a.title || 'Untitled'}</strong>
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
          {albums.length} {wishes ? (albums.length === 1 ? 'Wish' : 'Wishes') : albums.length === 1 ? 'Album' : 'Albums'}
          <small>{artistCount} {artistCount === 1 ? 'Artist' : 'Artists'}{totalValue > 0 ? ` · $${totalValue.toFixed(0)} ${wishes ? 'est. cost' : 'est. value'}` : ''}</small>
          {!wishes && albums.length > 1 && <small className="shake-tip">Shake your phone to shuffle</small>}
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
