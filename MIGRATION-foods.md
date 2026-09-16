# Migration foods.js → Supabase

## Problème
`lib/foods.js` pèse **847 Ko** et est actuellement inclus dans le bundle JS client.
Sur mobile 3G, c'est ~4 secondes de chargement supplémentaires rien que pour la nutrition.

## Solution : table Supabase + API route de recherche

### 1. Créer la table Supabase

```sql
CREATE TABLE foods (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  name_fr     TEXT,
  calories    NUMERIC,
  proteins    NUMERIC,
  carbs       NUMERIC,
  fats        NUMERIC,
  fiber       NUMERIC,
  category    TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(name_fr, '') || ' ' || coalesce(name, ''))
  ) STORED
);

CREATE INDEX foods_search_idx ON foods USING GIN (search_vector);

-- RLS : lecture publique pour les utilisateurs authentifiés
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods_read" ON foods FOR SELECT TO authenticated USING (true);
```

### 2. Importer les données (script one-shot)

```js
// scripts/import-foods.js (à exécuter une seule fois en local)
import { createClient } from '@supabase/supabase-js'
import foods from '../lib/foods.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BATCH = 500
for (let i = 0; i < foods.length; i += BATCH) {
  const { error } = await supabase.from('foods').insert(foods.slice(i, i + BATCH))
  if (error) console.error(error)
  else console.log(`Inserted ${i + BATCH}/${foods.length}`)
}
```

### 3. API route de recherche

Créer `pages/api/foods-search.js` :

```js
import { withAuth } from '../../lib/withAuth'
import { createClient } from '@supabase/supabase-js'

async function handler(req, res) {
  const { q } = req.query
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query trop courte' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase
    .from('foods')
    .select('id,name,name_fr,calories,proteins,carbs,fats,fiber')
    .textSearch('search_vector', q, { type: 'websearch', config: 'french' })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ results: data })
}

export default withAuth(handler)
```

### 4. Utilisation dans NutritionTab

```js
// Remplacer l'import statique par un fetch
const searchFoods = async (query) => {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  const res = await fetch(`/api/foods-search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}
```

## Gain estimé
- Bundle JS : -847 Ko (soit ~70% du bundle actuel)
- LCP mobile : -3 à 5 secondes
- Recherche fulltext : bien meilleure qu'un `.filter()` sur 10 000 entrées
