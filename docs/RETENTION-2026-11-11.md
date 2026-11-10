# Fonctions « rétention » — mise en service

## Ce qui a été ajouté

**Côté coach (cockpit `/coach`)**

- **Qui a besoin de toi cette semaine ?** : athlètes à risque (2 séances
  manquées d'affilée, pas de journal nutrition depuis 5 jours, bilan non
  rempli, ressenti en baisse) avec un bouton « Envoyer un message » pré-rédigé.
- **Renouvellements à préparer** : athlètes en semaine 10+ de leur engagement
  de 12 semaines, avec le résumé de progression depuis le début.
- **Fins de cycle** : repères J-14 / J-7 dans les tâches.
- **Fiche client → Vue d'ensemble** : date de début d'engagement (bouton
  « Renouvelé aujourd'hui ») et objectifs de l'Athlete Assessment.

**Côté athlète (accueil)**

- Objectifs avec barre de progression (l'athlète peut mettre à jour sa valeur).
- Série de semaines complètes (à partir de 2).
- Bilan du dernier cycle de 5 semaines, partageable en image.
- Invitation à installer l'app et à activer les notifications.

**Notifications sur le téléphone**

- Nouveau message (coach ↔ athlète), dès l'envoi.
- Chaque matin vers 7 h 30 : séance du jour (athlète), bilan à remplir le
  dimanche (athlète), résumé « qui a besoin de toi » (coach).

## Mise en service (une seule fois)

1. **Supabase → SQL Editor → New query** : coller
   `supabase/migrations/20261111090000_retention.sql` → **Run**.
   Le résultat doit afficher `colonne_engagement = 1` et
   `table_notifications_ok = true`. Rien n'est supprimé.
2. **Vercel → projet → Settings → Environment Variables** : ajouter les 4
   variables (valeurs fournies par Claude, à ne pas publier) :
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `CRON_SECRET` — environnement « Production » (et « Preview » si tu veux
   tester les notifications sur les versions de test).
3. **Vercel → Deployments → ⋯ sur le dernier → Redeploy** (les variables ne
   sont prises en compte qu'au déploiement suivant).
4. Sur ton téléphone : ouvrir l'app → « Activer les notifications ».
   iPhone : d'abord Partager → « Sur l'écran d'accueil », puis ouvrir l'app
   depuis l'icône.
5. Fiche de chaque athlète : vérifier la **date de début d'engagement**
   (pré-remplie avec la date de création du compte) et ajouter ses
   **objectifs**.

Sans les étapes 2-3, tout fonctionne sauf les notifications.
