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
  const blob = new Blob(['﻿' + collectionCsv(albums)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wax-cabinet-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Read-only link to one owner's collection, optionally opened on a genre.
export function shareUrl(ownerId, genre) {
  const url = new URL(window.location.origin)
  if (ownerId) url.searchParams.set('c', ownerId)
  if (genre && genre !== 'All') url.searchParams.set('g', genre)
  return url.toString()
}

// Phone share sheet when available, otherwise copy to the clipboard.
// Resolves to 'shared', 'copied', 'cancelled' or 'failed'.
export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
