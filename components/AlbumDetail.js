'use client'
import { useEffect, useState } from 'react'
import { CoverArt, Spinner } from '@/components/ui'
import { fetchJson, explain } from '@/lib/errors'

export default function AlbumDetail({ album, onDelete }) {
  const [fetched, setFetched] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const needsTracks = !album.tracklist?.length && !!album.discogs_id

  useEffect(() => {
    if (!needsTracks) return
    let cancelled = false
    fetchJson(`/api/discogs?id=${album.discogs_id}`)
      .then(d => { if (!cancelled) setFetched({ id: album.id, tracks: d.tracklist ?? [] }) })
      .catch(err => { if (!cancelled) setFetched({ id: album.id, tracks: [], error: explain(err) }) })
    return () => { cancelled = true }
  }, [album.id, album.discogs_id, needsTracks, attempt])

  const current = fetched?.id === album.id ? fetched : null
  const tracks = needsTracks ? (current && !current.error ? current.tracks : current ? [] : null) : album.tracklist ?? []
  const tracksError = needsTracks ? current?.error : null

  function retryTracks() {
    setFetched(null)
    setAttempt(n => n + 1)
  }

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
      {tracksError && (
        <div className="dark-note">
          Couldn’t load the tracklist from Discogs. {tracksError}
          <button onClick={retryTracks}>Try Again</button>
        </div>
      )}
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

      {onDelete && <button className="big-btn red" onClick={() => onDelete(album)}>Remove from Collection</button>}
    </div>
  )
}
