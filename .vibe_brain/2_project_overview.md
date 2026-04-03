# Project Overview — Architecture & Dépendances

## Architecture des dossiers

### `js/calculators/`
Logique métier pure. Aucune manipulation DOM sauf lecture des inputs et appel à `renderResults()`.

| Fichier | Rôle | Exports |
|---------|------|---------|
| `gros_oeuvre.js` | 7 calculateurs béton/maçonnerie — sorties négociant matériaux : Gravier 0/15 + Sable 0/2 en Tonnes (si vol > 1m³) sinon Big Bags, sacs 35 kg, panneaux treillis 3.6×2.4 m, Agglos 20×20×50 / d'angle, Armatures Semelles (ml), Épingles de chaînage (ml) | `handleGrosCalculate()` |
| `placo.js` | Calcul matériaux plaques de plâtre BA13 | `calculatePlaco()` |
| `sols.js` | Calcul carrelage et parquet (pose droite/diagonale) | `calculateSols()` |

### `js/ui/`
Présentation et interactions. Lit l'état, manipule le DOM, ne contient aucune formule.

| Fichier | Rôle | Exports |
|---------|------|---------|
| `navigation.js` | Switching onglets, rendu sous-nav gros œuvre dynamique depuis GROS_CONFIG | `switchTab()`, `setGrosType()`, `setSecondType()`, `renderGrosSubNav()` |
| `render.js` | Template carte résultats, boutons Share/Save, Web Share API + fallback clipboard | `renderResults()`, `shareResults()` |
| `toast.js` | Notifications auto-dismiss 2.5s, état erreur (rouge) ou succès | `showToast(msg, isError?)` |

### `js/core/` — fichiers racine équivalents
| Fichier | Rôle | Exports |
|---------|------|---------|
| `app.js` | Bootstrap : import all → expose sur `window` → init (`initPWA` + `renderGrosSubNav` + `setGrosType('dalle')`) | — |
| `config.js` | `GROS_CONFIG` : 7 définitions de calculateurs avec specs de champs (id, label, unit, default, select) | `GROS_CONFIG` |
| `storage.js` | CRUD localStorage (`kalou_btp_v3`) + groupByName + consolidateGroup + share consolidé | `saveHistory`, `deleteHistory`, `clearHistory`, `renderHistory`, `shareConsolidated` |
| `pwa.js` | Manifest dynamique (blob) + Service Worker v2 (blob, cache-first) | `initPWA()` |

---

## Flux de données

```
Saisie utilisateur (champs HTML)
        ↓
Calculateur (gros_oeuvre / placo / sols)
        ├─ Validation champ par champ (.field-error)
        ├─ parseFloat + virgule→point (locale FR)
        ├─ Formules + facteurs de perte
        └─ Tableau résultats : [{ l, v, u, h? }]
        ↓
renderResults(containerId, data, name, category)
        ├─ Carte HTML animée (slideUp)
        ├─ Listener bouton "Partager" → navigator.share() | clipboard
        └─ Listener bouton "Sauvegarder" → saveHistory()
        ↓
saveHistory(name, cat, data)
        └─ localStorage['kalou_btp_v3'] — max 50 entrées
        ↓
Onglet Historique
        ├─ renderHistory() → groupByName() → cards par chantier
        ├─ Totaux consolidés si >1 calcul sur le même chantier
        └─ Share consolidé → shareConsolidated(name)
```

---

## Dépendances externes

### Librairies JS
| Lib | Source | Usage |
|-----|--------|-------|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Styles utilitaires + thème custom |

### APIs Web natives
| API | Usage | Fallback |
|-----|-------|---------|
| Web Share API (`navigator.share`) | Partage natif mobile | `clipboard.writeText()` |
| Clipboard API (`navigator.clipboard.writeText`) | Copie texte | `document.execCommand('copy')` |
| Service Worker API | Cache-first PWA offline | Pas de SW si non supporté |
| localStorage | Persistance historique | — |

### APIs / Services tiers
Aucun. Pas de backend, pas d'analytics, pas d'auth.

---

## Points d'entrée

**HTML :** `index.html`
- Structure 3 onglets : `#tab-gros-oeuvre`, `#tab-second-oeuvre`, `#tab-historique`
- Nav fixe en bas + conteneur toast fixe
- Un seul script : `<script type="module" src="js/app.js"></script>`

**JS Bootstrap (`app.js`) :**
```
window.load
  ├─ initPWA()              → manifest + SW enregistrés
  ├─ renderGrosSubNav()     → boutons sous-nav générés depuis GROS_CONFIG
  └─ setGrosType('dalle')   → calculateur par défaut affiché
```

**Fonctions exposées sur `window` (pour onclick HTML) :**
`handleGrosCalculate`, `calculatePlaco`, `calculateSols`, `switchTab`, `setSecondType`, `setGrosType`, `shareResults`, `showToast`, `saveHistory`, `deleteHistory`, `clearHistory`, `renderHistory`, `shareConsolidated`

---

## Modèle de données — Historique

```js
// localStorage['kalou_btp_v3'] = JSON.stringify(entries)
{
  id:   1743500000000,          // Date.now() — identifiant unique
  name: "Extension Garage",     // Nom chantier saisi par l'utilisateur
  cat:  "Maçonnerie (Dalle Béton)", // Catégorie calculateur
  data: [                        // Tableau résultats
    { l: "Volume Béton", v: "2.63", u: "m³" },
    { l: "Ciment (35kg)", v: "27", u: "sacs" },
  ],
  date: "01/04 14:30"           // Date locale FR
}
```

**Règles storage :**
- Max 50 entrées (les plus anciennes supprimées)
- Consolidation : agrégation des `v` par clé `l|||u` pour un même `name`
