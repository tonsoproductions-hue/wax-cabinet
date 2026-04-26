export async function POST(request) {
  const { base64, mediaType, model } = await request.json()

  const prompt = 'This is a vinyl record album cover. Return ONLY valid JSON with keys: artist, title, year, genre, label. Genre must be one of: Jazz, Rock, Soul, Blues, Electronic, Classical, Hip-Hop, Folk, R&B, Pop, Country, Reggae, Other. No other text, no markdown.'

if (model === 'gemini') {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: base64 } },
            { text: prompt }
          ]
        }]
      })
    }
  )
  const data = await resp.json()
  console.log('Gemini status:', resp.status)
  console.log('Gemini response:', JSON.stringify(data).slice(0, 1000))  // ← key line

  if (data.error) {
    console.error('Gemini error:', data.error)
    return Response.json({ artist: '', title: '', year: '', genre: 'Other', label: '' })
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  try {
    return Response.json(JSON.parse(text.replace(/```json|```/g, '').trim()))
  } catch {
    return Response.json({ artist: '', title: '', year: '', genre: 'Other', label: '' })
  }
}

  // Default: Claude
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  })
  const data = await resp.json()
  const text = data.content?.[0]?.text || '{}'
  return Response.json(JSON.parse(text.replace(/```json|```/g, '').trim()))
}