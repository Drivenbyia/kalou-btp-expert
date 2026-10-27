# Kalou BTP — contexte pour Claude

> Lu automatiquement au début de chaque session. À tenir à jour à chaque évolution notable
> (section « Historique » en bas). Réponses à l'utilisateur : **en français**, simples,
> lisibles sur téléphone.

## Pour qui, pour quoi

- **Pascal**, beau-père de l'utilisateur (Thomas), **maçon retraité de 56 ans en Dordogne** qui fait
  encore beaucoup de chantiers (gros œuvre, rénovation de bâti ancien en pierre, un peu de second
  œuvre) pour des amis et connaissances. Il utilise l'appli **sur son téléphone, sur le chantier**
  (dehors, au soleil, mains sales) et aussi sur un **iMac** (Safari).
- Il **n'a pas d'entreprise** : l'appli sert à **calculer les quantités de matériaux** et à faire
  la **liste de courses** pour le négociant. **Pas de devis, pas de factures, pas de prix affichés.**
- Exception voulue : une option **« Estimation façon entreprise »** (Réglages, désactivée par défaut)
  montre ce qu'une entreprise facturerait (matériaux + main d'œuvre + marge + TVA), pour se faire une idée.

## Principes à respecter

- **Simple et rapide** pour un utilisateur peu technophile : gros boutons (≥ 52 px), texte ≥ 14 px,
  fort contraste (lisible au soleil), résultat en direct, vocabulaire du métier.
- **Termes du négoce / du chantier** : agglo (parpaing), gravillon 4/20, CEM II/B 32,5,
  NHL 3,5 St-Astier, hérisson, arase, chaînage, semelle filante, toupie (BPE C25/30), gâchée…
- **Rigueur métier** : dosages et ratios conformes aux DTU (13.1, 20.1, 21, 26.1, 26.2, 25.41, 25.42,
  45.11, 52.2, 51.2, 59.1). Ajouter des **avertissements de sécurité** quand c'est de la structure
  (bureau d'études, DICT, blindage, sol argileux, pas de ciment sur pierre ancienne…).
- Toute modification de calcul doit être **vérifiée** (tests + parcours navigateur) avant mise en ligne.
- Champs : toujours dire **d'où à où mesurer** et ce qui est compris (aide sous le champ).

## Technique

- **PWA statique**, vanilla JS (modules ES), **aucune dépendance, aucun build**. CSS maison
  (`css/app.css`, pas de Tailwind). Fonctionne **hors ligne** (`sw.js`, réseau d'abord puis cache).
- **Hébergement : Netlify**, déploiement automatique depuis `main` →
  https://kalou-btp-expert.netlify.app (vérifier : `curl -s …/js/app.js | grep APP_VERSION`).
- Données **uniquement dans le navigateur** (localStorage), sauvegarde/restauration en fichier JSON
  (Réglages). Téléphone et iMac ne partagent pas leurs données.

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css`, `manifest.webmanifest`, `sw.js`, `icons/` | coquille, style, PWA |
| `js/app.js` | routeur `#/…`, en-tête, historique (retour du téléphone), garde « Quitter sans enregistrer ? », `APP_VERSION` |
| `js/calc/materiaux.js` | catalogue (~150 articles) : libellé négoce, catégorie, unité d'achat (sac, T, rouleau…), prix indicatif |
| `js/calc/base.js` | **dosages de référence** et briques de calcul : béton, mortier (ciment/chaux/bâtard), blocs, chaînages, plancher, toiture (rectangle **et forme libre**), placo (DTU 25.41/25.42), soufflage, drainage, échafaudage |
| `js/calc/ouvrages.js` | **33 calculateurs** (champs, aides, mots-clés de recherche, `calcul` pur, `verifier`), `CONSEILS`, table `AIDES`, validation (erreurs bloquantes + alertes douces) |
| `js/calc/maison.js` | assistant **Maison neuve** lot par lot ; rectangle ou **forme libre** (périmètre, surface, angles, blocs de toit, largeur) |
| `js/calc/cout.js` | estimation façon entreprise (option) |
| `js/core/store.js` | localStorage : réglages, prix, chantiers, saisies, migration v3→v4, sauvegarde JSON |
| `js/ui/` | `dom.js` (toast avec « Annuler », feuilles du bas liées à l'historique, partage), `form.js` (champs, demi-largeurs appariées), `resultats.js` (listes, consolidation, texte de partage), `contour.js` (aide « tour de la maison ») |
| `js/views/` | écrans Calculs, Maison, Chantiers, Réglages |
| `tests/calculs.test.js` | `npm test` (node --test) : dosages, cohérence de tous les calculateurs, maison, forme libre |

### Dosages de référence (base.js)

- Béton / m³ : ciment = dosage, 0,65 T sable 0/4, 1,15 T gravillon 4/20, 175 L d'eau, pertes +5 %.
  Remplissage blocs/chaînages : gravillon 4/10. Toupie commandée en classe (350 ≈ C25/30).
- Mortier / m³ : liant = dosage, ≈ 1 m³ (1,5 T) de sable. Hourdage agglo 20 : 20 L/m².
- Chaux : enduit dégressif 450/325/275, hourdage pierre 300, joints 325 (jamais plus dur que la pierre).
- Enduit traditionnel 3 couches 500/400/300, bâtard par défaut ; monocouche 17 kg/m²/cm.
- Agglos 10/m² +5 %, brique R20 6,4/m², monomur 30 16,2/m², bloc à bancher 140 L/m².
- Chaînage vertical : **d'un seul tenant**, 1 armature + 1 attente par chaînage.
- Placo : plaque toute hauteur ≤ 3 m ; cloison 72/48 ≤ 2,60 m (2,95 m doublés), 98/48 ≤ 3,00 (3,40) ;
  plafond isolé : fourrures à 50 cm ; doublage collé MAP 4 kg/m² ; soufflage R = e/λ + tassement.
- Treillis 2,40×3,60 : 6,9 m² utiles. Gravats lourds : bennes 6 m³ (≈ 8 T).
- Forme libre (murs à angles droits) : axe = P − 4·ép., intérieur = P − 8·ép.,
  surface int. = S − P·ép. + 4·ép² ; toiture = (S + P·d + 4d²)/cos(pente), noues aux angles rentrants.

- Surface habitable (maison) : emprise − murs − doublage (collé 13,3 cm, sur appuis 14,5 cm,
  aucun si monomur) − cloisons 7,2 cm × ml − trémie 3 m² en R+1. Le détail s'affiche dans « À savoir ».
- Menuiseries (maison) : liste `menuiseries[{ t, nb, larg, haut }]` (cm), une ligne par taille ;
  anciennes saisies `porte/fenetre/baie/garage` converties par `menuiseriesDe()`.

### Données (localStorage)

- `kalou_chantiers_v4` : `{ id, nom, notes, items[], achete{ clé: quantité achetée }, libres[] }`.
  Un item garde l'ouvrage + les valeurs saisies et est **recalculé** à l'affichage avec les formules actuelles.
- `kalou_reglages_v4`, `kalou_prix_v4`, `kalou_saisies_v4` (dont `maison_contour`), `kalou_derniere_sauvegarde`.
- Anciennes clés v3 (`kalou_btp_v3`, `kalou_devis_v1`) converties une fois en chantiers, **jamais effacées**.

## Méthode de travail (à suivre)

1. Branche `claude/<sujet>` depuis `origin/main`.
2. Modifier ; **`npm test`** ; parcours **Playwright** à 360/390 px (Chromium préinstallé :
   `require('playwright')`, `python3 -m http.server`), regarder les captures, zéro erreur JS.
3. **Incrémenter `APP_VERSION`** (`js/app.js`) **et le nom du cache** (`sw.js`, `kalou-btp-vX.Y.Z`) ;
   ajouter tout nouveau fichier JS à la liste du `sw.js`.
4. Commit, push, PR, puis **fusion dans `main`** (l'utilisateur a autorisé la fusion directe) ;
   vérifier la version en ligne sur Netlify.
5. Répondre à l'utilisateur en français, court, en commençant par le résultat.
6. Pour une relecture approfondie, l'utilisateur apprécie des **agents à rôle** (expert UX, designer UI,
   maçon expérimenté, plaquiste-carreleur) qui analysent sans modifier, puis on applique.

## Historique (résumé)

| Version | PR | Contenu |
|---|---|---|
| 4.0.0 | #7 | Refonte : suppression devis/factures/tarifs, 25 calculateurs, Maison neuve, Chantiers + liste de courses, option estimation, migration des anciennes données, PWA hors ligne |
| 4.1.0 | #8 | Relecture UX / UI / maçon : chaînages, chaux, carrelage, sécurité, termes ; aperçu du résultat collé, anti-doublon, retour du téléphone, garde, cases liées à la quantité, contrastes |
| 4.2.0 | #9 | 8 nouveaux ouvrages (sous-œuvre, démolition, linteau coulé, soutènement, drainage, fosse, échafaudage, conduit), articles à la main, dupliquer, rappel de sauvegarde |
| 4.3.0 | #10 | Second œuvre au niveau DTU (relecture plaquiste-carreleur) : placo, isolation soufflée/rampants, chape, carrelage, parquet, peinture |
| 4.4.0 | #11 | Maison de **forme libre** (L, T, U, Z) + aide « tour de la maison » (flèches + longueurs, dessin, contrôle de fermeture) |
| 4.4.1 | #12 | Aide « tour » : indique quels côtés vérifier si le tour ne se referme pas |
| 4.4.2 | #13 | Explications sur ~40 champs (d'où à où mesurer), alignement des champs |
| 4.5.0 | #15 | Maison : surface habitable sans doublage ni cloisons (détail affiché) ; menuiseries en liste avec tailles libres |

Projet en cours chez l'utilisateur : maison en Z (plan ≈ 58 m de tour, 134 m² au sol, 8 angles,
2 blocs de toit, ailes ≈ 7,5 m).

## Idées non faites (si on reprend)

- Remplacer les emojis des tuiles par des pictos SVG cohérents (signalé par l'audit UI).
- Synchronisation téléphone ↔ iMac (aujourd'hui : fichier de sauvegarde à importer).
- Surfaces composées dans les calculateurs simples (dalle en L…), PDF propre de la liste de courses.
