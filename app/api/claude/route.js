import { identifyCover } from '@/lib/vision'
import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

const EMPTY = { artist: '', title: '', year: '', genre: 'Other', label: '' }

export async function POST(request) {
  // Each call costs money, so only signed-in users can identify covers.
  const { user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const { base64, mediaType } = await request.json()
  try {
    // Cheapest model first; see lib/vision.js and the VISION_MODELS env var.
    const { album, model, attempts } = await identifyCover(base64, mediaType)
    const cost = attempts.reduce((sum, a) => sum + (a.costUsd ?? 0), 0)
    console.log(`Cover scan: ${model ?? 'unreadable'} after ${attempts.length} attempt(s), $${cost.toFixed(5)}`)
    if (!album) return Response.json(EMPTY)
    // Same fields as before, so the live Import screen fills its form unchanged.
    const { artist, title, year, genre, label } = album
    return Response.json({ artist, title, year, genre, label })
  } catch (err) {
    console.error('Cover identification failed:', err)
    return Response.json({ ...EMPTY, error: 'Could not identify the cover' }, { status: 502 })
  }
}
