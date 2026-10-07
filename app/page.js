'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { GENRES, CONDITIONS } from '@/lib/genres'

const EMPTY_FORM = {
  artist: '', title: '', year: '', genre: 'Jazz',
  label: '', condition: 'Near Mint (NM)', discogs_id: '', market_value: ''
}

const MODEL_NAMES = { claude: 'Claude', gemini: 'Gemini' }
const MODEL_IDS = { claude: 'claude-opus-5-5', gemini: 'gemini-3.5-flash' }

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #b8b8b8;
  }

  .app {
    background: rgba(235,234,231,0.92);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    min-height: 100vh;
    font-family: 'Spectral', serif;
    color: #1d1d1f;
    max-width: 960px;
    margin: 0 auto;
    border-left: 1px solid rgba(160,160,158,0.5);
    border-right: 1px solid rgba(160,160,158,0.5);
    box-shadow: 0 0 60px rgba(0,0,0,.18);
    position: relative;
  }

  .app::before { content: none; }

  .header {
    background: rgba(22,22,22,0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-inner {
    padding: 20px 28px 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .masthead {
    font-family: 'IM Fell English', serif;
    font-size: 34px;
    color: #f0eee9;
    letter-spacing: .02em;
    line-height: 1;
  }

  .masthead-sub {
    font-family: 'Spectral', serif;
    font-style: italic;
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-top: 6px;
  }

  .header-stats {
    display: flex;
    gap: 24px;
    text-align: right;
  }

  .stat-item strong {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 24px;
    color: #f0eee9;
    display: block;
    line-height: 1;
  }

  .stat-item span {
    font-size: 9px;
    color: rgba(255,255,255,0.35);
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .header-rule { display: none; }

  .model-bar {
    background: rgba(14,14,14,0.7);
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 8px 28px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .model-label {
    font-size: 9px;
    letter-spacing: .15em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }

  .model-toggle {
    display: flex;
    background: rgba(255,255,255,0.06);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    overflow: hidden;
    padding: 2px;
    gap: 2px;
  }

  .model-btn {
    padding: 4px 14px;
    font-size: 10px;
    font-family: 'Spectral', serif;
    letter-spacing: .06em;
    color: rgba(255,255,255,0.4);
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all .2s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  .model-btn.active { background: rgba(255,255,255,0.14); color: #f0eee9; }
  .model-btn:hover:not(.active) { color: rgba(255,255,255,0.65); }

  .model-indicator {
    font-size: 9px;
    font-style: italic;
    color: rgba(255,255,255,0.25);
    letter-spacing: .08em;
    margin-left: auto;
  }

  .tabs {
    background: rgba(195,193,189,0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(120,120,118,0.3);
    padding: 0 28px;
    display: flex;
    gap: 0;
  }

  .tabs::before { display: none; }

  .tab {
    padding: 11px 22px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: .06em;
    color: #6e6e73;
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    transition: all .22s cubic-bezier(0.25,0.46,0.45,0.94);
    position: relative;
    top: 1px;
  }

  .tab.active { color: #1d1d1f; border-bottom-color: #1d1d1f; }
  .tab:hover:not(.active) { color: #3a3a3c; }

  .content { padding: 28px; }

  .drop-zone {
    border: 1.5px dashed rgba(100,100,98,0.5);
    border-radius: 16px;
    padding: 44px 28px;
    text-align: center;
    cursor: pointer;
    background: rgba(215,213,210,0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: all .25s cubic-bezier(0.25,0.46,0.45,0.94);
    position: relative;
    overflow: hidden;
    display: block;
    width: 100%;
  }

  .drop-zone::before { display: none; }
  .drop-zone:hover { background: rgba(200,198,195,0.8); border-color: rgba(60,60,58,0.5); }

  .drop-icon {
    font-family: 'IM Fell English', serif;
    font-size: 44px;
    color: #8e8e93;
    line-height: 1;
    margin-bottom: 14px;
  }

  .drop-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
    margin-bottom: 6px;
  }

  .drop-hint {
    font-size: 10px;
    font-style: italic;
    color: #8e8e93;
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .proc-card {
    background: rgba(215,213,210,0.7);
    border: 1px solid rgba(160,158,156,0.5);
    border-left: 3px solid #3a3a3c;
    border-radius: 12px;
    padding: 16px;
    margin-top: 14px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .proc-header { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }

  .proc-img {
    width: 52px; height: 52px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid rgba(160,158,156,0.4);
    flex-shrink: 0;
  }

  .proc-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px;
    font-weight: 600;
    color: #1d1d1f;
  }

  .proc-status {
    font-size: 10px;
    font-style: italic;
    color: #8e8e93;
    margin-top: 3px;
    letter-spacing: .04em;
  }

  .progress-track {
    height: 3px;
    background: rgba(160,158,156,0.4);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3a3a3c;
    border-radius: 99px;
    transition: width .4s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  .section-head {
    font-size: 9px;
    font-style: italic;
    letter-spacing: .2em;
    color: #8e8e93;
    text-transform: uppercase;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(160,158,156,0.35);
  }

  .discogs-card {
    background: rgba(215,213,210,0.65);
    border: 1px solid rgba(160,158,156,0.45);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all .22s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  .discogs-card:hover { background: rgba(200,198,195,0.85); transform: translateX(3px); box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .discogs-card.selected { border-color: #3a3a3c; border-left: 3px solid #3a3a3c; background: rgba(195,193,190,0.9); box-shadow: 0 4px 16px rgba(0,0,0,.12); }

  .discogs-thumb {
    width: 40px; height: 40px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid rgba(160,158,156,0.3);
    flex-shrink: 0;
    background: #c8c6c3;
  }

  .discogs-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13px;
    font-weight: 600;
    color: #1d1d1f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discogs-meta {
    font-size: 10px;
    font-style: italic;
    color: #6e6e73;
    margin-top: 2px;
  }

  .discogs-id {
    font-size: 9px;
    padding: 3px 8px;
    background: rgba(160,158,156,0.3);
    border: 1px solid rgba(160,158,156,0.4);
    border-radius: 6px;
    color: #6e6e73;
    flex-shrink: 0;
    font-family: 'Spectral', serif;
  }

  .sep {
    height: 1px;
    background: rgba(160,158,156,0.35);
    margin: 18px 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .field-label {
    font-size: 9px;
    font-style: italic;
    letter-spacing: .12em;
    color: #8e8e93;
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }

  .field-input, .field-select {
    width: 100%;
    background: rgba(245,244,241,0.85);
    border: 1px solid rgba(160,158,156,0.5);
    border-radius: 8px;
    color: #1d1d1f;
    font-family: 'Spectral', serif;
    font-size: 12px;
    padding: 8px 10px;
    outline: none;
    transition: border-color .2s ease, box-shadow .2s ease;
    -webkit-appearance: none;
  }

  .field-input:focus, .field-select:focus {
    border-color: #3a3a3c;
    box-shadow: 0 0 0 3px rgba(58,58,60,.1);
  }
  .field-select option { background: #f5f4f1; }

  .tracklist {
    background: rgba(215,213,210,0.65);
    border: 1px solid rgba(160,158,156,0.4);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }

  .track-row {
    display: flex;
    gap: 8px;
    font-size: 10px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(160,158,156,0.25);
    color: #3a3a3c;
  }

  .track-row:last-child { border-bottom: none; }
  .track-pos { font-style: italic; color: #8e8e93; width: 24px; flex-shrink: 0; }
  .track-title { flex: 1; font-family: 'Cormorant Garamond', serif; font-size: 12px; font-weight: 600; color: #1d1d1f; }
  .track-dur { font-style: italic; color: #8e8e93; }

  .add-btn {
    width: 100%;
    background: #1d1d1f;
    color: #f5f4f1;
    border: none;
    border-radius: 12px;
    padding: 13px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: .1em;
    cursor: pointer;
    transition: background .2s ease, transform .15s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow .2s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
  }

  .add-btn:hover { background: #3a3a3c; box-shadow: 0 4px 16px rgba(0,0,0,.25); }
  .add-btn:active { transform: scale(0.99); }
  .add-btn:disabled { background: #8e8e93; cursor: not-allowed; box-shadow: none; }

  .search-input {
    width: 100%;
    background: rgba(245,244,241,0.85);
    border: 1px solid rgba(160,158,156,0.5);
    border-radius: 10px;
    color: #1d1d1f;
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px;
    padding: 10px 14px;
    outline: none;
    margin-bottom: 16px;
    transition: border-color .2s ease, box-shadow .2s ease;
    -webkit-appearance: none;
  }

  .search-input:focus {
    border-color: #3a3a3c;
    box-shadow: 0 0 0 3px rgba(58,58,60,.1);
  }
  .search-input::placeholder { color: #c7c7cc; font-style: italic; }

  .filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }

  .filter-btn {
    font-size: 9px;
    padding: 5px 12px;
    border-radius: 99px;
    border: 1px solid rgba(160,158,156,0.5);
    background: rgba(215,213,210,0.5);
    color: #6e6e73;
    cursor: pointer;
    font-family: 'Spectral', serif;
    letter-spacing: .06em;
    transition: all .2s cubic-bezier(0.25,0.46,0.45,0.94);
  }

  .filter-btn.active { background: #1d1d1f; color: #f5f4f1; border-color: #1d1d1f; box-shadow: 0 2px 8px rgba(0,0,0,.18); }
  .filter-btn:hover:not(.active) { background: rgba(200,198,195,0.8); color: #1d1d1f; border-color: rgba(100,100,98,0.5); }

  .vinyl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .vinyl-card {
    background: rgba(215,213,210,0.7);
    border: 1px solid rgba(160,158,156,0.4);
    border-radius: 12px;
    overflow: hidden;
    transition: all .25s cubic-bezier(0.25,0.46,0.45,0.94);
    cursor: pointer;
  }

  .vinyl-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.14); border-color: rgba(100,100,98,0.5); }

  .vinyl-art-ph {
    width: 100%;
    aspect-ratio: 1;
    background: #c8c6c3;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IM Fell English', serif;
    font-size: 32px;
    color: #8e8e93;
  }

  .vinyl-info { padding: 9px 11px 11px; }

  .vinyl-artist {
    font-size: 9px;
    font-style: italic;
    color: #6e6e73;
    letter-spacing: .06em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .vinyl-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13px;
    font-weight: 600;
    color: #1d1d1f;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vinyl-year {
    font-size: 9px;
    font-style: italic;
    color: #8e8e93;
    margin-top: 3px;
  }

  .badge-row { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px; }

  .badge {
    font-size: 8px;
    padding: 2px 7px;
    border-radius: 99px;
    background: rgba(160,158,156,0.35);
    border: 1px solid rgba(160,158,156,0.4);
    color: #6e6e73;
    font-family: 'Spectral', serif;
  }

  .badge-value {
    font-size: 8px;
    padding: 2px 7px;
    border-radius: 99px;
    background: rgba(58,58,60,0.1);
    border: 1px solid rgba(58,58,60,0.18);
    color: #3a3a3c;
    font-family: 'Spectral', serif;
  }

  .empty-state {
    grid-column: 1/-1;
    text-align: center;
    padding: 60px 20px;
    color: #8e8e93;
  }

  .empty-icon {
    font-family: 'IM Fell English', serif;
    font-size: 52px;
    opacity: .25;
    margin-bottom: 14px;
  }

  .empty-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-style: italic;
    color: #8e8e93;
  }

  .footer-rule {
    height: 5px;
    background: rgba(22,22,22,0.9);
    margin-top: 48px;
  }

  .crate-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .crate-scroll {
    flex: 1;
    display: flex;
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 4px 2px 16px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(160,158,156,0.5) transparent;
  }

  .crate-scroll::-webkit-scrollbar { height: 3px; }
  .crate-scroll::-webkit-scrollbar-track { background: transparent; }
  .crate-scroll::-webkit-scrollbar-thumb { background: rgba(160,158,156,0.5); border-radius: 99px; }

  .crate-item {
    flex: 0 0 180px;
    scroll-snap-align: start;
    background: rgba(215,213,210,0.7);
    border: 1px solid rgba(160,158,156,0.4);
    border-radius: 12px;
    overflow: hidden;
    transition: all .25s cubic-bezier(0.25,0.46,0.45,0.94);
    cursor: pointer;
    position: relative;
  }

  .crate-item:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.14); border-color: rgba(100,100,98,0.5); }

  .crate-arrow {
    flex-shrink: 0;
    background: rgba(29,29,31,0.85);
    color: #f0eee9;
    border: none;
    border-radius: 99px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    font-family: 'Cormorant Garamond', serif;
    transition: background .2s ease, transform .15s ease;
    line-height: 1;
    padding-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
  }

  .crate-arrow:hover { background: rgba(58,58,60,0.95); transform: scale(1.06); }
  .crate-arrow:active { transform: scale(0.95); }
`

export default function Home() {
  const [collection, setCollection] = useState([])
  const [tab, setTab] = useState('import')
  const [model, setModel] = useState('claude')
  const [imageData, setImageData] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [procStatus, setProcStatus] = useState('')
  const [discogsResults, setDiscogsResults] = useState([])
  const [selectedDiscogs, setSelectedDiscogs] = useState(null)
  const [tracklist, setTracklist] = useState([])
  const [saving, setSaving] = useState(false)
  const [artistFilter, setArtistFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [dbError, setDbError] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    supabase
      .from('vinyl_records')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setDbError(`Couldn't load the collection: ${error.message}`)
        else setCollection(data)
      }, err => setDbError(`Couldn't reach the database: ${err.message}`))
  }, [])

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  setImageFile(file)
  const reader = new FileReader()
  reader.onload = async (e) => {
    // Resize image before sending to API
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
      setProcessing(true)
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

async function analyzeImage(base64, mediaType) {
  setProcessing(true)
  setProcStatus(`${MODEL_NAMES[model]} reading cover art...`)
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
      finishProcessing('Could not read the cover — fill in manually')
      return
    }
    setProgress(55)
    await searchDiscogs(`${album.artist} ${album.title}`)
  } catch (err) {
    console.error('analyzeImage failed:', err)
    finishProcessing('Could not identify — fill in manually')
  }
}

function finishProcessing(status) {
  setProcessing(false)
  setProgress(100)
  setProcStatus(status)
}

async function searchDiscogs(q) {
  setProcStatus('Searching Discogs...')
  try {
    const resp = await fetch(`/api/discogs?q=${encodeURIComponent(q)}`)
    const data = await resp.json()
    if (data.error) throw new Error(data.error)
    const results = data.results?.slice(0, 4) || []
    setDiscogsResults(results)
    finishProcessing(results.length > 0 ? 'Select a pressing below' : 'No Discogs matches — fill in manually')
  } catch (err) {
    console.error('searchDiscogs failed:', err)
    setDiscogsResults([])
    finishProcessing('Discogs search failed — fill in manually')
  }
}

async function pickDiscogs(result) {
  setSelectedDiscogs(result.id)
  setForm(f => ({ ...f, discogs_id: String(result.id) }))
  setProcStatus('Loading release details...')
  let d
  try {
    const resp = await fetch(`/api/discogs?id=${result.id}`)
    d = await resp.json()
    if (d.error) throw new Error(d.error)
  } catch (err) {
    console.error('pickDiscogs failed:', err)
    setProcStatus('Could not load release details')
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
  setTracklist(d.tracklist?.slice(0, 8) || [])
  setProcStatus('✓ Release loaded')
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

    setCollection(c => [data[0], ...c])
    resetImport()
    setTab('collection')
  } catch (err) {
    console.error('addRecord failed:', err)
    alert('Error saving record: ' + err.message)
  } finally {
    setSaving(false)
  }
}

  const crateRef = useRef(null)
  function scrollCrate(dir) {
    crateRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  const artists = [...new Set(collection.map(r => r.artist))].sort()
  const genres = [...new Set(collection.map(r => r.genre))].sort()
  const filtered = collection
    .filter(r => artistFilter === 'all' || r.artist === artistFilter)
    .filter(r => genreFilter === 'all' || r.genre === genreFilter)
    .filter(r => !search || [r.artist, r.title, r.genre, r.label].join(' ').toLowerCase().includes(search.toLowerCase()))
  const totalValue = collection.reduce((s, r) => s + (r.market_value || 0), 0)

  const fieldStyle = { width: '100%', background: 'rgba(245,244,241,0.85)', border: '1px solid rgba(160,158,156,0.5)', borderRadius: 8, color: '#1d1d1f', fontFamily: "'Spectral', serif", fontSize: 12, padding: '8px 10px', outline: 'none', WebkitAppearance: 'none' }
  const labelStyle = { fontSize: 9, fontStyle: 'italic', letterSpacing: '.12em', color: '#8e8e93', textTransform: 'uppercase', display: 'block', marginBottom: 4 }

async function deleteRecord(id) {
  if (!confirm('Remove this record from your collection?')) return
  const { error } = await supabase
    .from('vinyl_records')
    .delete()
    .eq('id', id)
  if (error) alert('Error removing record: ' + error.message)
  else setCollection(c => c.filter(r => r.id !== id))
}

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="header-inner">
            <div>
              <div className="masthead">Wax Cabinet</div>
              <div className="masthead-sub">◆ Your Vinyl Collection Registry</div>
            </div>
            <div className="header-stats">
              <div className="stat-item"><strong>{collection.length}</strong><span>Records</span></div>
              <div className="stat-item"><strong>{new Set(collection.map(r => r.artist)).size}</strong><span>Artists</span></div>
              <div className="stat-item"><strong>{totalValue > 0 ? '$' + totalValue.toFixed(0) : '—'}</strong><span>Est. Value</span></div>
            </div>
          </div>
          <div className="header-rule" />

          {/* Model toggle */}
          <div className="model-bar">
            <span className="model-label">Vision model</span>
            <div className="model-toggle">
              <button className={`model-btn${model === 'claude' ? ' active' : ''}`} onClick={() => setModel('claude')}>Claude</button>
              <button className={`model-btn${model === 'gemini' ? ' active' : ''}`} onClick={() => setModel('gemini')}>Gemini</button>
            </div>
            <span className="model-indicator">
              ◆ {MODEL_IDS[model]}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${tab === 'import' ? ' active' : ''}`} onClick={() => setTab('import')}>⊕ Import</button>
          <button className={`tab${tab === 'collection' ? ' active' : ''}`} onClick={() => setTab('collection')}>◈ Collection</button>
        </div>

        <div className="content">

          {dbError && (
            <div className="proc-card" style={{ marginTop: 0, marginBottom: 18, borderLeftColor: '#a33' }}>
              <div className="proc-title">Database unavailable</div>
              <div className="proc-status">{dbError}</div>
            </div>
          )}

          {/* IMPORT TAB */}
          {tab === 'import' && (
            <div>
              <label
                className="drop-zone"
                style={dragging ? { borderColor: '#3a3a3c', background: 'rgba(200,198,195,0.8)' } : undefined}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
              >
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
                <div className="drop-icon">◎</div>
                <div className="drop-text">Drop album art or photograph here</div>
                <div className="drop-hint">PNG · JPG · WEBP — {MODEL_NAMES[model]} reads the cover</div>
              </label>


              {imageData && (
  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
    <button onClick={resetImport} style={{
      fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 11, padding: '6px 14px',
      background: 'rgba(215,213,210,0.6)', color: '#6e6e73', border: '1px solid rgba(160,158,156,0.5)',
      borderRadius: 99, cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s ease'
    }}>↺ Start Over</button>
    <button onClick={() => { const q = `${form.artist} ${form.title}`; if (q.trim().length > 1) searchDiscogs(q) }} style={{
      fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 11, padding: '6px 14px',
      background: 'rgba(215,213,210,0.6)', color: '#6e6e73', border: '1px solid rgba(160,158,156,0.5)',
      borderRadius: 99, cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s ease'
    }}>↺ Re-run Discogs</button>
    <button onClick={() => analyzeImage(imageData.split(',')[1], 'image/jpeg')} style={{
      fontFamily: "'Spectral', serif", fontStyle: 'italic', fontSize: 11, padding: '6px 14px',
      background: 'rgba(215,213,210,0.6)', color: '#6e6e73', border: '1px solid rgba(160,158,156,0.5)',
      borderRadius: 99, cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s ease'
    }}>↺ Re-run {MODEL_NAMES[model]}</button>
  </div>
)}

{imageData && (
  <div className="proc-card" style={{ marginTop: 8 }}>
                  <div className="proc-header">
                    <img src={imageData} className="proc-img" alt="" />
                    <div>
                      <div className="proc-title">{processing ? 'Analyzing...' : 'Identified'}</div>
                      <div className="proc-status">{procStatus}</div>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: progress + '%' }} />
                  </div>
                </div>
              )}

              {discogsResults.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="section-head">Discogs pressings — select your edition</div>
                  {discogsResults.map(r => (
                    <div key={r.id} className={`discogs-card${selectedDiscogs === r.id ? ' selected' : ''}`} onClick={() => pickDiscogs(r)}>
                      {r.thumb && <img src={r.thumb} className="discogs-thumb" alt="" />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="discogs-title">{r.title}</div>
                        <div className="discogs-meta">{[r.country, r.year, r.label?.[0]].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="discogs-id">#{r.id}</div>
                    </div>
                  ))}
                </div>
              )}

              {imageData && !processing && (
                <>
                  <div className="sep" />
                  <div className="section-head">Review & confirm details</div>
                  <div className="form-grid">
                    {[['Artist', 'artist'], ['Title', 'title']].map(([label, key]) => (
                      <div key={key} style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>{label}</label>
                        <input style={fieldStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    {[['Year', 'year'], ['Label', 'label'], ['Market Value ($)', 'market_value'], ['Discogs ID', 'discogs_id']].map(([label, key]) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <input style={fieldStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={labelStyle}>Genre</label>
                      <select style={fieldStyle} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
                        {GENRES.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Condition</label>
                      <select style={fieldStyle} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {tracklist.length > 0 && (
                    <div className="tracklist">
                      <div className="section-head" style={{ marginBottom: 8 }}>Tracklist</div>
                      {tracklist.map((t, i) => (
                        <div key={i} className="track-row">
                          <span className="track-pos">{t.position}</span>
                          <span className="track-title">{t.title}</span>
                          <span className="track-dur">{t.duration}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="add-btn" onClick={addRecord} disabled={saving}>
                    {saving ? 'Filing record...' : 'Add to Collection →'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* COLLECTION TAB */}
          {tab === 'collection' && (
            <div>
              <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the collection..." />

              <div className="section-head">Filter by artist</div>
              <div className="filter-row">
                {['all', ...artists].map(a => (
                  <button key={a} className={`filter-btn${artistFilter === a ? ' active' : ''}`} onClick={() => setArtistFilter(a)}>
                    {a === 'all' ? 'All Artists' : a}
                  </button>
                ))}
              </div>

              <div className="section-head">Filter by genre</div>
              <div className="filter-row">
                {['all', ...genres].map(g => (
                  <button key={g} className={`filter-btn${genreFilter === g ? ' active' : ''}`} onClick={() => setGenreFilter(g)}>
                    {g === 'all' ? 'All Genres' : g}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">◎</div>
                  <div className="empty-text">{collection.length === 0 ? 'No records yet — import your first album' : 'No records match this filter'}</div>
                </div>
              ) : (
                <div className="crate-row">
                  <button className="crate-arrow" onClick={() => scrollCrate(-1)}>‹</button>
                  <div className="crate-scroll" ref={crateRef}>
                    {filtered.map(r => (
                      <div key={r.id} className="crate-item"
                        onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity = '0'}
                      >
                        {r.image_url
                          ? <img src={r.image_url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} alt="" />
                          : <div className="vinyl-art-ph">◎</div>
                        }
                        <button
                          className="del-btn"
                          onClick={() => deleteRecord(r.id)}
                          style={{
                            position: 'absolute', top: 7, right: 7,
                            background: 'rgba(29,29,31,0.82)', color: '#f0eee9',
                            border: 'none', borderRadius: 99,
                            fontFamily: "'Spectral', serif", fontStyle: 'italic',
                            fontSize: 10, padding: '3px 9px',
                            cursor: 'pointer', opacity: 0,
                            transition: 'opacity .2s ease',
                            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
                          }}
                        >
                          ✕ Remove
                        </button>
                        <div className="vinyl-info">
                          <div className="vinyl-artist">{r.artist}</div>
                          <div className="vinyl-title">{r.title}</div>
                          <div className="vinyl-year">{r.year || '—'}</div>
                          <div className="badge-row">
                            <span className="badge">{r.genre}</span>
                            {r.market_value != null && <span className="badge-value">${parseFloat(r.market_value).toFixed(0)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="crate-arrow" onClick={() => scrollCrate(1)}>›</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="footer-rule" />
      </div>
    </>
  )
}