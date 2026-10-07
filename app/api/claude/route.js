import { identifyCover, configuredModels, retryModels } from '@/lib/vision'
import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

const EMPTY = { artist: '', title: '', year: '', genre: 'Other', label: '' }

// Hard ceiling on this function; lib/vision.js normally finishes within ~35s.
export const maxDuration = 60

export async function POST(request) {
  // Each call costs money, so only signed-in users can identify covers.
  const { user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const body = await request.json()
  const { base64, mediaType, retry } = body
  // The owner's corrections when they ask again, length-capped.
  const hint = typeof body.hint === 'string' ? body.hint.trim().slice(0, 300) : undefined
  const rejected = Array.isArray(body.rejected)
    ? body.rejected.filter(r => typeof r === 'string' && r.trim()).slice(0, 5).map(r => r.trim().slice(0, 200))
    : []

  try {
    // Cheapest model first; "ask again" goes straight to the stronger models.
    // See lib/vision.js, VISION_MODELS and VISION_RETRY_MODELS.
    const { album, model, modelName, attempts } = await identifyCover(base64, mediaType, {
      models: retry ? retryModels() : configuredModels(),
      hint,
      rejected,
    })
    const cost = attempts.reduce((sum, a) => sum + (a.costUsd ?? 0), 0)
    console.log(`Cover scan${retry ? ' (retry)' : ''}: ${model ?? 'unreadable'} after ${attempts.length} attempt(s), $${cost.toFixed(5)}`)
    if (!album) return Response.json(EMPTY)
    const { artist, title, year, genre, label } = album
    // The model may stand by an answer the owner rejected (sometimes it's
    // right); flag it so the app can say so rather than look like nothing happened.
    const same = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const repeated = rejected.some(r => same(r) === same(`${artist} — ${title}`))
    return Response.json({ artist, title, year, genre, label, identifiedBy: modelName, repeated })
  } catch (err) {
    console.error('Cover identification failed:', err)
    return Response.json({ ...EMPTY, error: 'Could not identify the cover' }, { status: 502 })
  }
}
