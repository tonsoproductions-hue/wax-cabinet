'use client'
import { useRef, useState } from 'react'
import { supabase, authHeaders } from '@/lib/supabase'
import { GENRES, CONDITIONS } from '@/lib/genres'
import { Chevron, Spinner } from '@/components/ui'

const EMPTY_FORM = {
  artist: '', title: '', year: '', genre: 'Jazz',
  label: '', condition: 'Near Mint (NM)', discogs_id: '', market_value: ''
}

const TEXT_FIELDS = [
  ['Artist', 'artist', 'text'],
  ['Title', 'title', 'text'],
  ['Year', 'year', 'numeric'],
  ['Label', 'label', 'text'],
  ['Value ($)', 'market_value', 'decimal'],
  ['Discogs ID', 'discogs_id', 'numeric'],
]

// The server gives up on Claude within ~35s and on Discogs within 10s; these
// are the app's own backstops.
const CLAUDE_TIMEOUT_MS = 45_000
const DISCOGS_TIMEOUT_MS = 15_000

export default function ImportScreen({ user, onAdded, ask }) {
  const [imageData, setImageData] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [procStatus, setProcStatus] = useState('')
  const [discogsResults, setDiscogsResults] = useState([])
  const [selectedDiscogs, setSelectedDiscogs] = useState(null)
  const [tracklist, setTracklist] = useState([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [identifiedBy, setIdentifiedBy] = useState(null)
  // Fixing a wrong match: answers the owner rejected, their hint for Claude,
  // and a free-text Discogs search.
  const [rejected, setRejected] = useState([])
  const [hint, setHint] = useState('')
  const [discogsQuery, setDiscogsQuery] = useState('')
  // Text search instead of a photo: what's typed in the box, the search
  // being identified, and the cover of the chosen pressing (used as the
  // record's artwork when there's no photo).
  const [searchText, setSearchText] = useState('')
  const [textQuery, setTextQuery] = useState('')
  const [discogsCover, setDiscogsCover] = useState(null)
  const started = !!(imageData || textQuery)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setTextQuery('')
    setDiscogsCover(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      // Resize before sending to the vision model
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const maxSize = 800
        let w = img.width
        let h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize }
          else { w = (w / h) * maxSize; h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const resized = canvas.toDataURL('image/jpeg', 0.85)
        setImageData(resized)
        setProgress(10)
        setDiscogsResults([])
        setSelectedDiscogs(null)
        setTracklist([])
        setRejected([])
        setHint('')
        setDiscogsQuery('')
        await identify({ base64: resized.split(',')[1], mediaType: 'image/jpeg' })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  // One request at a time: a new scan or search, or Start Over, cancels the
  // previous one, and late answers from a cancelled request are ignored. Each
  // request also gives up after a time limit so the screen can never hang.
  const active = useRef(null)

  function startRequest(ms) {
    active.current?.controller.abort()
    const req = { controller: new AbortController(), timedOut: false }
    req.timer = setTimeout(() => { req.timedOut = true; req.controller.abort() }, ms)
    active.current = req
    return req
  }
  const endRequest = req => clearTimeout(req.timer)
  const isStale = req => active.current !== req
  function cancelRequest() {
    if (!active.current) return
    endRequest(active.current)
    active.current.controller.abort()
    active.current = null
  }

  function finishProcessing(status) {
    setProcessing(false)
    setProgress(100)
    setProcStatus(status)
  }

  // What Claude identifies from: the photo, or the words typed in the search box.
  const currentSource = () => (imageData
    ? { base64: imageData.split(',')[1], mediaType: 'image/jpeg' }
    : { text: textQuery })

  // source: { base64, mediaType } for a photo or { text } for a typed search.
  // retry: the owner says the last answer was wrong (or added a hint), so the
  // server skips to a stronger model and avoids the rejected answers.
  async function identify(source, { retry = false, hint: withHint, rejected: skip } = {}) {
    const isText = !!source.text
    const req = startRequest(CLAUDE_TIMEOUT_MS)
    setProcessing(true)
    setProcStatus(isText
      ? (retry ? 'Claude is thinking of another match…' : 'Claude is working out which record that is…')
      : (retry ? 'Claude is taking a closer look…' : 'Claude is reading the cover…'))
    setProgress(25)
    try {
      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ...source, retry, hint: withHint || undefined, rejected: skip?.length ? skip : undefined }),
        signal: req.controller.signal,
      })
      const { error, identifiedBy: model, repeated, ...album } = await resp.json()
      endRequest(req)
      if (isStale(req)) return
      if (error) throw new Error(error)
      setIdentifiedBy(model ?? null)
      if (!album.artist && !album.title) {
        finishProcessing(isText
          ? 'Couldn’t work out that record. Try other words or search Discogs below.'
          : retry ? 'Still couldn’t read it. Try a hint or search Discogs below.' : 'Couldn’t read the cover. Fill in the details below.')
        return
      }
      if (repeated) {
        finishProcessing(`Claude still thinks this is ${album.title}. Add a hint or search Discogs below.`)
        return
      }
      // A new answer replaces the old pick, so drop its Discogs id, price and tracks.
      setForm(f => ({ ...f, ...album, discogs_id: '', market_value: '' }))
      setSelectedDiscogs(null)
      setDiscogsCover(null)
      setTracklist([])
      const query = `${album.artist} ${album.title}`.trim()
      setDiscogsQuery(query)
      setProgress(55)
      await searchDiscogs(query)
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('identify failed:', err)
      finishProcessing(req.timedOut
        ? 'Claude took too long. Try again or search Discogs below.'
        : 'Couldn’t identify it. Fill in the details below.')
    }
  }

  function askAgain() {
    const guess = [form.artist, form.title].filter(Boolean).join(' — ')
    const next = guess && !rejected.includes(guess) ? [...rejected, guess] : rejected
    setRejected(next)
    identify(currentSource(), { retry: true, hint: hint.trim(), rejected: next })
  }

  function askWithHint(e) {
    e.preventDefault()
    if (!hint.trim()) return
    identify(currentSource(), { retry: true, hint: hint.trim(), rejected })
  }

  // Look a record up by name or description instead of a photo.
  function searchByText(e) {
    e.preventDefault()
    const q = searchText.trim()
    if (!q) return
    setImageData(null)
    setImageFile(null)
    setTextQuery(q)
    setDiscogsResults([])
    setSelectedDiscogs(null)
    setDiscogsCover(null)
    setTracklist([])
    setRejected([])
    setHint('')
    setDiscogsQuery('')
    setIdentifiedBy(null)
    setForm(EMPTY_FORM)
    setProgress(10)
    identify({ text: q })
  }

  function searchDiscogsYourself(e) {
    e.preventDefault()
    if (!discogsQuery.trim()) return
    setSelectedDiscogs(null)
    searchDiscogs(discogsQuery.trim())
  }

  async function searchDiscogs(q) {
    const req = startRequest(DISCOGS_TIMEOUT_MS)
    setProcessing(true)
    setProcStatus('Searching Discogs…')
    try {
      const resp = await fetch(`/api/discogs?q=${encodeURIComponent(q)}`, { signal: req.controller.signal })
      const data = await resp.json()
      endRequest(req)
      if (isStale(req)) return
      if (data.error) throw new Error(data.error)
      const results = data.results?.slice(0, 4) || []
      setDiscogsResults(results)
      finishProcessing(results.length > 0 ? 'Choose your pressing below.' : 'No Discogs matches. Fill in the details below.')
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('searchDiscogs failed:', err)
      setDiscogsResults([])
      finishProcessing(req.timedOut
        ? 'Discogs took too long. Try the search again or fill in the details below.'
        : 'Discogs search failed. Fill in the details below.')
    }
  }

  async function pickDiscogs(result) {
    setSelectedDiscogs(result.id)
    setDiscogsCover(result.cover_image || result.thumb || null)
    setForm(f => ({ ...f, discogs_id: String(result.id) }))
    setProcStatus('Loading release details…')
    const req = startRequest(DISCOGS_TIMEOUT_MS)
    let d
    try {
      const resp = await fetch(`/api/discogs?id=${result.id}`, { signal: req.controller.signal })
      d = await resp.json()
      endRequest(req)
      if (isStale(req)) return
      if (d.error) throw new Error(d.error)
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('pickDiscogs failed:', err)
      setProcStatus(req.timedOut ? 'Discogs took too long. Tap the pressing to try again.' : 'Couldn’t load release details.')
      return
    }
    setForm(f => ({
      ...f,
      artist: d.artists?.[0]?.name?.replace(/\s*\(\d+\)$/, '') || f.artist || '',
      title: d.title || f.title || '',
      year: String(d.year || f.year || ''),
      label: d.labels?.[0]?.name || f.label || '',
      market_value: d.lowest_price != null ? d.lowest_price.toFixed(2) : f.market_value || '',
      discogs_id: String(result.id)
    }))
    setTracklist(d.tracklist?.slice(0, 12) || [])
    setProcStatus('Release loaded.')
  }

  function resetImport() {
    cancelRequest()
    setImageData(null)
    setImageFile(null)
    setDiscogsResults([])
    setSelectedDiscogs(null)
    setTracklist([])
    setProcessing(false)
    setProgress(0)
    setProcStatus('')
    setIdentifiedBy(null)
    setRejected([])
    setHint('')
    setDiscogsQuery('')
    setSearchText('')
    setTextQuery('')
    setDiscogsCover(null)
    setForm(EMPTY_FORM)
  }

  async function addRecord() {
    setSaving(true)
    try {
      // A photo is uploaded; a text search uses the chosen pressing's Discogs cover.
      let image_url = imageFile ? null : discogsCover
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const up = await fetch('/api/upload', { method: 'POST', body: fd, headers: await authHeaders() })
        const upData = await up.json()
        if (upData.error) throw new Error(`Cover upload failed: ${upData.error}`)
        image_url = upData.url
      }

      const { data, error } = await supabase.from('vinyl_records').insert([{
        ...form,
        year: form.year ? parseInt(form.year) : null,
        market_value: form.market_value ? parseFloat(form.market_value) : null,
        discogs_id: form.discogs_id ? parseInt(form.discogs_id) : null,
        image_url,
        tracklist,
        owner_id: user.id
      }]).select()
      if (error) throw new Error(error.message)

      resetImport()
      onAdded(data[0])
    } catch (err) {
      console.error('addRecord failed:', err)
      ask('Couldn’t Save Record', err.message)
    } finally {
      setSaving(false)
    }
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="scroll pinstripes">
      <div className="group-label">New Record</div>
      <div className="group">
        <label
          className={`cell tappable photo-cell${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        >
          <input type="file" accept="image/*" hidden onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
          <span className="photo-icon">
            <svg viewBox="0 0 30 30" fill="#4a4a4a" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9h3.2l2-3h7.6l2 3H23a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 23 23H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 9zm9 2.5a5 5 0 1 0 0 10a5 5 0 1 0 0-10z" />
            </svg>
          </span>
          <span className="grow">
            {imageData ? 'Choose Another Photo' : 'Choose Album Photo'}
            <small>Or drop a cover photo here</small>
          </span>
          <Chevron />
        </label>
        <form className="cell field compose" onSubmit={searchByText}>
          <span className="field-label">Name</span>
          <input type="search" value={searchText} onChange={e => setSearchText(e.target.value)} maxLength={300} enterKeyHint="search" placeholder="Artist, album or a description" />
          <button className="cell-btn" type="submit" disabled={!searchText.trim()}>Find</button>
        </form>
      </div>
      <div className="group-footer">Claude reads the cover or what you type, then Discogs finds the pressing.</div>

      {started && (
        <>
          <div className="group">
            <div className="cell proc-cell">
              {imageData
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imageData} className="thumb" alt="" />
                : <span className="thumb search-thumb" aria-hidden="true">
                    <svg viewBox="0 0 14 14"><circle cx="5.5" cy="5.5" r="4.2" fill="none" stroke="#7f7f7f" strokeWidth="1.6" /><path d="M8.6 8.6L13 13" stroke="#7f7f7f" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </span>}
              <div className="grow">
                {processing ? 'Identifying…' : 'Identified'}
                {textQuery && <small className="ellipsis">“{textQuery}”</small>}
                <small>{procStatus}</small>
                {identifiedBy && !processing && <small>Read by {identifiedBy}</small>}
                <div className="progress"><i style={{ width: progress + '%' }} /></div>
              </div>
              {processing && <Spinner />}
            </div>
          </div>
          <div className="button-row">
            <button className="gloss-btn" onClick={resetImport}>Start Over</button>
          </div>
        </>
      )}

      {discogsResults.length > 0 && (
        <>
          <div className="group-label">Discogs Pressings</div>
          <div className="group">
            {discogsResults.map(r => (
              <button key={r.id} className="cell" onClick={() => pickDiscogs(r)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumb ? <img src={r.thumb} className="thumb" alt="" /> : <span className="thumb art-ph" />}
                <span className="grow">
                  <span className="ellipsis" style={{ display: 'block', fontSize: 15 }}>{r.title}</span>
                  <small className="ellipsis">{[r.country, r.year, r.label?.[0], `#${r.id}`].filter(Boolean).join(' · ')}</small>
                </span>
                {selectedDiscogs === r.id && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {started && !processing && (
        <>
          <div className="group-label">Not Right?</div>
          <div className="group">
            <button className="cell" onClick={askAgain}>
              <span className="grow">
                Wrong Album — Ask Again
                <small>
                  {rejected.length
                    ? `A stronger model looks again, skipping ${rejected.length} wrong ${rejected.length === 1 ? 'answer' : 'answers'}`
                    : 'A stronger model takes another look'}
                </small>
              </span>
              <Chevron />
            </button>
            {imageData && (
              // A typed search is already the hint, so this is only for photos.
              <form className="cell field compose" onSubmit={askWithHint}>
                <span className="field-label">Hint</span>
                <input value={hint} onChange={e => setHint(e.target.value)} maxLength={300} enterKeyHint="send" placeholder="e.g. Blue Note, 1965" />
                <button className="cell-btn" type="submit" disabled={!hint.trim()}>Ask</button>
              </form>
            )}
            <form className="cell field compose" onSubmit={searchDiscogsYourself}>
              <span className="field-label">Discogs</span>
              <input type="search" value={discogsQuery} onChange={e => setDiscogsQuery(e.target.value)} enterKeyHint="search" placeholder="Artist, title or catalogue no." />
              <button className="cell-btn" type="submit" disabled={!discogsQuery.trim()}>Search</button>
            </form>
          </div>
          <div className="group-footer">{imageData ? 'Ask Again and Hint use' : 'Ask Again uses'} a stronger model. Picking a Discogs pressing above fills in its details.</div>
        </>
      )}

      {started && !processing && (
        <>
          <div className="group-label">Details</div>
          <div className="group">
            {TEXT_FIELDS.map(([label, key, inputMode]) => (
              <label key={key} className="cell field">
                <span className="field-label">{label}</span>
                <input value={form[key]} inputMode={inputMode} onChange={set(key)} placeholder="—" />
              </label>
            ))}
            <label className="cell field">
              <span className="field-label">Genre</span>
              <select value={form.genre} onChange={set('genre')}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
              <Chevron />
            </label>
            <label className="cell field">
              <span className="field-label">Condition</span>
              <select value={form.condition} onChange={set('condition')}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
              <Chevron />
            </label>
          </div>

          {tracklist.length > 0 && (
            <>
              <div className="group-label">Tracklist</div>
              <div className="group">
                {tracklist.map((t, i) => (
                  <div key={i} className="cell track-cell">
                    <span className="pos">{t.position}</span>
                    <span className="grow ellipsis">{t.title}</span>
                    <span className="dur">{t.duration}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="big-btn" onClick={addRecord} disabled={saving}>
            {saving ? 'Saving…' : 'Add to Collection'}
          </button>
        </>
      )}
    </div>
  )
}
