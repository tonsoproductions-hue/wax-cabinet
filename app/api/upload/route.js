import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

export async function POST(request) {
  const { supabase, user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string' || !file.type.startsWith('image/')) {
    return Response.json({ error: 'Expected an image file' }, { status: 400 })
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
