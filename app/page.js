'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { sortAlbums, loadDemoAlbums } from '@/lib/albums'
import { StatusBar, NavBar, TabBar, AlertView } from '@/components/ui'
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

export default function Home() {
  const [collection, setCollection] = useState([])
  const [tab, setTab] = useState('albums')
  const [model, setModel] = useState('claude')
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(false)
  const [flowIndex, setFlowIndex] = useState(0)
  const [nanoColor, setNanoColor] = useState(() => typeof window === 'undefined' ? 'silver' : savedNanoColor())
  const [alert, setAlert] = useState(null)

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
    setEditing(false)
  }

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
        left={<button className="bar-btn back" onClick={() => setDetail(null)}>{tab === 'coverflow' ? 'Cover Flow' : 'Albums'}</button>}
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
          <ImportScreen model={model} setModel={setModel} onAdded={handleAdded} ask={ask} />
        ) : tab === 'albums' ? (
          <AlbumList albums={albums} editing={editing} onOpen={setDetail} onDelete={a => deleteRecord(a, { confirm: false })} />
        ) : (
          <Nano
            albums={albums}
            index={flowAt}
            setIndex={setFlowIndex}
            color={nanoColor}
            setColor={chooseNanoColor}
            onSelect={setDetail}
            onMenu={() => switchTab('albums')}
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
