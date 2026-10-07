import { identifyCover, identifyFromText, configuredModels, retryModels } from '@/lib/vision'
import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

// Each scan costs a fraction of a cent (Haiku 5.5 ~$0.0001, Sonnet ~$0.003), but
// cap scans per user per day so one account can't run up the bill.
const DAILY_LIMIT = Number(process.env.IDENTIFY_DAILY_LIMIT) || 40
// The app resizes covers to 800px JPEGs (~150 KB); anything far bigger is a mistake or abuse.
const MAX_BASE64_LENGTH = 3_000_000
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// Hard ceiling on this function; lib/vision.js normally finishes within ~35s.
export const maxDuration = 60

export async function POST(request) {
  // Each call costs money, so only signed-in users can identify records.
  // Send either a cover photo ({ base64, mediaType }) or typed keywords ({ text }).
  const { supabase, user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const body = await request.json()
  const { base64, mediaType, retry } = body
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 300) : ''
  const hint = typeof body.hint === 'string' ? body.hint.trim().slice(0, 300) : undefined
  const rejected = Array.isArray(body.rejected)
    ? body.rejected.filter(r => typeof r === 'string' && r.trim()).slice(0, 5).map(r => r.trim().slice(0, 200))
    : []
  if (!text && (typeof base64 !== 'string' || !MEDIA_TYPES.includes(mediaType))) {
    return Response.json({ error: 'Send a JPEG, PNG, WebP or GIF cover photo, or some words to search for' }, { status: 400 })
  }
  if (!text && base64.length > MAX_BASE64_LENGTH) {
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
      { error: `You've reached today's limit of ${DAILY_LIMIT} lookups. Fill in the details by hand or search Discogs, or try again tomorrow.` },
      { status: 429 }
    )
  }

  let result
  try {
    // "Ask again" goes straight to the stronger models, with the owner's
    // hint and the answers they rejected (both length-capped above).
    const models = retry ? retryModels() : configuredModels()
    result = text
      ? await identifyFromText(text, { models, rejected })
      : await identifyCover(base64, mediaType, { models, hint, rejected })
  } catch (err) {
    console.error('Identification failed:', err)
    return Response.json({ error: text ? 'Could not look that up' : 'Could not identify the cover' }, { status: 502 })
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
  // The model may stand by an answer the owner rejected (sometimes it's
  // right). Flag it so the app can say so rather than look like nothing happened.
  const same = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const repeated = rejected.some(r => same(r) === same(`${album.artist} — ${album.title}`))
  return Response.json({ album, confidence, identifiedBy: result.modelName, repeated })
}
