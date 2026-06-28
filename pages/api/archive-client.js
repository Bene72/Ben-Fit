// pages/api/archive-client.js
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role = bypass RLS
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { client_id, archived } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id requis' })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      archived:    archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq('id', client_id)
    .select()

  if (error) {
    console.error('archive-client error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true, data })
}
