import { createClient } from '@supabase/supabase-js'

// For API routes: returns a Supabase client acting as the caller, plus their
// user, or { user: null } when the request has no valid sign-in token.
export async function supabaseForRequest(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { user: null }
  return { supabase, user: data.user }
}

export const signInRequired = () =>
  Response.json({ error: 'Sign in to do that' }, { status: 401 })
