// === LES CALCULATEURS (un par ouvrage) ===
// Chaque ouvrage décrit ses champs de saisie et une fonction calcul(v, ctx) pure qui
// renvoie : { resume, lignes, infos, recette, mesure }.
//  - resume : chiffres clés affichés en haut (surface, volume…)
//  - lignes : matériaux à acheter { k, q } (voir materiaux.js)
//  - infos  : conseils et hypothèses en clair
//  - recette: gâchée bétonnière (optionnel)
//  - mesure : { q, u, h } quantité d'ouvrage + heures de travail estimées
//             (sert uniquement à l'option « estimation entreprise »)

import { BETON } from './ouvrages/beton.js';
import { MURS } from './ouvrages/murs.js';
import { ENDUITS } from './ouvrages/enduits.js';
import { TOITURE } from './ouvrages/toiture.js';
import { INTERIEUR } from './ouvrages/interieur.js';
import { EXTERIEUR } from './ouvrages/exterieur.js';
import { RENOVATION } from './ouvrages/renovation.js';
import { RESEAUX } from './ouvrages/reseaux.js';
import { fmtSmart } from '../core/format.js';
export { CONSEILS } from './ouvrages/commun.js';

export const OUV_CATS = [
    { id: 'beton',     l: 'Fondations & béton' },
    { id: 'murs',      l: 'Murs & ouvertures' },
    { id: 'enduits',   l: 'Enduits & joints' },
    { id: 'renovation', l: 'Rénovation & démolition' },
    { id: 'toiture',   l: 'Toiture & conduit' },
    { id: 'interieur', l: 'Intérieur' },
    { id: 'exterieur', l: 'Extérieur & terrassement' }
];

// Les calculateurs, rangés par familles dans js/calc/ouvrages/ (même ordre d'affichage qu'avant).
export const OUVRAGES = [...BETON, ...MURS, ...ENDUITS, ...TOITURE, ...INTERIEUR, ...EXTERIEUR, ...RENOVATION, ...RESEAUX];


// ─── Explications des champs : d'où à où mesurer, ce qui est compris ─────────
const AIDES = {
    fondation: { larg: 'Souvent 50 cm sous un mur de 20.', haut: 'Hauteur de béton dans la fouille, souvent 30 à 40 cm.' },
    dalle: { L: 'Dimensions de la dalle finie.', isolant: 'Sous une dalle de maison chauffée.' },
    poteau: { h: 'Hauteur coulée, de la semelle (ou dalle) jusqu\'au chaînage.' },
    escalier: {
        nb: 'Nombre de contremarches = hauteur à monter ÷ hauteur d\'une marche.',
        hm: '16 à 18 cm pour un escalier confortable.',
        g: 'Profondeur où l\'on pose le pied, 25 à 30 cm.',
        ep: 'Dalle inclinée sous les marches, 15 cm courant.'
    },
    mur: {
        h: 'Du dessus de la fondation ou de la dalle jusqu\'au dessus du dernier rang.',
        angles: 'Chaque angle, bout de mur libre ou tableau d\'ouverture : agglos d\'angle sur toute la hauteur. Un mur droit seul = 2.'
    },
    pierre: { ep: 'Épaisseur totale du mur. Bâti ancien : souvent 40 à 60 cm.' },
    muret: {
        h: 'Du terrain jusqu\'au dessus des agglos, chaperon non compris.',
        larg: '40 cm pour un agglo de 20.',
        prof: 'Fond de fouille sous le terrain : 50 cm mini (hors gel).'
    },
    ouverture: { larg: 'Dimensions du trou fini (le passage), pas de la menuiserie.' },
    enduit: { h: 'Du sol (ou du dessus du soubassement) jusqu\'au toit.', ouv: 'Portes et fenêtres de la façade.' },
    chaux: { h: 'Du sol jusqu\'en haut de la partie à enduire.' },
    rejoint: { h: 'Du sol jusqu\'en haut de la partie à rejointoyer.' },
    toiture: {
        L: 'Côtes extérieures des murs, sans les débords.',
        pans: '2 pans : un pignon maçonné à chaque bout. 4 pans : croupes, pas de pignon.',
        debord: 'Dépassement du toit au-delà des murs, mesuré à plat (souvent 30 à 50 cm).',
        pente: 'Canal ≈ 30 % · romane ≈ 35 % · ardoise ≈ 80 % · tuile plate ≈ 100 % (= 45°). Pente = hauteur ÷ demi-largeur.'
    },
    ragreage: { ep: 'Moyenne entre le point haut et le point bas du sol.' },
    placo: { a: 'Longueur du mur ou de la pièce.', b: 'Du sol jusqu\'au plafond (ou largeur de la pièce pour un plafond).' },
    isolation: { L: 'Surface du plancher des combles (= surface du plafond en dessous).' },
    peinture: { ouv: 'Total des portes et fenêtres (porte ≈ 1,7 m², fenêtre ≈ 1,5 m²).' },
    terrassement: { p: 'Profondeur moyenne à creuser.' },
    piscine: { p: 'Profondeur d\'eau moyenne, intérieur du bassin.', L: 'Dimensions intérieures du bassin.' },
    sousoeuvre: { h: 'Hauteur de la nouvelle fondation coulée sous le mur existant.' },
    demolition: { ep: 'Piquage : épaisseur d\'enduit (2 à 4 cm). Joints : profondeur à dégarnir. Mur, cloison, dalle : épaisseur totale.' },
    drainage: { prof: 'Hauteur de mur sous le terrain, jusqu\'au pied de la fondation.' },
    echafaudage: { h: 'Jusqu\'au toit, plus 1 m pour travailler en sécurité.' },
    soutenement: { L: 'Longueur du mur le long du talus.' },
    linteau: { ouv: 'Largeur du trou à franchir. 20 cm d\'appui sont ajoutés de chaque côté.' }
};
OUVRAGES.forEach(o => o.champs.forEach(ch => {
    const a = AIDES[o.id] && AIDES[o.id][ch.id];
    if (a) ch.aide = a;
}));

export const OUVRAGES_PAR_ID = Object.fromEntries(OUVRAGES.map(o => [o.id, o]));

// ─── Valeurs, validation, calcul ─────────────────────────────────────────────

/** Valeurs par défaut d'un ouvrage. */
export function valeursDefaut(def) {
    const v = {};
    def.champs.forEach(ch => { v[ch.id] = ch.def; });
    return v;
}

/** Le champ est-il visible pour ces valeurs ? */
export const champVisible = (ch, v) => !ch.si || !!ch.si(v);

/**
 * Normalise et valide les valeurs saisies.
 * @returns {{ v: object, erreurs: Object<string,string> }}
 */
/** Lit un nombre saisi : accepte la virgule, les espaces et une unité collée (« 6m », « 12 cm »). */
export function lireNombre(val) {
    if (typeof val === 'number') return val;
    const s = String(val ?? '').trim().toLowerCase().replace(/\s/g, '').replace(',', '.').replace(/(m²|m2|m³|m3|cm|mm|m|%|u|kg)$/, '');
    if (s === '' || !/^-?\d*\.?\d+$/.test(s)) return s === '' ? NaN : NaN;
    return Number(s);
}

export function valider(def, brut) {
    const v = { ...valeursDefaut(def), ...brut };
    const erreurs = {};
    const alertes = {};
    def.champs.forEach(ch => {
        if (ch.type === 'num') {
            const brutTxt = String(v[ch.id] ?? '').trim();
            const x = lireNombre(v[ch.id]);
            if (!champVisible(ch, v)) { v[ch.id] = isNaN(x) ? (ch.def || 0) : x; return; }
            if (isNaN(x)) { erreurs[ch.id] = brutTxt === '' ? (ch.zero ? 'Mets 0 si aucun' : 'À remplir') : 'Chiffres seulement (ex : 6,5)'; return; }
            if (x < 0 || (!ch.zero && x <= 0)) { erreurs[ch.id] = 'Doit être plus grand que 0'; return; }
            const max = ch.max ?? (ch.u === 'm' ? 200 : ch.u === 'cm' ? 500 : ch.u === 'm²' ? 5000 : 100000);
            if (x > max) { erreurs[ch.id] = `Trop grand ? (max ${fmtSmart(max)} ${ch.u || ''})`; return; }
            // Alerte douce : probablement des mètres tapés dans un champ en centimètres
            if (ch.u === 'cm' && x > 0 && x < 1) alertes[ch.id] = `Tu as mis des mètres ? Ici c'est en cm (${fmtSmart(x, 2)} m = ${fmtSmart(x * 100, 0)} cm).`;
            else if (ch.bas && x > 0 && x < ch.bas) alertes[ch.id] = `Valeur faible (souvent ${fmtSmart(ch.bas)} ${ch.u} ou plus) : vérifie.`;
            v[ch.id] = x;
        } else if (ch.type === 'oui') {
            v[ch.id] = v[ch.id] === true || v[ch.id] === 'true';
        } else if (ch.type === 'choix') {
            if (!ch.options.some(o => o.v === String(v[ch.id]))) v[ch.id] = ch.def;
            else v[ch.id] = String(v[ch.id]);
        }
    });
    if (!Object.keys(erreurs).length && def.verifier) Object.assign(erreurs, def.verifier(v) || {});
    return { v, erreurs, alertes };
}

/** Calcul complet d'un ouvrage (null si saisie invalide). */
export function calculer(defOrId, brut, ctx = {}) {
    const def = typeof defOrId === 'string' ? OUVRAGES_PAR_ID[defOrId] : defOrId;
    if (!def) return null;
    const { v, erreurs, alertes } = valider(def, brut);
    if (Object.keys(erreurs).length) return { erreurs, alertes, v };
    const r = def.calcul(v, ctx);
    r.resume = (r.resume || []).filter(Boolean);
    r.lignes = (r.lignes || []).filter(li => li && li.q > 0);
    r.titre = def.titre(v);
    r.v = v;
    r.erreurs = {};
    r.alertes = alertes;
    return r;
}
