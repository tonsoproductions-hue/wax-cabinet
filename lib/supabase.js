import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Header that lets our API routes act as the signed-in user.
export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Storage path of a cover photo the given user uploaded, or null.
export function ownCoverPath(imageUrl, userId) {
  const marker = `/album-art/${userId}/`
  const at = imageUrl?.indexOf(marker) ?? -1
  return at === -1 ? null : decodeURIComponent(imageUrl.slice(at + '/album-art/'.length))
}
