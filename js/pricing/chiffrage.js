// === CHIFFRAGE INTERNE DES OUVRAGES ===
// Relie un ouvrage configurable (dimensions + options) aux calculateurs de métré
// déjà en place (computeGros) pour estimer, en interne (caché du devis client),
// les matériaux nécessaires selon la surface. Sert aussi au calcul du prix.
//
// Chaque entrée peut définir :
//  - vals(dims)              → entrées du calculateur de métré de base (computeGros)
//  - extra(dims, opts, base) → lignes supplémentaires selon les prestations cochées
//                              (ex: enduit si "enduit ext/int" est coché) — le calculateur
//                              de base ne les connaît pas car il sert aussi à l'écran Gros
//                              Œuvre où ces choix n'existent pas.
//  - custom(dims, opts)      → remplace entièrement computeGros (ouvrage sans calculateur
//                              de métré dédié, ex: terrasse sur plots).

import { computeGros } from '../calculators/gros_oeuvre.js';

function enduitPretAlEmploi(surf, epCm = 1.5) {
    return Math.ceil(surf * epCm * 18 / 25);   // ~18 kg/m²/cm, sacs 25 kg
}

const MAPPING = {
    terrasse_beton: {
        type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }),
        extra: (d, o) => o.desactive ? [{ l: 'Désactivant de surface', v: Math.ceil(d.L * d.l * 0.15), u: 'L' }] : []
    },
    terrasse_desac: {
        type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }),
        extra: (d, o) => o.desactive ? [{ l: 'Désactivant de surface', v: Math.ceil(d.L * d.l * 0.15), u: 'L' }] : []
    },
    terrasse_plots: {
        // Pas de calculateur écran dédié : estimation directe (plots + géotextile).
        custom: (d, o) => {
            const surf = d.L * d.l;
            const out = [];
            if (o.plots)      out.push({ l: 'Plots réglables terrasse', v: Math.ceil(surf * 3.5), u: 'u' });
            if (o.geotextile) out.push({ l: 'Géotextile', v: Math.ceil(surf * 1.05), u: 'm²' });
            return out;
        }
    },
    dallage: {
        type: 'terrasse', vals: d => ({ l: d.L, w: d.l, e: 12, he: 15, d: 350 }),
        extra: (d, o) => o.bordures ? [{ l: 'Bordures béton', v: (2 * (d.L + d.l)).toFixed(1), u: 'ml' }] : []
    },
    mur_parpaing: {
        type: 'mur', vals: d => ({ l: d.L, h: d.h, o: 0, c: 2 }),
        extra: (d, o) => {
            const out = [];
            const faces = (o.enduitext ? 1 : 0) + (o.enduitint ? 1 : 0);
            if (faces) out.push({ l: "Enduit prêt-à-l'emploi (sacs 25 kg)", v: enduitPretAlEmploi(d.L * d.h * faces), u: 'sacs' });
            if (o.ferraillage) out.push({ l: 'Fer HA Ø10 (barres 6 m)', v: Math.ceil((d.L * 4) / 6), u: 'barres' });
            return out;
        }
    },
    mur_pierre: {
        type: 'pierre', vals: d => ({ l: d.L, h: d.h, ep: 30, o: 0 }),
        // "Deux faces vues" : le parement est refait sur les deux faces du mur (~doublement pierre+mortier).
        extra: (d, o, base) => o.deuxfaces ? base.filter(r => /pierre|chaux|sable/i.test(r.l)) : []
    },
    rejoint: {
        type: 'chaux', vals: d => ({ l: d.L, h: d.h, o: 0, e: 2, t: 'joint' }),
        extra: (d, o, base) => o.deuxfaces ? base.filter(r => /chaux|sable/i.test(r.l)) : []
    },
    enduit_chaux: {
        type: 'chaux', vals: d => ({ l: d.L, h: d.h, o: 0, e: 2, t: 'enduit' }),
        extra: (d, o, base) => o.gratte ? [] : []   // finitions grattée/talochée : pas de matériau supplémentaire
    },
    ouverture: {
        type: 'ouverture', vals: d => ({ larg: d.larg, haut: d.haut, ep: 20 })
    },
    piscine_go: {
        type: 'piscine', vals: d => ({ l: d.L, w: d.l, p: d.p, ep: 20 }),
        extra: (d, o) => {
            const out = [];
            const surfMurs = 2 * (d.L + d.l) * d.p;
            if (o.enduit)    out.push({ l: 'Enduit hydrofuge d\'imperméabilisation', v: Math.ceil(surfMurs * 1.2), u: 'kg' });
            if (o.localtech) out.push({ l: 'Agglos 20×20×50 (local technique, à ajuster)', v: 60, u: 'unités' });
            return out;
        }
    }
    // evacuation, terrassement : le service (benne, location) EST l'ouvrage — pas de métré matériaux.
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
 * Estime la liste des matériaux d'un ouvrage selon ses dimensions et les
 * prestations cochées (`opts`). Combine le calculateur de métré de base
 * (computeGros) avec les compléments propres à l'ouvrage (`extra`), ou un
 * calcul direct (`custom`) quand aucun calculateur de métré n'existe.
 * @returns {Array<{l,v,u}>|null}
 */
export function estimerMateriaux(ouvrageId, dims, opts = {}) {
    const m = MAPPING[ouvrageId];
    if (!m) return null;

    if (m.custom) {
        try { return m.custom(dims, opts); } catch { return null; }
    }

    let base = [];
    try {
        const { get, getRaw } = makeGetters(m.vals(dims));
        base = computeGros(m.type, get, getRaw) || [];
    } catch { return null; }

    const extra = m.extra ? (m.extra(dims, opts, base) || []) : [];
    return [...base, ...extra];
}

// Lignes de quantité intermédiaire (ni matériau achetable, ni à chiffrer) :
// volumes de béton/mur, surfaces, terre/terrassement à évacuer, gravats, volume de mortier.
const INTERMEDIAIRE = /^(volume|surface|terre|terrassement|mortier|gravats)/i;

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

/**
 * Liste de courses consolidée d'un devis : additionne les métrés internes
 * (`ligne.materiaux`) de toutes les lignes, regroupés par matériau + unité de base.
 * Usage interne (commande négociant) — n'apparaît jamais sur le devis client.
 * @returns {Array<{l,v,u}>}
 */
export function listeCoursesDevis(devis) {
    const totals = new Map();   // clé "label|||unité de base" -> { label, unit, val }
    (devis.lignes || []).forEach(ligne => {
        (ligne.materiaux || []).forEach(m => {
            if (INTERMEDIAIRE.test(m.l.trim())) return;
            const baseU = String(m.u).split(' ~')[0].trim();     // "T ~ 2835 kg" -> "T"
            const key   = m.l + '|||' + baseU;
            const val   = parseFloat(String(m.v).replace(',', '.')) || 0;
            const cur   = totals.get(key) || { label: m.l, unit: baseU, val: 0 };
            cur.val += val;
            totals.set(key, cur);
        });
    });
    return Array.from(totals.values()).map(x => ({
        l: x.label,
        v: Number.isInteger(x.val) ? String(x.val) : x.val.toFixed(2),
        u: x.unit
    }));
}
