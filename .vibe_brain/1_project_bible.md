# Project Bible — Kalou BTP Expert

## Vision

Application PWA mobile-first d'estimation de matériaux BTP (Bâtiment Travaux Publics) en français.
Objectif : permettre aux artisans et conducteurs de travaux de calculer rapidement les quantités de matériaux nécessaires à un chantier, **sans connexion internet**, depuis leur téléphone.

- Zéro dépendance externe (hors Tailwind CDN)
- Zéro build step — déploiement statique direct
- Offline-first via Service Worker
- Données 100% locales (localStorage, jamais de serveur)

## Stack Technique

### Frontend
- **HTML5** — structure sémantique, lang="fr", viewport-fit=cover (support encoche)
- **Vanilla JS ES6+** — modules natifs (import/export), pas de framework
- **Tailwind CSS** — chargé via CDN, thème custom étendu (`kalou.*`)
- **CSS inline** — animations (fadeIn, slideUp), états de validation, scrollbar hidden

### PWA
- **Service Worker v2** — stratégie cache-first, nettoyage auto du cache v1
- **Manifest dynamique** — généré en JS dans `pwa.js` (pas de fichier manifest.json séparé)
- **localStorage** — clé `kalou_btp_v3`, max 50 entrées, JSON

### Outils & Build
- **Aucun** — pas de npm, pas de webpack/vite/esbuild, pas de TypeScript
- Déploiement : tout serveur HTTP statique

## Conventions Globales

### Nommage

**HTML IDs :**
- `#g-*` — champs du module Gros Œuvre (ex: `#g-l`, `#g-w`)
- `#p-*` — champs Placo (ex: `#p-long`, `#p-haut`)
- `#s-*` — champs Sols (ex: `#s-surface`)
- `#btn-*` — boutons d'action
- `#tab-*` — conteneurs de sections principales

**Fonctions JS :**
- Verb-first : `handleGrosCalculate`, `renderResults`, `saveHistory`, `showToast`
- Préfixe `set*` pour les mutations d'état UI : `setGrosType`, `setSecondType`
- Préfixe `render*` pour les rendus DOM : `renderResults`, `renderHistory`, `renderGrosSubNav`

**Variables :**
- `_activeGros` — état module-level préfixé `_`

### Structure des fichiers

```
kalou-btp-expert/
├── index.html              ← Point d'entrée unique, inline Tailwind config + CSS custom
├── js/
│   ├── app.js              ← Bootstrap : imports + exposition window.* + init PWA
│   ├── config.js           ← GROS_CONFIG : définitions des 7 calculateurs gros œuvre
│   ├── storage.js          ← CRUD localStorage + consolidation multi-chantier
│   ├── pwa.js              ← Manifest dynamique + enregistrement Service Worker
│   ├── calculators/
│   │   ├── gros_oeuvre.js  ← 7 calculateurs béton/maçonnerie
│   │   ├── placo.js        ← Calculateur plaques de plâtre
│   │   └── sols.js         ← Calculateur carrelage / parquet
│   └── ui/
│       ├── navigation.js   ← Onglets, sous-nav dynamique, injection champs
│       ├── render.js       ← Template carte résultats + share/save
│       └── toast.js        ← Notifications auto-dismiss (2.5s)
```

### Bonnes pratiques

- **Séparation stricte** : UI (`js/ui/`) vs Logique métier (`js/calculators/`) vs Persistance (`storage.js`)
- **Validation** : `makeGet()` dans gros_oeuvre pour closure avec flag `isValidRef.v` ; boucle inline dans second œuvre — toujours marquer `.field-error` sur le champ invalide
- **Facteurs de perte** : Béton +5% (Dalle, Fondation, Chape, Escalier, Poteau, Enduit trad), Parpaings +5%, Carrelage +10% (pose droite) / +15% (pose diagonale), Placo +10%
- **Ratio sable mortier** : 1 m³ de sable foisonné pour 1 m³ de mortier dosé 350 kg/m³ (Mur, Enduit, Chape) — `pushSable(volMortier)`
- **Chaînage fondation** : 4 fils HA filants (2 sup + 2 inf), épingles tous les 25 cm de périmètre 2×(w+p)+0.10
- **Placo plafond** : fourrures F530 + suspentes (≠ rails + montants des cloisons)
- **Normes** : DTU 52.2 (carrelage collé), DTU 25.41 (placo 12 vis/m²)
- **Format décimal** : Toujours remplacer la virgule par un point avant `parseFloat()` (saisie FR)
- **Exposition globale** : Toutes les fonctions appelées en `onclick` HTML sont exposées sur `window` dans `app.js`
- **Structure résultat** : `{ l: label, v: valeur_string, u: unité, h?: boolean }` — `h: true` = ligne mise en avant (orange)
