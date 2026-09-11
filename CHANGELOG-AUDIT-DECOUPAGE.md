# Point 4 de l'audit — Découpage de pages/coach.js (09/09/2026)

## Avant / après
`pages/coach.js` : **1260 lignes → 523 lignes** (état, chargement de données, handlers, orchestration du layout uniquement).

Le rendu a été extrait tel quel (copié-collé, zéro changement de comportement ou de style) dans 6 nouveaux composants :

```
components/coach/dashboard/
├── CoachSidebar.jsx      (177 lignes) — barre latérale desktop
├── CoachMobileNav.jsx    (38 lignes)  — barre d'onglets mobile
├── KpiRow.jsx            (33 lignes)  — ligne des 3 cartes KPI
├── ClientsTab.jsx        (293 lignes) — onglet "Clients" (recherche/tri/liste + colonne activité)
├── OffresTab.jsx         (198 lignes) — onglet "Offres" (cartes offres + tableau répartition)
└── CalendarTab.jsx       (86 lignes)  — onglet "Calendrier" (panneau + liste des suivis)
```

## Ce qui n'a PAS changé
- Aucune logique métier modifiée. Chaque composant reçoit exactement les mêmes valeurs qu'avant (state, handlers, données dérivées) simplement passées en props plutôt que fermées par closure.
- Aucun style, aucune classe, aucun texte modifié.
- Les imports `Avatar`, `KpiCard`, `Badge`, `ActivityFeed`, `CalendarPanel`, `CycleTasksPanel`, `Icon` ont migré vers les composants qui les utilisent réellement désormais.

## Petit bonus trouvé en cours de route
`import ProgressBar from '../components/coach/ProgressBar'` était présent dans `pages/coach.js` mais n'était utilisé nulle part dans le fichier (mort avant même ce découpage). Retiré.

## Validation
```
npm run lint    → 0 erreur, 0 warning
npm test        → 3 suites, 52 tests, tous passants (inchangés, sans rapport avec ce découpage)
npm run build   → succès, 15 pages générées, /coach : 21.2 kB (comportement identique)
```

## Fichiers à remplacer / ajouter
```
Ben-Fit-main/
└── components/
    └── coach/
        └── dashboard/                    ← NOUVEAU dossier
            ├── CoachSidebar.jsx          ← NOUVEAU
            ├── CoachMobileNav.jsx        ← NOUVEAU
            ├── KpiRow.jsx                ← NOUVEAU
            ├── ClientsTab.jsx            ← NOUVEAU
            ├── OffresTab.jsx             ← NOUVEAU
            └── CalendarTab.jsx           ← NOUVEAU

pages/coach.js                            ← REMPLACÉ (1260 → 523 lignes)
```

## Prochain fichier candidat au découpage
`pages/mensurations.js` (1632 lignes) ou `components/coach/ProgrammeTab.jsx` (1993 lignes) — dis-moi lequel tu veux ensuite.
