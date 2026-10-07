import { createClient } from '@supabase/supabase-js'

// Uptime check, and the daily Vercel cron in vercel.json: a real database read
// keeps a free-tier Supabase project from pausing after a quiet week.
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )
  const started = Date.now()
  const { error } = await supabase.from('vinyl_records').select('id', { head: true, count: 'estimated' }).limit(1)
  const body = { ok: !error, database: error ? error.message : 'ok', ms: Date.now() - started }
  return Response.json(body, { status: error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } })
}
