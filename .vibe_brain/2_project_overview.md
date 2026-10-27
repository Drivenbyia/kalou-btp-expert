# Architecture — Kalou BTP v4 (refonte « sans prix »)

Appli PWA de **métré chantier** pour un maçon : quantités de matériaux, maison neuve
complète, chantiers avec liste de courses à cocher. Plus de devis ni de factures.
Une option (Réglages) affiche une **estimation façon entreprise** (matériaux + MO + TVA), désactivée par défaut.

Aucune dépendance, aucun build. Hors ligne via `sw.js` (réseau d'abord, cache en secours).

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css`, `manifest.webmanifest`, `sw.js`, `icons/` | coquille, style, PWA |
| `js/app.js` | routeur `#/…` (retour du téléphone OK), en-tête, menu du bas |
| `js/calc/materiaux.js` | catalogue matériaux : libellé, catégorie, unité d'achat (sacs, T, rouleaux…), prix indicatif |
| `js/calc/base.js` | **dosages de référence** (béton, mortier, blocs, chaînages, plancher, toiture, placo) |
| `js/calc/ouvrages.js` | les 25 calculateurs (champs + fonction `calcul` pure) + validation |
| `js/calc/maison.js` | assistant maison neuve (terre-plein / vide sanitaire, plain-pied / R+1, fermettes / traditionnelle) |
| `js/calc/cout.js` | estimation entreprise (option) |
| `js/core/store.js` | localStorage : réglages, prix, chantiers, saisies, **migration v3 → v4**, sauvegarde JSON |
| `js/ui/*` | toast/feuilles/partage, champs de formulaire, rendu des résultats |
| `js/views/*` | écrans Calculs, Maison neuve, Chantiers, Réglages |
| `tests/calculs.test.js` | `npm test` : dosages et cohérence de tous les calculateurs |

## Dosages (voir `js/calc/base.js`)
- Béton / m³ : dosage ciment, 0,65 T sable 0/4, 1,15 T gravier 5/20, 175 L eau. Pertes +5 %.
- Mortier / m³ : dosage liant, 1 m³ (1,5 T) de sable. Hourdage parpaing 20 : 20 L/m². Pertes +10 %.
- Parpaings 10/m² +5 %, brique R20 6,4/m², monomur 30 16,2/m², bloc à bancher 140 L béton/m².

## Données
- `kalou_chantiers_v4` : chantiers `{ id, nom, notes, items[], achete{} }`. Un item garde l'ouvrage + les valeurs saisies : il est **recalculé** avec les formules actuelles à l'affichage.
- Les anciennes clés `kalou_btp_v3` / `kalou_devis_v1` sont converties une fois en chantiers (sans prix) et **jamais effacées**.
