// Turns what went wrong into a sentence a person can act on, instead of
// "Failed to fetch" or a database error code.

// fetch() for our API routes: returns the JSON body, or throws an Error with
// the server's message and the HTTP status. Network failures keep their
// TypeError so explain() can tell them apart; aborts pass through untouched.
export async function fetchJson(url, options) {
  const resp = await fetch(url, options)
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data.error) {
    throw Object.assign(new Error(data.error || `The server answered ${resp.status}`), { status: resp.status })
  }
  return data
}

export function explain(err) {
  const message = err?.message ?? String(err ?? '')
  if (err?.name === 'TypeError' && /fetch|load failed|network/i.test(message)) {
    return navigator.onLine === false
      ? 'You’re offline. Check your Wi-Fi or mobile data.'
      : 'Couldn’t reach Vinyl Crate’s server. Check your connection.'
  }
  if (err?.status === 401 || /jwt|not authenticated|sign in to do that/i.test(message)) {
    return 'Your sign-in has expired. Sign in again from Settings.'
  }
  if (err?.status === 413) return 'The photo is too large to upload.'
  // Supabase database errors carry a five-character Postgres code.
  if (err?.code === '42501') return 'You don’t have permission to change that record.'
  if (/^[0-9A-Z]{5}$/.test(err?.code ?? '')) return `The database turned it down (${message}).`
  if (err?.name === 'QuotaExceededError' || /quota|no space/i.test(message)) {
    return 'Your device is out of storage space.'
  }
  // Our API routes pass on Discogs' own status as "Discogs returned 429".
  if (err?.status === 429 || /returned 429/.test(message)) {
    return 'Discogs is getting too many lookups right now. Wait a minute and try again.'
  }
  if (/returned 404/.test(message)) return 'Discogs doesn’t have that release any more.'
  if (err?.status >= 500) {
    return /^The server answered/.test(message)
      ? 'The server had a problem. Try again in a moment.'
      : `${message.replace(/\.$/, '')}. Try again in a moment.`
  }
  return message || 'Something went wrong.'
}
