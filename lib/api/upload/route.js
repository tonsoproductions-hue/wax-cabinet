import { supabase } from '@/lib/supabase'

export async function POST(request) {
  const formData = await request.formData()
  const file = formData.get('file')
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const path = `covers/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('album-art')
    .upload(path, buffer, { contentType: file.type })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('album-art').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}