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
| `render.js` | Template carte résultats, boutons Share/Save/Devis, Web Share API + fallback clipboard | `renderResults()`, `shareResults()` |
| `toast.js` | Notifications auto-dismiss 2.5s, état erreur (rouge) ou succès | `showToast(msg, isError?)` |
| `devis_view.js` | Liste + éditeur de devis (client, chantier, lignes, TVA, totaux, export) | `renderDevisList()`, `nouveauDevis()`, `ouvrirDevis()`, `ajouterAuDevis()`, `fermerEditeurDevis()`, handlers `maj*`/`ajouter*`/`supprimer*` |
| `print_devis.js` | Vue imprimable A4 avec mentions légales, remplit `#devis-print-sheet` | `imprimerDevis()` |
| `tarifs_view.js` | Écran Réglages : profil entreprise, décennale, TVA par défaut, taux horaire, catalogue de prix éditable | `renderReglages()`, `majProfilChamp()`, `majDebourse()`, `appliquerTauxDebourse()`, `majPrix()`, `resetPrixCatalogue()` |

### `js/data/` & `js/pricing/`
Données et logique métier du chiffrage — aucune manipulation DOM.

| Fichier | Rôle | Exports |
|---------|------|---------|
| `data/prices.default.js` | Catalogue par défaut (matériaux, ouvrages fourni-posé, profil entreprise, options TVA) | `MATERIAUX_DEFAUT`, `OUVRAGES_DEFAUT`, `PROFIL_DEFAUT`, `TVA_OPTIONS` |
| `pricing/tarifs.js` | Fusion défauts + surcharges (`kalou_prix_v1`), CRUD profil (`kalou_profil_v1`) | `getMateriaux()`, `getOuvrages()`, `setPrix()`, `resetPrix()`, `getProfil()`, `updateProfil()` |
| `pricing/debourse.js` | Calcul du taux horaire (méthode du déboursé) | `calculerDebourse(params)` |
| `pricing/devis.js` | Modèle devis, calcul des totaux (TVA multi-taux), numérotation, persistance (`kalou_devis_v1`) | `creerDevis()`, `creerLigne()`, `calculerTotaux()`, `changerType()`, `sauvegarderDevis()`, `dupliquerDevis()`, `lignesDepuisResultats()` |

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

---

## Modèle de données — Devis (`localStorage['kalou_devis_v1']`)

```js
{
  id: 1784022317949,             // Date.now()
  num: "DEV-2026-001",           // ou "EST-{timestamp}" pour une estimation
  type: "devis",                 // "devis" | "estimation"
  date: "2026-07-14",
  validite: "3 mois",
  client:   { nom, adresse, tel, email },
  chantier: { adresse, description },
  regimeTVA: "10",                // "franchise" | "10" | "20"
  lignes: [
    { id: "l...", designation, detail, qte, unite, puHT, tva: null }  // tva: override ligne (sinon regimeTVA)
  ],
  acomptePct: 30,
  statut: "brouillon"             // brouillon | envoye | accepte | refuse
}
```

`calculerTotaux(devis)` groupe les lignes par taux de TVA effectif et retourne
`{ totalHT, parTaux[], totalTVA, totalTTC, acompte, solde, mentionFranchise }`.

## Modèle de données — Profil entreprise (`localStorage['kalou_profil_v1']`)

Fusionné avec `PROFIL_DEFAUT` (data/prices.default.js) : identité entreprise (nom, SIRET, EI, APE),
assurance décennale (assureur, contrat, zone), médiateur, régime TVA par défaut, acompte/validité par
défaut, taux horaire (`tauxHoraire`) et paramètres du déboursé (`debourse: { revenuMensuel,
fraisAnnuels, heuresFacturables, cotisationsPct, margePct }`).

## Modèle de données — Prix (`localStorage['kalou_prix_v1']`)

Ne stocke que les **diffs** par rapport au catalogue par défaut : `{ materiaux: { [id]: prix },
ouvrages: { [id]: prix } }`. `getMateriaux()` / `getOuvrages()` fusionnent à la lecture.
