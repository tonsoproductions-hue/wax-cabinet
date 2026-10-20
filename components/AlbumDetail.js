'use client'
import { useEffect, useState } from 'react'
import { CoverArt, Spinner } from '@/components/ui'
import { apiUrl } from '@/lib/supabase'

export default function AlbumDetail({ album, onDelete, onFavorite, onGotIt, onRotate }) {
  const [fetched, setFetched] = useState(null)
  const [rotating, setRotating] = useState(false)
  const needsTracks = !album.tracklist?.length && !!album.discogs_id

  useEffect(() => {
    if (!needsTracks) return
    let cancelled = false
    fetch(apiUrl(`/api/discogs?id=${album.discogs_id}`))
      .then(r => r.json())
      .then(d => { if (!cancelled) setFetched({ id: album.id, tracks: d.tracklist ?? [] }) })
      .catch(() => { if (!cancelled) setFetched({ id: album.id, tracks: [] }) })
    return () => { cancelled = true }
  }, [album.id, album.discogs_id, needsTracks])

  const tracks = needsTracks ? (fetched?.id === album.id ? fetched.tracks : null) : album.tracklist ?? []

  const info = [
    ['Label', album.label],
    ['Genre', album.genre],
    ['Condition', album.condition],
    ['Value', album.market_value != null ? `$${Number(album.market_value).toFixed(2)}` : null],
  ].filter(([, v]) => v)

  return (
    <div className="scroll detail push-in">
      <div className="detail-art">
        <CoverArt album={album} />
        <div className="reflection" aria-hidden="true"><CoverArt album={album} /></div>
      </div>
      <div className="detail-titles">
        <strong>{album.title || 'Untitled'}</strong>
        <span>{album.artist}</span>
        {album.year && <small>{album.year}</small>}
        <div className="detail-actions">
          {onFavorite && !album.wanted && (
            <button
              className={`pill-btn${album.favorite ? ' on' : ''}`}
              aria-pressed={!!album.favorite}
              onClick={() => onFavorite(album)}
            >
              {album.favorite ? '★ Favorite' : '☆ Add to Favorites'}
            </button>
          )}
          {onRotate && (
            <button
              className="pill-btn"
              disabled={rotating}
              onClick={async () => { setRotating(true); await onRotate(album); setRotating(false) }}
            >
              {rotating ? 'Rotating…' : '↻ Rotate'}
            </button>
          )}
        </div>
      </div>

      {(info.length > 0 || album.discogs_id) && (
        <div className="dark-list">
          {info.map(([k, v]) => (
            <div key={k} className="dark-row"><span className="key">{k}</span><span>{v}</span></div>
          ))}
          {album.discogs_id && (
            <div className="dark-row">
              <span className="key">Discogs</span>
              <a href={`https://www.discogs.com/release/${album.discogs_id}`} target="_blank" rel="noreferrer">Release #{album.discogs_id} ›</a>
            </div>
          )}
        </div>
      )}

      {tracks === null && <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner light /></div>}
      {tracks?.length > 0 && (
        <>
          <div className="dark-label">Tracks</div>
          <div className="dark-list">
            {tracks.map((t, i) => (
              <div key={i} className="dark-row">
                <span className="pos">{t.position}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <span className="dur">{t.duration}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {onGotIt && album.wanted && (
        <button className="big-btn got-it" onClick={() => onGotIt(album)}>Got It — Move to Collection</button>
      )}
      {onDelete && (
        <button className="big-btn red" onClick={() => onDelete(album)}>
          {album.wanted ? 'Remove from Wish List' : 'Remove from Collection'}
        </button>
      )}
    </div>
  )
}
