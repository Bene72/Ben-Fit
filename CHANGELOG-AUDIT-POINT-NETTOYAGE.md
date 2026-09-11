# Nettoyage rapide — 09/09/2026 (avant le découpage des gros fichiers)

## 1. Warnings ESLint (3 corrigés)
- `components/ui/AppShell.js` — `<img>` → `<Image>` (next/image) pour le logo du menu.
- `pages/index.js` — `<img>` → `<Image>` (next/image) pour le logo de la page de connexion.
- `pages/messages.js` — `router` ajouté aux dépendances du `useEffect` (référence stable en Pages Router, aucun risque de boucle).

**Découverte en cours de route :** le script `npm run lint` (`eslint .` sans `--ext`) ne lint en réalité que les fichiers `.js`, pas les `.jsx`. En testant avec `--ext .js,.jsx` explicite, 3 warnings supplémentaires apparaissent dans des `.jsx` :
- `components/coach/BilanTab.jsx:20` — dépendance manquante `load`
- `components/coach/MessagesTab.jsx:54` — dépendances manquantes `coachId`, `onRead`
- `components/coach/NutritionTab.jsx:756` — dépendance manquante `log`

Je ne les ai **pas corrigés** : ce sont des `useEffect` métier où ajouter la dépendance manquante pourrait changer le comportement (relance de l'effet à chaque changement de `coachId`/`onRead`/etc.), contrairement au cas de `messages.js` où c'était sans risque. Ça mérite un regard au cas par cas plutôt qu'un correctif mécanique. Deux options pour la suite :
1. Étendre `"lint": "eslint . --max-warnings=0"` à `"eslint . --ext .js,.jsx --max-warnings=0"` dans `package.json`, puis traiter ces 3 warnings.
2. Laisser tel quel pour l'instant (le script actuel passe à 0 warning).

## 2. Formatage Prettier
`npm run verify` inclut un `format:check` qui échoue sur **69 fichiers** non formatés — un problème préexistant et généralisé, pas quelque chose que j'ai reformaté en bloc (le diff serait énorme et sans rapport avec l'audit). J'ai uniquement reformaté les 8 fichiers que j'ai moi-même créés/modifiés dans ce projet (mes 3 fichiers de tests + `rateLimit.js`, `pages/coach.js`, `pages/messages.js`, `GestionTab.jsx`, `AppShell.js`), pour qu'au moins mes propres contributions soient conformes.
Si tu veux que `npm run verify` passe intégralement un jour, il faudra un `npx prettier --write .` global suivi d'une relecture — je peux le faire sur demande séparée.

## 3. Documentation obsolète — `GUIDE-SECURITE.md`
Un bandeau d'avertissement a été ajouté en tête du fichier : il documente un round d'audit antérieur, mentionne des fichiers qui n'existent plus (`generate-programme.js`, `exercise-images.js`, `today-view.js`) et un CSP qui a depuis été déplacé dans `middleware.js`. Le contenu original est conservé tel quel comme trace historique ; le bandeau renvoie vers `CHANGELOG-AUDIT-2026-09-09.md` et `CHANGELOG-AUDIT-POINT3-TESTS.md` pour l'état actuel.

## 4. Renommage — confusion `coachShared.js` / `coachDashboard/shared.js`
`lib/coachDashboard/shared.js` → renommé en **`lib/coachDashboard/offersAndCompliance.js`** (reflète mieux son contenu : offres, calcul de compliance, calendrier, modèle client). Les 16 fichiers qui l'importaient ont tous été mis à jour. `lib/coachShared.js` (helpers UI + dates de l'espace coach) n'est pas renommé, il garde son nom actuel — c'est bien lui la "source de vérité" désignée dans ses propres commentaires.

---

## Validation
```
npm run lint    → 0 erreur, 0 warning
npm test        → 3 suites, 52 tests, tous passants
npm run build   → succès, 15 pages générées, middleware 83 kB
```

## Fichiers modifiés/créés dans ce lot
```
Ben-Fit-main/
├── components/
│   └── ui/AppShell.js                              ← MODIFIÉ (img → Image)
├── pages/
│   ├── index.js                                    ← MODIFIÉ (img → Image)
│   └── messages.js                                 ← MODIFIÉ (dep useEffect)
├── GUIDE-SECURITE.md                               ← MODIFIÉ (bandeau historique)
├── lib/coachDashboard/
│   ├── shared.js                                   ← SUPPRIMÉ (renommé)
│   └── offersAndCompliance.js                      ← NOUVEAU (ex-shared.js)
└── + 16 fichiers avec import mis à jour :
    components/coach/OfferModal.jsx, ActivityFeed.jsx, PostItPanel.jsx,
    Avatar.jsx, CreateClientModal.jsx, ClientDetail.jsx, Badge.jsx,
    CycleTasksPanel.js, CalendarPanel.jsx, NavBtn.jsx, CoachMiniChart.jsx,
    KpiCard.jsx, CoachHome.jsx, TrackerPanel.jsx, ArchiveModal.jsx,
    pages/coach.js
```
