import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { GENRES } from '@/lib/genres'
import { VISION_MODEL } from '@/lib/models'
import { supabaseForRequest, signInRequired } from '@/lib/supabase-server'

const AlbumSchema = z.object({
  artist: z.string(),
  title: z.string(),
  year: z.string(),
  genre: z.enum(GENRES),
  label: z.string(),
})

const EMPTY = { artist: '', title: '', year: '', genre: 'Other', label: '' }

const PROMPT = `This is a photo of a vinyl record album cover. Identify the album and return its artist, title, original release year, genre and record label. Use an empty string for anything you can't determine from the cover. Genre must be one of: ${GENRES.join(', ')}.`

const anthropic = new Anthropic()

async function identifyWithClaude(base64, mediaType) {
  const response = await anthropic.messages.parse({
    model: VISION_MODEL.id,
    max_tokens: 2000,
    output_config: { effort: 'low', format: zodOutputFormat(AlbumSchema) },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: PROMPT },
      ],
    }],
  })
  if (response.stop_reason === 'refusal') return null
  return response.parsed_output
}

export async function POST(request) {
  // Each call costs money, so only signed-in users can identify covers.
  const { user } = await supabaseForRequest(request)
  if (!user) return signInRequired()

  const { base64, mediaType } = await request.json()
  try {
    const album = await identifyWithClaude(base64, mediaType)
    return Response.json(album ?? EMPTY)
  } catch (err) {
    console.error('Cover identification failed:', err)
    return Response.json({ ...EMPTY, error: 'Could not identify the cover' }, { status: 502 })
  }
}
