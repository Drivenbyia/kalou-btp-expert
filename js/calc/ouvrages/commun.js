// Briques communes aux calculateurs : constructeurs de champs, choix béton, conseils.

import { L, recetteBeton } from '../base.js';
import { fmtSmart } from '../../core/format.js';
// ─── Petits constructeurs de champs ──────────────────────────────────────────
export const n = (id, l, u, def, o = {}) => ({ id, type: 'num', l, u, def, ...o });
export const c = (id, l, options, def, o = {}) => ({ id, type: 'choix', l, options, def, ...o });
export const oui = (id, l, def = true, o = {}) => ({ id, type: 'oui', l, def, ...o });
/** Liste de lignes : { types: { clé: { l, def } }, cols: [{ id, l, u, def, si(t), options, max, zero }], def: [lignes], ajout } */
export const liste = (id, l, o) => ({ id, type: 'liste', l, ...o });
export const texte = (id, l, def = '', o = {}) => ({ id, type: 'texte', l, def, ...o });

export const MODE = c('mode', 'Le béton', [
    { v: 'betonniere', l: 'Bétonnière' },
    { v: 'bpe', l: 'Toupie (prêt à l\'emploi)' }
], 'betonniere', { aide: 'Bétonnière pour les petites quantités. Au-delà de 3 m³ environ, la toupie fait gagner beaucoup de temps.' });

export const DOSAGE = c('dosage', 'Dosage du béton', [
    { v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }, { v: '400', l: '400 kg' }
], '350', { aide: '350 kg/m³ conseillé à la bétonnière (dalles, poteaux, chaînages, fondations armées). 300 minimum pour du béton armé.' });

export const fm = x => fmtSmart(x, 2);

// Conseils de mise en œuvre réutilisés
export const CONSEILS = {
    cure: 'Cure du béton : arroser ou bâcher 3 à 7 jours. Pas de coulage sous 5 °C ni sur sol gelé (sinon antigel et bâches).',
    decoffrage: 'Décoffrage : semelles 1 à 2 jours, poteaux et voiles 2 à 3 jours, dalles portées : étais 21 à 28 jours.',
    dict: 'Avant de creuser : déclaration DICT (réseaux enterrés : gaz, électricité, eau). Tranchée de plus de 1,30 m : blindage obligatoire.',
    argile: 'Sol argileux (fréquent en Dordogne) : 80 cm minimum sous le terrain, 1,20 m en aléa fort. En zone argile, étude de sol G1/G2 obligatoire pour une maison (loi ELAN).',
    structure: 'Ordre de grandeur pour commander : sections, armatures et profondeurs viennent du plan, de l\'étude de sol ou du bureau d\'études.',
    pierreCiment: 'Sur mur en pierre ancienne : jamais de ciment ni de monocouche (l\'humidité reste piégée, la pierre s\'abîme). Utiliser la chaux.',
    chaux: 'Chaux : travailler entre 5 et 30 °C, pas en plein soleil ni sous la pluie, support humidifié. Attendre 2-3 jours entre gobetis et corps, 7 jours avant la finition.'
};

/** Conseils communs béton : recette ou toupie. */
export function aideBeton(vol, dosage, mode, ctx, infos) {
    if (mode === 'bpe') return null;
    if (vol > 3) infos.push(`Avec ${fm(vol)} m³ de béton, pense à la toupie : ça évite environ ${Math.ceil(vol * 10)} gâchées.`);
    return recetteBeton(dosage, ctx.sacCiment || 35);
}

export const surfNette = (Lg, h, o) => Math.max(0, Lg * h - (o || 0));

// ─── « Je connais la surface » : saisie directe en m² au lieu de longueur × hauteur ──
const parSurf = v => v.saisie === 'surf';
/** Choix du mode de saisie, à mettre en tête des champs. */
export const SAISIE = c('saisie', 'Je connais', [{ v: 'dim', l: 'Dimensions' }, { v: 'surf', l: 'Surface en m²' }], 'dim');
/** Champ surface (visible seulement en saisie directe). */
export const champSurface = (def = 20, aide = 'Surface totale, déjà mesurée ou lue sur le plan.') =>
    n('S', 'Surface', 'm²', def, { si: parSurf, aide });
/** Rend un champ de dimension invisible en saisie directe. */
export const dim = ch => ({ ...ch, si: v => !parSurf(v) && (!ch.si || ch.si(v)) });
/** Surface brute selon le mode de saisie. */
export const surfaceBrute = (v, a = 'L', b = 'h') => (parSurf(v) ? v.S : v[a] * v[b]);
/** Surface nette (ouvertures déduites) selon le mode de saisie. */
export const surfaceDe = (v, a = 'L', b = 'h') => Math.max(0, surfaceBrute(v, a, b) - (v.ouv || 0));

/** Contrôle : les ouvertures ne peuvent pas dépasser la surface du mur. */
export const verifOuv = (a = 'L', b = 'h') => v => (v.ouv > 0 && v.ouv >= surfaceBrute(v, a, b) ? { ouv: `Plus grand que le mur (${fm(surfaceBrute(v, a, b))} m²) : vérifie` } : {});

