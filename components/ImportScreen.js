'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GENRES, CONDITIONS } from '@/lib/genres'
import { MODELS } from '@/lib/models'
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

export default function ImportScreen({ model, setModel, onAdded, ask }) {
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

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
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
        await analyzeImage(resized.split(',')[1], 'image/jpeg')
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function finishProcessing(status) {
    setProcessing(false)
    setProgress(100)
    setProcStatus(status)
  }

  async function analyzeImage(base64, mediaType) {
    setProcessing(true)
    setProcStatus(`${MODELS[model].name} is reading the cover…`)
    setProgress(25)
    try {
      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType, model })
      })
      const { error, ...album } = await resp.json()
      if (error) throw new Error(error)
      setForm(f => ({ ...f, ...album }))
      if (!album.artist && !album.title) {
        finishProcessing('Couldn’t read the cover. Fill in the details below.')
        return
      }
      setProgress(55)
      await searchDiscogs(`${album.artist} ${album.title}`)
    } catch (err) {
      console.error('analyzeImage failed:', err)
      finishProcessing('Couldn’t identify it. Fill in the details below.')
    }
  }

  async function searchDiscogs(q) {
    setProcessing(true)
    setProcStatus('Searching Discogs…')
    try {
      const resp = await fetch(`/api/discogs?q=${encodeURIComponent(q)}`)
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      const results = data.results?.slice(0, 4) || []
      setDiscogsResults(results)
      finishProcessing(results.length > 0 ? 'Choose your pressing below.' : 'No Discogs matches. Fill in the details below.')
    } catch (err) {
      console.error('searchDiscogs failed:', err)
      setDiscogsResults([])
      finishProcessing('Discogs search failed. Fill in the details below.')
    }
  }

  async function pickDiscogs(result) {
    setSelectedDiscogs(result.id)
    setForm(f => ({ ...f, discogs_id: String(result.id) }))
    setProcStatus('Loading release details…')
    let d
    try {
      const resp = await fetch(`/api/discogs?id=${result.id}`)
      d = await resp.json()
      if (d.error) throw new Error(d.error)
    } catch (err) {
      console.error('pickDiscogs failed:', err)
      setProcStatus('Couldn’t load release details.')
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
    setImageData(null)
    setImageFile(null)
    setDiscogsResults([])
    setSelectedDiscogs(null)
    setTracklist([])
    setProcessing(false)
    setProgress(0)
    setProcStatus('')
    setForm(EMPTY_FORM)
  }

  async function addRecord() {
    setSaving(true)
    try {
      let image_url = null
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const up = await fetch('/api/upload', { method: 'POST', body: fd })
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
        tracklist
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
      <div className="group-label">Vision Model</div>
      <div className="segmented">
        {Object.entries(MODELS).map(([id, m]) => (
          <button key={id} className={id === model ? 'on' : ''} onClick={() => setModel(id)}>{m.name}</button>
        ))}
      </div>
      <div className="group-footer">{MODELS[model].id}</div>

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
      </div>

      {imageData && (
        <>
          <div className="group">
            <div className="cell proc-cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData} className="thumb" alt="" />
              <div className="grow">
                {processing ? 'Identifying…' : 'Identified'}
                <small>{procStatus}</small>
                <div className="progress"><i style={{ width: progress + '%' }} /></div>
              </div>
              {processing && <Spinner />}
            </div>
          </div>
          <div className="button-row">
            <button className="gloss-btn" onClick={resetImport}>Start Over</button>
            <button className="gloss-btn" onClick={() => { const q = `${form.artist} ${form.title}`; if (q.trim().length > 1) searchDiscogs(q) }}>Search Discogs</button>
            <button className="gloss-btn" onClick={() => analyzeImage(imageData.split(',')[1], 'image/jpeg')}>Ask {MODELS[model].name}</button>
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

      {imageData && !processing && (
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
