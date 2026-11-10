# Correctifs du 10/11/2026 — dates, erreurs silencieuses, recherche d'aliments

## 1. Les semaines commençaient un dimanche (bug de fuseau)

`toISOString()` convertit en UTC. En France, « lundi 00:00 » devient
« dimanche 23:00 UTC », donc la date calculée était **la veille**. Effets
constatés dans le code :

- Côté coach, les bilans étaient créés avec `week_start` = dimanche, alors que
  côté athlète c'était le lundi → « Semaine en cours » ne retrouvait pas le
  bilan de l'athlète, et des doublons pouvaient être créés.
- Le taux d'assiduité (compliance) comparait les séances au mauvais jour.
- Entre minuit et 1 h (2 h l'été), « aujourd'hui » était la veille (pesées,
  tâches, journaux nutrition).
- Le dimanche, la page Mensurations cherchait les séances à partir du lundi
  **suivant** (donc aucune).

Correctif : `toLocalISODate()`, `parseLocalDate()` et `addDaysISO()` dans
`lib/dateUtils.js`, utilisés partout. Tests : `lib/__tests__/dateUtils.test.js`
(exécutés en fuseau Europe/Paris, heure d'hiver et d'été).

### ⚠️ Ordre de déploiement

Les bilans déjà enregistrés avec un dimanche doivent être recalés, sinon la
vue coach ne les reconnaîtra plus comme « semaine en cours » :

1. Merger la PR → attendre que Vercel ait déployé.
2. Juste après : Supabase → SQL Editor → coller
   `supabase/migrations/20261110130000_bilans_semaine_lundi.sql` → Run.
   - Aucune ligne n'est supprimée ; l'ancienne date est gardée dans la
     colonne `week_start_avant_20261110` (rollback exact en bas du fichier).
   - Le dernier résultat liste les semaines qui ont 2 bilans pour un même
     athlète : rien n'est fusionné automatiquement, regarde-les.
   - Si le script s'arrête sur une erreur de contrainte d'unicité, rien n'est
     cassé : envoie-moi le message, on traitera les doublons d'abord.

Les autres tables (pesées, séances, nutrition) stockent des dates de jour
réelles : rien à migrer.

## 2. Échecs d'enregistrement invisibles

`supabase-js` ne lève pas d'exception en cas d'échec, il renvoie `{ error }`.
Plusieurs actions affichaient donc « enregistré » alors que rien n'était
écrit (bilan coach, post-it, tâches et cycles, suppression de séance ou
d'exercice, activation/archivage de cycle, suppression d'aliment).

Correctif : `must()` dans `lib/db.js` transforme l'erreur en exception, et
chaque action affiche maintenant un message en cas d'échec. Le contenu saisi
reste dans le formulaire pour pouvoir réessayer.

## 3. Recherche d'aliments : clic sur un résultat → erreur

Dans `FoodBlock.jsx`, `setResults` était utilisé dans les sous-composants
`ClientLayout` et `CoachLayout` sans leur être passé (ReferenceError au clic,
la liste de résultats restait ouverte). Corrigé, et la règle ESLint
`no-undef` est maintenant activée pour détecter ce type d'erreur.
