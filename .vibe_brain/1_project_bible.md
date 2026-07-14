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
│   ├── data/
│   │   └── prices.default.js ← Catalogue prix par défaut (matériaux, ouvrages, profil, TVA_OPTIONS)
│   ├── pricing/
│   │   ├── tarifs.js       ← Fusion catalogue défaut + surcharges localStorage, CRUD profil
│   │   ├── debourse.js     ← Calcul du taux horaire (déboursé → prix de vente)
│   │   └── devis.js        ← Modèle devis, totaux TVA multi-taux, numérotation, persistance
│   └── ui/
│       ├── navigation.js   ← Onglets, sous-nav dynamique, injection champs
│       ├── render.js       ← Template carte résultats + share/save/devis
│       ├── toast.js        ← Notifications auto-dismiss (2.5s)
│       ├── devis_view.js   ← Éditeur de devis (liste + édition, lignes, TVA, totaux)
│       ├── print_devis.js  ← Vue imprimable A4 (mentions légales) → window.print()
│       └── tarifs_view.js  ← Écran Réglages (profil, décennale, TVA, taux horaire, catalogue)
```

### Bonnes pratiques

- **Séparation stricte** : UI (`js/ui/`) vs Logique métier (`js/calculators/`) vs Persistance (`storage.js`)
- **Validation** : `makeGet()` dans gros_oeuvre pour closure avec flag `isValidRef.v` ; boucle inline dans second œuvre — toujours marquer `.field-error` sur le champ invalide
- **Facteurs de perte** : Béton +5% (Dalle, Fondation, Chape, Escalier, Poteau, Enduit trad), Parpaings +5%, Carrelage +10% (pose droite) / +15% (pose diagonale), Placo +10%
- **Ratio sable mortier** : 1 m³ de sable foisonné pour 1 m³ de mortier dosé 350 kg/m³ (Mur, Enduit, Chape) — `pushSable(volMortier, grade, usage)`
- **Granulométrie sable par usage** : `0/4` pour béton, mortier hourdage, chape ; `0/2` pour enduit fin de façade ; `pushAgregatsBeton` utilise Gravier 0/15 + Sable 0/4
- **Densités agrégats** : 1 m³ sable foisonné ≈ 1 500 kg, 1 m³ gravier ≈ 1 500 kg, 1 big bag ≈ 1 m³
- **Affichage agrégats** : tous les sables/graviers affichent le poids en kg dans l'unité (`T ~ X kg` ou `big bag ~ X kg`)
- **Chaînage fondation** : 4 fils HA filants (2 sup + 2 inf), épingles tous les 25 cm de périmètre 2×(w+p)+0.10
- **Placo plafond** : fourrures F530 + suspentes (≠ rails + montants des cloisons)
- **Normes** : DTU 52.2 (carrelage collé), DTU 25.41 (placo 12 vis/m²)
- **Format décimal** : Toujours remplacer la virgule par un point avant `parseFloat()` (saisie FR)
- **Exposition globale** : Toutes les fonctions appelées en `onclick` HTML sont exposées sur `window` dans `app.js`
- **Structure résultat** : `{ l: label, v: valeur_string, u: unité, h?: boolean }` — `h: true` = ligne mise en avant (orange)

### Module Devis (V2)

- **Clés localStorage** : `kalou_prix_v1` (surcharges de prix, diff uniquement — jamais les catalogues par défaut), `kalou_profil_v1` (entreprise/décennale/TVA/taux horaire), `kalou_devis_v1` (liste devis + estimations)
- **Numérotation** : `DEV-{année}-{compteur}` pour les devis, `EST-{timestamp}` pour les estimations (pas de valeur contractuelle)
- **TVA en interrupteur** : `TVA_OPTIONS` = `franchise` (0%, mention art. 293 B) / `10` (rénovation) / `20` (neuf) — réglage par défaut dans le profil, surchargeable par devis, et par ligne si besoin (chantier mixte)
- **Types de document** : `estimation` (non contractuel, pas de mentions légales complètes) vs `devis` (contractuel, mentions légales générées automatiquement à l'impression) — `changerType()` dans `pricing/devis.js` bascule l'un vers l'autre en renumérotant
- **Pont calculateurs → devis** : bouton `.btn-devis` sur chaque carte de résultats (`render.js`) → `window.ajouterAuDevis(nom, categorie, data)` crée une estimation et convertit les lignes de métré en lignes de devis via `lignesDepuisResultats()` (association par libellé au catalogue matériaux)
- **Export PDF sans dépendance** : `#devis-print-sheet` toujours présent dans le DOM (hors écran via `left:-99999px`), rempli dynamiquement par `print_devis.js`, rendu visible uniquement par la règle CSS `@media print` puis `window.print()` — aucune librairie externe
- **Convention de rendu** : chaque module UI Devis/Réglages définit son propre petit helper local `esc()` (échappement HTML) et `fmt()` (formatage `toLocaleString('fr-FR')`), à l'identique du pattern déjà utilisé dans `render.js` — pas de module utilitaire partagé, cohérent avec le zéro-abstraction du projet
- **Pas d'accents dans les identifiants JS** : `debourse.js` / `calculerDebourse()` (pas de `é`) pour éviter tout risque d'encodage — seuls les textes UI (chaînes, labels) portent les accents
- **Ouvrages configurables** : **tous** les ouvrages de `OUVRAGES_DEFAUT` portent un objet `config` = `{ mode:'m2'|'qte'|'forfait', dims:[{id,label,unit,default}], resume:(dims)=>string, base?:number|(dims)=>number, options:[{id,label,defaut,prix?}], exclusions?:string }`. Modes : `m2` (qté = produit des dims, unité m², prix/m²) · `qte` (qté = produit des dims, unité = `o.unite` ex. jour/benne, prix unitaire) · `forfait` (qté 1, prix = base + Σ prix des options cochées). À l'ajout au devis, `devis_view.js` ouvre un configurateur (dimensions + cases « ce qui apparaît dans le devis »). `composeConfig()` construit la ligne : description = `resume(dims)` + « Comprend : … » (options cochées) + `exclusions` ; prix `m2` = surface × prix/m², prix `forfait` = `base` + Σ prix des options cochées. Les ouvrages sans `config` gardent l'ajout en un clic. La description composée reste éditable (textarea) sur la ligne.
- **Export/Import (backup.js)** : sauvegarde des 4 clés en un fichier JSON ; import = **fusion additive** (listes union par `id`, objets `{...actuel, ...importé}`), jamais de suppression. Pont téléphone ↔ PC + secours.
- **Sécurité des devis vérifiée** : totaux TVA multi-taux, per-line TVA au taux effectif dans le PDF, lignes intermédiaires (`^volume|surface|terre`) non chiffrées à l'import d'un métré (anti double-comptage béton).
- **Prix réactif aux prestations** : chaque option d'ouvrage peut porter `tempsMO` (h/unité) et/ou `prix` (€/unité matériel). Valeur d'une prestation = `prix + tempsMO × tauxHoraire` (profil). En m²/qte, le prix unitaire = tarif de référence `o.prix` **ajusté** (delta) : +valeur pour une option hors-standard cochée, −valeur pour une option standard décochée. En forfait, prix = `base + Σ(options cochées)`. But : « chaque prestation ajoute du temps de travail » → fait bouger le prix.
- **Métré interne caché** (`pricing/chiffrage.js`) : `computeGros(type, get, getRaw)` est désormais une **fonction pure** (extraite de `gros_oeuvre.js`, le handler écran n'en est qu'un wrapper). `estimerMateriaux(ouvrageId, dims)` mappe l'ouvrage vers le bon calculateur et renvoie le métré ; stocké sur `ligne.materiaux` (jamais affiché sur le PDF client) et résumé dans le configurateur sous « 🔧 Interne ». `listeCoursesDevis(devis)` consolide ces métrés en **liste de courses** par devis (bouton « 🧱 Liste de courses » de l'éditeur, partage texte via `shareResults`) — usage interne négociant, jamais sur le devis client.
- **Mapping sensible aux options** (`pricing/chiffrage.js`) : `estimerMateriaux(ouvrageId, dims, opts)` — chaque entrée de `MAPPING` peut définir `extra(dims, opts, base)` (matériaux additionnels selon les prestations cochées, ex: enduit si "enduit ext/int" coché sur un mur parpaing) ou `custom(dims, opts)` (calcul direct sans passer par `computeGros`, pour un ouvrage sans calculateur de métré dédié comme la terrasse sur plots). Audité systématiquement sur les 12 ouvrages (script diff défaut/options inversées) — toute nouvelle option d'un ouvrage doit être vérifiée de la même façon pour ne pas oublier un matériau physique (leçon du bug piscine/parpaings).
