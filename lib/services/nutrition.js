import { supabase } from "../../lib/supabase"

export async function fetchNutritionData(clientId) {
  const [planRes, logsRes] = await Promise.all([
    supabase.from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true).maybeSingle(),
    supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', clientId).order('date', { ascending: false }).limit(84),
  ])
  if (planRes.error) throw planRes.error
  if (logsRes.error) throw logsRes.error
  return { plan: planRes.data || null, logs: logsRes.data || [] }
}

export async function upsertNutritionLogRecord({ clientId, date, fields, existingId }) {
  if (existingId) {
    const res = await supabase.from('nutrition_logs').update(fields).eq('id', existingId).select('*, nutrition_log_meals(*)').single()
    if (res.error) throw res.error
    return res.data
  }
  const res = await supabase.from('nutrition_logs').insert({ client_id: clientId, date, ...fields }).select('*, nutrition_log_meals(*)').single()
  if (res.error) throw res.error
  return res.data
}
