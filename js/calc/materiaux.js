// === CATALOGUE DES MATÉRIAUX ===
// Chaque calcul renvoie des lignes { k, q } : k = clé du matériau ci-dessous,
// q = quantité dans l'unité de base (kg, T, u, m², ml, m³, L…), pertes comprises.
// Ce catalogue sait :
//  - afficher la quantité dans l'unité d'achat (sacs, tonnes, rouleaux, boîtes…)
//  - ranger le matériau dans une catégorie (liste de courses)
//  - donner un prix indicatif (uniquement pour l'option « estimation entreprise »)
//
// Prix : repères négoce Dordogne 2026, TTC, modifiables dans Réglages.

import { fmt, fmtSmart } from '../core/format.js';

export const CATEGORIES = [
    { id: 'granulats',  l: 'Sable, gravier & béton' },
    { id: 'liants',     l: 'Ciment, chaux & mortiers' },
    { id: 'blocs',      l: 'Blocs, briques & pierre' },
    { id: 'acier',      l: 'Ferraillage, linteaux & plancher' },
    { id: 'bois',       l: 'Charpente & bois' },
    { id: 'couverture', l: 'Couverture & gouttières' },
    { id: 'platrerie',  l: 'Plâtrerie & isolation' },
    { id: 'plomberie',  l: 'Plomberie & sanitaire' },
    { id: 'elec',       l: 'Électricité & ventilation' },
    { id: 'revetement', l: 'Sols, murs & peinture' },
    { id: 'divers',     l: 'Divers, location & évacuation' }
];

// base : unité de calcul. pack : conditionnement d'achat (sac, rouleau, boîte…).
// dens : densité vrac (T/m³) pour afficher l'équivalent en m³.
// prix : prix d'UNE unité d'achat (un sac, une tonne, un rouleau, un mètre…).
export const MATERIAUX = {
    // ── Granulats & béton ────────────────────────────────────────────────
    sable04:    { l: 'Sable 0/4 (maçonnerie, béton)',   cat: 'granulats', base: 'T', dens: 1.5,  prix: 48 },
    sable02:    { l: 'Sable fin 0/2 (enduit de finition)', cat: 'granulats', base: 'T', dens: 1.5, prix: 52 },
    gravier:    { l: 'Gravillon 4/20 (béton)',          cat: 'granulats', base: 'T', dens: 1.45, prix: 48 },
    gravillon_fin: { l: 'Gravillon 4/10 (remplissage blocs, chaînages)', cat: 'granulats', base: 'T', dens: 1.45, prix: 52 },
    gravier_drain: { l: 'Gravier lavé 20/40 (drainage, épandage)', cat: 'granulats', base: 'T', dens: 1.6, prix: 38 },
    herisson:   { l: 'Cailloux 20/40 (hérisson)',       cat: 'granulats', base: 'T', dens: 1.6, prix: 32 },
    grave:      { l: 'Grave 0/31,5 (fond de forme)',     cat: 'granulats', base: 'T', dens: 2.0, prix: 30 },
    billes_argile: { l: 'Billes d\'argile expansée (sac 50 L)', cat: 'granulats', base: 'L', pack: { taille: 50, nom: 'sac', noms: 'sacs', label: 'de 50 L' }, prix: 12 },
    chenevotte: { l: 'Chanvre en vrac / chènevotte (ballot 20 kg)', cat: 'granulats', base: 'kg', pack: { taille: 20, nom: 'ballot', noms: 'ballots', label: 'de 20 kg' }, prix: 28 },
    bpe:        { l: 'Béton toupie (BPE)',              cat: 'granulats', base: 'm3', prix: 170 },

    // ── Liants & mortiers ────────────────────────────────────────────────
    ciment:     { l: 'Ciment CEM II/B 32,5',                   cat: 'liants', base: 'kg', pack: { ciment: true, nom: 'sac', noms: 'sacs' }, prix: 9.5 },
    chaux:      { l: 'Chaux NHL 3,5 (type St-Astier)',       cat: 'liants', base: 'kg', pack: { taille: 35, nom: 'sac', noms: 'sacs' }, prix: 17 },
    chaux_nhl2: { l: 'Chaux NHL 2 (pierre tendre, finition)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 15 },
    chaux_nhl5: { l: 'Chaux NHL 5 (gobetis, soubassement)',  cat: 'liants', base: 'kg', pack: { taille: 35, nom: 'sac', noms: 'sacs' }, prix: 18 },
    chaux_cl90: { l: 'Chaux aérienne CL 90 (finition)',      cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 14 },
    liant_chanvre: { l: 'Liant chaux formulé pour chanvre',  cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 22 },
    injection:  { l: 'Crème d\'injection anti-remontées (cartouche 600 ml)', cat: 'liants', base: 'L', pack: { taille: 0.6, nom: 'cartouche', noms: 'cartouches', label: 'de 600 ml' }, prix: 35 },
    enduit_mono:{ l: 'Enduit monocouche',               cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 13 },
    colle_bloc: { l: 'Mortier-colle joint mince (briques)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 13 },
    mortier_sr: { l: 'Mortier sans retrait (calage)',   cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 25 },
    mortier_refr: { l: 'Mortier réfractaire (boisseaux)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'seau', noms: 'seaux', label: 'de 25 kg' }, prix: 45 },
    bitume:     { l: 'Enduit bitumineux (murs enterrés)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'seau', noms: 'seaux', label: 'de 25 kg' }, prix: 60 },
    enduit_etanche: { l: 'Enduit d\'étanchéité (piscine)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 28 },
    colle_carrelage: { l: 'Mortier-colle C2 (carrelage)',            cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 18 },
    joint_carrelage: { l: 'Mortier joint CG2',            cat: 'liants', base: 'kg', pack: { taille: 5,  nom: 'sac', noms: 'sacs' }, prix: 12 },
    ragreage:   { l: 'Ragréage autolissant P3',            cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 22 },

    map:        { l: 'Mortier adhésif MAP (doublage collé)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 14 },
    primaire:   { l: 'Primaire d\'accrochage',            cat: 'liants', base: 'kg', pack: { taille: 5, nom: 'bidon', noms: 'bidons', label: 'de 5 kg' }, prix: 35 },
    spec:       { l: 'SPEC : protection à l\'eau sous carrelage', cat: 'liants', base: 'kg', pack: { taille: 7, nom: 'seau', noms: 'seaux', label: 'de 7 kg' }, prix: 85 },
    colle_parquet: { l: 'Colle parquet MS polymère',       cat: 'liants', base: 'kg', pack: { taille: 15, nom: 'seau', noms: 'seaux', label: 'de 15 kg' }, prix: 95 },
    enduit_lissage: { l: 'Enduit de lissage en pâte',      cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'seau', noms: 'seaux', label: 'de 25 kg' }, prix: 40 },

    // ── Blocs, briques, pierre ───────────────────────────────────────────
    parpaing20: { l: 'Agglo creux de 20 (20×20×50)',         cat: 'blocs', base: 'u', prix: 1.9 },
    angle20:    { l: 'Agglo d\'angle de 20',            cat: 'blocs', base: 'u', prix: 2.4 },
    parpaing15: { l: 'Agglo creux de 15 (15×20×50)',         cat: 'blocs', base: 'u', prix: 1.6 },
    angle15:    { l: 'Agglo d\'angle de 15',            cat: 'blocs', base: 'u', prix: 2.0 },
    parpaing10: { l: 'Agglo de 10 (10×20×50)',     cat: 'blocs', base: 'u', prix: 1.25 },
    bancher20:  { l: 'Bloc à bancher 20×20×50',         cat: 'blocs', base: 'u', prix: 2.8 },
    brique20:   { l: 'Brique rectifiée de 20 (50×20×31,4)', cat: 'blocs', base: 'u', prix: 2.9 },
    monomur30:  { l: 'Brique monomur 30 (25×30×24,9)',  cat: 'blocs', base: 'u', prix: 5.9 },
    bloc_u:     { l: 'Bloc U / bloc chaînage 20',        cat: 'blocs', base: 'u', prix: 3.2 },
    planelle:   { l: 'Planelle (rive de plancher)',      cat: 'blocs', base: 'u', prix: 1.7 },
    moellon:    { l: 'Pierre / moellons du pays',        cat: 'blocs', base: 'T', prix: 180 },
    chaperon:   { l: 'Chaperon de mur (50 cm)',          cat: 'blocs', base: 'u', prix: 6.5 },
    paves:      { l: 'Pavés ou dalles extérieures',      cat: 'blocs', base: 'm2', prix: 25 },
    bordure:    { l: 'Bordure béton (1 m)',              cat: 'blocs', base: 'u', prix: 6 },

    // ── Acier, linteaux, plancher ────────────────────────────────────────
    arm_semelle:{ l: 'Semelle filante armée préfa (6 m)',   cat: 'acier', base: 'u', prix: 22 },
    arm_chainage:{ l: 'Chaînage préfa 4 HA (6 m)', cat: 'acier', base: 'u', prix: 13 },
    fer10:      { l: 'Fer HA Ø10 (barre de 6 m)',        cat: 'acier', base: 'u', prix: 11 },
    fer12:      { l: 'Fer HA Ø12 (barre de 6 m)',        cat: 'acier', base: 'u', prix: 15 },
    etrier:     { l: 'Cadre / étrier HA6 façonné',        cat: 'acier', base: 'u', prix: 0.9 },
    equerre_sem:{ l: 'Équerre d\'angle / té de semelle préfa', cat: 'acier', base: 'u', prix: 14 },
    equerre_ch: { l: 'Équerre d\'angle de chaînage',     cat: 'acier', base: 'u', prix: 6 },
    attente:    { l: 'Attente en L (chaînage vertical)', cat: 'acier', base: 'u', prix: 6 },
    treillis36: { l: 'Treillis soudé ST 25 C 2,40×3,60 m',       cat: 'acier', base: 'u', prix: 22 },
    treillis6:  { l: 'Treillis soudé ST 25 C 2,40×6,00 m',       cat: 'acier', base: 'u', prix: 38 },
    cales:      { l: 'Cales à béton (distanciers)',      cat: 'acier', base: 'u', prix: 0.25 },
    linteau:    { l: 'Linteau béton préfa',              cat: 'acier', base: 'ml', prix: 28 },
    linteau_tc: { l: 'Linteau terre cuite (brique)',     cat: 'acier', base: 'ml', prix: 32 },
    ipn:        { l: 'Poutre acier IPN / HEA',           cat: 'acier', base: 'ml', prix: 70 },
    poutrelle:  { l: 'Poutrelle béton précontraint',     cat: 'acier', base: 'ml', prix: 7 },
    entrevous:  { l: 'Entrevous (hourdis) béton',        cat: 'acier', base: 'u', prix: 1.7 },
    entrevous_pse: { l: 'Entrevous isolant PSE (hourdis polystyrène)', cat: 'acier', base: 'u', prix: 4.5 },
    appui:      { l: 'Appui de fenêtre béton préfa',     cat: 'acier', base: 'u', prix: 38 },
    seuil:      { l: 'Seuil de porte béton préfa',       cat: 'acier', base: 'u', prix: 45 },

    // ── Bois / charpente ─────────────────────────────────────────────────
    fermette:   { l: 'Fermette industrielle (sur mesure)', cat: 'bois', base: 'u', prix: 120 },
    chevron:    { l: 'Chevron (63×75 à 75×100)',          cat: 'bois', base: 'ml', prix: 5.5 },
    panne:      { l: 'Panne (≈ 100×220)',                 cat: 'bois', base: 'ml', prix: 20 },
    ferme:      { l: 'Ferme traditionnelle (charpentier)', cat: 'bois', base: 'u', prix: 550 },
    fixation_ch:{ l: 'Équerres / connecteurs de charpente', cat: 'bois', base: 'u', prix: 1.5 },
    liteau:     { l: 'Liteau 27×40',                      cat: 'bois', base: 'ml', prix: 0.9 },
    contreliteau:{ l: 'Contre-liteau 27×40',              cat: 'bois', base: 'ml', prix: 0.9 },
    planche:    { l: 'Planche de coffrage',               cat: 'bois', base: 'ml', prix: 3 },
    contreplaque: { l: 'Contreplaqué de coffrage',         cat: 'bois', base: 'm2', prix: 14 },
    osb:        { l: 'Dalle OSB 3 rainure-languette (2,05 × 0,675 m)', cat: 'bois', base: 'u', prix: 22 },
    vis_bois:   { l: 'Vis à bois 4 × 50 (boîte de 200)',  cat: 'bois', base: 'u', pack: { taille: 200, nom: 'boîte', noms: 'boîtes', label: 'de 200' }, prix: 12 },
    colle_bois: { l: 'Colle à bois D3 (750 g)',          cat: 'bois', base: 'u', prix: 12 },
    lambris:    { l: 'Lambris bois',                     cat: 'bois', base: 'm2', prix: 15 },
    tasseau:    { l: 'Tasseau 27 × 40',                  cat: 'bois', base: 'ml', prix: 1.2 },
    clips_lambris: { l: 'Clips à lambris (boîte de 100)', cat: 'bois', base: 'u', pack: { taille: 100, nom: 'boîte', noms: 'boîtes', label: 'de 100' }, prix: 8 },
    bloc_porte: { l: 'Bloc-porte intérieur (huisserie + porte)', cat: 'bois', base: 'u', prix: 110 },
    poignee:    { l: 'Ensemble poignée + serrure',       cat: 'bois', base: 'u', prix: 20 },
    chambranle: { l: 'Kit chambranle (une face)',        cat: 'bois', base: 'u', prix: 18 },
    mousse_pu:  { l: 'Mousse PU (bombe)',                cat: 'bois', base: 'u', prix: 9 },

    // ── Couverture & zinguerie ───────────────────────────────────────────
    ecran:      { l: 'Écran sous-toiture HPV',            cat: 'couverture', base: 'm2', pack: { taille: 75, nom: 'rouleau', noms: 'rouleaux', label: 'de 75 m²' }, prix: 120 },
    tuile_meca: { l: 'Tuile romane (emboîtement)',       cat: 'couverture', base: 'u', prix: 1.4 },
    tuile_gm:   { l: 'Tuile mécanique grand moule',      cat: 'couverture', base: 'u', prix: 1.5 },
    tuile_canal:{ l: 'Tuile canal (courants + chapeaux)',   cat: 'couverture', base: 'u', prix: 0.95 },
    tuile_plate:{ l: 'Tuile plate 17×27 (Périgord)',                 cat: 'couverture', base: 'u', prix: 0.9 },
    ardoise:    { l: 'Ardoise naturelle 32×22',           cat: 'couverture', base: 'u', prix: 1.3 },
    crochet_ardoise: { l: 'Crochets d\'ardoise',          cat: 'couverture', base: 'u', prix: 0.08 },
    plaque_st:  { l: 'Plaque sous-tuile (PST, type Onduline)',         cat: 'couverture', base: 'm2', prix: 10 },
    faitiere:   { l: 'Tuile faîtière / arêtier',          cat: 'couverture', base: 'u', prix: 4.5 },
    tuile_rive: { l: 'Tuile de rive',                     cat: 'couverture', base: 'u', prix: 5 },
    closoir:    { l: 'Closoir ventilé de faîtage',        cat: 'couverture', base: 'ml', prix: 9 },
    noue:       { l: 'Noue (zinc ou alu)',               cat: 'couverture', base: 'ml', prix: 30 },
    rive_zinc:  { l: 'Bande de rive en zinc (2 m)',      cat: 'couverture', base: 'ml', prix: 18 },
    gouttiere:  { l: 'Gouttière (zinc ou PVC)',           cat: 'couverture', base: 'ml', prix: 15 },
    descente:   { l: 'Descente EP + coude + dauphin',     cat: 'couverture', base: 'u', prix: 45 },
    crochet:    { l: 'Crochets de gouttière',             cat: 'couverture', base: 'u', prix: 2.5 },

    // ── Plâtrerie & isolation ────────────────────────────────────────────
    ba13:       { l: 'Plaque BA13 standard',              cat: 'platrerie', base: 'u', prix: 9.5 },
    ba13_h1:    { l: 'Plaque BA13 H1 hydrofuge (verte)',  cat: 'platrerie', base: 'u', prix: 13 },
    ba13_phon:  { l: 'Plaque BA13 phonique',              cat: 'platrerie', base: 'u', prix: 14 },
    doublage_colle: { l: 'Doublage collé PSE graphite + plâtre (type Placomur)', cat: 'platrerie', base: 'u', prix: 32 },
    rail:       { l: 'Rail R48 (3 m) Placostil / Prégymétal',                    cat: 'platrerie', base: 'u', prix: 4.5 },
    montant:    { l: 'Montant M48',                       cat: 'platrerie', base: 'u', prix: 5 },
    rail70:     { l: 'Rail R70 (3 m)',                    cat: 'platrerie', base: 'u', prix: 6 },
    montant70:  { l: 'Montant M70',                       cat: 'platrerie', base: 'u', prix: 7 },
    eclisse:    { l: 'Éclisse F530',                      cat: 'platrerie', base: 'u', prix: 0.5 },
    appui_doublage: { l: 'Appui intermédiaire de doublage (type Optima)', cat: 'platrerie', base: 'u', prix: 1.2 },
    fourrure:   { l: 'Fourrure F530 (3 m)',               cat: 'platrerie', base: 'u', prix: 3.8 },
    suspente:   { l: 'Suspente F530 (pivot ou étrier)',    cat: 'platrerie', base: 'u', prix: 0.7 },
    corniere:   { l: 'Cornière de rive / lisse U (3 m)',    cat: 'platrerie', base: 'u', prix: 2.8 },
    vis_placo35:{ l: 'Vis plaque TTPC 35 (2e plaque)',    cat: 'platrerie', base: 'u', pack: { taille: 1000, nom: 'boîte', noms: 'boîtes', label: 'de 1000' }, prix: 22 },
    fixation:   { l: 'Chevilles à frapper / vis de fixation', cat: 'platrerie', base: 'u', pack: { taille: 100, nom: 'boîte', noms: 'boîtes', label: 'de 100' }, prix: 12 },
    vis_placo:  { l: 'Vis plaque TTPC 25',                cat: 'platrerie', base: 'u', pack: { taille: 1000, nom: 'boîte', noms: 'boîtes', label: 'de 1000' }, prix: 18 },
    bande:      { l: 'Bande à joint papier',              cat: 'platrerie', base: 'ml', pack: { taille: 150, nom: 'rouleau', noms: 'rouleaux', label: 'de 150 m' }, prix: 9 },
    bande_armee:{ l: 'Bande armée (angles sortants)',     cat: 'platrerie', base: 'ml', pack: { taille: 30, nom: 'rouleau', noms: 'rouleaux', label: 'de 30 m' }, prix: 14 },
    enduit_joint:{ l: 'Enduit à joint en poudre',                   cat: 'platrerie', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 28 },
    laine_mur:  { l: 'Laine minérale de doublage (panneau semi-rigide)', cat: 'platrerie', base: 'm2', prix: 9 },
    laine_cloison:{ l: 'Laine de verre pour cloison (rouleau)', cat: 'platrerie', base: 'm2', prix: 4 },
    laine_combles:{ l: 'Laine minérale en rouleau',  cat: 'platrerie', base: 'm2', prix: 13 },
    souffle_verre: { l: 'Laine de verre à souffler',      cat: 'platrerie', base: 'kg', pack: { taille: 16, nom: 'sac', noms: 'sacs', label: 'de 16 kg' }, prix: 22 },
    souffle_roche: { l: 'Laine de roche à souffler',      cat: 'platrerie', base: 'kg', pack: { taille: 20, nom: 'sac', noms: 'sacs', label: 'de 20 kg' }, prix: 20 },
    souffle_ouate: { l: 'Ouate de cellulose à souffler',  cat: 'platrerie', base: 'kg', pack: { taille: 12.5, nom: 'sac', noms: 'sacs', label: 'de 12,5 kg' }, prix: 13 },
    pige:       { l: 'Piges graduées (combles soufflés)', cat: 'platrerie', base: 'u', prix: 1 },
    rehausse:   { l: 'Rehausse de trappe de visite',      cat: 'platrerie', base: 'u', prix: 25 },
    pare_vapeur:{ l: 'Membrane pare-vapeur (côté chaud)', cat: 'platrerie', base: 'm2', prix: 1.5 },
    adhesif_pv: { l: 'Adhésif pour membrane',             cat: 'platrerie', base: 'ml', pack: { taille: 25, nom: 'rouleau', noms: 'rouleaux', label: 'de 25 m' }, prix: 12 },
    mastic_pv:  { l: 'Mastic pour membrane',              cat: 'platrerie', base: 'u', prix: 11 },
    isolant_chape: { l: 'Isolant sous chape PSE / PU (SC1 a2 Ch)', cat: 'platrerie', base: 'm2', prix: 12 },
    isolant_sol:{ l: 'Isolant sous dalle (polystyrène)',  cat: 'platrerie', base: 'm2', prix: 14 },
    // Isolants pour murs et rampants (conditionnement saisi : m² par paquet ou rouleau)
    iso_verre:  { l: 'Laine de verre (rouleau / panneau)',  cat: 'platrerie', base: 'm2', prix: 5 },
    iso_roche:  { l: 'Laine de roche (panneau)',            cat: 'platrerie', base: 'm2', prix: 8 },
    iso_bois:   { l: 'Fibre de bois souple (panneau)',      cat: 'platrerie', base: 'm2', prix: 18 },
    iso_chanvre:{ l: 'Laine de chanvre (panneau)',          cat: 'platrerie', base: 'm2', prix: 17 },
    iso_ouate:  { l: 'Ouate de cellulose (panneau)',        cat: 'platrerie', base: 'm2', prix: 15 },
    iso_pu:     { l: 'Panneau PU / PIR (polyuréthane)',     cat: 'platrerie', base: 'm2', prix: 17 },
    frein_vapeur: { l: 'Frein-vapeur hygrorégulant (Sd variable)', cat: 'platrerie', base: 'm2', pack: { taille: 75, nom: 'rouleau', noms: 'rouleaux', label: 'de 75 m²' }, prix: 160 },

    // ── Plomberie & sanitaire ────────────────────────────────────────────
    per16:      { l: 'Tube PER prégainé Ø16',               cat: 'plomberie', base: 'ml', pack: { taille: 25, nom: 'couronne', noms: 'couronnes', label: 'de 25 m' }, prix: 32 },
    nourrice:   { l: 'Nourrice (collecteur) 3/4"',           cat: 'plomberie', base: 'u', prix: 35 },
    raccord_per:{ l: 'Raccord à sertir ou à glissement Ø16 × 1/2"', cat: 'plomberie', base: 'u', prix: 4 },
    applique:   { l: 'Applique murale Ø16 × 1/2" (sortie de cloison)', cat: 'plomberie', base: 'u', prix: 6 },
    robinet_arret: { l: 'Robinet d\'arrêt 1/4 de tour 1/2"', cat: 'plomberie', base: 'u', prix: 9 },
    flexible:   { l: 'Flexible inox 1/2" (40 cm)',          cat: 'plomberie', base: 'u', prix: 6 },
    pvc40:      { l: 'Tube PVC évacuation Ø40',              cat: 'plomberie', base: 'ml', pack: { taille: 2, nom: 'barre', noms: 'barres', label: 'de 2 m' }, prix: 6 },
    pvc100b:    { l: 'Tube PVC évacuation Ø100 (WC, chute)', cat: 'plomberie', base: 'ml', pack: { taille: 2, nom: 'barre', noms: 'barres', label: 'de 2 m' }, prix: 12 },
    coude40:    { l: 'Coude PVC Ø40 (45° ou 87°)',           cat: 'plomberie', base: 'u', prix: 1.5 },
    coude100:   { l: 'Coude PVC Ø100 (45° ou 87°)',          cat: 'plomberie', base: 'u', prix: 4 },
    manchon40:  { l: 'Manchon PVC Ø40',                      cat: 'plomberie', base: 'u', prix: 1 },
    manchon100: { l: 'Manchon PVC Ø100',                     cat: 'plomberie', base: 'u', prix: 2.5 },
    collier40:  { l: 'Collier PVC Ø40',                      cat: 'plomberie', base: 'u', prix: 0.8 },
    collier100: { l: 'Collier PVC Ø100',                     cat: 'plomberie', base: 'u', prix: 2 },
    colle_pvc:  { l: 'Colle PVC (pot 250 ml) + décapant',    cat: 'plomberie', base: 'u', prix: 12 },
    teflon:     { l: 'Téflon / pâte d\'étanchéité',         cat: 'plomberie', base: 'u', prix: 4 },
    siphon:     { l: 'Siphon (lavabo, évier, machine)',      cat: 'plomberie', base: 'u', prix: 9 },
    vidage_bain:{ l: 'Vidage de baignoire',                  cat: 'plomberie', base: 'u', prix: 25 },
    pipe_wc:    { l: 'Pipe WC Ø100 (droite ou coudée)',      cat: 'plomberie', base: 'u', prix: 9 },
    bati_wc:    { l: 'Bâti-support WC suspendu',             cat: 'plomberie', base: 'u', prix: 180 },
    siphon_douche: { l: 'Siphon de douche à carreler (extra-plat)', cat: 'plomberie', base: 'u', prix: 45 },
    caniveau:   { l: 'Caniveau de douche linéaire',          cat: 'plomberie', base: 'u', prix: 120 },
    receveur_carreler: { l: 'Receveur à carreler (panneau de douche à pente intégrée)', cat: 'plomberie', base: 'u', prix: 160 },
    natte_etanche: { l: 'Natte d\'étanchéité SEL (rouleau 5 m × 1 m)', cat: 'plomberie', base: 'm2', pack: { taille: 5, nom: 'rouleau', noms: 'rouleaux', label: 'de 5 m²' }, prix: 95 },
    manchette:  { l: 'Manchette d\'étanchéité (traversée de tuyau)', cat: 'plomberie', base: 'u', prix: 6 },
    angle_etanche: { l: 'Angle d\'étanchéité préformé (rentrant / sortant)', cat: 'plomberie', base: 'u', prix: 6 },
    colle_s1:   { l: 'Mortier-colle C2 S1 (natte, grands carreaux)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 24 },

    // ── Électricité (NF C 15-100) & ventilation ──────────────────────────
    icta_15:    { l: 'Gaine ICTA Ø16 préfilée 3G1,5 (éclairage)',   cat: 'elec', base: 'ml', pack: { taille: 100, nom: 'couronne', noms: 'couronnes', label: 'de 100 m' }, prix: 75 },
    icta_25:    { l: 'Gaine ICTA Ø20 préfilée 3G2,5 (prises)',      cat: 'elec', base: 'ml', pack: { taille: 100, nom: 'couronne', noms: 'couronnes', label: 'de 100 m' }, prix: 110 },
    icta_6:     { l: 'Gaine ICTA Ø25 + fils 3 × 6 mm² (plaque de cuisson)', cat: 'elec', base: 'ml', prix: 5 },
    cable_15:   { l: 'Câble R2V 3G1,5 (apparent, sous moulure)',    cat: 'elec', base: 'ml', pack: { taille: 50, nom: 'couronne', noms: 'couronnes', label: 'de 50 m' }, prix: 45 },
    cable_25:   { l: 'Câble R2V 3G2,5 (apparent, sous moulure)',    cat: 'elec', base: 'ml', pack: { taille: 50, nom: 'couronne', noms: 'couronnes', label: 'de 50 m' }, prix: 70 },
    moulure:    { l: 'Moulure / goulotte PVC (2 m)',                 cat: 'elec', base: 'ml', pack: { taille: 2, nom: 'barre', noms: 'barres', label: 'de 2 m' }, prix: 4 },
    boite_placo:{ l: 'Boîte d\'encastrement placo Ø67',              cat: 'elec', base: 'u', prix: 0.8 },
    boite_sceller: { l: 'Boîte d\'encastrement à sceller (maçonnerie)', cat: 'elec', base: 'u', prix: 0.6 },
    boite_dcl:  { l: 'Boîte DCL de plafond (point lumineux)',        cat: 'elec', base: 'u', prix: 3 },
    boite_derivation: { l: 'Boîte de dérivation',                    cat: 'elec', base: 'u', prix: 4 },
    wago:       { l: 'Bornes de connexion automatiques (type Wago)', cat: 'elec', base: 'u', pack: { taille: 50, nom: 'boîte', noms: 'boîtes', label: 'de 50' }, prix: 15 },
    fil15:      { l: 'Fil H07V-U 1,5 mm² (navettes, retours)',  cat: 'elec', base: 'ml', pack: { taille: 100, nom: 'couronne', noms: 'couronnes', label: 'de 100 m' }, prix: 25 },
    cable_6:    { l: 'Câble R2V 3G6 (plaque, apparent)',          cat: 'elec', base: 'ml', prix: 6 },
    boitier_saillie: { l: 'Cadre / boîtier en saillie (pose apparente)', cat: 'elec', base: 'u', prix: 3 },
    platre:     { l: 'Plâtre gros (rebouchage des saignées)',     cat: 'elec', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 12 },
    disj2:      { l: 'Disjoncteur 2 A (VMC, commande de contacteur)', cat: 'elec', base: 'u', prix: 9 },
    contacteur: { l: 'Contacteur jour/nuit 20 A (chauffe-eau)',   cat: 'elec', base: 'u', prix: 25 },
    bornier_terre: { l: 'Bornier (barrette) de terre du tableau', cat: 'elec', base: 'u', prix: 6 },
    piquet_terre: { l: 'Piquet de terre (1,5 à 2 m)',             cat: 'elec', base: 'u', prix: 25 },
    cable_terre:{ l: 'Câble de terre cuivre 16 mm² vert-jaune',   cat: 'elec', base: 'ml', prix: 4 },
    barrette_terre: { l: 'Barrette de mesure de terre',           cat: 'elec', base: 'u', prix: 10 },
    fil_vj4:    { l: 'Fil vert-jaune 4 mm² (liaison équipotentielle)', cat: 'elec', base: 'ml', prix: 1.2 },
    collier_terre: { l: 'Collier de mise à la terre',             cat: 'elec', base: 'u', prix: 3 },
    prise:      { l: 'Prise 16 A 2P+T',                             cat: 'elec', base: 'u', prix: 6 },
    inter:      { l: 'Interrupteur (simple ou va-et-vient)',         cat: 'elec', base: 'u', prix: 6 },
    douille:    { l: 'Douille DCL + fiche (point lumineux)',         cat: 'elec', base: 'u', prix: 4 },
    sortie_cable: { l: 'Sortie de câble 20 A / 32 A',               cat: 'elec', base: 'u', prix: 8 },
    disj16:     { l: 'Disjoncteur 16 A (éclairage)',                 cat: 'elec', base: 'u', prix: 9 },
    disj20:     { l: 'Disjoncteur 20 A (prises, circuits spécialisés)', cat: 'elec', base: 'u', prix: 9 },
    disj32:     { l: 'Disjoncteur 32 A (plaque de cuisson)',         cat: 'elec', base: 'u', prix: 12 },
    diff_ac:    { l: 'Interrupteur différentiel 40 A 30 mA type AC', cat: 'elec', base: 'u', prix: 35 },
    diff_a:     { l: 'Interrupteur différentiel 40 A 30 mA type A',  cat: 'elec', base: 'u', prix: 55 },
    tableau:    { l: 'Tableau électrique (rangées de 13 modules)',   cat: 'elec', base: 'u', prix: 60 },
    peigne:     { l: 'Peigne de raccordement (rangée)',              cat: 'elec', base: 'u', prix: 8 },
    vmc_caisson:{ l: 'Caisson VMC simple flux',                      cat: 'elec', base: 'u', prix: 120 },
    vmc_bouche: { l: 'Bouche d\'extraction VMC',                    cat: 'elec', base: 'u', prix: 12 },
    vmc_gaine80:{ l: 'Gaine VMC souple isolée Ø80',                  cat: 'elec', base: 'ml', pack: { taille: 6, nom: 'rouleau', noms: 'rouleaux', label: 'de 6 m' }, prix: 25 },
    vmc_gaine125:{ l: 'Gaine VMC souple isolée Ø125',                cat: 'elec', base: 'ml', pack: { taille: 6, nom: 'rouleau', noms: 'rouleaux', label: 'de 6 m' }, prix: 35 },
    vmc_sortie: { l: 'Sortie de toiture VMC (avec manchon)',         cat: 'elec', base: 'u', prix: 70 },
    entree_air: { l: 'Entrée d\'air (menuiserie ou mur) + auvent', cat: 'elec', base: 'u', prix: 9 },
    collier_vmc:{ l: 'Colliers de serrage VMC',                      cat: 'elec', base: 'u', prix: 1 },
    vmc_manchon:{ l: 'Manchon de bouche VMC',                        cat: 'elec', base: 'u', prix: 4 },
    vmc_suspension: { l: 'Kit de suspension / plots du caisson VMC', cat: 'elec', base: 'u', prix: 12 },
    adhesif_alu:{ l: 'Adhésif aluminium',                            cat: 'elec', base: 'u', prix: 7 },

    // ── Revêtements ──────────────────────────────────────────────────────
    natte_desol:{ l: 'Natte de désolidarisation',         cat: 'revetement', base: 'm2', prix: 18 },
    croisillon: { l: 'Croisillons',                       cat: 'revetement', base: 'u', pack: { taille: 250, nom: 'sachet', noms: 'sachets', label: 'de 250' }, prix: 4 },
    cale_nivel: { l: 'Cales autonivelantes',              cat: 'revetement', base: 'u', pack: { taille: 100, nom: 'sachet', noms: 'sachets', label: 'de 100' }, prix: 15 },
    bande_spec: { l: 'Bande d\'angle SPEC',              cat: 'revetement', base: 'ml', pack: { taille: 10, nom: 'rouleau', noms: 'rouleaux', label: 'de 10 m' }, prix: 25 },
    silicone:   { l: 'Mastic silicone sanitaire (310 ml)', cat: 'revetement', base: 'u', prix: 8 },
    acrylique:  { l: 'Mastic acrylique (310 ml)',          cat: 'revetement', base: 'u', prix: 4 },
    carrelage:  { l: 'Carrelage',                         cat: 'revetement', base: 'm2', prix: 30 },
    plinthe:    { l: 'Plinthes carrelage (pièces de 60 cm)', cat: 'revetement', base: 'ml', pack: { taille: 0.6, nom: 'pièce', noms: 'pièces', label: 'de 60 cm' }, prix: 2.5 },
    plinthe_bois: { l: 'Plinthes bois / MDF (barres de 2,40 m)', cat: 'revetement', base: 'ml', pack: { taille: 2.4, nom: 'barre', noms: 'barres', label: 'de 2,40 m' }, prix: 8 },
    parquet:    { l: 'Parquet contrecollé ou stratifié',                   cat: 'revetement', base: 'm2', prix: 28 },
    sous_couche:{ l: 'Sous-couche parquet',               cat: 'revetement', base: 'm2', pack: { taille: 15, nom: 'rouleau', noms: 'rouleaux', label: 'de 15 m²' }, prix: 45 },
    polyane200: { l: 'Film polyane 200 µm (sous parquet)', cat: 'revetement', base: 'm2', prix: 0.9 },
    barre_seuil:{ l: 'Barre de seuil',                    cat: 'revetement', base: 'u', prix: 12 },
    peinture:   { l: 'Peinture de finition murs (velours / satin)', cat: 'revetement', base: 'L', pots: true, prix: 7.5 },
    peinture_plafond: { l: 'Peinture de finition plafonds (mat)', cat: 'revetement', base: 'L', pots: true, prix: 6.5 },
    ruban:      { l: 'Ruban de masquage',                 cat: 'revetement', base: 'ml', pack: { taille: 50, nom: 'rouleau', noms: 'rouleaux', label: 'de 50 m' }, prix: 5 },
    bache:      { l: 'Bâche de protection 4 × 5 m',       cat: 'revetement', base: 'm2', pack: { taille: 20, nom: 'bâche', noms: 'bâches', label: 'de 20 m²' }, prix: 8 },
    impression: { l: 'Impression acrylique (plaques, plâtre)',         cat: 'revetement', base: 'L', pots: true, prix: 5 },

    // ── Divers ───────────────────────────────────────────────────────────
    arase:      { l: 'Arase étanche (bande bitumineuse ou mortier hydrofuge)', cat: 'divers', base: 'ml', prix: 2.5 },
    drain:      { l: 'Drain agricole Ø100 avec chaussette', cat: 'divers', base: 'ml', prix: 2.2 },
    tuyau_epandage: { l: 'Tuyau d\'épandage rigide perforé Ø100 (sans chaussette)', cat: 'divers', base: 'ml', prix: 3.5 },
    pvc_cr8:    { l: 'Tube PVC assainissement CR8 (barre de 4 m)', cat: 'divers', base: 'ml', pack: { taille: 4, nom: 'barre', noms: 'barres', label: 'de 4 m' }, prix: 28 },
    coude_cr8:  { l: 'Coude PVC assainissement 45°',     cat: 'divers', base: 'u', prix: 8 },
    grillage_avert: { l: 'Grillage avertisseur (rouleau 25 m)', cat: 'divers', base: 'ml', pack: { taille: 25, nom: 'rouleau', noms: 'rouleaux', label: 'de 25 m' }, prix: 12 },
    temoin:     { l: 'Témoin de fissure (jauge)',        cat: 'divers', base: 'u', prix: 8 },
    delta:      { l: 'Membrane à excroissances (type Delta MS)', cat: 'divers', base: 'm2', prix: 5 },
    regard:     { l: 'Regard de visite (PVC ou béton)',    cat: 'divers', base: 'u', prix: 35 },
    pvc100:     { l: 'Tuyau PVC Ø100 (évacuation)',         cat: 'divers', base: 'ml', prix: 4.5 },
    barbacane:  { l: 'Barbacane (tube PVC Ø50)',            cat: 'divers', base: 'u', prix: 2 },
    fosse:      { l: 'Fosse toutes eaux',                   cat: 'divers', base: 'u', prix: 1100 },
    boisseau:   { l: 'Boisseau de conduit de fumée',        cat: 'divers', base: 'u', prix: 22 },
    chapeau:    { l: 'Chapeau / sortie de souche',          cat: 'divers', base: 'u', prix: 90 },
    echaf:      { l: 'Échafaudage (location)',              cat: 'divers', base: 'm2', prix: 3 },
    polyane:    { l: 'Film polyane 150 µm',               cat: 'divers', base: 'm2', prix: 0.8 },
    geotextile: { l: 'Géotextile',                        cat: 'divers', base: 'm2', prix: 1.2 },
    desactivant:{ l: 'Désactivant de surface',            cat: 'divers', base: 'L', prix: 9 },
    treillis_chape: { l: 'Treillis de chape galva 50×50, fil Ø2 mm', cat: 'divers', base: 'm2', prix: 3.5 },
    fibres_pp:  { l: 'Fibres polypropylène (mortier)',     cat: 'divers', base: 'kg', pack: { taille: 0.6, nom: 'sachet', noms: 'sachets', label: 'de 600 g' }, prix: 6 },
    bande_peri: { l: 'Bande de désolidarisation (périphérique)', cat: 'divers', base: 'ml', prix: 0.6 },
    baguette:   { l: 'Baguette d\'angle pour enduit (3 m)', cat: 'divers', base: 'u', prix: 4 },
    grille_vs:  { l: 'Grille d\'aération vide sanitaire', cat: 'divers', base: 'u', prix: 4 },
    plot:       { l: 'Plot réglable terrasse',            cat: 'divers', base: 'u', prix: 3 },
    dalle_ter:  { l: 'Dalles de terrasse',                cat: 'divers', base: 'm2', prix: 40 },
    etai:       { l: 'Étais (location)',                  cat: 'divers', base: 'u', prix: 4 },
    mini_pelle: { l: 'Location mini-pelle',               cat: 'divers', base: 'jour', prix: 220 },
    benne:      { l: 'Benne 8 m³ (terre)',                cat: 'divers', base: 'u', prix: 280 },
    bigbag_gravats: { l: 'Big bag à gravats (1 m³)',      cat: 'divers', base: 'u', prix: 15 },
    benne6:     { l: 'Benne 6 m³ (gravats lourds)',       cat: 'divers', base: 'u', prix: 300 }
};

export const PRIX_DEFAUT = Object.fromEntries(Object.entries(MATERIAUX).map(([k, m]) => [k, m.prix]));

const UNITES = { u: 'pcs', m2: 'm²', ml: 'm', m3: 'm³', L: 'L', T: 'T', kg: 'kg', jour: 'jour' };

/** Taille du conditionnement (sac de ciment selon le réglage 25/35 kg). */
function taillePack(mat, ctx = {}) {
    if (!mat.pack) return null;
    if (mat.pack.ciment) return ctx.sacCiment || 35;
    return mat.pack.taille;
}

/** Libellé du matériau (le ciment affiche le poids du sac choisi). */
export function libelle(k, ctx = {}) {
    const m = MATERIAUX[k];
    if (!m) return k;
    if (m.pack && m.pack.ciment) return `${m.l} (sac ${taillePack(m, ctx)} kg)`;
    return m.l;
}

// Pots du commerce (litres) et prix relatif d'un pot (repère : 1 L ≈ 15 €, 2,5 L ≈ 30 €, 5 L ≈ 45 €, 10 L ≈ 75 €).
// On prend la combinaison la moins chère ; à prix égal, le moins de pots.
const COUT_POT = { 10: 7.5, 5: 4.5, 2.5: 3, 1: 1.5 };

/** Pots à acheter pour q litres : { pots: [[taille, nombre]…], litres }. */
export function combinaisonPots(q) {
    let best = null;
    const n10max = Math.ceil(q / 10 - 1e-9);
    for (let a = 0; a <= n10max; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 2; c++) for (let d = 0; d <= 3; d++) {
        const L = a * 10 + b * 5 + c * 2.5 + d;
        if (L + 1e-9 < q) continue;
        const nb = a + b + c + d;
        const cout = a * COUT_POT[10] + b * COUT_POT[5] + c * COUT_POT[2.5] + d * COUT_POT[1];
        const mieux = !best || cout < best.cout - 1e-9 || (Math.abs(cout - best.cout) < 1e-9 && (nb < best.nb || (nb === best.nb && L < best.litres)));
        if (mieux) best = { litres: L, nb, cout, comp: [[10, a], [5, b], [2.5, c], [1, d]] };
    }
    return { litres: best.litres, pots: best.comp.filter(x => x[1] > 0) };
}
const textePots = pots => pots.map(([t, n]) => `${n} pot${n > 1 ? 's' : ''} de ${fmtSmart(t, 1)} L`).join(' + ');

/** Quantité à acheter, en unités d'achat (celles du prix). */
export function quantiteAchat(k, q, ctx = {}) {
    const m = MATERIAUX[k];
    if (!m || !(q > 0)) return 0;
    if (m.pots) return combinaisonPots(q).litres;                       // prix au litre
    const t = taillePack(m, ctx);
    if (t) return Math.ceil(q / t - 1e-9);
    if (m.base === 'u' || m.base === 'm2' || m.base === 'jour' || m.base === 'L') return Math.ceil(q - 1e-9);
    if (m.base === 'ml') return Math.ceil(q * 2 - 1e-9) / 2;          // au demi-mètre
    if (m.base === 'm3') return Math.ceil(q * 4 - 1e-9) / 4;          // au quart de m³
    return Math.round(q * 100) / 100;                                  // tonnes
}

/** Nombre affiché à l'achat (pots, paquets, sacs…), pour cocher « acheté » dans la même unité. */
export function nbAchat(k, q, ctx = {}, pk = 0) {
    const m = MATERIAUX[k];
    if (!m || !(q > 0)) return 0;
    if (pk > 0) return Math.ceil(q / pk - 1e-6);
    if (m.pots) return combinaisonPots(q).pots.reduce((s, [, n]) => s + n, 0);
    return quantiteAchat(k, q, ctx);
}

/**
 * Affichage d'une quantité : { v, u, d }
 *  v = valeur principale (« 12 »), u = unité (« sacs »), d = précision (« de 35 kg · 420 kg »).
 */
export function affichage(k, q, ctx = {}, pk = 0) {
    const m = MATERIAUX[k];
    if (!m) return { v: fmtSmart(q, 2), u: '', d: '' };
    if (pk > 0 && q > 0) {                                              // conditionnement saisi (ex. paquet de parquet)
        const nb = Math.ceil(q / pk - 1e-6);
        return { v: fmt(nb), u: nb > 1 ? 'paquets' : 'paquet', d: `${fmtSmart(nb * pk, 2)} m²` };
    }
    if (m.pots && q > 0) {
        const c = combinaisonPots(q);
        const nb = c.pots.reduce((s, [, n]) => s + n, 0);
        return { v: fmt(nb), u: nb > 1 ? 'pots' : 'pot', d: `${textePots(c.pots)} · besoin ${fmtSmart(q, 1)} L` };
    }
    const t = taillePack(m, ctx);
    if (t) {
        const n = quantiteAchat(k, q, ctx);
        const lab = m.pack.label || `de ${t} kg`;
        const brut = m.base === 'kg' ? ` · ${fmtSmart(q, q < 10 ? 1 : 0)} kg` : m.base === 'm2' ? ` · ${fmt(q)} m²` : m.base === 'ml' ? ` · ${fmt(q)} m` : m.base === 'L' ? ` · ${fmt(q)} L` : '';
        return { v: fmt(n), u: n > 1 ? m.pack.noms : m.pack.nom, d: `${lab}${brut}` };
    }
    switch (m.base) {
        case 'T': {
            const d = [];
            if (m.dens && q / m.dens >= 0.1) d.push(`≈ ${fmtSmart(q / m.dens, 1)} m³`);
            if (q < 0.5 && k !== 'moellon') { const s = Math.ceil(q * 1000 / 35); d.push(`ou ${s} sac${s > 1 ? 's' : ''} de 35 kg`); }
            else if (q <= 3.5 && m.cat === 'granulats') { const bb = Math.ceil(q - 0.05); d.push(`ou ${bb} big bag${bb > 1 ? 's' : ''} d'1 T`); }
            return { v: fmt(Math.max(q, 0.01), 2), u: 'T', d: d.join(' · ') };
        }
        case 'm3': {
            const n = quantiteAchat(k, q, ctx);
            return { v: fmtSmart(n, 2), u: 'm³', d: k === 'bpe' ? `calcul : ${fmt(q, 2)} m³` : '' };
        }
        case 'ml': return { v: fmtSmart(Math.ceil(q * 10 - 1e-9) / 10, 1), u: 'm', d: '' };
        case 'jour': {
            const n = quantiteAchat(k, q, ctx);
            return { v: fmt(n), u: n > 1 ? 'jours' : 'jour', d: '' };
        }
        default: {
            const n = quantiteAchat(k, q, ctx);
            return { v: fmt(n), u: UNITES[m.base] || '', d: '' };
        }
    }
}

/** Texte court « 12 sacs (de 35 kg) » pour le partage. */
export function texteQuantite(k, q, ctx = {}, pk = 0) {
    const a = affichage(k, q, ctx, pk);
    return `${a.v} ${a.u}`.trim() + (a.d ? ` (${a.d})` : '');
}

/** Libellé de l'unité d'achat pour l'écran des prix. */
export function unitePrix(k, ctx = {}) {
    const m = MATERIAUX[k];
    if (!m) return '';
    const t = taillePack(m, ctx);
    if (t) return `${m.pack.nom} ${m.pack.label || `de ${t} kg`}`;
    return { u: 'unité', m2: 'm²', ml: 'mètre', m3: 'm³', L: 'litre', T: 'tonne', kg: 'kg', jour: 'jour' }[m.base] || m.base;
}
