'use client'
import { useState, useEffect, useEffectEvent, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sortAlbums, loadDemoAlbums, pickRandom } from '@/lib/albums'
import { StatusBar, NavBar, TabBar, AlertView, ShuffleIcon } from '@/components/ui'
import ImportScreen from '@/components/ImportScreen'
import AlbumList from '@/components/AlbumList'
import AlbumDetail from '@/components/AlbumDetail'
import Nano, { NANO_COLORS } from '@/components/Nano'

const TABS = [
  { id: 'import', label: 'Import' },
  { id: 'albums', label: 'Albums' },
  { id: 'coverflow', label: 'Cover Flow' },
]

const TAB_TITLES = { import: 'Add Record', albums: 'Albums' }

function savedNanoColor() {
  try {
    const c = localStorage.getItem('wax-nano-color')
    if (c in NANO_COLORS) return c
  } catch {
    // Storage can be unavailable (private mode); fall back to silver.
  }
  return 'silver'
}

// iOS only delivers motion events after the page asks from a tap.
function requestMotionAccess() {
  const DM = window.DeviceMotionEvent
  if (typeof DM?.requestPermission === 'function') DM.requestPermission().catch(() => {})
}

export default function Home() {
  const [collection, setCollection] = useState([])
  const [tab, setTab] = useState('albums')
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(false)
  const [flowIndex, setFlowIndex] = useState(0)
  const [nanoColor, setNanoColor] = useState(() => typeof window === 'undefined' ? 'silver' : savedNanoColor())
  const [alert, setAlert] = useState(null)
  const [shufflePool, setShufflePool] = useState(null)
  const recentPicks = useRef([])

  const albums = useMemo(() => sortAlbums(collection), [collection])
  const flowAt = Math.min(flowIndex, Math.max(0, albums.length - 1))

  const ask = useCallback((title, message, buttons = ['OK']) =>
    new Promise(resolve => setAlert({ title, message, buttons, resolve })), [])

  function choose(label) {
    alert.resolve(label)
    setAlert(null)
  }

  const showDemo = useCallback(async () => {
    const demo = await loadDemoAlbums()
    if (demo.length) setCollection(demo)
    else ask('Demo Unavailable', 'Couldn’t reach Discogs either.')
  }, [ask])

  useEffect(() => {
    async function load() {
      // ?demo skips the database and fills the crate from Discogs.
      if (new URLSearchParams(window.location.search).has('demo')) return loadDemoAlbums()
      const { data, error } = await supabase
        .from('vinyl_records')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    }
    load()
      .then(setCollection)
      .catch(async err => {
        console.error('Loading collection failed:', err)
        const choice = await ask('Cannot Connect', 'Wax Cabinet couldn’t reach its database. You can browse a demo crate from Discogs instead.', ['OK', 'Show Demo'])
        if (choice === 'Show Demo') showDemo()
      })
  }, [ask, showDemo])

  function switchTab(id) {
    setTab(id)
    setDetail(null)
    setShufflePool(null)
    setEditing(false)
  }

  function openAlbum(album) {
    setShufflePool(null)
    setDetail(album)
  }

  function nextPick(pool) {
    const pick = pickRandom(pool, recentPicks.current)
    if (pick) recentPicks.current = [pick.id, ...recentPicks.current].slice(0, 50)
    return pick
  }

  function shuffle(pool) {
    const pick = nextPick(pool)
    if (!pick) return
    setShufflePool(pool)
    setDetail(pick)
  }

  // Shake to shuffle, like the 4th-generation iPod nano.
  const onShake = useEffectEvent(() => {
    if (tab !== 'import' && !alert && albums.length > 1) shuffle(albums)
  })
  useEffect(() => {
    // A shake is a sharp change (> 15 m/s²) on at least two axes between
    // readings 100ms apart; one-axis bumps like setting the phone down don't count.
    let prev = null
    let lastShake = 0
    function onMotion(e) {
      const a = e.accelerationIncludingGravity
      const now = Date.now()
      if (!a || a.x == null || (prev && now - prev.t < 100)) return
      if (prev) {
        const jolted = [a.x - prev.x, a.y - prev.y, a.z - prev.z].filter(d => Math.abs(d) > 15).length
        if (jolted >= 2 && now - lastShake > 1500) {
          lastShake = now
          onShake()
        }
      }
      prev = { x: a.x, y: a.y, z: a.z, t: now }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [])

  function chooseNanoColor(c) {
    setNanoColor(c)
    try { localStorage.setItem('wax-nano-color', c) } catch { /* not persisted */ }
  }

  async function deleteRecord(album, { confirm = true } = {}) {
    if (confirm) {
      const choice = await ask('Remove Album?', `“${album.title}” will be removed from your collection.`, ['Cancel', 'Remove'])
      if (choice !== 'Remove') return
    }
    if (!album.demo) {
      const { error } = await supabase.from('vinyl_records').delete().eq('id', album.id)
      if (error) {
        ask('Couldn’t Remove Album', error.message)
        return
      }
    }
    setCollection(c => c.filter(r => r.id !== album.id))
    setShufflePool(p => p?.filter(r => r.id !== album.id) ?? null)
    setDetail(d => (d?.id === album.id ? null : d))
  }

  function handleAdded(record) {
    setCollection(c => [record, ...c])
    setTab('albums')
    setDetail(record)
  }

  let nav = null
  if (detail) {
    nav = (
      <NavBar
        variant="black"
        title="Now Playing"
        left={<button className="bar-btn back" onClick={() => { setDetail(null); setShufflePool(null) }}>{tab === 'coverflow' ? 'Cover Flow' : 'Albums'}</button>}
        right={shufflePool?.length > 1 && (
          <button className="bar-btn" onClick={() => shuffle(shufflePool)}><ShuffleIcon color="#fff" size={16} />Again</button>
        )}
      />
    )
  } else if (tab !== 'coverflow') {
    nav = (
      <NavBar
        title={TAB_TITLES[tab]}
        right={tab === 'albums' && albums.length > 0 && (
          <button className={`bar-btn${editing ? ' done' : ''}`} onClick={() => setEditing(e => !e)}>{editing ? 'Done' : 'Edit'}</button>
        )}
      />
    )
  }

  return (
    <div className="device">
      <div className="device-top"><span className="speaker" /></div>
      <div className="screen">
        <StatusBar />
        {nav}
        {detail ? (
          <AlbumDetail key={detail.id} album={detail} onDelete={a => deleteRecord(a)} />
        ) : tab === 'import' ? (
          <ImportScreen onAdded={handleAdded} ask={ask} />
        ) : tab === 'albums' ? (
          <AlbumList
            albums={albums}
            editing={editing}
            onOpen={openAlbum}
            onDelete={a => deleteRecord(a, { confirm: false })}
            onShuffle={pool => { requestMotionAccess(); shuffle(pool) }}
          />
        ) : (
          <Nano
            albums={albums}
            index={flowAt}
            setIndex={setFlowIndex}
            color={nanoColor}
            setColor={chooseNanoColor}
            onSelect={openAlbum}
            onMenu={() => switchTab('albums')}
            onShuffle={() => nextPick(albums)}
          />
        )}
        <TabBar tabs={TABS} active={tab} onChange={switchTab} />
        <AlertView alert={alert} onChoose={choose} />
      </div>
      <div className="device-bottom">
        <button className="home-btn" aria-label="Home" onClick={() => switchTab('albums')} />
      </div>
    </div>
  )
}
