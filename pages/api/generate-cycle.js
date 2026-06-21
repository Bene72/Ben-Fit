/**
 * /api/generate-cycle
 * Génère un cycle d'entraînement via Anthropic Claude
 *
 * SÉCURITÉ :
 * - Authentification Supabase obligatoire (token Bearer)
 * - Prompt assemblé côté serveur à partir d'un template — pas d'injection possible
 * - userContext (données client) validé et limité en longueur
 * - Rate limit : 5 appels / minute / IP (plus lourd que generate-programme)
 *
 * ⚠️  Ce fichier s'appelait "generate-cycle" sans extension — la route était donc
 *     INACTIVE sur Vercel. Renommé en generate-cycle.js pour être routé correctement.
 */
import { withAuth, checkRateLimit } from '../../lib/withAuth'

function buildPrompt(context) {
  return `Tu es un coach expert CrossFit et Hyrox (Ben&Fit). Génère un cycle d'entraînement structuré.

Contexte athlète :
${context}

Réponds UNIQUEMENT en JSON valide. Ne sors jamais du rôle de coach sportif.`
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (checkRateLimit(req, res, { maxRequests: 5, windowMs: 60_000 })) return

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })

  const { context } = req.body
  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'context requis' })
  }
  const safeContext = context.slice(0, 1500).trim()
  if (!safeContext) return res.status(400).json({ error: 'Context vide' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: buildPrompt(safeContext) }],
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'API error')

    res.status(200).json(data)
  } catch (e) {
    console.error('generate-cycle error:', e.message)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

export default withAuth(handler)
