// === CHIFFRAGE INTERNE DES OUVRAGES ===
// Relie un ouvrage configurable (dimensions + options) aux calculateurs de métré
// déjà en place (computeGros) pour estimer, en interne (caché du devis client),
// les matériaux nécessaires selon la surface. Sert aussi au calcul du prix.

import { computeGros } from '../calculators/gros_oeuvre.js';

// Mapping ouvrage -> calculateur de métré + valeurs d'entrée dérivées des dimensions.
const MAPPING = {
    terrasse_beton: { type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }) },
    terrasse_desac: { type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }) },
    dallage:        { type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }) },
    mur_parpaing:   { type: 'mur',      vals: d => ({ l: d.L, h: d.h, o: 0, c: 2 }) },
    mur_pierre:     { type: 'pierre',   vals: d => ({ l: d.L, h: d.h, ep: 30, o: 0 }) },
    rejoint:        { type: 'chaux',    vals: d => ({ l: d.L, h: d.h, o: 0, e: 2, t: 'joint' }) },
    enduit_chaux:   { type: 'chaux',    vals: d => ({ l: d.L, h: d.h, o: 0, e: 2, t: 'enduit' }) },
    ouverture:      { type: 'ouverture', vals: d => ({ larg: d.larg, haut: d.haut, ep: 20 }) },
    piscine_go:     { type: 'piscine',  vals: d => ({ l: d.L, w: d.l, p: d.p, ep: 20 }) }
    // terrasse_plots, evacuation, terrassement : pas de métré matériaux dédié.
};

function makeGetters(vals) {
    const get = (id) => {
        const v = vals[id];
        return (v === undefined || v === null || isNaN(v)) ? 0 : v;
    };
    const getRaw = (id) => vals[id];
    return { get, getRaw };
}

/**
 * Estime la liste des matériaux d'un ouvrage selon ses dimensions.
 * @returns {Array<{l,v,u}>|null} résultats du calculateur, ou null si non mappé.
 */
export function estimerMateriaux(ouvrageId, dims) {
    const m = MAPPING[ouvrageId];
    if (!m) return null;
    const { get, getRaw } = makeGetters(m.vals(dims));
    try {
        return computeGros(m.type, get, getRaw);
    } catch {
        return null;
    }
}

// Lignes de quantité intermédiaire (ni matériau achetable, ni à chiffrer).
const INTERMEDIAIRE = /^(volume|surface|terre|mortier|gravats|volume de mur)/i;

/**
 * Coût matériaux approximatif à partir des résultats de métré et du catalogue.
 * Associe chaque ligne à un matériau du catalogue par mot-clé ; ignore les
 * quantités intermédiaires. Sert de repère interne (le prix de vente reste piloté
 * par le tarif fourni-posé + options).
 */
export function coutMateriaux(resultats, catalogue) {
    if (!resultats) return 0;
    let total = 0;
    resultats.forEach(r => {
        if (INTERMEDIAIRE.test(r.l.trim())) return;
        const mot = r.l.toLowerCase().split(' ')[0];
        const mat = catalogue.find(c => c.label.toLowerCase().split(' ')[0] === mot);
        if (!mat) return;
        const q = parseFloat(String(r.v).replace(',', '.')) || 0;
        total += q * mat.prix;
    });
    return Math.round(total * 100) / 100;
}

/** Résumé compact des matériaux pour affichage interne (n'apparaît pas sur le devis). */
export function resumeMateriaux(resultats) {
    if (!resultats) return '';
    return resultats
        .filter(r => !INTERMEDIAIRE.test(r.l.trim()))
        .map(r => `${r.l} : ${r.v} ${String(r.u).split(' ~')[0]}`)
        .join(' · ');
}
