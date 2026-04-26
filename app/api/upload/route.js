import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
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
