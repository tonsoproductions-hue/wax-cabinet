'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #d6cbb0;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(180,160,110,0.15) 28px, rgba(180,160,110,0.15) 29px),
      repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(180,160,110,0.08) 28px, rgba(180,160,110,0.08) 29px);
  }

  .app {
    background: #e8dfc0;
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    min-height: 100vh;
    font-family: 'DM Mono', monospace;
    color: #2c1f0e;
    max-width: 960px;
    margin: 0 auto;
    border-left: 1px solid #b8a882;
    border-right: 1px solid #b8a882;
    position: relative;
  }

.app::before {
  content: none;
}

  .header {
    background: #1a2a3a;
    border-bottom: 3px solid #8b6914;
    padding: 0;
    position: relative;
    overflow: hidden;
  }

  .header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: #c4941a;
  }

  .header-inner {
    padding: 18px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }

  .masthead {
    font-family: 'Special Elite', cursive;
    font-size: 32px;
    color: #d4c285;
    letter-spacing: .04em;
    line-height: 1;
    text-shadow: 0 1px 0 rgba(0,0,0,0.5);
  }

  .masthead-sub {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    color: #7a9ab5;
    letter-spacing: .2em;
    text-transform: uppercase;
    margin-top: 5px;
    border-top: 1px solid #2e4a62;
    padding-top: 5px;
  }

  .header-stats {
    display: flex;
    gap: 20px;
    text-align: right;
  }

  .stat-item strong {
    font-family: 'Special Elite', cursive;
    font-size: 22px;
    color: #d4c285;
    display: block;
    line-height: 1;
  }

  .stat-item span {
    font-size: 9px;
    color: #7a9ab5;
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  .header-rule {
    height: 2px;
    background: repeating-linear-gradient(90deg, #8b6914 0px, #8b6914 4px, transparent 4px, transparent 8px);
  }

  .model-bar {
    background: #1a2a3a;
    border-bottom: 1px solid #2e4a62;
    padding: 8px 28px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .model-label {
    font-size: 9px;
    letter-spacing: .15em;
    color: #7a9ab5;
    text-transform: uppercase;
  }

  .model-toggle {
    display: flex;
    background: #0f1e2c;
    border-radius: 4px;
    border: 1px solid #2e4a62;
    overflow: hidden;
  }

  .model-btn {
    padding: 5px 14px;
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    letter-spacing: .08em;
    color: #4a7a9b;
    background: none;
    border: none;
    cursor: pointer;
    transition: all .15s;
    border-right: 1px solid #2e4a62;
  }

  .model-btn:last-child { border-right: none; }
  .model-btn.active { background: #2e4a62; color: #a8c8e0; }
  .model-btn:hover:not(.active) { color: #7a9ab5; }

  .model-indicator {
    font-size: 9px;
    color: #4a8a5a;
    letter-spacing: .08em;
    margin-left: auto;
  }

  .tabs {
    background: #c8bc98;
    border-bottom: 2px solid #8b6914;
    padding: 0 28px;
    display: flex;
    gap: 0;
    position: relative;
  }

  .tabs::before {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 1px;
    background: #d4a843;
  }

  .tab {
    padding: 10px 20px;
    font-family: 'Special Elite', cursive;
    font-size: 13px;
    letter-spacing: .06em;
    color: #6b5020;
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 3px solid transparent;
    transition: all .15s;
    position: relative;
    top: 2px;
  }

  .tab.active {
    color: #1a2a3a;
    border-bottom-color: #1a2a3a;
    background: #e8dfc0;
  }

  .tab:hover:not(.active) { color: #2c1f0e; }

  .content {
    padding: 28px;
  }

.drop-zone {
  border: 2px dashed #8b6914;
  border-radius: 4px;
  padding: 40px 28px;
  text-align: center;
  cursor: pointer;
  background: #dfd5b0;
  transition: all .2s;
  position: relative;
  overflow: hidden;
  display: block;
  width: 100%;
}

.drop-zone::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid #c4a862;
  border-radius: 2px;
  pointer-events: none;
}

  .drop-zone:hover { background: #d4c898; border-color: #c4941a; }

  .drop-icon {
    font-family: 'Special Elite', cursive;
    font-size: 42px;
    color: #8b6914;
    line-height: 1;
    margin-bottom: 12px;
    opacity: .7;
  }

  .drop-text {
    font-family: 'Special Elite', cursive;
    font-size: 16px;
    color: #2c1f0e;
    margin-bottom: 6px;
  }

  .drop-hint {
    font-size: 10px;
    color: #8b7040;
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .proc-card {
    background: #dfd5b0;
    border: 1px solid #b8a882;
    border-left: 3px solid #2e4a62;
    border-radius: 4px;
    padding: 14px;
    margin-top: 14px;
  }

  .proc-header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
  }

  .proc-img {
    width: 48px; height: 48px;
    border-radius: 3px;
    object-fit: cover;
    border: 1px solid #b8a882;
    flex-shrink: 0;
  }

  .proc-title {
    font-family: 'Special Elite', cursive;
    font-size: 13px;
    color: #1a2a3a;
  }

  .proc-status {
    font-size: 10px;
    color: #6b7a8b;
    margin-top: 3px;
    letter-spacing: .06em;
  }

  .progress-track {
    height: 3px;
    background: #c8bc98;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #2e4a62;
    border-radius: 2px;
    transition: width .3s;
  }

  .section-head {
    font-size: 9px;
    letter-spacing: .2em;
    color: #8b7040;
    text-transform: uppercase;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #c8b882;
  }

  .discogs-card {
    background: #dfd5b0;
    border: 1px solid #b8a882;
    border-radius: 3px;
    padding: 10px 12px;
    margin-bottom: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all .15s;
  }

  .discogs-card:hover { border-color: #8b6914; background: #d4c898; }
  .discogs-card.selected { border-color: #2e4a62; border-left: 3px solid #2e4a62; background: #d0caa8; }

  .discogs-thumb {
    width: 38px; height: 38px;
    border-radius: 2px;
    object-fit: cover;
    border: 1px solid #b8a882;
    flex-shrink: 0;
    background: #c8bc98;
  }

  .discogs-title {
    font-family: 'Special Elite', cursive;
    font-size: 12px;
    color: #1a2a3a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .discogs-meta {
    font-size: 10px;
    color: #6b5020;
    margin-top: 2px;
  }

  .discogs-id {
    font-size: 9px;
    padding: 2px 7px;
    background: #c8bc98;
    border: 1px solid #b8a882;
    border-radius: 2px;
    color: #6b5020;
    flex-shrink: 0;
    font-family: 'DM Mono', monospace;
  }

  .sep {
    height: 1px;
    background: repeating-linear-gradient(90deg, #b8a882 0px, #b8a882 4px, transparent 4px, transparent 8px);
    margin: 16px 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .field-label {
    font-size: 9px;
    letter-spacing: .12em;
    color: #8b7040;
    text-transform: uppercase;
    display: block;
    margin-bottom: 3px;
  }

  .field-input, .field-select {
    width: 100%;
    background: #f0e8cc;
    border: 1px solid #b8a882;
    border-radius: 2px;
    color: #1a1008;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    padding: 7px 9px;
    outline: none;
    transition: border-color .15s;
  }

  .field-input:focus, .field-select:focus { border-color: #2e4a62; }
  .field-select option { background: #f0e8cc; }

  .tracklist {
    background: #dfd5b0;
    border: 1px solid #b8a882;
    border-radius: 3px;
    padding: 10px 12px;
    margin-bottom: 12px;
  }

  .track-row {
    display: flex;
    gap: 8px;
    font-size: 10px;
    padding: 4px 0;
    border-bottom: 1px solid #c8b882;
    color: #4a3820;
  }

  .track-row:last-child { border-bottom: none; }
  .track-pos { color: #8b7040; width: 24px; flex-shrink: 0; font-family: 'DM Mono', monospace; }
  .track-title { flex: 1; font-family: 'Special Elite', cursive; font-size: 11px; color: #1a2a3a; }
  .track-dur { color: #8b7040; font-family: 'DM Mono', monospace; }

  .add-btn {
    width: 100%;
    background: #1a2a3a;
    color: #d4c285;
    border: none;
    border-radius: 3px;
    padding: 11px;
    font-family: 'Special Elite', cursive;
    font-size: 14px;
    letter-spacing: .08em;
    cursor: pointer;
    transition: background .15s;
    border-bottom: 2px solid #0f1e2c;
  }

  .add-btn:hover { background: #2e4a62; }
  .add-btn:disabled { background: #8b9aaa; cursor: not-allowed; }

  .search-input {
    width: 100%;
    background: #f0e8cc;
    border: 1px solid #b8a882;
    border-radius: 2px;
    color: #1a1008;
    font-family: 'Special Elite', cursive;
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    margin-bottom: 14px;
    transition: border-color .15s;
  }

  .search-input:focus { border-color: #2e4a62; }
  .search-input::placeholder { color: #b8a882; }

  .filter-row { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; }

  .filter-btn {
    font-size: 9px;
    padding: 4px 10px;
    border-radius: 2px;
    border: 1px solid #b8a882;
    background: transparent;
    color: #6b5020;
    cursor: pointer;
    font-family: 'DM Mono', monospace;
    letter-spacing: .06em;
    transition: all .15s;
  }

  .filter-btn.active { background: #1a2a3a; color: #d4c285; border-color: #1a2a3a; }
  .filter-btn:hover:not(.active) { border-color: #8b6914; color: #2c1f0e; }

  .vinyl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .vinyl-card {
    background: #dfd5b0;
    border: 1px solid #b8a882;
    border-radius: 3px;
    overflow: hidden;
    transition: all .15s;
    cursor: pointer;
  }

  .vinyl-card:hover { border-color: #8b6914; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,16,8,.15); }

  .vinyl-art-ph {
    width: 100%;
    aspect-ratio: 1;
    background: #c8bc98;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Special Elite', cursive;
    font-size: 32px;
    color: #8b7040;
  }

  .vinyl-info { padding: 8px 10px 10px; }

  .vinyl-artist {
    font-size: 9px;
    color: #6b5020;
    letter-spacing: .06em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .vinyl-title {
    font-family: 'Special Elite', cursive;
    font-size: 12px;
    color: #1a1008;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vinyl-year {
    font-size: 9px;
    color: #8b7040;
    margin-top: 3px;
    font-family: 'DM Mono', monospace;
  }

  .badge-row { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 4px; }

  .badge {
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 2px;
    background: #c8bc98;
    border: 1px solid #b8a882;
    color: #6b5020;
    font-family: 'DM Mono', monospace;
  }

  .badge-value {
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 2px;
    background: #c8dac8;
    border: 1px solid #8aaa8a;
    color: #2a4a2a;
    font-family: 'DM Mono', monospace;
  }

  .empty-state {
    grid-column: 1/-1;
    text-align: center;
    padding: 60px 20px;
    color: #8b7040;
  }

  .empty-icon {
    font-family: 'Special Elite', cursive;
    font-size: 48px;
    opacity: .3;
    margin-bottom: 12px;
  }

  .empty-text {
    font-family: 'Special Elite', cursive;
    font-size: 14px;
    color: #8b7040;
  }

  .footer-rule {
    height: 6px;
    background: #1a2a3a;
    border-top: 1px solid #8b6914;
    margin-top: 40px;
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
    padding: 4px 2px 14px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #b8a882 #dfd5b0;
  }

  .crate-scroll::-webkit-scrollbar { height: 4px; }
  .crate-scroll::-webkit-scrollbar-track { background: #dfd5b0; }
  .crate-scroll::-webkit-scrollbar-thumb { background: #b8a882; border-radius: 2px; }

  .crate-item {
    flex: 0 0 180px;
    scroll-snap-align: start;
    background: #dfd5b0;
    border: 1px solid #b8a882;
    border-radius: 3px;
    overflow: hidden;
    transition: all .15s;
    cursor: pointer;
    position: relative;
  }

  .crate-item:hover { border-color: #8b6914; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,16,8,.15); }

  .crate-arrow {
    flex-shrink: 0;
    background: #1a2a3a;
    color: #d4c285;
    border: 1px solid #8b6914;
    border-radius: 3px;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    font-family: 'Special Elite', cursive;
    transition: background .15s;
    line-height: 1;
    padding-bottom: 10px;
  }

  .crate-arrow:hover { background: #2e4a62; }
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
 const [form, setForm] = useState({
  artist: '', title: '', year: '', genre: 'Jazz',
  label: '', condition: 'Near Mint (NM)', discogs_id: '', market_value: ''
})

  useEffect(() => { loadCollection() }, [])

  async function loadCollection() {
    const { data } = await supabase
      .from('vinyl_records')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCollection(data)
  }

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
  setProcStatus(`${model === 'claude' ? 'Claude' : 'Gemini'} reading cover art...`)
  setProgress(25)
  try {
    const resp = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mediaType, model })
    })
    const parsed = await resp.json()
    console.log('🎵 Model identified:', parsed)  // ← see what AI returned
    setForm(f => ({ ...f, ...parsed }))
    setProgress(55)
    setProcStatus('Searching Discogs...')
    await searchDiscogs(`${parsed.artist} ${parsed.title}`)
  } catch (err) {
    console.error('❌ analyzeImage failed:', err)
    setProcStatus('Could not identify — fill in manually')
    setProcessing(false)
    setProgress(100)
  }
}

async function searchDiscogs(q) {
  console.log('🔍 Searching Discogs for:', q)  // ← see the search query
  const resp = await fetch(`/api/discogs?q=${encodeURIComponent(q)}`)
  const data = await resp.json()
  console.log('📀 Discogs results:', data.results?.slice(0, 4))  // ← see what came back
  setDiscogsResults(data.results?.slice(0, 4) || [])
  setProcessing(false)
  setProgress(100)
  setProcStatus(data.results?.length > 0 ? 'Select a pressing below' : 'No Discogs matches — fill in manually')
}

async function pickDiscogs(result) {
  setSelectedDiscogs(result.id)
  setForm(f => ({ ...f, discogs_id: String(result.id) }))
  setProcStatus('Loading release details...')
  const resp = await fetch(`/api/discogs?id=${result.id}`)
  const d = await resp.json()
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
  setForm({ artist: '', title: '', year: '', genre: 'Jazz', label: '', condition: 'Near Mint (NM)', discogs_id: '', market_value: '' })
}
async function addRecord() {
  setSaving(true)
  let image_url = null

  try {
    if (imageFile) {
      console.log('1. Uploading image...')
      const fd = new FormData()
      fd.append('file', imageFile)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await up.json()
      console.log('2. Upload result:', upData)
      image_url = upData.url
    }

    console.log('3. Saving to Supabase...')
    const { data, error } = await supabase.from('vinyl_records').insert([{
      ...form,
      year: form.year ? parseInt(form.year) : null,
      market_value: form.market_value ? parseFloat(form.market_value) : null,
      discogs_id: form.discogs_id ? parseInt(form.discogs_id) : null,
      image_url,
      tracklist
    }]).select()

    console.log('4. Supabase result:', data, 'error:', error)

    if (data) setCollection(c => [{ ...data[0], image_url }, ...c])
  } catch (err) {
    console.error('addRecord failed:', err)
    alert('Error saving record: ' + err.message)
  }

  setImageData(null); setImageFile(null)
  setDiscogsResults([]); setTracklist([])
  setSelectedDiscogs(null); setProgress?.(0)
  setForm({ artist: '', title: '', year: '', genre: 'Jazz', label: '', condition: 'Near Mint (NM)', discogs_id: '', market_value: '' })
  setSaving(false)
  setTab('collection')
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
    .filter(r => !search || (r.artist + r.title + r.genre).toLowerCase().includes(search.toLowerCase()))
  const totalValue = collection.reduce((s, r) => s + (r.market_value || 0), 0)

  const fieldStyle = { width: '100%', background: '#f0e8cc', border: '1px solid #b8a882', borderRadius: 2, color: '#1a1008', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '7px 9px', outline: 'none' }
  const labelStyle = { fontSize: 9, letterSpacing: '.12em', color: '#8b7040', textTransform: 'uppercase', display: 'block', marginBottom: 3 }

async function deleteRecord(id) {
  if (!confirm('Remove this record from your collection?')) return
  const { error } = await supabase
    .from('vinyl_records')
    .delete()
    .eq('id', id)
  if (!error) setCollection(c => c.filter(r => r.id !== id))
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
              ◆ {model === 'claude' ? 'claude-sonnet-4-20250514' : 'gemini-2.0-flash'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab${tab === 'import' ? ' active' : ''}`} onClick={() => setTab('import')}>⊕ Import</button>
          <button className={`tab${tab === 'collection' ? ' active' : ''}`} onClick={() => setTab('collection')}>◈ Collection</button>
        </div>

        <div className="content">

          {/* IMPORT TAB */}
          {tab === 'import' && (
            <div>
              <label className="drop-zone">
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div className="drop-icon">◎</div>
                <div className="drop-text">Drop album art or photograph here</div>
                <div className="drop-hint">PNG · JPG · WEBP — {model === 'claude' ? 'Claude' : 'Gemini'} reads the cover</div>
                
              </label>


              {imageData && (
  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
    <button onClick={resetImport} style={{
      fontFamily: "'Special Elite', cursive", fontSize: 11, padding: '6px 14px',
      background: 'transparent', color: '#6b5020', border: '1px solid #b8a882',
      borderRadius: 2, cursor: 'pointer', letterSpacing: '.06em'
    }}>↺ Start Over</button>
    <button onClick={() => { const q = `${form.artist} ${form.title}`; if (q.trim().length > 1) searchDiscogs(q) }} style={{
      fontFamily: "'Special Elite', cursive", fontSize: 11, padding: '6px 14px',
      background: 'transparent', color: '#6b5020', border: '1px solid #b8a882',
      borderRadius: 2, cursor: 'pointer', letterSpacing: '.06em'
    }}>↺ Re-run Discogs</button>
    <button onClick={() => analyzeImage(imageData.split(',')[1], 'image/jpeg')} style={{
      fontFamily: "'Special Elite', cursive", fontSize: 11, padding: '6px 14px',
      background: 'transparent', color: '#6b5020', border: '1px solid #b8a882',
      borderRadius: 2, cursor: 'pointer', letterSpacing: '.06em'
    }}>↺ Re-run {model === 'claude' ? 'Claude' : 'Gemini'}</button>
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
                        {['Jazz', 'Rock', 'Soul', 'Blues', 'Electronic', 'Classical', 'Hip-Hop', 'Folk', 'R&B', 'Pop', 'Country', 'Reggae', 'Other'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Condition</label>
                      <select style={fieldStyle} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                        {['Mint (M)', 'Near Mint (NM)', 'Very Good+ (VG+)', 'Very Good (VG)', 'Good (G)'].map(c => <option key={c}>{c}</option>)}
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
                            position: 'absolute', top: 6, right: 6,
                            background: '#1a2a3a', color: '#d4c285',
                            border: '1px solid #8b6914', borderRadius: 2,
                            fontFamily: "'Special Elite', cursive",
                            fontSize: 10, padding: '3px 7px',
                            cursor: 'pointer', opacity: 0,
                            transition: 'opacity .15s'
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
                            {r.market_value && <span className="badge-value">${parseFloat(r.market_value).toFixed(0)}</span>}
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