import { supabaseForRequest, supabaseAdmin, signInRequired } from '@/lib/supabase-server'

// Deletes the caller's account: their cover photos, then the auth user.
// Their records go with it (vinyl_records.owner_id cascades on delete).
// The App Store requires apps with sign-up to offer this in-app.
export async function DELETE(request) {
  const { user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  let admin
  try {
    admin = supabaseAdmin()
  } catch (err) {
    console.error(err.message)
    return Response.json({ error: 'Account deletion isn’t set up yet. Contact support.' }, { status: 500 })
  }

  // Remove every cover in the user's folder, a page at a time.
  const bucket = admin.storage.from('album-art')
  for (;;) {
    const { data: files, error } = await bucket.list(user.id, { limit: 1000 })
    if (error) {
      console.error('Listing covers failed:', error.message)
      return Response.json({ error: 'Couldn’t delete your cover photos. Try again.' }, { status: 500 })
    }
    if (!files.length) break
    const { error: removeError } = await bucket.remove(files.map(f => `${user.id}/${f.name}`))
    if (removeError) {
      console.error('Removing covers failed:', removeError.message)
      return Response.json({ error: 'Couldn’t delete your cover photos. Try again.' }, { status: 500 })
    }
    if (files.length < 1000) break
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('Deleting user failed:', error.message)
    return Response.json({ error: 'Couldn’t delete your account. Try again.' }, { status: 500 })
  }
  return new Response(null, { status: 204 })
}
