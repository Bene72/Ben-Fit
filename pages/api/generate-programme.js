export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { systemPrompt, userMessage } = req.body
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY non configurée' })

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur Gemini' })

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.status(200).json({ text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
