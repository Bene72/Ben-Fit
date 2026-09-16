# Point 4 de l'audit — Découpage de ProgrammeTab.jsx (09/09/2026)

## Avant / après
`components/coach/ProgrammeTab.jsx` : **1993 lignes → 1681 lignes**.

## Pourquoi seulement les modales, pas tout le fichier ?
Contrairement à `pages/coach.js` (qui avait 3 onglets clairement séparés, faciles à extraire), `ProgrammeTab.jsx` est un **éditeur de cycle/workouts** avec une trentaine d'états (`useState`) fortement imbriqués : ouverture/fermeture d'un workout, mode édition, sélecteur d'exercice, réordonnancement, renommage inline... Le corps principal de l'éditeur (~700 lignes) reste volontairement en un seul bloc : le découper sans pouvoir retester chaque interaction contre un vrai Supabase (drag & drop, sauvegarde, etc.) créerait un risque de régression réel sur la fonctionnalité la plus utilisée par les coachs. Le rapport effort/risque n'était pas bon pour cette partie-là.

En revanche, **3 modales étaient parfaitement autonomes** (chacune encadrée par son propre état booléen, sans dépendance croisée avec le reste de l'éditeur) — extraction sûre et mécanique :

```
components/coach/programme/
├── WorkoutBlockPickerModal.jsx   (125 lignes) — création d'un "Workout Block" (AMRAP/EMOM/etc.)
├── DuplicateCycleModal.jsx       (86 lignes)  — duplication d'un cycle vers un autre client
└── CycleHistoryModal.jsx         (150 lignes) — historique des cycles archivés
```

## Ce qui n'a PAS changé
Aucune logique métier modifiée, copié-collé du JSX existant, simplement paramétré via props. Les fonctions `confirmAddWorkoutBlock`, `duplicateProgram`, et tout le state (`wbForm`, `duplicateTarget`, `archivedCycles`, etc.) restent dans `ProgrammeTab.jsx`, qui reste le seul détenteur de la logique — les modales ne sont que de la présentation.

## Validation
```
npm run lint    → 0 erreur, 0 warning
npm test        → 3 suites, 52 tests, tous passants
npm run build   → succès, /coach/[clientId] (qui héberge ProgrammeTab) : 28.5 kB, quasi identique à avant
```

## Fichiers à remplacer / ajouter
```
Ben-Fit-main/
└── components/coach/
    ├── ProgrammeTab.jsx                       ← REMPLACÉ (1993 → 1681 lignes)
    └── programme/                             ← NOUVEAU dossier
        ├── WorkoutBlockPickerModal.jsx         ← NOUVEAU
        ├── DuplicateCycleModal.jsx             ← NOUVEAU
        └── CycleHistoryModal.jsx               ← NOUVEAU
```

## Reste à faire sur ce fichier (si tu veux aller plus loin un jour)
Le corps principal de l'éditeur (~700 lignes, gestion des workouts/exercices/réordonnancement) pourrait être découpé en composants comme `WorkoutCard.jsx` ou `CycleEditorHeader.jsx`, mais ça demanderait des tests d'intégration (ou au moins une relecture manuelle poussée en environnement réel) avant de le tenter — je ne l'ai pas fait ici par prudence.

## Prochain fichier candidat au découpage
`pages/mensurations.js` (1632 lignes) reste le plus gros fichier non touché. Dis-moi si tu veux continuer dessus, ou si on s'arrête là pour le découpage.
