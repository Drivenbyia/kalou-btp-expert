# Dev Journal — Suivi & Statut

## Statut actuel

**V1 — Fonctionnelle ✓**

9 calculateurs opérationnels, historique groupé par chantier, PWA offline.

| Module | État | Notes |
|--------|------|-------|
| Gros Œuvre (12 types) | ✅ Stable | Dalle, Fondations, Mur, Enduit, Chape, Escalier, Poteaux + Terrasse/Dallage, Mur pierre, Enduit/Joint chaux, Ouverture, Piscine (V2) |
| Placo | ✅ Stable | Simple/doublage/plafond, trame simple/double |
| Sols | ✅ Stable | Carrelage + parquet, pose droite/diagonale |
| Historique | ✅ Stable | Groupé par chantier, consolidation multi-calculs |
| PWA / Offline | ✅ Stable | SW v2, cache-first, manifest dynamique |
| Partage | ✅ Stable | Web Share API + fallback clipboard |
| **Devis & Estimations** | ✅ Nouveau (V2) | Édition, TVA multi-taux, export PDF, mentions légales |
| **Réglages / Tarifs** | ✅ Nouveau (V2) | Profil entreprise, décennale, taux horaire, catalogue éditable |
| Export/Import JSON | ✅ Nouveau (V2) | Pont téléphone ↔ PC + sauvegarde de secours (fusion additive) |

## Décisions techniques — Session 2026-04-03 (Alignement Négociants Matériaux)

| Date | Décision | Raison |
|------|----------|--------|
| 2026-04-03 | Agrégats béton : Big Bags → Gravier 0/15 + Sable 0/2 en Tonnes si vol > 1m³ | Unité négociant (livraison vrac) — ratio 0.9T gravier + 0.6T sable par m³ béton = 1.5T/m³ total |
| 2026-04-03 | Sable mortier/chape/enduit : Big Bags → Sable 0/2 Tonnes si volSable > 1m³ | Même logique vrac — ratio densité 1.5T/m³ |
| 2026-04-03 | Ferraillage fondation : Acier (kg) → Armatures Semelles (ml) + Épingles chaînage (ml) | Unité magasin : longueur linéaire achetable. Épingles = ceil(l/0.25) × 2×(w+p) |
| 2026-04-03 | Ferraillage escalier : Acier (kg) → Épingles chaînage (ml) | Épingles = ceil(longPaillasse/0.20) × (w + 2e + 0.10) |
| 2026-04-03 | Ferraillage poteau : Acier (kg) → Épingles chaînage (ml) | Épingles = n × ceil(h/0.20) × (2×(sl+sw) + 0.10) |
| 2026-04-03 | Mur : "Parpaings std/angle" → "Agglos 20×20×50" / "Agglos d'angle" | Terminologie négociant Gedimat |
| 2026-04-03 | Suppression champ `a` (Acier kg/m³) dans config.js fondation | Champ inutile après passage en ML |

## Prochaine étape immédiate

> **V2 — Phase 0 + 1 livrées (2026-07-14) : moteur de prix + module Devis.**
> Plan complet : voir **`.vibe_brain/4_plan_chiffrage_devis.md`**.

Décisions cadrées avec le porteur (2026-07-14) :
- Régime fiscal non arrêté → **TVA en interrupteur** (Franchise 293 B / 10 % rénovation / 20 % neuf), taux surchargeable par ligne.
- Ouvrages prioritaires : **ouvertures & piscines**, **terrasses & dallages**, **murs pierre & chaux**.
- Taux horaire : **méthode du déboursé** (à affiner avec ses vrais chiffres).
- Usage multi-appareils : téléphone sur chantier, PC à la maison — le localStorage n'est PAS synchronisé entre les deux (pont manuel via Partage pour l'instant, export/import JSON en Phase 1 suivante).
- Deux types de document : **Estimation** (non contractuelle) et **Devis** (contractuelle, activité déclarée).

**Réalisé (Phase 0 + 1)** :
- `data/prices.default.js` — catalogue matériaux + ouvrages (fourni-posé) + profil par défaut + `TVA_OPTIONS`
- `pricing/tarifs.js` — fusion catalogue défaut/surcharges (`kalou_prix_v1`), CRUD profil (`kalou_profil_v1`)
- `pricing/debourse.js` — calcul du taux horaire (déboursé → prix de vente)
- `pricing/devis.js` — modèle devis, totaux TVA multi-taux, numérotation `DEV-{année}-{n}` / `EST-{ts}`, persistance (`kalou_devis_v1`), `lignesDepuisResultats()` pour importer un calcul de métré
- `ui/devis_view.js` — liste + éditeur (client/chantier, lignes manuelles/ouvrage type/depuis un calcul, TVA, acompte, totaux live), layout responsive (1 colonne mobile, 2 colonnes dès `lg`)
- `ui/print_devis.js` — aperçu A4 imprimable (`#devis-print-sheet`, `window.print()`), mentions légales générées (EI, SIRET, décennale, TVA/293 B, acompte, médiateur, Bon pour accord) — simplifiées si type Estimation
- `ui/tarifs_view.js` — écran Réglages : profil entreprise, assurance décennale, régime TVA par défaut, calculateur "Mon taux horaire", catalogue de prix éditable (avec reset par ligne)
- `render.js` — bouton `.btn-devis` sur les cartes de résultats → `ajouterAuDevis()` (pont calculateurs → devis)
- `index.html` / `navigation.js` / `app.js` — nouveaux onglets Devis (nav du bas) et Réglages (icône engrenage header), `<main>` élargi (`max-w-6xl`) avec les anciens onglets recentrés en `max-w-2xl` pour ne pas changer leur rendu mobile
- **Testé** en conditions réelles (Playwright + Tailwind local pour contourner le proxy sandbox) : création devis, ajout ligne "ouvrage type", calcul TVA (franchise → 10 % → 20 %), export PDF, écran Réglages (taux horaire + catalogue de prix). Aucune erreur JS, seul un 404 favicon.ico sans rapport.

**Vérification (2026-07-14, relecture + test navigateur élargi)** — 3 correctifs :
1. **PDF, colonne TVA par ligne** : s'affichait vide quand la TVA venait du régime (l.tva = null). Corrigé dans `print_devis.js` — affiche le taux effectif (`tauxLigne`).
2. **Impression, pages blanches** : `@media print` passait par `visibility:hidden` (laissait l'espace). Remplacé par `body > *:not(#devis-print-sheet){ display:none }` dans `index.html`.
3. **Double-comptage béton à l'import « depuis un calcul »** : la ligne « Volume Béton » était chiffrée comme béton toupie EN PLUS du ciment + agrégats qui le composent. Corrigé dans `lignesDepuisResultats()` — les lignes intermédiaires (`^volume|surface|terre`) sont importées à 0 € (à compléter), plus auto-chiffrées.

Note connue (non bloquant) : l'import d'un métré reste une base à ajuster (association libellé→prix best-effort ; certaines lignes intermédiaires arrivent à 0 €). Toast « vérifie les prix » affiché.

**Export / Import JSON (2026-07-14)** — `pricing/backup.js` + carte « Sauvegarde & transfert » en tête de l'écran Réglages :
- `construireSauvegarde()` : snapshot des 4 clés (`kalou_devis_v1`, `kalou_btp_v3`, `kalou_profil_v1`, `kalou_prix_v1`) → `{ app:'kalou-btp', version, date, stores }`
- Export : partage natif de fichier sur mobile (`navigator.canShare({files})`), sinon téléchargement Blob (`kalou-sauvegarde-AAAA-MM-JJ.json`)
- Import : sélecteur de fichier → validation → confirmation avec résumé → `fusionnerSauvegarde()` : **fusion additive** (listes union par `id`, import prioritaire sur conflit ; objets `{...actuel, ...importé}`) → rien n'est supprimé, idempotent
- Vérifié (Playwright) : export → clear → import restaure tout ; ré-import garde les entrées locales, aucun doublon ; bouton export déclenche le download.

**Phase 2 — nouveaux calculateurs métier (2026-07-14)** — 5 ajouts dans `GROS_CONFIG` + branches dans `gros_oeuvre.js` :
- **terrasse** (Terrasse / Dallage) : béton + treillis + tout-venant hérisson (T) + polyane + terre à évacuer
- **pierre** (Mur en pierre) : pierre/moellon en T (~75% du volume × 2,4) + mortier de chaux NHL + sable (0/4)
- **chaux** (Enduit / Rejointoiement) : chaux NHL + sable 0/2 ; enduit = surf×ép, joint = ~15 L/m²
- **ouverture** : linteau/IPN (ml, +40 cm d'appuis), nb d'étais, volume à démolir, gravats
- **piscine** (structure GO) : béton radier + murs, ciment/agrégats, treillis radier, terrassement déblai — HORS étanchéité/local technique
- Héritent automatiquement de la sous-nav (`renderGrosSubNav` itère `GROS_CONFIG`) et du bouton « Ajouter au devis ».
- Vérifié (Playwright) : les 5 calculent sans erreur, sous-nav à 12 calculateurs, pont pierre→devis OK.

**Configurateur d'ouvrages + descriptions client (2026-07-14, retour beau-père)** — suite au test :
- Retour : lignes d'ouvrage trop légères pour un client ; piscine à adapter (dimensions + sélecteur compris/non compris).
- `prices.default.js` : `detail` enrichis (prestations comprises) sur tous les ouvrages ; ajout d'un objet `config` à **terrasse_beton, mur_pierre (mode m2)** et **ouverture, piscine_go (mode forfait)** — voir bible §config.
- `devis_view.js` : configurateur (dimensions + cases à cocher avec prix, aperçu live description + prix), `composeConfig()`, `ouvrirConfigOuvrage/majConfigDim/toggleConfigOpt/validerConfig/annulerConfig` ; détail de ligne passé en `<textarea>` pour les longues descriptions.
- Vérifié (Playwright) : piscine 8×4 défaut = 16 400 € ; 10×5 sans terrassement + enduit = 22 100 € (description et prix recalculés en direct) ; terrasse m² = surface×prix ; PDF affiche les prestations « Comprend : … » + exclusions. Aucune erreur JS.

**Configurateur généralisé à TOUS les ouvrages (2026-07-14, « fait le pour tout »)** :
- Ajout du mode `qte` (qté = produit des dims, unité = `o.unite`) pour évacuation (bennes) et terrassement (jours).
- `config` ajoutée aux 8 ouvrages restants : terrasse_desac, terrasse_plots, dallage, mur_parpaing, rejoint, enduit_chaux (m²), evacuation (benne, qte), terrassement (jour, qte). `evacuation` : unité passée de `forfait` à `benne` (prix 290/benne).
- `colClass` du configurateur : grid-cols 3/2/1 selon le nombre de dimensions.
- Vérifié (Playwright) : les 12 ouvrages ouvrent un configurateur, dims + options OK, ajout de ligne, totaux justes (terrasse 1 560 €, mur parpaing 1 000 €, évacuation 290 €, terrassement 450 €…). 0 ouvrage sans config. Aucune erreur JS.

## Prochaine étape immédiate (suite)

Pistes restantes (non urgentes) :
- L'import « depuis un calcul » garde des approximations d'unité (ex. sable en big bag chiffré au prix €/T) — à affiner si besoin, mais le message « vérifie les prix » couvre le cas.
- Second Œuvre : d'autres postes (peinture, isolation) si demandé.
- Éventuelle synchro cloud (§5 bis du plan) si le transfert manuel gêne à l'usage.

## Bugs en cours

Aucun bug ouvert.

## Décisions techniques — Session 2026-04-01 (Refonte Gros Œuvre)

| Date | Décision | Raison |
|------|----------|--------|
| 2026-04-01 | Suppression Sable/Gravier en m³ dans béton | Remplacement par Big Bag (~1 m³) — unité magasin |
| 2026-04-01 | Treillis soudé : formule `ceil(surf/8)` sur dalle | Panneau standard 3.6×2.4 m = 8 m² |
| 2026-04-01 | Armatures fondation : formule `ceil(longueur/6)` | Barre acier standard = 6 m |
| 2026-04-01 | Séparation Parpaings standards / d'angle dans mur | Champ `c` (nb angles) ajouté dans GROS_CONFIG.mur |
| 2026-04-01 | Fonction `esc()` dans render.js | Prévention XSS sur innerHTML (name/category/labels) |
| 2026-04-01 | `.catch(() => fallbackCopy())` sur clipboard | Robustesse : clipboard peut être refusé sans erreur silencieuse |

## Décisions techniques récentes

| Date | Décision | Raison |
|------|----------|--------|
| Init | Zero-build, Vanilla JS ES6 modules | Simplicité, déploiement statique, pas de toolchain à maintenir |
| Init | localStorage v3 (clé `kalou_btp_v3`) | Versionnement de la clé pour migrations futures sans conflit |
| Init | Service Worker inline (blob) | Pas de fichier SW séparé à déployer, tout en un seul dossier |
| Init | Fonctions exposées sur `window` pour onclick HTML | Compatible avec Tailwind CDN sans bundler |
| Init | Manifest généré dynamiquement en JS | Idem — pas de fichier manifest.json à gérer |
| Init | Cache SW nommé `kalou-btp-v2` | Auto-cleanup du cache v1 à l'activation |

## Historique des sessions

### Session 2026-04-03 — Alignement Négociants Matériaux (Gedimat)
- **Objectif** : Passer les sorties en unités négociant : Tonnes (agrégats vrac), ml (ferraillage achetable)
- **Réalisé** :
  - `gros_oeuvre.js` : helpers `pushAgregatsBeton()` + `pushSable()` — seuil 1m³ pour bascule Big Bags → Tonnes
  - `gros_oeuvre.js` : ferraillage fondation → Armatures Semelles (ml) + Épingles chaînage (ml) via l et périmètre section
  - `gros_oeuvre.js` : ferraillage escalier/poteau → Épingles chaînage (ml) remplacent "Acier estimé (kg)"
  - `gros_oeuvre.js` : Agglos 20×20×50 / d'angle remplacent "Parpaings std/angle"
  - `config.js` : suppression champ `a` (Acier kg/m³) — devenu inutile
- **État laissé** : Vérification cible OK — 2m³ dalle → 20 sacs + 1.8T gravier + 1.2T sable = 3T agrégats

### Session 2026-04-01 — Refonte Gros Œuvre (liste de courses magasin)
- **Objectif** : Remplacer les sorties théoriques (m³ sable/gravier) par des unités achetables en magasin BTP
- **Réalisé** :
  - `gros_oeuvre.js` : Sable/Gravier → Big Bags, treillis sur formule 8 m²/panneau, armatures barres 6 m, parpaings standards vs angles
  - `config.js` : Ajout champ `c` (nb angles) pour le calculateur Mur Parpaings
  - `render.js` : Correction XSS (`esc()` sur tous les champs interpolés dans innerHTML), `.catch()` sur clipboard avec fallback propre, refactor `fallbackCopy()`
- **État laissé** : Tous les calculateurs Gros Œuvre génèrent des listes de courses exploitables en magasin

### Session 2026-04-01 — Audit initial
- **Objectif** : Cartographier l'architecture complète du projet
- **Réalisé** :
  - Exploration de l'arborescence complète (10 fichiers JS, 1 HTML)
  - Analyse de chaque calculateur (formules, inputs, outputs, normes DTU)
  - Cartographie du flux de données (Input → Calcul → Render → Storage)
  - Identification des patterns partagés (makeGet, field-error, structure résultat)
  - Remplissage de `1_project_bible.md`, `2_project_overview.md`, `3_dev_journal.md`
- **État laissé** : Mémoire persistante `.vibe_brain/` initialisée, projet prêt pour développement
