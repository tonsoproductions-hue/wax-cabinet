'use client'
import { useRef, useState } from 'react'
import { supabase, authHeaders } from '@/lib/supabase'
import { GENRES, CONDITIONS } from '@/lib/genres'
import { fetchJson, explain } from '@/lib/errors'
import { fileSize } from '@/lib/export'
import { Chevron, StatusSteps } from '@/components/ui'

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

// The image drawn on a canvas no bigger than maxSize on its longest side.
function scaledCanvas(img, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export default function ImportScreen({ user, onAdded, notify }) {
  const [imageData, setImageData] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  // The checklist of what the import is doing; see showStep().
  const [steps, setSteps] = useState([])
  const [discogsResults, setDiscogsResults] = useState([])
  const [selectedDiscogs, setSelectedDiscogs] = useState(null)
  const [tracklist, setTracklist] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
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
  const hasSource = !!(imageData || textQuery)
  const stepsRef = useRef(null)

  // Shows a step in the checklist, adding it if it's new. Starting a step
  // again (state 'busy') drops the steps after it, since they'll be redone.
  function showStep(id, state, label, detail, extra) {
    const step = { id, state, label, detail, ...extra }
    setSteps(prev => {
      const i = prev.findIndex(st => st.id === id)
      if (i === -1) return [...prev, step]
      return state === 'busy' ? [...prev.slice(0, i), step] : prev.map(st => (st.id === id ? step : st))
    })
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    resetImport()
    showStep('photo', 'busy', 'Preparing photo…', file.name)
    const cantOpen = () => showStep('photo', 'fail', 'Couldn’t open that photo',
      `${file.type.replace('image/', '').toUpperCase()} photos can’t be read here. Try a JPEG or PNG, or a screenshot of the photo.`)
    const reader = new FileReader()
    reader.onerror = cantOpen
    reader.onload = (e) => {
      const img = new Image()
      // e.g. a HEIC photo dropped into a browser that can't decode it.
      img.onerror = cantOpen
      img.onload = async () => {
        // Claude gets a small copy. The saved cover is larger but still a
        // fraction of a full phone photo, which can be over Vercel's 4.5MB
        // request limit for /api/upload.
        const resized = scaledCanvas(img, 800).toDataURL('image/jpeg', 0.85)
        const cover = await new Promise(resolve => scaledCanvas(img, 1200).toBlob(resolve, 'image/jpeg', 0.85))
        setImageFile(new File([cover], `${file.name.replace(/\.[^.]*$/, '') || 'cover'}.jpg`, { type: 'image/jpeg' }))
        setImageData(resized)
        showStep('photo', 'done', 'Photo ready', `Resized from ${fileSize(file.size)} to ${fileSize(cover.size)}`, { thumb: resized })
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
    showStep('claude', 'busy', isText
      ? (retry ? 'Claude is thinking of another match…' : 'Claude is working out which record that is…')
      : (retry ? 'Claude is taking a closer look…' : 'Claude is reading the cover…'),
    isText ? `“${source.text}”` : retry ? 'Using a stronger model' : null)
    try {
      const { identifiedBy, repeated, ...album } = await fetchJson('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ...source, retry, hint: withHint || undefined, rejected: skip?.length ? skip : undefined }),
        signal: req.controller.signal,
      })
      endRequest(req)
      if (isStale(req)) return
      if (!album.artist && !album.title) {
        showStep('claude', 'fail', isText ? 'Claude couldn’t work out that record' : 'Claude couldn’t read the cover', isText
          ? 'Try other words, or search Discogs yourself below.'
          : retry ? 'Add a hint like the label or year, or search Discogs below.' : 'Tap Ask Again for a closer look, or fill in the details below.')
        setProcessing(false)
        return
      }
      if (repeated) {
        showStep('claude', 'note', `Claude still thinks it’s ${album.title}`, 'Add a hint or search Discogs yourself below.')
        setProcessing(false)
        return
      }
      showStep('claude', 'done', `Identified: ${album.title}`, [album.artist, album.year, identifiedBy && `read by ${identifiedBy}`].filter(Boolean).join(' · '))
      // A new answer replaces the old pick, so drop its Discogs id, price and tracks.
      setForm(f => ({ ...f, ...album, discogs_id: '', market_value: '' }))
      setSelectedDiscogs(null)
      setDiscogsCover(null)
      setTracklist([])
      const query = `${album.artist} ${album.title}`.trim()
      setDiscogsQuery(query)
      await searchDiscogs(query)
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('identify failed:', err)
      showStep('claude', 'fail', req.timedOut ? 'Claude took too long to answer' : 'Couldn’t ask Claude', req.timedOut
        ? 'Tap Ask Again to retry, or search Discogs yourself below.'
        : `${explain(err)} You can still fill in the details yourself.`)
      setProcessing(false)
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
    resetImport()
    setSearchText(q)
    setTextQuery(q)
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
    showStep('discogs', 'busy', 'Searching Discogs for pressings…', `“${q}”`)
    try {
      const data = await fetchJson(`/api/discogs?q=${encodeURIComponent(q)}`, { signal: req.controller.signal })
      endRequest(req)
      if (isStale(req)) return
      const results = data.results?.slice(0, 4) || []
      setDiscogsResults(results)
      if (results.length) {
        showStep('discogs', 'done', `Found ${results.length} ${results.length === 1 ? 'pressing' : 'pressings'} on Discogs`, 'Pick yours below to fill in the label, value and tracks.')
      } else {
        showStep('discogs', 'note', 'No pressings found on Discogs', 'Try a different search below, or fill in the details yourself.')
      }
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('searchDiscogs failed:', err)
      setDiscogsResults([])
      showStep('discogs', 'fail', req.timedOut ? 'Discogs took too long to answer' : 'Couldn’t search Discogs', req.timedOut
        ? 'Try the search again below, or fill in the details yourself.'
        : `${explain(err)} You can fill in the details yourself.`)
    }
    setProcessing(false)
  }

  async function pickDiscogs(result) {
    setSelectedDiscogs(result.id)
    setDiscogsCover(result.cover_image || result.thumb || null)
    setForm(f => ({ ...f, discogs_id: String(result.id) }))
    showStep('release', 'busy', 'Loading the pressing’s details…', result.title)
    const req = startRequest(DISCOGS_TIMEOUT_MS)
    let d
    try {
      d = await fetchJson(`/api/discogs?id=${result.id}`, { signal: req.controller.signal })
      endRequest(req)
      if (isStale(req)) return
    } catch (err) {
      endRequest(req)
      if (isStale(req)) return
      console.error('pickDiscogs failed:', err)
      showStep('release', 'fail', 'Couldn’t load the pressing’s details',
        `${req.timedOut ? 'Discogs took too long.' : explain(err)} Tap the pressing to try again.`)
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
    const label = d.labels?.[0]
    showStep('release', 'done', 'Details filled in from Discogs',
      [label && [label.name, label.catno].filter(Boolean).join(' '), d.year || null, d.tracklist?.length && `${d.tracklist.length} tracks`].filter(Boolean).join(' · '))
  }

  function resetImport() {
    cancelRequest()
    setImageData(null)
    setImageFile(null)
    setDiscogsResults([])
    setSelectedDiscogs(null)
    setTracklist([])
    setProcessing(false)
    setSteps([])
    setSaveFailed(false)
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
    setSaveFailed(false)
    let doing = 'save'
    try {
      // A photo is uploaded; a text search uses the chosen pressing's Discogs cover.
      let image_url = imageFile ? null : discogsCover
      if (imageFile) {
        doing = 'upload'
        showStep('save', 'busy', 'Uploading the cover photo…', fileSize(imageFile.size))
        const fd = new FormData()
        fd.append('file', imageFile)
        const up = await fetchJson('/api/upload', { method: 'POST', body: fd, headers: await authHeaders() })
        image_url = up.url
        doing = 'save'
      }

      showStep('save', 'busy', 'Saving to your collection…')
      const { data, error } = await supabase.from('vinyl_records').insert([{
        ...form,
        year: form.year ? parseInt(form.year) : null,
        market_value: form.market_value ? parseFloat(form.market_value) : null,
        discogs_id: form.discogs_id ? parseInt(form.discogs_id) : null,
        image_url,
        tracklist,
        owner_id: user.id
      }]).select()
      if (error) throw error

      resetImport()
      onAdded(data[0])
      notify('Added', data[0].title || 'to your collection')
    } catch (err) {
      console.error('addRecord failed:', err)
      showStep('save', 'fail', doing === 'upload' ? 'The cover photo didn’t upload' : 'The record didn’t save',
        `${explain(err)} Your details are kept, so you can try again.`)
      setSaveFailed(true)
      stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

      {steps.length > 0 && (
        <>
          <div className="group-label" ref={stepsRef}>Adding Record</div>
          <StatusSteps steps={steps} />
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

      {hasSource && !processing && (
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

      {hasSource && !processing && (
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
            {saving ? 'Saving…' : saveFailed ? 'Try Again' : 'Add to Collection'}
          </button>
        </>
      )}
    </div>
  )
}
