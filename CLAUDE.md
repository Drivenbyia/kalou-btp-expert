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
- **Hébergement : GitHub Pages** (dépôt public, gratuit), publié par `.github/workflows/ci.yml`
  à chaque push sur `main`, **seulement si les tests passent** →
  https://drivenbyia.github.io/kalou-btp-expert/ (vérifier : `curl -s …/js/app.js | grep APP_VERSION`).
  Ancien hébergement Netlify **supprimé** (nov. 2026, site et application GitHub retirés) : ne plus
  l'utiliser ni le citer. L'adresse github.io est partagée avec les autres sites Pages du compte :
  le `sw.js` ne supprime que les caches `kalou-btp-*`.
- **Tests automatiques sur GitHub** (même workflow, à chaque PR) : `npm test` puis `npm run test:ecrans`.
- Données **uniquement dans le navigateur** (localStorage), sauvegarde/restauration en fichier JSON
  (Réglages). Téléphone et iMac ne partagent pas leurs données.

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css`, `manifest.webmanifest`, `sw.js`, `icons/` | coquille, style, PWA |
| `js/app.js` | routeur `#/…`, en-tête, historique (retour du téléphone), garde « Quitter sans enregistrer ? », `APP_VERSION` |
| `js/calc/materiaux.js` | catalogue (~260 articles) : libellé négoce, catégorie, unité d'achat (sac, T, rouleau, barre, couronne…), prix indicatif ; pots de peinture combinés (`combinaisonPots`), `nbAchat` = nombre affiché à l'achat |
| `js/calc/base.js` | **dosages de référence** et briques de calcul : béton, mortier (ciment/chaux/bâtard), blocs, chaînages, plancher, toiture (rectangle **et forme libre**), placo (DTU 25.41/25.42), soufflage, drainage, échafaudage |
| `js/calc/ouvrages.js` | assemble les **48 calculateurs**, catégories `OUV_CATS`, table `AIDES`, validation (erreurs bloquantes + alertes douces), `calculer()` |
| `js/calc/ouvrages/*.js` | les calculateurs **par famille** (`beton`, `murs`, `enduits`, `toiture`, `interieur`, `isoler`, `piece`, `eau`, `elec`, `exterieur`, `renovation`, `reseaux`, `complements` = bâti ancien, tranchée, pavage, portes, OSB, lambris) ; `commun.js` = constructeurs de champs (dont `texte`), choix béton, `CONSEILS`, saisie « je connais la surface » (`SAISIE`, `champSurface`, `dim`, `surfaceDe`) |
| `js/calc/pieces.js` | pièces d'un chantier (champs, métré, ce qu'on calcule pour une pièce, vers électricité / plomberie / VMC) |
| `js/calc/maison.js` | assistant **Maison neuve** lot par lot ; rectangle ou **forme libre** (périmètre, surface, angles, blocs de toit, largeur) |
| `js/calc/cout.js` | estimation façon entreprise (option) |
| `js/core/store.js` | localStorage : réglages, prix, chantiers, saisies, migration v3→v4, sauvegarde JSON |
| `js/ui/` | `dom.js` (toast avec « Annuler », feuilles du bas liées à l'historique, partage), `form.js` (champs num / choix / oui / texte, demi-largeurs appariées), `resultats.js` (listes, consolidation par référence, comparatif, texte de partage), `contour.js` (aide « tour de la maison »), `pictos.js` (pictos SVG des tuiles) |
| `js/core/pdf.js` | mini-générateur PDF maison (A4, Helvetica/WinAnsi, traits) — aucune dépendance |
| `js/ui/liste-pdf.js` | liste de courses en PDF : en-tête (date, réf. `KB-AAMMJJ-xxxx`, nom/tél des Réglages), tableau par catégorie, lignes numérotées, colonnes prix/total vides pour devis |
| `js/views/` | écrans Calculs (accueil par familles `#/?f=<famille>`, calculateur), Maison, Chantiers, Réglages |
| `tests/calculs.test.js` | `npm test` (node --test) : dosages, cohérence de tous les calculateurs, maison, forme libre |
| `tests/pdf.test.js` | `npm test` : PDF valide (xref, flux), accents, pagination, nom de fichier |
| `tests/pwa.test.js` | `npm test` : chaque fichier JS/CSS est dans `sw.js`, `APP_VERSION` = nom du cache |
| `tests/ecrans.e2e.js` | `npm run test:ecrans` : Chromium à 360 px, tous les écrans et calculateurs, menuiseries, enregistrement d'un chantier, zéro erreur JS, pas de débordement |
| `.github/workflows/ci.yml` | tests à chaque PR ; mise en ligne GitHub Pages depuis `main` |

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
- **Lignes de matériaux** `{ k, q, ref?, d?, pk? }` : `ref` = la référence à acheter (épaisseur, longueur, format,
  faïence/sol, classe de béton) → **une ligne par ref** dans la liste de courses (`consolider`) ; `d` = simple
  précision (fusionnée) ; `pk` = conditionnement saisi (m² par paquet) → affichage en paquets.
- Chaînage en blocs U : **le dernier rang est retiré des agglos** (`RANG_CHAINAGE` = 0,20 m). Barres de 6 m :
  `barresPour(nb, lg)` (morceaux, on ne raboute pas les chutes). Chaux : `chaux` (NHL 3,5), `chaux_nhl2`, `chaux_nhl5`, `chaux_cl90`.
- Isolation (`isoler.js`) : épaisseur = R × λ arrondie aux épaisseurs vendues (2 couches au-delà de 200 mm mur /
  240 mm rampants) ; mur ancien ou isolant biosourcé → **frein-vapeur hygro** ; PU interdit sur mur ancien.
- Plomberie (`eau.js`) : **une ligne par appareil** avec ses distances (arrivée d'eau depuis la nourrice, évacuation
  jusqu'à la chute). PER Ø16 = distance × 1,10 + 0,5 m, un tuyau entier par appareil (froid, + chaud), couronnes de 25 m
  sans raccord ; PVC Ø40 / Ø100 (WC) = évacuations réelles + 10 %, une culotte par appareil ; arrivée → nourrice et
  chauffe-eau (groupe de sécurité, aller + retour) en Ø20. Pas de débit (plombier).
- Champ **liste** (`liste()` dans `commun.js`, rendu dans `form.js`) : lignes `{ t, ...colonnes }`, types avec valeurs
  proposées, colonnes visibles selon le type (`si(t)`), erreurs par ligne (`<id>-<i>`). `migrer()` d'un ouvrage
  convertit les anciennes saisies (avant 5.2) au moment du chargement et du calcul.
- Électricité (`elec.js`, relu par un électricien) : **pièce par pièce** (prises, lampes, inter., distance au tableau)
  et **appareil par appareil** (plaque, four, machines, chauffe-eau, radiateurs, clim, PAC, prise voiture, autre).
  Circuits remplis du plus proche au plus loin : tableau → 1re pièce, puis pièce à pièce (écart de distance, 3 m mini),
  + 3 m par point, + 15 %. 8 prises / circuit 2,5 mm² 20 A, **cuisine sur ses circuits (6 maxi)**, 8 points / circuit 1,5 mm² 16 A,
  dédiés : section selon calibre (16-20 A → 2,5 ; 32 A → 6) et **section au-dessus si chute de tension > 5 %** (L > 255·S/I),
  clim / PAC en R2V + coupure près de l'unité extérieure, prise voiture avec son différentiel type A,
  plaque 6 mm² 32 A, chauffage 3 500 W / circuit 16 A (fil pilote), chauffe-eau sur contacteur ; tableau neuf :
  **2 différentiels 40 A mini**, 8 circuits maxi chacun, type A si plaque ou lave-linge, **20 % de réserve**.
  VMC : circuit dédié 2 A, bouches par pièce humide, Ø125 cuisine / Ø80 autres.
- Béton de chanvre (sol, enduit) : ≈ 220 kg de liant formulé + 110 kg de chènevotte par m³ (ordre de grandeur, fiche fabricant).
- **Pièces d'un chantier** (`js/calc/pieces.js`, écran `#/chantier/<id>?piece=<pid|nouvelle>`) : `ch.pieces[{ id, type, nom,
  L, l, h, portes, fen, fenT }]`. `POUR_PIECE` = ce qu'on calcule pour une pièce (variante `pre` → calculateur + valeurs
  reprises). Un ouvrage lancé depuis une pièce garde `piece` + `pre` ; quand on change les mesures de la pièce, ses
  ouvrages sont mis à jour. Électricité / VMC : `?depuis=pieces` construit la saisie à partir de toutes les pièces.
  Depuis 5.4 une pièce a aussi : niveau, saisie en surface (+ tour, sinon estimé), **murs donnant dehors** (doublage),
  sol propre ou « comme le niveau », électricité (prises, lampes, inter., distance du tableau, radiateur W),
  plomberie selon le type (lavabos, douche/baignoire, WC, évier, LV, LL, distances nourrice et chute). `normaliser()`
  complète les pièces d'avant.
- **« Toute la maison »** (`ouvrages/renomaison.js`, `chantierSeul` : hors accueil, ouvert depuis le chantier) : on coche
  les travaux, il appelle Placo, Isolation, Carrelage, Parquet, Ragréage, Peinture, Électricité, Plomberie, VMC avec
  les pièces **actuelles** du chantier (injectées au calcul). **Cloisons saisies une fois pour toute la maison**
  (pas de doublon entre deux pièces). Plaques H1 en salle de bain / WC. Par travail, **pièces à cocher** (champ `pieces` /
  `choixPieces` : la valeur = pièces décochées, une pièce ajoutée ensuite est cochée d'office).
- Dans une pièce, les travaux qui comptent les mêmes matériaux (`DOUBLONS` de `pieces.js` : Isoler ↔ Doublage, Pièce
  complète ↔ peinture / sol / placo) : quand l'un est calculé, l'autre est grisé « déjà compté » (`dejaCompte`).
- Pas de doublon de consommables : petits articles en quantité continue (acrylique, colle PVC) arrondis une fois
  sur le total ; forfaits `mx: true` (téflon, adhésif alu) = un par chantier (max, pas somme) dans `fusion` et `consolider`.
- Ordinateur ≥ 1100 px : `.calc-grid` = saisie à gauche, résultat collé à droite (calculateurs et Maison).

### Données (localStorage)

- `kalou_chantiers_v4` : `{ id, nom, notes, items[], achete{ clé: quantité achetée }, libres[] }`.
  Un item garde l'ouvrage + les valeurs saisies et est **recalculé** à l'affichage avec les formules actuelles.
- `kalou_reglages_v4`, `kalou_prix_v4`, `kalou_saisies_v4` (dont `maison_contour`), `kalou_derniere_sauvegarde`.
- Anciennes clés v3 (`kalou_btp_v3`, `kalou_devis_v1`) converties une fois en chantiers, **jamais effacées**.

## Méthode de travail (à suivre)

1. Branche `claude/<sujet>` depuis `origin/main`.
2. Modifier ; **`npm test`** et **`npm run test:ecrans`** (Chromium préinstallé dans les sessions) ;
   pour un nouvel écran, compléter `tests/ecrans.e2e.js` et regarder des captures à 360/390 px.
3. **Incrémenter `APP_VERSION`** (`js/app.js`) **et le nom du cache** (`sw.js`, `kalou-btp-vX.Y.Z`) ;
   ajouter tout nouveau fichier JS à la liste du `sw.js`.
4. Commit, push, PR, attendre le **contrôle GitHub vert**, puis **fusion dans `main`**
   (l'utilisateur a autorisé la fusion directe) ; vérifier la version en ligne sur GitHub Pages.
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
| 4.6.0 | #16 | Architecture : calculateurs découpés par famille, tests des écrans (Playwright) et de la PWA, tests sur GitHub à chaque PR, hébergement GitHub Pages |
| 4.7.0 | #17 | Liste de courses **en PDF** (vrai fichier, partagé sur téléphone / téléchargé sur ordinateur) : rangé par catégorie, numéroté, prix à remplir pour devis ; nom + téléphone dans Réglages ; « Envoyer la liste » = PDF ou message |
| 4.8.0 | #18 | Relecture croisée (maçon, plaquiste, UX, UI, rénovateur) — lot 1 : liste par référence (épaisseur, longueur, faïence/sol), chaux choisie, rang de chaînage, barres en morceaux, colle extérieure, garde-fous, avertissements amiante/plomb/pierre |
| 4.9.0 | #19 | Lot 2 : conditionnements du rayon (pots combinés, paquets, barres, rouleaux, big bags), saisie directe en m², accueil (carte, récents, recherche mot par mot), barre du bas sur une ligne, lisibilité |
| 5.1.0 | #21 | **Électricité** (prises, lumières, tableau, terre ; relu par un électricien) et **VMC** ; version **iMac** en 2 colonnes, puces de familles, tuiles compactes, **pictos SVG** ; bâti ancien (sol et enduit chaux-chanvre, agrafage, injection), tranchée EU/EP, pavage, portes, OSB, lambris ; carreaux en taille exacte ; laine en paquets |
| 5.2.0 | #23 | **Plomberie appareil par appareil** et **électricité pièce par pièce** (chacun sa distance, détail des longueurs affiché), clim, pompe à chaleur, prise voiture, chauffe-eau ; anciennes saisies converties ; **accueil par familles** (9 lignes au lieu de 48 tuiles, la recherche cherche partout) |
| 5.3.0 | #24 | **Pièces dans le chantier** (rénovation) : on mesure chaque pièce une fois, puis sol, murs, plafond, portes calculés avec ses mesures ; les calculs suivent si on change les mesures ; électricité et VMC à partir des pièces |
| 5.4.0 | #25 | Questions posées avant de coder. **Toute la maison** (rénovation) à partir des pièces : doublage des murs donnant dehors, cloisons (total maison), plafonds, sols par niveau, peinture, électricité, plomberie, ballon, clim, VMC ; pièces enrichies (niveau, surface seule, murs extérieurs, électricité et plomberie de la pièce) ; consommables sans doublon |
| 5.4.1 | #26 | Pièce : « Isoler les murs » et « Doublage placo » grisés l'un par l'autre (laine et placo pas comptés deux fois) ; Toute la maison : pièces à cocher par travail |
| 5.0.0 | #20 | Lot 3 : **Isoler un mur ou des rampants** (R visé, 6 isolants comparés, bâti ancien), **Douche à l'italienne**, **Plomberie** par appareil, **Pièce complète** (une saisie → murs, plafond, sol, plinthes) |

Projet en cours chez l'utilisateur : maison en Z (plan ≈ 58 m de tour, 134 m² au sol, 8 angles,
2 blocs de toit, ailes ≈ 7,5 m).

## Idées non faites (si on reprend)

- Électricité : parafoudre selon la zone (en conseil), volets roulants. Plomberie : Ø32 pour un lavabo seul (en conseil).
- Impression de la liste depuis l'ordinateur avec le nom du chantier (le PDF le fait déjà).
- Faux plafond sous solives anciennes, remaniement de toiture canal.
- Synchronisation téléphone ↔ iMac (aujourd'hui : fichier de sauvegarde à importer).
- Surfaces composées dans les calculateurs simples (dalle en L…).
