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
    gravier:    { l: 'Gravier 5/20 (béton)',            cat: 'granulats', base: 'T', dens: 1.45, prix: 48 },
    herisson:   { l: 'Cailloux 20/40 ou tout-venant (hérisson)', cat: 'granulats', base: 'T', dens: 1.6, prix: 32 },
    bpe:        { l: 'Béton prêt à l\'emploi (toupie)', cat: 'granulats', base: 'm3', prix: 170 },

    // ── Liants & mortiers ────────────────────────────────────────────────
    ciment:     { l: 'Ciment CEM II',                   cat: 'liants', base: 'kg', pack: { ciment: true, nom: 'sac', noms: 'sacs' }, prix: 9.5 },
    chaux:      { l: 'Chaux hydraulique NHL 3,5',       cat: 'liants', base: 'kg', pack: { taille: 35, nom: 'sac', noms: 'sacs' }, prix: 17 },
    enduit_mono:{ l: 'Enduit monocouche',               cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 13 },
    colle_bloc: { l: 'Mortier-colle joint mince (briques)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 13 },
    enduit_etanche: { l: 'Enduit d\'étanchéité (piscine)', cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 28 },
    colle_carrelage: { l: 'Colle carrelage',            cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 18 },
    joint_carrelage: { l: 'Joint carrelage',            cat: 'liants', base: 'kg', pack: { taille: 5,  nom: 'sac', noms: 'sacs' }, prix: 12 },
    ragreage:   { l: 'Ragréage autolissant',            cat: 'liants', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 22 },

    // ── Blocs, briques, pierre ───────────────────────────────────────────
    parpaing20: { l: 'Parpaing creux 20×20×50',         cat: 'blocs', base: 'u', prix: 1.9 },
    angle20:    { l: 'Parpaing d\'angle 20',            cat: 'blocs', base: 'u', prix: 2.4 },
    parpaing15: { l: 'Parpaing creux 15×20×50',         cat: 'blocs', base: 'u', prix: 1.6 },
    angle15:    { l: 'Parpaing d\'angle 15',            cat: 'blocs', base: 'u', prix: 2.0 },
    parpaing10: { l: 'Parpaing 10×20×50 (cloison)',     cat: 'blocs', base: 'u', prix: 1.25 },
    bancher20:  { l: 'Bloc à bancher 20×20×50',         cat: 'blocs', base: 'u', prix: 2.8 },
    brique20:   { l: 'Brique terre cuite R20 (50×20×31,4)', cat: 'blocs', base: 'u', prix: 2.9 },
    monomur30:  { l: 'Brique monomur 30 (25×30×24,9)',  cat: 'blocs', base: 'u', prix: 5.9 },
    bloc_u:     { l: 'Bloc U / bloc chaînage 20',        cat: 'blocs', base: 'u', prix: 3.2 },
    planelle:   { l: 'Planelle (rive de plancher)',      cat: 'blocs', base: 'u', prix: 1.7 },
    moellon:    { l: 'Pierre / moellons du pays',        cat: 'blocs', base: 'T', prix: 180 },
    chaperon:   { l: 'Chaperon de mur (50 cm)',          cat: 'blocs', base: 'u', prix: 6.5 },

    // ── Acier, linteaux, plancher ────────────────────────────────────────
    arm_semelle:{ l: 'Armature semelle filante (6 m)',   cat: 'acier', base: 'u', prix: 22 },
    arm_chainage:{ l: 'Armature chaînage / poteau (6 m)', cat: 'acier', base: 'u', prix: 13 },
    fer10:      { l: 'Fer HA Ø10 (barre de 6 m)',        cat: 'acier', base: 'u', prix: 11 },
    treillis36: { l: 'Treillis soudé 2,40×3,60 m',       cat: 'acier', base: 'u', prix: 22 },
    treillis6:  { l: 'Treillis soudé 2,40×6,00 m',       cat: 'acier', base: 'u', prix: 38 },
    cales:      { l: 'Cales à béton (distanciers)',      cat: 'acier', base: 'u', prix: 0.25 },
    linteau:    { l: 'Linteau béton préfabriqué',        cat: 'acier', base: 'ml', prix: 28 },
    ipn:        { l: 'Poutre acier IPN / HEA',           cat: 'acier', base: 'ml', prix: 70 },
    poutrelle:  { l: 'Poutrelle béton précontraint',     cat: 'acier', base: 'ml', prix: 7 },
    entrevous:  { l: 'Entrevous (hourdis) béton',        cat: 'acier', base: 'u', prix: 1.7 },
    appui:      { l: 'Appui de fenêtre béton préfa',     cat: 'acier', base: 'u', prix: 38 },

    // ── Bois / charpente ─────────────────────────────────────────────────
    fermette:   { l: 'Fermette industrielle (sur mesure)', cat: 'bois', base: 'u', prix: 120 },
    chevron:    { l: 'Chevron (63×75 à 75×100)',          cat: 'bois', base: 'ml', prix: 5.5 },
    panne:      { l: 'Panne (≈ 100×220)',                 cat: 'bois', base: 'ml', prix: 20 },
    ferme:      { l: 'Ferme traditionnelle (charpentier)', cat: 'bois', base: 'u', prix: 550 },
    fixation_ch:{ l: 'Équerres / connecteurs de charpente', cat: 'bois', base: 'u', prix: 1.5 },
    liteau:     { l: 'Liteau 27×40',                      cat: 'bois', base: 'ml', prix: 0.9 },
    contreliteau:{ l: 'Contre-liteau 27×40',              cat: 'bois', base: 'ml', prix: 0.9 },
    planche:    { l: 'Planche de coffrage',               cat: 'bois', base: 'ml', prix: 3 },

    // ── Couverture & zinguerie ───────────────────────────────────────────
    ecran:      { l: 'Écran sous-toiture HPV',            cat: 'couverture', base: 'm2', pack: { taille: 75, nom: 'rouleau', noms: 'rouleaux', label: 'de 75 m²' }, prix: 120 },
    tuile_meca: { l: 'Tuile à emboîtement (romane / grand moule)', cat: 'couverture', base: 'u', prix: 1.4 },
    tuile_canal:{ l: 'Tuile canal (courant + couvert)',   cat: 'couverture', base: 'u', prix: 0.95 },
    tuile_plate:{ l: 'Tuile plate 17×27',                 cat: 'couverture', base: 'u', prix: 0.9 },
    ardoise:    { l: 'Ardoise naturelle 32×22',           cat: 'couverture', base: 'u', prix: 1.3 },
    plaque_st:  { l: 'Plaque support sous-tuile',         cat: 'couverture', base: 'm2', prix: 10 },
    faitiere:   { l: 'Tuile faîtière / arêtier',          cat: 'couverture', base: 'u', prix: 4.5 },
    tuile_rive: { l: 'Tuile de rive',                     cat: 'couverture', base: 'u', prix: 5 },
    closoir:    { l: 'Closoir ventilé de faîtage',        cat: 'couverture', base: 'ml', prix: 9 },
    gouttiere:  { l: 'Gouttière (zinc ou PVC)',           cat: 'couverture', base: 'ml', prix: 15 },
    descente:   { l: 'Descente EP + coude + dauphin',     cat: 'couverture', base: 'u', prix: 45 },
    crochet:    { l: 'Crochets de gouttière',             cat: 'couverture', base: 'u', prix: 2.5 },

    // ── Plâtrerie & isolation ────────────────────────────────────────────
    ba13:       { l: 'Plaque de plâtre BA13 (1,20×2,50 m)', cat: 'platrerie', base: 'u', prix: 9.5 },
    rail:       { l: 'Rail R48 (3 m)',                    cat: 'platrerie', base: 'u', prix: 4.5 },
    montant:    { l: 'Montant M48',                       cat: 'platrerie', base: 'u', prix: 5 },
    fourrure:   { l: 'Fourrure F530 (3 m)',               cat: 'platrerie', base: 'u', prix: 3.8 },
    suspente:   { l: 'Suspente / appui intermédiaire',    cat: 'platrerie', base: 'u', prix: 0.7 },
    corniere:   { l: 'Cornière / lisse de rive (3 m)',    cat: 'platrerie', base: 'u', prix: 2.8 },
    vis_placo:  { l: 'Vis plaque TTPC 25',                cat: 'platrerie', base: 'u', pack: { taille: 1000, nom: 'boîte', noms: 'boîtes', label: 'de 1000' }, prix: 18 },
    bande:      { l: 'Bande à joint papier',              cat: 'platrerie', base: 'ml', pack: { taille: 150, nom: 'rouleau', noms: 'rouleaux', label: 'de 150 m' }, prix: 9 },
    enduit_joint:{ l: 'Enduit à joint',                   cat: 'platrerie', base: 'kg', pack: { taille: 25, nom: 'sac', noms: 'sacs' }, prix: 28 },
    laine_mur:  { l: 'Isolant laine minérale murs (100 mm)', cat: 'platrerie', base: 'm2', prix: 9 },
    laine_cloison:{ l: 'Laine acoustique cloison (45 mm)', cat: 'platrerie', base: 'm2', prix: 4 },
    laine_combles:{ l: 'Isolant combles (laine 300 mm)',  cat: 'platrerie', base: 'm2', prix: 13 },
    isolant_sol:{ l: 'Isolant sous dalle (polystyrène)',  cat: 'platrerie', base: 'm2', prix: 14 },

    // ── Revêtements ──────────────────────────────────────────────────────
    carrelage:  { l: 'Carrelage',                         cat: 'revetement', base: 'm2', prix: 30 },
    plinthe:    { l: 'Plinthes',                          cat: 'revetement', base: 'ml', prix: 4 },
    parquet:    { l: 'Parquet / lames',                   cat: 'revetement', base: 'm2', prix: 28 },
    sous_couche:{ l: 'Sous-couche parquet',               cat: 'revetement', base: 'm2', prix: 3.5 },
    peinture:   { l: 'Peinture (2 couches)',              cat: 'revetement', base: 'L', pack: { taille: 10, nom: 'pot', noms: 'pots', label: 'de 10 L' }, prix: 75 },
    impression: { l: 'Sous-couche d\'impression',         cat: 'revetement', base: 'L', pack: { taille: 10, nom: 'pot', noms: 'pots', label: 'de 10 L' }, prix: 50 },

    // ── Divers ───────────────────────────────────────────────────────────
    polyane:    { l: 'Film polyane 150 µm',               cat: 'divers', base: 'm2', prix: 0.8 },
    geotextile: { l: 'Géotextile',                        cat: 'divers', base: 'm2', prix: 1.2 },
    desactivant:{ l: 'Désactivant de surface',            cat: 'divers', base: 'L', prix: 9 },
    bande_peri: { l: 'Bande de désolidarisation (périphérique)', cat: 'divers', base: 'ml', prix: 0.6 },
    baguette:   { l: 'Baguette d\'angle pour enduit (3 m)', cat: 'divers', base: 'u', prix: 4 },
    grille_vs:  { l: 'Grille d\'aération vide sanitaire', cat: 'divers', base: 'u', prix: 4 },
    plot:       { l: 'Plot réglable terrasse',            cat: 'divers', base: 'u', prix: 3 },
    dalle_ter:  { l: 'Dalles de terrasse',                cat: 'divers', base: 'm2', prix: 40 },
    etai:       { l: 'Étais (location)',                  cat: 'divers', base: 'u', prix: 4 },
    mini_pelle: { l: 'Location mini-pelle',               cat: 'divers', base: 'jour', prix: 220 },
    benne:      { l: 'Benne / camion 8 m³ (évacuation)',  cat: 'divers', base: 'u', prix: 280 }
};

export const PRIX_DEFAUT = Object.fromEntries(Object.entries(MATERIAUX).map(([k, m]) => [k, m.prix]));

const UNITES = { u: '', m2: 'm²', ml: 'm', m3: 'm³', L: 'L', T: 'T', kg: 'kg', jour: 'jour' };

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

/** Quantité à acheter, en unités d'achat (celles du prix). */
export function quantiteAchat(k, q, ctx = {}) {
    const m = MATERIAUX[k];
    if (!m || !(q > 0)) return 0;
    const t = taillePack(m, ctx);
    if (t) return Math.ceil(q / t - 1e-9);
    if (m.base === 'u' || m.base === 'm2' || m.base === 'jour' || m.base === 'L') return Math.ceil(q - 1e-9);
    if (m.base === 'ml') return Math.ceil(q * 2 - 1e-9) / 2;          // au demi-mètre
    if (m.base === 'm3') return Math.ceil(q * 4 - 1e-9) / 4;          // au quart de m³
    return Math.round(q * 100) / 100;                                  // tonnes
}

/**
 * Affichage d'une quantité : { v, u, d }
 *  v = valeur principale (« 12 »), u = unité (« sacs »), d = précision (« de 35 kg · 420 kg »).
 */
export function affichage(k, q, ctx = {}) {
    const m = MATERIAUX[k];
    if (!m) return { v: fmtSmart(q, 2), u: '', d: '' };
    const t = taillePack(m, ctx);
    if (t) {
        const n = quantiteAchat(k, q, ctx);
        const lab = m.pack.label || `de ${t} kg`;
        const brut = m.base === 'kg' ? ` · ${fmt(q)} kg` : m.base === 'm2' ? ` · ${fmt(q)} m²` : m.base === 'ml' ? ` · ${fmt(q)} m` : m.base === 'L' ? ` · ${fmt(q)} L` : '';
        return { v: fmt(n), u: n > 1 ? m.pack.noms : m.pack.nom, d: `${lab}${brut}` };
    }
    switch (m.base) {
        case 'T': {
            const d = [];
            if (m.dens && q / m.dens >= 0.1) d.push(`≈ ${fmtSmart(q / m.dens, 1)} m³`);
            if (q < 0.5 && k !== 'moellon') { const s = Math.ceil(q * 1000 / 35); d.push(`ou ${s} sac${s > 1 ? 's' : ''} de 35 kg`); }
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
export function texteQuantite(k, q, ctx = {}) {
    const a = affichage(k, q, ctx);
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
