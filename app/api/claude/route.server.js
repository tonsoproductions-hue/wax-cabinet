import { identifyCover } from '@/lib/vision'
import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

// Each scan costs a fraction of a cent (Haiku ~$0.001, Sonnet ~$0.004), but
// cap scans per user per day so one account can't run up the bill.
const DAILY_LIMIT = Number(process.env.IDENTIFY_DAILY_LIMIT) || 40
// The app resizes covers to 800px JPEGs (~150 KB); anything far bigger is a mistake or abuse.
const MAX_BASE64_LENGTH = 3_000_000
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request) {
  // Each call costs money, so only signed-in users can identify covers.
  const { supabase, user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const { base64, mediaType } = await request.json()
  if (typeof base64 !== 'string' || !MEDIA_TYPES.includes(mediaType)) {
    return Response.json({ error: 'Expected a JPEG, PNG, WebP or GIF image' }, { status: 400 })
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: 'That photo is too large' }, { status: 413 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('identify_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)
  if (countError) console.error('Usage check failed:', countError.message)
  else if (count >= DAILY_LIMIT) {
    return Response.json(
      { error: `You've reached today's limit of ${DAILY_LIMIT} cover scans. Fill in the details by hand, or try again tomorrow.` },
      { status: 429 }
    )
  }

  let result
  try {
    result = await identifyCover(base64, mediaType)
  } catch (err) {
    console.error('Cover identification failed:', err)
    return Response.json({ error: 'Could not identify the cover' }, { status: 502 })
  }

  // One row per scan, with what it actually cost across any escalations.
  const costUsd = result.attempts.reduce((sum, a) => sum + (a.costUsd ?? 0), 0)
  const { error: logError } = await supabase.from('identify_events').insert({
    user_id: user.id,
    model: result.model,
    cost_usd: costUsd,
    attempts: result.attempts,
  })
  if (logError) console.error('Usage log failed:', logError.message)

  if (!result.album) return Response.json({ album: null })
  const { confidence, ...album } = result.album
  return Response.json({ album, confidence, identifiedBy: result.modelName })
}
