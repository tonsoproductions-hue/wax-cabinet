import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

export async function POST(request) {
  const { supabase, user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string' || !file.type.startsWith('image/')) {
    return Response.json({ error: 'Expected an image file' }, { status: 400 })
  }
  // The app uploads its 800px resize (~150 KB). Storage is the main cost as
  // users grow, so refuse originals straight off a phone camera.
  if (file.size > 2 * 1024 * 1024) {
    return Response.json({ error: 'Cover photos must be under 2 MB' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  // Each user's covers live in their own folder; storage policies enforce it.
  const path = `${user.id}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from('album-art')
    .upload(path, buffer, { contentType: file.type })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('album-art').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}
