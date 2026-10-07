import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { GENRES } from '@/lib/genres'

const CLAUDE_MODEL = 'claude-opus-5-5'
const GEMINI_MODEL = 'gemini-3.5-flash'

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
    model: CLAUDE_MODEL,
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

async function identifyWithGemini(base64, mediaType) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mediaType, data: base64 } }, { text: PROMPT }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(AlbumSchema),
        },
      }),
    }
  )
  const data = await resp.json()
  if (data.error) throw new Error(`Gemini: ${data.error.message}`)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return text ? AlbumSchema.parse(JSON.parse(text)) : null
}

export async function POST(request) {
  const { base64, mediaType, model } = await request.json()
  try {
    const album = model === 'gemini'
      ? await identifyWithGemini(base64, mediaType)
      : await identifyWithClaude(base64, mediaType)
    return Response.json(album ?? EMPTY)
  } catch (err) {
    console.error('Cover identification failed:', err)
    return Response.json({ ...EMPTY, error: 'Could not identify the cover' }, { status: 502 })
  }
}
