export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const id = searchParams.get('id')

  if (!id && !q) return Response.json({ results: [] })
  if (id && !/^\d+$/.test(id)) return Response.json({ error: 'Invalid release id' }, { status: 400 })

  const url = id
    ? `https://api.discogs.com/releases/${id}`
    : `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release&format=Vinyl&per_page=5`

  const resp = await fetch(url, {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
      'User-Agent': 'WaxCabinet/1.0'
    }
  })

  if (!resp.ok) {
    console.error('Discogs error:', resp.status, await resp.text())
    return Response.json({ error: `Discogs returned ${resp.status}`, results: [] }, { status: 502 })
  }
  return Response.json(await resp.json())
}
