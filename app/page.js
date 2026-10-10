'use client'
import { useState, useEffect, useEffectEvent, useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { supabase, ownCoverPath } from '@/lib/supabase'
import { sortAlbums, loadDemoAlbums, pickRandom } from '@/lib/albums'
import { StatusBar, NavBar, TabBar, AlertView, ShuffleIcon, GearIcon } from '@/components/ui'
import ImportScreen from '@/components/ImportScreen'
import AlbumList from '@/components/AlbumList'
import AlbumDetail from '@/components/AlbumDetail'
import Nano, { NANO_COLORS } from '@/components/Nano'
import SettingsScreen from '@/components/SettingsScreen'

const TABS = [
  { id: 'import', label: 'Import' },
  { id: 'albums', label: 'Albums' },
  { id: 'coverflow', label: 'Cover Flow' },
]

const noSubscribe = () => () => {}

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

function SignInPrompt({ onSignIn }) {
  return (
    <div className="scroll pinstripes">
      <div className="empty">
        <strong>Sign In to Add Records</strong>
        <small>Anyone can browse and shuffle this collection. Only its owner can add or remove records.</small>
      </div>
      <button className="big-btn" onClick={onSignIn}>Sign In</button>
    </div>
  )
}

export default function Home() {
  // URL options: ?c=<owner id> opens a shared collection, &g=<genre> pre-filters it,
  // ?demo fills the crate from Discogs. Read after hydration (server snapshot is empty).
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => '')
  const params = useMemo(() => new URLSearchParams(search), [search])
  const sharedOwner = params.get('c')
  const sharedGenre = params.get('g')
  const demo = params.has('demo')

  const [user, setUser] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState('main')
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
  const viewingShared = !!sharedOwner && sharedOwner !== user?.id
  const canEdit = !!user && !demo && !viewingShared
  // Demo records live only in this browser, so they can be removed without signing in.
  const canManage = canEdit || demo
  const shareOwnerId = sharedOwner ?? user?.id ?? collection.find(a => a.owner_id)?.owner_id
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
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      if (demo) return loadDemoAlbums()
      let query = supabase.from('vinyl_records').select('*').order('created_at', { ascending: false })
      if (sharedOwner) query = query.eq('owner_id', sharedOwner)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    }
    load()
      .then(setCollection)
      .catch(async err => {
        console.error('Loading collection failed:', err)
        const choice = await ask('Cannot Connect', 'Vinyl Crate couldn’t reach its database. You can browse a demo crate from Discogs instead.', ['OK', 'Show Demo'])
        if (choice === 'Show Demo') showDemo()
      })
  }, [ask, showDemo, demo, sharedOwner])

  function switchTab(id) {
    setTab(id)
    setSettingsOpen(false)
    setDetail(null)
    setShufflePool(null)
    setEditing(false)
  }

  function openSettings(view = 'main') {
    setSettingsView(view)
    setSettingsOpen(true)
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
    if (tab !== 'import' && !settingsOpen && !alert && albums.length > 1) shuffle(albums)
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
      // Row security skips other owners' records without an error, so check a
      // row really went; otherwise the album would come back on the next load.
      const { data, error } = await supabase.from('vinyl_records').delete().eq('id', album.id).select('id')
      if (error || !data?.length) {
        ask('Couldn’t Remove Album', error?.message ?? 'You can only remove records you added.')
        return
      }
      // Tidy up the cover photo too; older covers outside the user's folder stay put.
      const coverPath = ownCoverPath(album.image_url, user?.id)
      if (coverPath) supabase.storage.from('album-art').remove([coverPath])
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
  } else if (!settingsOpen) {
    // Settings gear top-left, Edit top-right. Shared links get neither.
    const gear = !viewingShared && (
      <button className="bar-btn icon" aria-label="Settings" onClick={() => openSettings()}><GearIcon /></button>
    )
    // Edit is always offered on your own Albums; signed out, it leads to Sign In.
    const edit = tab === 'albums' && !viewingShared && albums.length > 0 && (
      <button
        className={`bar-btn${editing ? ' done' : ''}`}
        onClick={() => (canManage ? setEditing(e => !e) : openSettings('signin'))}
      >
        {editing ? 'Done' : 'Edit'}
      </button>
    )
    nav = (
      <NavBar
        title={{ import: 'Add Record', coverflow: 'Cover Flow' }[tab] ?? (viewingShared ? 'Shared Albums' : 'Albums')}
        left={gear}
        right={edit}
      />
    )
  }

  return (
    <div className="device">
      <div className="device-top"><span className="speaker" /></div>
      <div className="screen">
        <StatusBar />
        {nav}
        {settingsOpen ? (
          <SettingsScreen
            user={user}
            view={settingsView}
            setView={setSettingsView}
            onClose={() => setSettingsOpen(false)}
            albums={albums}
            shareOwnerId={shareOwnerId}
            ask={ask}
          />
        ) : detail ? (
          <AlbumDetail key={detail.id} album={detail} onDelete={canManage ? a => deleteRecord(a) : null} />
        ) : tab === 'import' ? (
          canEdit
            ? <ImportScreen user={user} onAdded={handleAdded} ask={ask} />
            : <SignInPrompt onSignIn={() => openSettings('signin')} />
        ) : tab === 'albums' || viewingShared ? (
          <AlbumList
            // Remount once the URL is read so a shared link's genre takes effect.
            key={sharedGenre ?? 'all'}
            albums={albums}
            initialGenre={sharedGenre}
            editing={editing && canManage}
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
        {/* Shared links are browse-only: just the Albums list and Now Playing. */}
        {!viewingShared && <TabBar tabs={TABS} active={tab} onChange={switchTab} />}
        <AlertView alert={alert} onChoose={choose} />
      </div>
      <div className="device-bottom">
        <button className="home-btn" aria-label="Home" onClick={() => switchTab('albums')} />
      </div>
    </div>
  )
}
