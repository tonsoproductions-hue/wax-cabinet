export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const id = searchParams.get('id')

  const base = id
    ? `https://api.discogs.com/releases/${id}`
    : `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release&per_page=5`

  const resp = await fetch(base, {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
      'User-Agent': 'WaxCabinet/1.0'
    }
  })

  const data = await resp.json()
  return Response.json(data)
}