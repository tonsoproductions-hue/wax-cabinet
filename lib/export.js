import { saveTextFile } from '@/lib/native'

const CSV_COLUMNS = [
  ['Artist', a => a.artist],
  ['Title', a => a.title],
  ['Year', a => a.year],
  ['Genre', a => a.genre],
  ['Label', a => a.label],
  ['Condition', a => a.condition],
  ['Value (USD)', a => (a.market_value != null ? Number(a.market_value).toFixed(2) : '')],
  ['Discogs', a => (a.discogs_id ? `https://www.discogs.com/release/${a.discogs_id}` : '')],
  ['Added', a => a.created_at?.slice(0, 10)],
]

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function collectionCsv(albums) {
  const rows = [CSV_COLUMNS.map(([name]) => name), ...albums.map(a => CSV_COLUMNS.map(([, get]) => get(a)))]
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(albums) {
  // Byte-order mark so Excel reads accented artist names as UTF-8.
  return saveTextFile(
    `vinyl-crate-${new Date().toISOString().slice(0, 10)}.csv`,
    '\uFEFF' + collectionCsv(albums),
    'text/csv;charset=utf-8'
  )
}

// Read-only link to one owner's collection, optionally opened on a genre.
// Always points at the website (NEXT_PUBLIC_SITE_URL), since links shared
// from the iOS app must open for people who don't have it.
export function shareUrl(ownerId, genre) {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)
  if (ownerId) url.searchParams.set('c', ownerId)
  if (genre && genre !== 'All') url.searchParams.set('g', genre)
  return url.toString()
}

export { shareLink } from '@/lib/native'
