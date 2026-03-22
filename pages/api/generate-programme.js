export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { systemPrompt, userMessage } = req.body
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY non configurée' })

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur Groq' })

    const text = data.choices?.[0]?.message?.content || ''
    res.status(200).json({ text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
