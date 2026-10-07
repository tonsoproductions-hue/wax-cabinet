// Server-only: identifies an album from a cover photo or typed keywords, trying the cheapest
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

// The owner's corrections, when they ask again: a hint they typed, and earlier
// answers they marked wrong. Both come from the signed-in user about their
// own photo, so the worst a bad value can do is spoil their own result.
function promptFor({ hint, rejected } = {}) {
  let text = PROMPT
  if (hint) {
    text += `\n\nThe record's owner adds this context. Trust it over your first impression of the cover: ${JSON.stringify(hint)}`
  }
  if (rejected?.length) {
    text += `\n\nThe owner says these earlier identifications are wrong, so don't return any of them: ${rejected.map(r => JSON.stringify(r)).join('; ')}. Look again closely at the lettering, artwork, logos and catalogue numbers.`
  }
  return text
}

// Text search: the person types a name or a description instead of taking a photo.
function textPromptFor(query, { rejected } = {}) {
  let text = `Someone is looking for a vinyl record and typed this: ${JSON.stringify(query)}. It may be an exact artist and album, partial names, misspellings, lyrics, or a description of the cover or sound. Work out the single most likely album and return its artist, official album title, original release year, genre and record label. Genre must be one of: ${GENRES.join(', ')}. Use an empty string for anything you don't know. Set confidence to "low" if the words fit several albums equally well or you are guessing.`
  if (rejected?.length) {
    text += `\n\nThey say these earlier suggestions are wrong, so don't return any of them: ${rejected.map(r => JSON.stringify(r)).join('; ')}. Suggest the next most likely album.`
  }
  return text
}

let anthropic
const PROVIDERS = {
  async anthropic(modelId, entry, content) {
    // Fail fast rather than hang: 15s per call and one retry, so a stalled
    // request can't keep the person waiting (the SDK default is 10 minutes).
    anthropic ??= new Anthropic({ timeout: 15_000, maxRetries: 1 })
    const response = await anthropic.messages.parse({
      model: modelId,
      max_tokens: 2000,
      output_config: {
        format: zodOutputFormat(AlbumSchema),
        ...(entry.effort && { effort: entry.effort }),
      },
      messages: [{ role: 'user', content }],
    })
    return {
      album: response.stop_reason === 'refusal' ? null : response.parsed_output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  },
}

const modelList = value => (value || '').split(',').map(s => s.trim()).filter(Boolean)

export function configuredModels() {
  const list = modelList(process.env.VISION_MODELS)
  return list.length ? list : DEFAULT_MODELS
}

// Used when the owner says the first answer was wrong: skip straight to the
// stronger models. VISION_RETRY_MODELS overrides; by default it's every model
// after the cheapest one (or the only one, if just one is configured).
export function retryModels() {
  const list = modelList(process.env.VISION_RETRY_MODELS)
  if (list.length) return list
  const all = configuredModels()
  return all.length > 1 ? all.slice(1) : all
}

function catalogEntry(modelId) {
  return MODEL_CATALOG[modelId] ?? { name: modelId, provider: 'anthropic', price: null }
}

function costOf(entry, inputTokens, outputTokens) {
  if (!entry.price) return null
  return (inputTokens * entry.price.input + outputTokens * entry.price.output) / 1_000_000
}

const readable = album => album && (album.artist || album.title)

const ESCALATION_CUTOFF_MS = 20_000

// Identify from a cover photo. Options: models (defaults to configuredModels()),
// hint (owner's context) and rejected (earlier answers marked wrong).
export function identifyCover(base64, mediaType, { models = configuredModels(), hint, rejected } = {}) {
  return identify([
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    { type: 'text', text: promptFor({ hint, rejected }) },
  ], models)
}

// Identify from typed keywords or a description. Same options, minus the hint
// (the query is the hint).
export function identifyFromText(query, { models = configuredModels(), rejected } = {}) {
  return identify([{ type: 'text', text: textPromptFor(query, { rejected }) }], models)
}

// Returns { album, model, modelName, attempts } where attempts lists every
// model tried with its token usage and cost, for logging. Throws only if
// every model errored.
async function identify(content, models) {
  const attempts = []
  let best = null
  let lastError = null

  const started = Date.now()
  for (const [i, modelId] of models.entries()) {
    // Don't start a slower fallback model if the first one already used up the time.
    if (i > 0 && Date.now() - started > ESCALATION_CUTOFF_MS) {
      attempts.push({ model: modelId, error: 'skipped: out of time' })
      break
    }
    const entry = catalogEntry(modelId)
    const call = PROVIDERS[entry.provider]
    if (!call) {
      console.error(`No provider "${entry.provider}" for model ${modelId}`)
      continue
    }
    try {
      const { album, inputTokens, outputTokens } = await call(modelId, entry, content)
      attempts.push({ model: modelId, inputTokens, outputTokens, costUsd: costOf(entry, inputTokens, outputTokens) })
      if (readable(album)) best = { album, model: modelId, modelName: entry.name }
      const isLast = i === models.length - 1
      if (readable(album) && (album.confidence !== 'low' || isLast)) break
    } catch (err) {
      lastError = err
      attempts.push({ model: modelId, error: err.message })
      console.error(`Identification with ${modelId} failed:`, err.message)
    }
  }

  if (!best && lastError && attempts.every(a => a.error)) throw lastError
  return { ...(best ?? { album: null, model: null, modelName: null }), attempts }
}
