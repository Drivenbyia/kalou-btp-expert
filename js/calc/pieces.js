// Pièces d'un chantier de rénovation : on mesure chaque pièce une fois (dans le chantier),
// puis on lance chape, carrelage, placo, peinture, isolation… avec ses mesures déjà remplies.
// L'électricité et la VMC se construisent à partir de toutes les pièces du chantier.

import { n, c, texte } from './ouvrages/commun.js';
import { fmtSmart } from '../core/format.js';

export const TYPES_PIECE = {
    chambre: 'Chambre', sejour: 'Séjour / salon', cuisine: 'Cuisine', sdb: 'Salle de bain', wc: 'WC',
    entree: 'Entrée / couloir', bureau: 'Bureau', garage: 'Garage / cellier', autre: 'Autre'
};

export const CHAMPS_PIECE = [
    c('type', 'Type de pièce', Object.entries(TYPES_PIECE).map(([v, l]) => ({ v, l })), 'chambre'),
    texte('nom', 'Nom', '', { ph: 'Chambre 1, chambre des enfants…', aide: 'Vide = le type de pièce.' }),
    n('L', 'Longueur', 'm', 4, { demi: true, aide: 'Intérieur, d\'un mur à l\'autre.' }),
    n('l', 'Largeur', 'm', 3.5, { demi: true }),
    n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 6 }),
    n('portes', 'Portes', 'u', 1, { demi: true, zero: true, max: 10 }),
    n('fen', 'Fenêtres', 'u', 1, { demi: true, zero: true, max: 20 }),
    n('fenT', 'Taille d\'une fenêtre', 'm²', 1.5, { si: v => v.fen > 0, max: 10, aide: 'Largeur × hauteur. Fenêtre ≈ 1,5 m², porte-fenêtre ≈ 2,7 m².' })
];
export const DEF_PIECE = { champs: CHAMPS_PIECE };

export const nomPiece = p => (p.nom && String(p.nom).trim()) || TYPES_PIECE[p.type] || 'Pièce';

/** Métré de la pièce : sol, tour, murs (portes et fenêtres déduites). */
export function metre(p) {
    const S = p.L * p.l, P = 2 * (p.L + p.l);
    const ouv = p.portes * 1.7 + p.fen * (p.fen > 0 ? p.fenT : 0);
    return { S, P, ouv, Sm: Math.max(0, P * p.h - ouv) };
}
export const resumePiece = p => {
    const m = metre(p);
    return `${fmtSmart(p.L, 2)} × ${fmtSmart(p.l, 2)} m · ${fmtSmart(m.S, 1)} m² au sol · ${fmtSmart(m.Sm, 1)} m² de murs`;
};

const r2 = x => Math.round(x * 100) / 100;

/**
 * Ce qu'on peut calculer pour une pièce : `pre` = variante, `ouv` = calculateur,
 * `val(p)` = valeurs reprises de la pièce (les autres champs restent ceux du calculateur).
 */
export const POUR_PIECE = [
    { pre: 'piece',     ouv: 'piece',      g: 'Tout d\'un coup', l: 'Pièce complète (murs, plafond, sol)',
        val: p => ({ nom: nomPiece(p), L: p.L, l: p.l, h: p.h, portes: p.portes, fen: p.fen, fenT: p.fenT }) },
    { pre: 'dalle',     ouv: 'dalle',      g: 'Sol', l: 'Dalle béton',         val: p => ({ L: p.L, l: p.l }) },
    { pre: 'solchaux',  ouv: 'solchaux',   g: 'Sol', l: 'Sol chaux-chanvre',   val: p => ({ saisie: 'dim', L: p.L, l: p.l }) },
    { pre: 'chape',     ouv: 'chape',      g: 'Sol', l: 'Chape',               val: p => ({ L: p.L, l: p.l }) },
    { pre: 'ragreage',  ouv: 'ragreage',   g: 'Sol', l: 'Ragréage',            val: p => ({ saisie: 'dim', L: p.L, l: p.l }) },
    { pre: 'carrelage', ouv: 'carrelage',  g: 'Sol', l: 'Carrelage du sol',    val: p => ({ support: 'sol', saisie: 'dim', L: p.L, l: p.l, portes: p.portes }) },
    { pre: 'parquet',   ouv: 'parquet',    g: 'Sol', l: 'Parquet',             val: p => ({ L: p.L, l: p.l, portes: p.portes }) },
    { pre: 'osb',       ouv: 'osb',        g: 'Sol', l: 'Plancher OSB',        val: p => ({ L: p.L, l: p.l }) },
    { pre: 'piquage',   ouv: 'demolition', g: 'Murs', l: 'Piquer les enduits', val: p => ({ type: 'piquage', L: r2(metre(p).P), h: p.h }) },
    { pre: 'chaux',     ouv: 'chaux',      g: 'Murs', l: 'Enduit chaux',       val: p => ({ saisie: 'dim', L: r2(metre(p).P), h: p.h, ouv: r2(metre(p).ouv) }) },
    { pre: 'isoler',    ouv: 'isoler',     g: 'Murs', l: 'Isoler les murs',    val: p => ({ paroi: 'mur', saisie: 'dim', L: r2(metre(p).P), h: p.h, ouv: r2(metre(p).ouv) }),
        note: 'Toute la pièce est comptée : ne garde que la longueur des murs donnant dehors.' },
    { pre: 'doublage',  ouv: 'placo',      g: 'Murs', l: 'Doublage placo',     val: p => ({ type: 'appuis', a: r2(metre(p).P), b: p.h, ouv: r2(metre(p).ouv) }),
        note: 'Toute la pièce est comptée : ne garde que la longueur des murs à doubler.' },
    { pre: 'faience',   ouv: 'carrelage',  g: 'Murs', l: 'Faïence',            val: p => ({ support: 'mur', saisie: 'surf', S: r2(metre(p).Sm) }),
        note: 'Tous les murs, toute hauteur : réduis la surface si la faïence est partielle.' },
    { pre: 'peinture',  ouv: 'peinture',   g: 'Murs', l: 'Peinture (murs et plafond)', val: p => ({ L: p.L, l: p.l, h: p.h, ouv: r2(metre(p).ouv) }) },
    { pre: 'plafond',   ouv: 'placo',      g: 'Plafond', l: 'Plafond placo',   val: p => ({ type: 'plafond', a: p.L, b: p.l }) },
    { pre: 'lambris',   ouv: 'lambris',    g: 'Plafond', l: 'Lambris au plafond', val: p => ({ saisie: 'dim', L: p.L, l: p.l, ouv: 0 }) },
    { pre: 'combles',   ouv: 'isolation',  g: 'Plafond', l: 'Isoler les combles au-dessus', val: p => ({ type: 'souffle', L: p.L, l: p.l }) },
    { pre: 'portes',    ouv: 'portes',     g: 'Autre', l: 'Portes intérieures', val: p => ({ nb: Math.max(1, p.portes) }) }
];
export const POUR_PIECE_PAR_PRE = Object.fromEntries(POUR_PIECE.map(x => [x.pre, x]));

/** Valeurs du calculateur reprises de la pièce (null si la variante est inconnue). */
export function valeursPiece(pre, p) {
    const x = POUR_PIECE_PAR_PRE[pre];
    return x ? x.val(p) : null;
}

// Électricité : type de pièce du chantier → type de pièce du calculateur
const VERS_ELEC = { chambre: 'chambre', sejour: 'sejour', cuisine: 'cuisine', sdb: 'sdb', wc: 'wc', entree: 'entree', bureau: 'bureau', garage: 'garage', autre: 'autre' };

/** Lignes du calculateur Électricité à partir des pièces (prises, lampes… proposées selon le type). */
export function piecesVersElec(pieces, typesElec) {
    return pieces.map(p => {
        const t = VERS_ELEC[p.type] || 'autre';
        const d = (typesElec[t] && typesElec[t].def) || {};
        return { t, nom: nomPiece(p), prises: d.prises ?? 3, points: d.points ?? 1, inter: d.inter ?? 1, dist: d.dist ?? 8 };
    });
}

/** Saisie VMC à partir des pièces : pièces humides et pièces sèches. */
export function piecesVersVmc(pieces) {
    const nb = t => pieces.filter(p => p.type === t).length;
    return { sdb: nb('sdb'), wc: nb('wc'), cuisine: nb('cuisine') > 0, seches: nb('chambre') + nb('sejour') + nb('bureau') };
}
