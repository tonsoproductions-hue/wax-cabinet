// Server-only: identifies an album from a cover photo, trying the cheapest
// model first and escalating only when it fails, can't read the cover, or says
// it isn't confident. Imported by app/api/claude/route.server.js.
//
// Choose models with the VISION_MODELS env var: a comma-separated list,
// cheapest first, e.g. "claude-haiku-5-5,claude-sonnet-5-5". Any Claude model
// id works; ids in MODEL_CATALOG also get a display name and cost tracking.
// To add another provider, add a `call` function to PROVIDERS and catalog
// entries that name it.
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { GENRES } from '@/lib/genres'

export const DEFAULT_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5']

// Prices in USD per million tokens (Haiku 5.5's apply to prompts under 100k
// tokens, which a cover scan always is). Haiku 4.5 rejects the effort setting,
// so only the newer models get `effort: 'low'` (a lookup needs little thinking).
export const MODEL_CATALOG = {
  'claude-haiku-5-5': { name: 'Claude Haiku 5.5', provider: 'anthropic', price: { input: 0.1, output: 0.5 }, effort: 'low' },
  'claude-haiku-4-5': { name: 'Claude Haiku 4.5', provider: 'anthropic', price: { input: 1, output: 5 } },
  'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5', provider: 'anthropic', price: { input: 2, output: 10 }, effort: 'low' },
  'claude-opus-5-5': { name: 'Claude Opus 5.5', provider: 'anthropic', price: { input: 4, output: 20 }, effort: 'low' },
}

export const AlbumSchema = z.object({
  artist: z.string(),
  title: z.string(),
  year: z.string(),
  genre: z.enum(GENRES),
  label: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
})

const PROMPT = `This is a photo of a vinyl record album cover. Identify the album and return its artist, title, original release year, genre and record label. Use an empty string for anything you can't determine from the cover. Genre must be one of: ${GENRES.join(', ')}. Set confidence to "low" if you are guessing which album this is.`

let anthropic
const PROVIDERS = {
  async anthropic(modelId, entry, base64, mediaType) {
    anthropic ??= new Anthropic()
    const response = await anthropic.messages.parse({
      model: modelId,
      max_tokens: 2000,
      output_config: {
        format: zodOutputFormat(AlbumSchema),
        ...(entry.effort && { effort: entry.effort }),
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    })
    return {
      album: response.stop_reason === 'refusal' ? null : response.parsed_output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  },
}

export function configuredModels() {
  const list = (process.env.VISION_MODELS || '').split(',').map(s => s.trim()).filter(Boolean)
  return list.length ? list : DEFAULT_MODELS
}

function catalogEntry(modelId) {
  return MODEL_CATALOG[modelId] ?? { name: modelId, provider: 'anthropic', price: null }
}

function costOf(entry, inputTokens, outputTokens) {
  if (!entry.price) return null
  return (inputTokens * entry.price.input + outputTokens * entry.price.output) / 1_000_000
}

const readable = album => album && (album.artist || album.title)

// Returns { album, model, modelName, attempts } where attempts lists every
// model tried with its token usage and cost, for logging. Throws only if
// every model errored.
export async function identifyCover(base64, mediaType, models = configuredModels()) {
  const attempts = []
  let best = null
  let lastError = null

  for (const [i, modelId] of models.entries()) {
    const entry = catalogEntry(modelId)
    const call = PROVIDERS[entry.provider]
    if (!call) {
      console.error(`No provider "${entry.provider}" for model ${modelId}`)
      continue
    }
    try {
      const { album, inputTokens, outputTokens } = await call(modelId, entry, base64, mediaType)
      attempts.push({ model: modelId, inputTokens, outputTokens, costUsd: costOf(entry, inputTokens, outputTokens) })
      if (readable(album)) best = { album, model: modelId, modelName: entry.name }
      const isLast = i === models.length - 1
      if (readable(album) && (album.confidence !== 'low' || isLast)) break
    } catch (err) {
      lastError = err
      attempts.push({ model: modelId, error: err.message })
      console.error(`Cover identification with ${modelId} failed:`, err.message)
    }
  }

  if (!best && lastError && attempts.every(a => a.error)) throw lastError
  return { ...(best ?? { album: null, model: null, modelName: null }), attempts }
}
