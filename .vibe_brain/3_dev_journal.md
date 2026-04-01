# Dev Journal — Suivi & Statut

## Statut actuel

**V1 — Fonctionnelle ✓**

9 calculateurs opérationnels, historique groupé par chantier, PWA offline.

| Module | État | Notes |
|--------|------|-------|
| Gros Œuvre (7 types) | ✅ Stable | Dalle, Fondations, Mur, Enduit, Chape, Escalier, Poteaux |
| Placo | ✅ Stable | Simple/doublage/plafond, trame simple/double |
| Sols | ✅ Stable | Carrelage + parquet, pose droite/diagonale |
| Historique | ✅ Stable | Groupé par chantier, consolidation multi-calculs |
| PWA / Offline | ✅ Stable | SW v2, cache-first, manifest dynamique |
| Partage | ✅ Stable | Web Share API + fallback clipboard |

## Prochaine étape immédiate

> À définir — audit initial terminé.

Pistes identifiées lors de l'audit :
- Ajouter d'autres types Second Œuvre (peinture, isolation…)
- Migrer de localStorage vers IndexedDB pour des projets plus riches
- Ajouter un calcul de coût estimatif (prix matériaux configurables)
- Export PDF de la liste de courses d'un chantier

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
