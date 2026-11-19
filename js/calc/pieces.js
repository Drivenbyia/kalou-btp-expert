// Pièces d'un chantier de rénovation : on mesure chaque pièce une fois (dans le chantier),
// puis on lance chape, carrelage, placo, peinture, isolation… avec ses mesures déjà remplies.
// L'électricité et la VMC se construisent à partir de toutes les pièces du chantier.

import { n, c, oui, texte, titre } from './ouvrages/commun.js';
import { PIECES as PIECES_ELEC } from './ouvrages/elec.js';
import { fmtSmart } from '../core/format.js';

export const TYPES_PIECE = {
    chambre: 'Chambre', sejour: 'Séjour / salon', cuisine: 'Cuisine', sdb: 'Salle de bain', wc: 'WC',
    entree: 'Entrée / palier', bureau: 'Bureau', garage: 'Garage / cellier', autre: 'Autre'
};
const est = (...t) => v => t.includes(v.type);
const parSurf = v => v.saisie === 'surf';
const oui_ = (v, k) => v[k] === true || v[k] === 'true';
// Prises, lampes, interrupteurs proposés selon le type (mêmes repères que le calculateur Électricité)
const DEF_ELEC = Object.fromEntries(Object.keys(TYPES_PIECE).map(t => [t, (PIECES_ELEC[t] || PIECES_ELEC.autre).def]));

export const CHAMPS_PIECE = [
    c('type', 'Type de pièce', Object.entries(TYPES_PIECE).map(([v, l]) => ({ v, l })), 'chambre'),
    texte('nom', 'Nom', '', { ph: 'Chambre 1, chambre des enfants…', aide: 'Vide = le type de pièce.' }),
    c('niveau', 'Niveau', [{ v: 'rdc', l: 'Rez-de-chaussée' }, { v: 'etage', l: 'Étage' }, { v: 'autre', l: 'Autre' }], 'rdc'),
    c('saisie', 'Je connais', [{ v: 'dim', l: 'Dimensions' }, { v: 'surf', l: 'Surface en m²' }], 'dim', { aide: 'Pièce en L ou biscornue : prends la surface.' }),
    n('L', 'Longueur', 'm', 4, { demi: true, si: v => !parSurf(v), aide: 'Intérieur, d\'un mur à l\'autre.' }),
    n('l', 'Largeur', 'm', 3.5, { demi: true, si: v => !parSurf(v) }),
    n('S', 'Surface au sol', 'm²', 14, { demi: true, si: parSurf, max: 500 }),
    n('P', 'Tour de la pièce', 'm', 0, { demi: true, zero: true, si: parSurf, max: 300, aide: '0 = estimé. Mesure-le pour plinthes, peinture et doublage justes.' }),
    n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 6 }),
    n('portes', 'Portes', 'u', 1, { demi: true, zero: true, max: 10 }),
    n('fen', 'Fenêtres', 'u', 1, { demi: true, zero: true, max: 20 }),
    n('fenT', 'Taille d\'une fenêtre', 'm²', 1.5, { si: v => v.fen > 0, max: 10, aide: 'Largeur × hauteur. Fenêtre ≈ 1,5 m², porte-fenêtre ≈ 2,7 m².' }),
    n('murExt', 'Murs donnant dehors', 'm', 0, { zero: true, max: 200, aide: 'Longueur des murs extérieurs de la pièce, à doubler. Le reste du tour = cloisons (comptées une fois pour toute la maison).' }),
    c('sol', 'Sol de la pièce', [{ v: 'niveau', l: 'Comme le niveau' }, { v: 'carrelage', l: 'Carrelage' }, { v: 'parquet', l: 'Parquet' }, { v: 'rien', l: 'On garde' }], 'niveau',
        { aide: '« Comme le niveau » : le choix fait dans « Toute la maison » pour ce niveau.' }),
    titre('Électricité de la pièce'),
    n('prises', 'Prises', 'u', 3, { demi: true, zero: true, max: 40 }),
    n('points', 'Lampes', 'u', 1, { demi: true, zero: true, max: 20, aide: 'Plafonniers et appliques.' }),
    n('inter', 'Interrupteurs', 'u', 1, { demi: true, zero: true, max: 20 }),
    n('dist', 'Distance du tableau', 'm', 8, { demi: true, max: 80, aide: 'Longueur de gaine du tableau à l\'entrée de la pièce.' }),
    n('chauffage', 'Radiateur électrique', 'W', 0, { zero: true, max: 6000, aide: '0 si aucun. Plusieurs radiateurs : additionne (2 × 1 000 = 2 000).' }),
    titre('Plomberie de la pièce', { si: est('sdb', 'wc', 'cuisine', 'garage') }),
    n('lavabos', 'Lavabos / vasques', 'u', 1, { demi: true, zero: true, max: 4, si: est('sdb') }),
    c('bain', 'Douche ou baignoire', [{ v: 'douche', l: 'Douche' }, { v: 'bain', l: 'Baignoire' }, { v: 'deux', l: 'Les deux' }, { v: 'aucun', l: 'Aucune' }], 'douche', { si: est('sdb') }),
    oui('wcIn', 'WC dans la pièce', false, { si: est('sdb') }),
    oui('laveMain', 'Lave-mains', false, { si: est('wc') }),
    oui('evier', 'Évier', true, { si: est('cuisine') }),
    oui('lv', 'Lave-vaisselle', true, { si: est('cuisine') }),
    oui('ll', 'Lave-linge', false, { si: est('cuisine', 'sdb', 'garage') }),
    n('distEau', 'Nourrice → pièce', 'm', 5, { demi: true, max: 60, si: est('sdb', 'wc', 'cuisine', 'garage'), aide: 'Longueur de tuyau de la nourrice aux appareils.' }),
    n('distEvac', 'Pièce → chute', 'm', 2, { demi: true, zero: true, max: 40, si: est('sdb', 'wc', 'cuisine', 'garage'), aide: 'Évacuation jusqu\'à la chute ou au collecteur.' })
];
export const DEF_PIECE = { champs: CHAMPS_PIECE };
export const DEF_ELEC_PIECE = DEF_ELEC;

export const nomPiece = p => (p.nom && String(p.nom).trim()) || TYPES_PIECE[p.type] || 'Pièce';

/** Pièce complète : champs ajoutés depuis la 5.3 remplis par défaut (selon le type pour l'électricité). */
export function normaliser(p) {
    const d = DEF_ELEC[p.type] || DEF_ELEC.autre;
    const base = Object.fromEntries(CHAMPS_PIECE.filter(ch => ch.id).map(ch => [ch.id, ch.def]));
    const out = { ...base, prises: d.prises, points: d.points, inter: d.inter, ...p };
    if (out.saisie !== 'surf') out.saisie = 'dim';
    return out;
}

/** Longueur × largeur (réelles, ou rectangle équivalent quand on n'a que la surface et le tour). */
export function dims(p) {
    if (p.saisie !== 'surf') return { L: p.L, l: p.l };
    const S = p.S;
    const P = p.P > 0 ? p.P : 2 * (Math.sqrt(S * 1.3) + S / Math.sqrt(S * 1.3));     // pièce ≈ 1,3 fois plus longue que large
    const dlt = (P / 2) ** 2 - 4 * S;
    if (dlt < 0) return { L: Math.sqrt(S), l: Math.sqrt(S) };
    const L = (P / 2 + Math.sqrt(dlt)) / 2;
    return { L, l: S / L };
}

/** Métré de la pièce : sol, tour, murs (portes et fenêtres déduites), fenêtres seules. */
export function metre(p) {
    const { L, l } = dims(p);
    const S = p.saisie === 'surf' ? p.S : L * l;
    const P = 2 * (L + l);
    const fenS = p.fen * (p.fen > 0 ? p.fenT : 0);
    const ouv = p.portes * 1.7 + fenS;
    return { L, l, S, P, ouv, fenS, Sm: Math.max(0, P * p.h - ouv) };
}
export const resumePiece = p => {
    const m = metre(p);
    return `${p.saisie === 'surf' ? '' : `${fmtSmart(p.L, 2)} × ${fmtSmart(p.l, 2)} m · `}${fmtSmart(m.S, 1)} m² au sol · ${fmtSmart(m.Sm, 1)} m² de murs`;
};

/** Appareils de plomberie de la pièce (pour le calculateur Plomberie). */
export function appareilsEau(p) {
    const out = [];
    const a = t => out.push({ t, alim: p.distEau, evac: t === 'ext' ? 0 : t === 'wc' ? Math.min(p.distEvac, 3) : p.distEvac, nom: nomPiece(p) });
    if (p.type === 'sdb') {
        for (let i = 0; i < p.lavabos; i++) a('lavabo');
        if (p.bain === 'douche' || p.bain === 'deux') a('douche');
        if (p.bain === 'bain' || p.bain === 'deux') a('bain');
        if (oui_(p, 'wcIn')) a('wc');
    }
    if (p.type === 'wc') { a('wc'); if (oui_(p, 'laveMain')) a('lavemain'); }
    if (p.type === 'cuisine') { if (oui_(p, 'evier')) a('evier'); if (oui_(p, 'lv')) a('lv'); }
    if (['cuisine', 'sdb', 'garage'].includes(p.type) && oui_(p, 'll')) a('ll');
    return out;
}

const r2 = x => Math.round(x * 100) / 100;
const murs = p => (p.murExt > 0 ? p.murExt : metre(p).P);
const dimsR = p => { const d = dims(p); return { L: r2(d.L), l: r2(d.l) }; };

/**
 * Ce qu'on peut calculer pour une pièce : `pre` = variante, `ouv` = calculateur,
 * `val(p)` = valeurs reprises de la pièce (les autres champs restent ceux du calculateur).
 */
export const POUR_PIECE = [
    { pre: 'piece',     ouv: 'piece',      g: 'Tout d\'un coup', l: 'Pièce complète (murs, plafond, sol)',
        val: p => ({ nom: nomPiece(p), ...dimsR(p), h: p.h, portes: p.portes, fen: p.fen, fenT: p.fenT }) },
    { pre: 'dalle',     ouv: 'dalle',      g: 'Sol', l: 'Dalle béton',         val: p => ({ ...dimsR(p) }) },
    { pre: 'solchaux',  ouv: 'solchaux',   g: 'Sol', l: 'Sol chaux-chanvre',   val: p => ({ saisie: 'dim', ...dimsR(p) }) },
    { pre: 'chape',     ouv: 'chape',      g: 'Sol', l: 'Chape',               val: p => ({ ...dimsR(p) }) },
    { pre: 'ragreage',  ouv: 'ragreage',   g: 'Sol', l: 'Ragréage',            val: p => ({ saisie: 'dim', ...dimsR(p) }) },
    { pre: 'carrelage', ouv: 'carrelage',  g: 'Sol', l: 'Carrelage du sol',    val: p => ({ support: 'sol', saisie: 'dim', ...dimsR(p), portes: p.portes }) },
    { pre: 'parquet',   ouv: 'parquet',    g: 'Sol', l: 'Parquet',             val: p => ({ ...dimsR(p), portes: p.portes }) },
    { pre: 'osb',       ouv: 'osb',        g: 'Sol', l: 'Plancher OSB',        val: p => ({ ...dimsR(p) }) },
    { pre: 'piquage',   ouv: 'demolition', g: 'Murs', l: 'Piquer les enduits', val: p => ({ type: 'piquage', L: r2(metre(p).P), h: p.h }) },
    { pre: 'chaux',     ouv: 'chaux',      g: 'Murs', l: 'Enduit chaux',       val: p => ({ saisie: 'dim', L: r2(metre(p).P), h: p.h, ouv: r2(metre(p).ouv) }) },
    { pre: 'isoler',    ouv: 'isoler',     g: 'Murs', l: 'Isoler les murs',    val: p => ({ paroi: 'mur', saisie: 'dim', L: r2(murs(p)), h: p.h, ouv: r2(p.murExt > 0 ? metre(p).fenS : metre(p).ouv) }),
        note: 'Murs donnant dehors de la pièce (tout le tour s\'ils ne sont pas renseignés).' },
    { pre: 'doublage',  ouv: 'placo',      g: 'Murs', l: 'Doublage placo',     val: p => ({ type: 'appuis', a: r2(murs(p)), b: p.h, ouv: r2(p.murExt > 0 ? metre(p).fenS : metre(p).ouv) }),
        note: 'Murs donnant dehors de la pièce (tout le tour s\'ils ne sont pas renseignés).' },
    { pre: 'faience',   ouv: 'carrelage',  g: 'Murs', l: 'Faïence',            val: p => ({ support: 'mur', saisie: 'surf', S: r2(metre(p).Sm) }),
        note: 'Tous les murs, toute hauteur : réduis la surface si la faïence est partielle.' },
    { pre: 'peinture',  ouv: 'peinture',   g: 'Murs', l: 'Peinture (murs et plafond)', val: p => ({ ...dimsR(p), h: p.h, ouv: r2(metre(p).ouv) }) },
    { pre: 'plafond',   ouv: 'placo',      g: 'Plafond', l: 'Plafond placo',   val: p => ({ type: 'plafond', a: dimsR(p).L, b: dimsR(p).l }) },
    { pre: 'lambris',   ouv: 'lambris',    g: 'Plafond', l: 'Lambris au plafond', val: p => ({ saisie: 'dim', ...dimsR(p), ouv: 0 }) },
    { pre: 'combles',   ouv: 'isolation',  g: 'Plafond', l: 'Isoler les combles au-dessus', val: p => ({ type: 'souffle', ...dimsR(p) }) },
    { pre: 'portes',    ouv: 'portes',     g: 'Autre', l: 'Portes intérieures', val: p => ({ nb: Math.max(1, p.portes) }) }
];
// Travaux qui comptent les mêmes matériaux : quand l'un est calculé dans la pièce, l'autre est grisé
const DOUBLONS = [
    ['isoler', 'doublage'],                                                           // les deux comptent laine + placo
    ['piece', 'peinture'], ['piece', 'parquet'], ['piece', 'carrelage'], ['piece', 'ragreage'],
    ['piece', 'doublage'], ['piece', 'isoler'], ['piece', 'plafond']                  // « Pièce complète » les compte déjà
];
/** Variante déjà calculée dans la pièce qui compte les mêmes matériaux que `pre` (ou null). */
export function dejaCompte(pre, faits) {
    const autre = DOUBLONS.flatMap(([a, b]) => (a === pre ? [b] : b === pre ? [a] : [])).find(x => faits.includes(x));
    return autre ? POUR_PIECE_PAR_PRE[autre] : null;
}
export const POUR_PIECE_PAR_PRE = Object.fromEntries(POUR_PIECE.map(x => [x.pre, x]));

/** Valeurs du calculateur reprises de la pièce (null si la variante est inconnue). */
export function valeursPiece(pre, p) {
    const x = POUR_PIECE_PAR_PRE[pre];
    return x ? x.val(normaliser(p)) : null;
}

// Électricité : type de pièce du chantier → type de pièce du calculateur
const VERS_ELEC = { chambre: 'chambre', sejour: 'sejour', cuisine: 'cuisine', sdb: 'sdb', wc: 'wc', entree: 'entree', bureau: 'bureau', garage: 'garage', autre: 'autre' };

/** Lignes du calculateur Électricité à partir des pièces (prises, lampes… proposées selon le type). */
export function piecesVersElec(pieces, typesElec) {
    return pieces.map(p => {
        const t = VERS_ELEC[p.type] || 'autre';
        const q = normaliser(p);
        return { t, nom: nomPiece(q), prises: q.prises, points: q.points, inter: q.inter, dist: q.dist };
    });
}

/** Saisie VMC à partir des pièces : pièces humides et pièces sèches. */
export function piecesVersVmc(pieces) {
    const nb = t => pieces.filter(p => p.type === t).length;
    return { sdb: nb('sdb'), wc: nb('wc'), cuisine: nb('cuisine') > 0, seches: nb('chambre') + nb('sejour') + nb('bureau') };
}
