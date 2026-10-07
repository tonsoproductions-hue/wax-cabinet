import { GENRES } from '@/lib/genres'

// iPod-style ordering: by artist ignoring a leading "The", then year.
export function sortKey(album) {
  return (album.artist || '').replace(/^the\s+/i, '')
}

export function sortAlbums(albums) {
  return [...albums].sort((a, b) =>
    sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }) ||
    (a.year || 0) - (b.year || 0)
  )
}

const DISCOGS_GENRES = {
  'Funk / Soul': 'Soul',
  'Hip Hop': 'Hip-Hop',
  'Folk, World, & Country': 'Folk',
}

function toGenre(discogsGenres = []) {
  for (const g of discogsGenres) {
    const mapped = DISCOGS_GENRES[g] ?? g
    if (GENRES.includes(mapped)) return mapped
  }
  return 'Other'
}

const DEMO_QUERIES = [
  'Miles Davis Kind of Blue',
  'Fleetwood Mac Rumours',
  "Marvin Gaye What's Going On",
  'Daft Punk Discovery',
  'Pink Floyd The Dark Side of the Moon',
  'Stevie Wonder Songs in the Key of Life',
  'Radiohead OK Computer',
  'Bill Evans Trio Waltz for Debby',
  'A Tribe Called Quest The Low End Theory',
  'Joni Mitchell Blue',
  'Bob Marley Exodus',
  'John Coltrane A Love Supreme',
]

// A sample crate pulled live from Discogs, for when the database is unavailable.
export async function loadDemoAlbums() {
  const albums = await Promise.all(DEMO_QUERIES.map(async (q, i) => {
    try {
      const resp = await fetch(`/api/discogs?q=${encodeURIComponent(q)}`)
      const data = await resp.json()
      const hit = data.results?.find(r => r.cover_image && !r.cover_image.endsWith('.gif'))
      if (!hit) return null
      const [artist, ...rest] = hit.title.split(' - ')
      return {
        id: `demo-${i}`,
        demo: true,
        artist: artist.replace(/\s*\(\d+\)$/, '').replace(/\*$/, ''),
        title: rest.join(' - '),
        year: hit.year ? Number(hit.year) : null,
        genre: toGenre(hit.genre),
        label: hit.label?.[0] ?? '',
        image_url: hit.cover_image,
        discogs_id: hit.id,
        market_value: null,
        condition: null,
        tracklist: [],
      }
    } catch {
      return null
    }
  }))
  return albums.filter(Boolean)
}
