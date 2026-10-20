'use client'
import { useState, useEffect, useEffectEvent, useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { supabase, ownCoverPath, authHeaders, apiUrl } from '@/lib/supabase'
import { rotateImage } from '@/lib/images'
import { sortAlbums, loadDemoAlbums, loadCollection, pickRandom } from '@/lib/albums'
import { StatusBar, NavBar, TabBar, AlertView, ShuffleIcon, GearIcon } from '@/components/ui'
import ImportScreen from '@/components/ImportScreen'
import AlbumList from '@/components/AlbumList'
import AlbumDetail from '@/components/AlbumDetail'
import Nano, { NANO_COLORS } from '@/components/Nano'
import SettingsScreen from '@/components/SettingsScreen'
import { initNative } from '@/lib/native'

const TABS = [
  { id: 'import', label: 'Import' },
  { id: 'albums', label: 'Albums' },
  { id: 'coverflow', label: 'Cover Flow' },
]
// Share links can't add records, so their Wish List takes Import's place.
const SHARED_TABS = [
  { id: 'wishlist', label: 'Wish List' },
  { id: 'albums', label: 'Albums' },
  { id: 'coverflow', label: 'Cover Flow' },
]

const noSubscribe = () => () => {}

// The website shows this collection to signed-out visitors. Leave it unset in
// the iOS build so the app opens on its welcome screen instead.
const FEATURED_OWNER = process.env.NEXT_PUBLIC_FEATURED_OWNER || null

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

function Welcome({ onSignIn, onDemo }) {
  return (
    <div className="scroll pinstripes">
      <div className="empty">
        <strong>Welcome to Vinyl Crate</strong>
        <small>Photograph a record cover and Vinyl Crate identifies it, finds the pressing on Discogs and files it in your crate.</small>
      </div>
      <button className="big-btn" onClick={onSignIn}>Sign In or Create Account</button>
      <div className="button-row" style={{ marginTop: 12 }}>
        <button className="gloss-btn" onClick={onDemo}>Browse a Demo Crate</button>
      </div>
    </div>
  )
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
  const [authReady, setAuthReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [demoCrate, setDemoCrate] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState('main')
  const [collection, setCollection] = useState([])
  const [tab, setTab] = useState('albums')
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(false)
  // Your Wish List opens from a row on the Import tab, like an iPod menu.
  const [wishOpen, setWishOpen] = useState(false)
  const [flowIndex, setFlowIndex] = useState(0)
  const [nanoColor, setNanoColor] = useState(() => typeof window === 'undefined' ? 'silver' : savedNanoColor())
  const [alert, setAlert] = useState(null)
  const [shufflePool, setShufflePool] = useState(null)
  const recentPicks = useRef([])

  // Wish-list records share the table with owned ones (wanted = true).
  const albums = useMemo(() => sortAlbums(collection.filter(r => !r.wanted)), [collection])
  const wishList = useMemo(() => sortAlbums(collection.filter(r => r.wanted)), [collection])
  const viewingShared = !!sharedOwner && sharedOwner !== user?.id
  const inDemo = demo || demoCrate
  const canEdit = !!user && !inDemo && !viewingShared
  // Demo records live only in this browser, so they can be removed without signing in.
  const canManage = canEdit || inDemo
  // Whose records are on screen: a shared link's owner, you, or the website's featured crate.
  const viewedOwner = sharedOwner ?? user?.id ?? FEATURED_OWNER
  const shareOwnerId = sharedOwner ?? user?.id ?? FEATURED_OWNER
  const showWelcome = authReady && loaded && !viewedOwner && !inDemo
  const flowAt = Math.min(flowIndex, Math.max(0, albums.length - 1))

  const ask = useCallback((title, message, buttons = ['OK']) =>
    new Promise(resolve => setAlert({ title, message, buttons, resolve })), [])

  function choose(label) {
    alert.resolve(label)
    setAlert(null)
  }

  const showDemo = useCallback(async () => {
    const demoAlbums = await loadDemoAlbums()
    if (demoAlbums.length) {
      setDemoCrate(true)
      setCollection(demoAlbums)
    } else ask('Demo Unavailable', 'Couldn’t reach Discogs.')
  }, [ask])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session) setDemoCrate(false) // signing in leaves the demo for your own crate
      setAuthReady(true)
    })
    const stopNative = initNative(supabase)
    return () => {
      data.subscription.unsubscribe()
      stopNative.then(stop => stop())
    }
  }, [])

  // Reload whenever whose collection we're showing changes (sign in, sign out, shared link).
  useEffect(() => {
    if (!authReady || demoCrate) return
    let cancelled = false
    async function load() {
      if (demo) return loadDemoAlbums()
      return viewedOwner ? loadCollection(supabase, viewedOwner) : []
    }
    load()
      .then(rows => {
        if (cancelled) return
        setCollection(rows)
        setLoaded(true)
      })
      .catch(async err => {
        console.error('Loading collection failed:', err)
        const choice = await ask('Cannot Connect', 'Vinyl Crate couldn’t reach its database. You can browse a demo crate from Discogs instead.', ['OK', 'Show Demo'])
        if (choice === 'Show Demo') showDemo()
      })
    return () => { cancelled = true }
  }, [ask, showDemo, demo, demoCrate, authReady, viewedOwner])

  function switchTab(id) {
    setTab(id)
    setSettingsOpen(false)
    setDetail(null)
    setShufflePool(null)
    setEditing(false)
    setWishOpen(false)
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
    if ((tab === 'albums' || tab === 'coverflow') && !settingsOpen && !alert && albums.length > 1) shuffle(albums)
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
      const choice = album.wanted
        ? await ask('Remove from Wish List?', `“${album.title}” will be removed from your wish list.`, ['Cancel', 'Remove'])
        : await ask('Remove Album?', `“${album.title}” will be removed from your collection.`, ['Cancel', 'Remove'])
      if (choice !== 'Remove') return
    }
    if (!album.demo) {
      const { error } = await supabase.from('vinyl_records').delete().eq('id', album.id)
      if (error) {
        ask('Couldn’t Remove Album', error.message)
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

  // Saves a change to one record (demo records only change on screen).
  async function updateRecord(album, changes) {
    if (!album.demo) {
      const { error } = await supabase.from('vinyl_records').update(changes).eq('id', album.id)
      if (error) {
        ask('Couldn’t Save Change', error.message)
        return false
      }
    }
    const apply = r => (r?.id === album.id ? { ...r, ...changes } : r)
    setCollection(c => c.map(apply))
    setShufflePool(p => p?.map(apply) ?? null)
    setDetail(apply)
    return true
  }

  const toggleFavorite = album => updateRecord(album, { favorite: !album.favorite })

  // Turns your own cover photo 90° clockwise, uploads it and tidies away the old one.
  // Covers saved before photos were resized come back at 800px too.
  async function rotateCover(album) {
    try {
      const oldPath = ownCoverPath(album.image_url, user?.id)
      const { blob } = await rotateImage(album.image_url)
      const fd = new FormData()
      fd.append('file', new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
      const up = await fetch(apiUrl('/api/upload'), { method: 'POST', body: fd, headers: await authHeaders() })
      const upData = await up.json()
      if (upData.error) throw new Error(upData.error)
      if (await updateRecord(album, { image_url: upData.url }) && oldPath) {
        supabase.storage.from('album-art').remove([oldPath])
      }
    } catch (err) {
      console.error('rotateCover failed:', err)
      ask('Couldn’t Rotate Cover', err.message)
    }
  }

  // A wish-list record you've bought moves into the collection.
  async function gotIt(album) {
    if (await updateRecord(album, { wanted: false })) {
      setTab('albums')
      setWishOpen(false)
    }
  }

  function handleAdded(record) {
    setCollection(c => [record, ...c])
    setTab(record.wanted ? 'import' : 'albums')
    setWishOpen(!!record.wanted)
    setDetail(record)
  }

  // Your wish list inside Import, or the Wish List tab on a share link.
  const showWish = (tab === 'import' && wishOpen && canEdit) || tab === 'wishlist'

  let nav = null
  if (detail) {
    nav = (
      <NavBar
        variant="black"
        title={detail.wanted ? 'Wished For' : 'Now Playing'}
        left={<button className="bar-btn back" onClick={() => { setDetail(null); setShufflePool(null) }}>{tab === 'coverflow' ? 'Cover Flow' : showWish ? 'Wish List' : 'Albums'}</button>}
        right={shufflePool?.length > 1 && (
          <button className="bar-btn" onClick={() => shuffle(shufflePool)}><ShuffleIcon color="#fff" size={16} />Again</button>
        )}
      />
    )
  } else if (!settingsOpen) {
    // Settings gear top-left (Back on your Wish List), Edit top-right. Shared links get neither.
    const gear = showWish && !viewingShared ? (
      <button className="bar-btn back" onClick={() => { setWishOpen(false); setEditing(false) }}>Add Record</button>
    ) : !viewingShared && (
      <button className="bar-btn icon" aria-label="Settings" onClick={() => openSettings()}><GearIcon /></button>
    )
    // Edit is always offered on your own Albums and Wish List; signed out, it leads to Sign In.
    const listed = showWish ? wishList : albums
    const edit = (tab === 'albums' || showWish) && !viewingShared && listed.length > 0 && (
      <button
        className={`bar-btn${editing ? ' done' : ''}`}
        onClick={() => (canManage ? setEditing(e => !e) : openSettings('signin'))}
      >
        {editing ? 'Done' : 'Edit'}
      </button>
    )
    // Share links: Sign In when signed out, then a way back to your own crate.
    const account = viewingShared && (user
      ? <button className="bar-btn" onClick={() => { window.location.href = window.location.pathname }}>My Crate</button>
      : <button className="bar-btn" onClick={() => openSettings('signin')}>Sign In</button>)
    nav = (
      <NavBar
        title={showWish ? 'Wish List' : { import: 'Add Record', coverflow: 'Cover Flow' }[tab] ?? (viewingShared ? 'Shared Albums' : 'Albums')}
        left={gear}
        right={edit || account}
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
            signInOnly={viewingShared}
          />
        ) : detail ? (
          <AlbumDetail
            key={detail.id}
            album={detail}
            onDelete={canManage ? a => deleteRecord(a) : null}
            onFavorite={canManage ? toggleFavorite : null}
            onGotIt={canManage ? gotIt : null}
            // Only photos you uploaded; Discogs covers are already upright.
            onRotate={canEdit && ownCoverPath(detail.image_url, user?.id) ? rotateCover : null}
          />
        ) : showWish ? (
          <AlbumList
            kind="wishlist"
            albums={wishList}
            readOnly={viewingShared}
            editing={editing && canManage}
            onOpen={openAlbum}
            onDelete={a => deleteRecord(a, { confirm: false })}
          />
        ) : tab === 'import' ? (
          canEdit
            ? <ImportScreen user={user} onAdded={handleAdded} ask={ask} wishCount={wishList.length} onOpenWishList={() => setWishOpen(true)} />
            : <SignInPrompt onSignIn={() => openSettings('signin')} />
        ) : showWelcome && tab !== 'import' ? (
          <Welcome onSignIn={() => openSettings('signin')} onDemo={showDemo} />
        ) : tab === 'albums' || (viewingShared && tab !== 'coverflow') ? (
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
        {/* Shared links are browse-only: Wish List, Albums and Cover Flow. */}
        <TabBar tabs={viewingShared ? SHARED_TABS : TABS} active={tab} onChange={switchTab} />
        <AlertView alert={alert} onChoose={choose} />
      </div>
      <div className="device-bottom">
        <button className="home-btn" aria-label="Home" onClick={() => switchTab('albums')} />
      </div>
    </div>
  )
}
