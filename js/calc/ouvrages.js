// === LES CALCULATEURS (un par ouvrage) ===
// Chaque ouvrage décrit ses champs de saisie et une fonction calcul(v, ctx) pure qui
// renvoie : { resume, lignes, infos, recette, mesure }.
//  - resume : chiffres clés affichés en haut (surface, volume…)
//  - lignes : matériaux à acheter { k, q } (voir materiaux.js)
//  - infos  : conseils et hypothèses en clair
//  - recette: gâchée bétonnière (optionnel)
//  - mesure : { q, u, h } quantité d'ouvrage + heures de travail estimées
//             (sert uniquement à l'option « estimation entreprise »)

import {
    L, fusion, lignesBeton, lignesMortier, recetteBeton, recetteMortier, lignesMurBlocs,
    lignesChainage, lignesChainageVertical, nbBarres6m, calcPlancher, calcToiture, calcPlaco, BLOCS, COUVERTURES,
    PERTE_BETON, PERTE_MORTIER, TREILLIS_UTILE, calcDrainage, lignesEchafaudage,
    LIMITES_CLOISON, DOUBLAGE_COLLE, SOUFFLAGE, calcSoufflage, calcRampants, lignesPareVapeur
} from './base.js';
import { fmtSmart } from '../core/format.js';

export const OUV_CATS = [
    { id: 'beton',     l: 'Fondations & béton' },
    { id: 'murs',      l: 'Murs & ouvertures' },
    { id: 'enduits',   l: 'Enduits & joints' },
    { id: 'renovation', l: 'Rénovation & démolition' },
    { id: 'toiture',   l: 'Toiture & conduit' },
    { id: 'interieur', l: 'Intérieur' },
    { id: 'exterieur', l: 'Extérieur & terrassement' }
];

// ─── Petits constructeurs de champs ──────────────────────────────────────────
const n = (id, l, u, def, o = {}) => ({ id, type: 'num', l, u, def, ...o });
const c = (id, l, options, def, o = {}) => ({ id, type: 'choix', l, options, def, ...o });
const oui = (id, l, def = true, o = {}) => ({ id, type: 'oui', l, def, ...o });

const MODE = c('mode', 'Le béton', [
    { v: 'betonniere', l: 'Bétonnière' },
    { v: 'bpe', l: 'Toupie (prêt à l\'emploi)' }
], 'betonniere', { aide: 'Bétonnière pour les petites quantités. Au-delà de 3 m³ environ, la toupie fait gagner beaucoup de temps.' });

const DOSAGE = c('dosage', 'Dosage du béton', [
    { v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }, { v: '400', l: '400 kg' }
], '350', { aide: '350 kg/m³ conseillé à la bétonnière (dalles, poteaux, chaînages, fondations armées). 300 minimum pour du béton armé.' });

const fm = x => fmtSmart(x, 2);

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
function aideBeton(vol, dosage, mode, ctx, infos) {
    if (mode === 'bpe') return null;
    if (vol > 3) infos.push(`Avec ${fm(vol)} m³ de béton, pense à la toupie : ça évite environ ${Math.ceil(vol * 10)} gâchées.`);
    return recetteBeton(dosage, ctx.sacCiment || 35);
}

const surfNette = (Lg, h, o) => Math.max(0, Lg * h - (o || 0));
/** Contrôle : les ouvertures ne peuvent pas dépasser la surface du mur. */
const verifOuv = (a = 'L', b = 'h') => v => (v.ouv > 0 && v.ouv >= v[a] * v[b] ? { ouv: `Plus grand que le mur (${fm(v[a] * v[b])} m²) : vérifie` } : {});

// ─── Définitions ─────────────────────────────────────────────────────────────

export const OUVRAGES = [
    // ════════════════ FONDATIONS & BÉTON ════════════════
    {
        id: 'fondation', cat: 'beton', ic: '🏗️', nom: 'Fondations (semelles)',
        desc: 'Semelles filantes sous les murs',
        champs: [
            n('ml', 'Longueur de semelles', 'm', 30, { aide: 'Tour de la construction + murs de refend.' }),
            n('larg', 'Largeur', 'cm', 50, { demi: true, max: 150, bas: 25 }),
            n('haut', 'Épaisseur de semelle', 'cm', 35, { demi: true, max: 150, bas: 15 }),
            n('prof', 'Profondeur de fouille', 'cm', 80, { aide: 'Hors gel : 50 cm mini. Sol argileux : 80 cm mini (1,20 m en aléa fort).', max: 300, bas: 40 }),
            n('angles', 'Angles et jonctions en T', 'u', 4, { zero: true, max: 60, aide: 'Une équerre préfa à chaque angle ou croisement.' }),
            c('dosage', 'Dosage du béton', [{ v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }], '350'),
            MODE,
            oui('proprete', 'Béton de propreté (5 cm, dosé 150)'),
            oui('armature', 'Semelle armée préfa (3 ou 4 HA10, 6 m)')
        ],
        mots: 'semelle filante fouille rigole terrassement propreté armature hors gel',
        titre: v => `Fondations ${fm(v.ml)} m — ${fm(v.larg)}×${fm(v.haut)} cm`,
        calcul(v, ctx) {
            const net = v.ml * v.larg / 100 * v.haut / 100;
            const vol = net * PERTE_BETON;
            const volP = v.proprete ? v.ml * v.larg / 100 * 0.05 * PERTE_BETON : 0;
            const terre = v.ml * v.larg / 100 * v.prof / 100;
            const dos = +v.dosage;
            const infos = [];
            const lignes = [
                ...lignesBeton(vol, dos, v.mode),
                ...lignesBeton(volP, 150, v.mode),
                v.armature ? L('arm_semelle', nbBarres6m(v.ml)) : null,
                v.armature && v.angles > 0 ? L('equerre_sem', v.angles) : null,
                v.armature ? L('cales', Math.ceil(v.ml * 1.5)) : null
            ];
            if (v.haut > v.prof) infos.push('L\'épaisseur de semelle dépasse la profondeur de fouille : vérifie les cotes.');
            if (v.prof < 80) infos.push(CONSEILS.argile);
            infos.push(`Terre à sortir : ${fm(terre)} m³ en place, soit ≈ ${fm(terre * 1.25)} m³ foisonnés (≈ ${Math.max(1, Math.ceil(terre / 40))} jour(s) de mini-pelle).`);
            if (v.armature) infos.push('Armatures de 6 m avec 50 cm de recouvrement, équerres préfa aux angles et aux T, cales pour 3-4 cm d\'enrobage. Prévoir les attentes des chaînages verticaux.');
            infos.push(CONSEILS.dict, CONSEILS.cure, CONSEILS.structure);
            return {
                resume: [
                    { l: 'Béton semelles', v: `${fm(vol)} m³` },
                    volP ? { l: 'Béton de propreté', v: `${fm(volP)} m³` } : null,
                    { l: 'Terre à sortir', v: `${fm(terre)} m³` }
                ],
                lignes: fusion(lignes), infos,
                recette: aideBeton(vol + volP, dos, v.mode, ctx, infos),
                mesure: { q: net, u: 'm³', h: net * 3 + terre / 5 }
            };
        }
    },
    {
        id: 'dalle', cat: 'beton', ic: '⬛', nom: 'Dalle / terrasse béton',
        desc: 'Dalle sur terre-plein, garage, terrasse, allée',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            n('ep', 'Épaisseur du béton', 'cm', 12, { max: 50, bas: 6, aide: 'Terrasse/allée : 10-12 cm. Garage : 12-15 cm.' }),
            DOSAGE,
            MODE,
            n('he', 'Hérisson compacté (20/40)', 'cm', 15, { zero: true, max: 60, aide: '0 = pas de hérisson.' }),
            c('treillis', 'Treillis soudé ST 25 C', [{ v: '36', l: '2,40×3,60' }, { v: '6', l: '2,40×6,00' }, { v: 'non', l: 'Sans (béton fibré)' }], '36'),
            oui('polyane', 'Film polyane sous la dalle'),
            oui('isolant', 'Isolant sous dalle (maison)', false),
            oui('desactive', 'Finition béton désactivé', false)
        ],
        mots: 'dallage terrasse allée garage hérisson treillis polyane désactivé radier',
        titre: v => `Dalle béton ${fm(v.L)}×${fm(v.l)} m — ép. ${fm(v.ep)} cm`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const vol = S * v.ep / 100 * PERTE_BETON;
            const dos = +v.dosage;
            const infos = [];
            const lignes = [...lignesBeton(vol, dos, v.mode)];
            if (v.treillis === '36') lignes.push(L('treillis36', Math.ceil(S / TREILLIS_UTILE['36'] - 1e-9)));
            if (v.treillis === '6')  lignes.push(L('treillis6', Math.ceil(S / TREILLIS_UTILE['6'] - 1e-9)));
            if (v.treillis !== 'non') lignes.push(L('cales', Math.ceil(S * 4)));
            if (v.he > 0) lignes.push(L('herisson', S * v.he / 100 * 1.8));
            if (v.polyane) lignes.push(L('polyane', S * 1.15));
            if (v.isolant) lignes.push(L('isolant_sol', S * 1.05));
            if (v.desactive) lignes.push(L('desactivant', S * 0.2));
            lignes.push(L('planche', 2 * (v.L + v.l) * 1.05, { d: 'coffrage de rive' }));
            const deblai = S * (v.ep + (v.he || 0)) / 100;
            infos.push(`Décaissement : ${fm(deblai)} m³ de terre en place (≈ ${fm(deblai * 1.25)} m³ foisonnés).`);
            if (v.treillis !== 'non') infos.push('Treillis : recouvrement de 2 mailles compris. Cales : 4 par m².');
            if (S > 20) infos.push('Joints de fractionnement : un tous les 3 à 4 m (cases de 15-20 m² maxi). Joint de dilatation contre la maison. Pente extérieure 1,5 à 2 %.');
            infos.push(CONSEILS.cure);
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume béton', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos,
                recette: aideBeton(vol, dos, v.mode, ctx, infos),
                mesure: { q: S, u: 'm²', h: S * (0.9 + (v.desactive ? 0.3 : 0) + (v.he > 0 ? 0.15 : 0)) }
            };
        }
    },
    {
        id: 'beton', cat: 'beton', ic: '🪣', nom: 'Béton ou mortier au m³',
        desc: 'Dosage rapide + recette de la gâchée',
        champs: [
            c('type', 'Je prépare', [{ v: 'beton', l: 'Du béton' }, { v: 'mortier', l: 'Du mortier' }], 'beton'),
            n('vol', 'Volume voulu', 'm³', 1, { max: 200 }),
            c('dosage', 'Dosage', [
                { v: '150', l: '150' }, { v: '250', l: '250' }, { v: '300', l: '300' }, { v: '350', l: '350' }, { v: '400', l: '400' }
            ], '350', { aide: 'kg par m³. Béton : 150 propreté · 250 gros béton · 300 mini en béton armé · 350 dalles, poteaux, chaînages. Mortier : 300-350.' }),
            c('liant', 'Liant', [{ v: 'ciment', l: 'Ciment' }, { v: 'batard', l: 'Bâtard (ciment + chaux)' }, { v: 'chaux', l: 'Chaux NHL' }], 'ciment', { si: v => v.type === 'mortier' }),
            { ...MODE, si: v => v.type === 'beton' }
        ],
        mots: 'gâchée bétonnière dosage ciment sable gravillon toupie bpe mortier bâtard chaux recette',
        titre: v => `${v.type === 'beton' ? 'Béton' : 'Mortier'} ${fm(v.vol)} m³ dosé ${v.dosage}`,
        calcul(v, ctx) {
            const dos = +v.dosage;
            const infos = [];
            if (v.type === 'beton') {
                const vol = v.vol * PERTE_BETON;
                const sac = ctx.sacCiment || 35;
                infos.push(`Pour 1 m³ de béton : ${fmtSmart(dos / sac, 1)} sacs de ${sac} kg, ≈ 400 L de sable et ≈ 800 L de gravillon, ≈ 175 L d'eau. Pertes 5 % comprises.`, CONSEILS.cure);
                return {
                    resume: [{ l: 'Béton (pertes comprises)', v: `${fm(vol)} m³` }],
                    lignes: fusion(lignesBeton(vol, dos, v.mode)), infos,
                    recette: aideBeton(vol, dos, v.mode, ctx, infos),
                    mesure: { q: v.vol, u: 'm³', h: v.vol * 2 }
                };
            }
            const vol = v.vol * PERTE_MORTIER;
            infos.push('Pour 1 m³ de mortier : le dosage en liant et ≈ 1 m³ de sable (1,5 T). Pertes 10 % comprises.');
            return {
                resume: [{ l: 'Mortier (pertes comprises)', v: `${fm(vol)} m³` }],
                lignes: fusion(lignesMortier(vol, { liant: v.liant, dosage: dos })), infos,
                recette: recetteMortier(dos, v.liant === 'ciment' ? (ctx.sacCiment || 35) : 35, v.liant),
                mesure: { q: v.vol, u: 'm³', h: v.vol * 2 }
            };
        }
    },
    {
        id: 'poteau', cat: 'beton', ic: '🏛️', nom: 'Poteaux béton',
        desc: 'Poteaux carrés ou rectangulaires',
        champs: [
            n('a', 'Côté 1', 'cm', 20, { demi: true, max: 100 }),
            n('b', 'Côté 2', 'cm', 20, { demi: true, max: 100 }),
            n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 12 }),
            n('nb', 'Nombre', 'u', 4, { demi: true, max: 200 }),
            DOSAGE, MODE
        ],
        mots: 'poteau coffrage cage armature pilier',
        titre: v => `${fm(v.nb)} poteau(x) ${fm(v.a)}×${fm(v.b)} cm, h ${fm(v.h)} m`,
        calcul(v, ctx) {
            const vol = v.a / 100 * v.b / 100 * v.h * v.nb * PERTE_BETON;
            const dos = +v.dosage;
            const infos = ['Armature : 1 cage préfabriquée par poteau (+ 50 cm d\'attente pour le chaînage).', 'Coffrage : blocs poteaux ou planches/contreplaqué.', CONSEILS.decoffrage, CONSEILS.structure];
            return {
                resume: [{ l: 'Volume béton', v: `${fm(vol)} m³` }],
                lignes: fusion([...lignesBeton(vol, dos, v.mode), L('arm_chainage', v.nb * Math.ceil((v.h + 0.5) / 6 - 1e-9))]),
                infos, recette: aideBeton(vol, dos, v.mode, ctx, infos),
                mesure: { q: v.nb, u: 'u', h: v.nb * 3 }
            };
        }
    },
    {
        id: 'chainage', cat: 'beton', ic: '⛓️', nom: 'Chaînages',
        desc: 'Chaînage horizontal (blocs U) ou vertical',
        champs: [
            c('sens', 'Type', [{ v: 'h', l: 'Horizontal' }, { v: 'v', l: 'Vertical (angles)' }], 'h'),
            n('ml', 'Longueur totale', 'm', 20, { si: v => v.sens !== 'v' }),
            n('angles', 'Angles', 'u', 4, { zero: true, max: 40, si: v => v.sens !== 'v', aide: 'Une équerre de chaînage à chaque angle.' }),
            oui('blocsU', 'En blocs U', true, { si: v => v.sens !== 'v' }),
            n('nbV', 'Nombre de chaînages', 'u', 4, { demi: true, max: 60, si: v => v.sens === 'v' }),
            n('hV', 'Hauteur de chacun', 'm', 3, { demi: true, max: 15, si: v => v.sens === 'v', aide: 'De la semelle jusqu\'au chaînage haut, d\'un seul tenant.' }),
            MODE
        ],
        mots: 'chaînage bloc u raidisseur armature attente équerre',
        titre: v => v.sens === 'v' ? `${fm(v.nbV)} chaînage(s) vertical(aux) de ${fm(v.hV)} m` : `Chaînage horizontal ${fm(v.ml)} m`,
        calcul(v, ctx) {
            const vert = v.sens === 'v';
            const lignes = vert
                ? lignesChainageVertical(v.nbV, v.hV, { mode: v.mode })
                : lignesChainage(v.ml, { blocsU: v.blocsU, mode: v.mode, angles: v.angles });
            const vol = (vert ? v.nbV * v.hV : v.ml) * 0.025 * PERTE_BETON;
            const infos = [
                'Béton ≈ 25 L par mètre, dosé 350, gravillon 4/10 pour bien remplir. Armatures de 6 m avec 50 cm de recouvrement, enrobage 3 cm.',
                vert ? 'Chaque chaînage vertical est d\'un seul tenant : attente en L dans la semelle, armature jusqu\'au chaînage haut.' : 'Continuité obligatoire aux angles : équerres de chaînage.'
            ];
            return {
                resume: [{ l: 'Volume béton', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: aideBeton(vol, 350, v.mode, ctx, infos),
                mesure: { q: vert ? v.nbV * v.hV : v.ml, u: 'm', h: (vert ? v.nbV * v.hV : v.ml) * 0.5 }
            };
        }
    },
    {
        id: 'plancher', cat: 'beton', ic: '🔲', nom: 'Plancher poutrelles-hourdis',
        desc: 'Plancher d\'étage ou sur vide sanitaire',
        champs: [
            n('long', 'Longueur du plancher', 'm', 8, { aide: 'Dans le sens où l\'on aligne les poutrelles (perpendiculaire à leur portée).' }),
            n('portee', 'Portée des poutrelles', 'm', 4, { aide: 'Distance entre les 2 murs porteurs. Au-delà de 5-6 m, voir le fabricant.', max: 8 }),
            c('haut', 'Hauteur des entrevous', [{ v: '12', l: '12 cm' }, { v: '16', l: '16 cm' }, { v: '20', l: '20 cm' }], '16'),
            c('entrevous', 'Entrevous', [{ v: 'beton', l: 'Béton' }, { v: 'pse', l: 'Isolant PSE' }], 'beton', { aide: 'Sur vide sanitaire : entrevous isolants PSE (RE2020).' }),
            oui('rives', 'Planelles de rive'),
            MODE
        ],
        mots: 'plancher hourdis poutrelle entrevous dalle de compression étage vide sanitaire étai',
        titre: v => `Plancher ${fm(v.long)}×${fm(v.portee)} m (${v.haut}+4)`,
        calcul(v, ctx) {
            const r = calcPlancher(v.long, v.portee, { haut: +v.haut, rives: v.rives, mode: v.mode, pse: v.entrevous === 'pse' });
            const infos = [
                `Poutrelles tous les 60 cm. Dalle de compression de 4 cm avec treillis : ≈ ${fm(r.vol)} m³ de béton dosé 350.`,
                `Étaiement : ${r.etais} étais à laisser en place 21 jours environ.`,
                'Le plan de pose du fabricant reste la référence (portée, étaiement, charges). Pas d\'étais seulement si le plan dit « sans étai ».',
                CONSEILS.cure
            ];
            if (v.portee > 6) infos.unshift('Portée de plus de 6 m : poutrelles spéciales, à vérifier avec le fabricant.');
            return {
                resume: [{ l: 'Surface', v: `${fm(r.S)} m²` }, { l: 'Poutrelles', v: `${r.nbP} × ${fm(r.lgP)} m` }],
                lignes: fusion(r.lignes), infos, recette: aideBeton(r.vol, 350, v.mode, ctx, infos),
                mesure: { q: r.S, u: 'm²', h: r.S * 0.8 }
            };
        }
    },
    {
        id: 'escalier', cat: 'beton', ic: '🪜', nom: 'Escalier béton',
        desc: 'Escalier droit sur paillasse',
        champs: [
            n('nb', 'Nombre de marches', 'u', 14, { demi: true, max: 40 }),
            n('hm', 'Hauteur de marche', 'cm', 17.5, { demi: true, max: 25 }),
            n('g', 'Giron (profondeur)', 'cm', 27, { demi: true, max: 40 }),
            n('w', 'Largeur', 'cm', 90, { demi: true, max: 300 }),
            n('ep', 'Épaisseur de paillasse', 'cm', 15, { max: 30 }),
            MODE
        ],
        mots: 'escalier marche contremarche giron paillasse blondel',
        titre: v => `Escalier béton ${fm(v.nb)} marches, larg. ${fm(v.w)} cm`,
        calcul(v, ctx) {
            const h = v.hm / 100, g = v.g / 100, w = v.w / 100, e = v.ep / 100;
            const girons = Math.max(1, v.nb - 1);                   // la dernière marche est le palier
            const volMarches = girons * (g * h / 2) * w;
            const pail = Math.sqrt(Math.pow(girons * g, 2) + Math.pow(v.nb * h, 2));
            const vol = (volMarches + pail * w * e) * PERTE_BETON;
            const mlFer = (Math.ceil(w / 0.15) + 1) * (pail + 0.6) + (Math.ceil(pail / 0.25) + 1) * w;
            const blondel = 2 * v.hm + v.g;
            const infos = [
                `Paillasse de ${fm(pail)} m de long. Ferraillage : HA10 tous les 15 cm + répartition tous les 25 cm.`,
                `Confort (Blondel) : 2 × hauteur + giron = ${fmtSmart(blondel, 1)} cm ${blondel >= 59 && blondel <= 65 ? '✔ (idéal 60 à 64)' : '⚠ idéal entre 60 et 64 cm'}.`,
                `Hauteur totale montée : ${fmtSmart(v.nb * v.hm, 0)} cm, reculement ${fm(girons * g)} m.`,
                'Aciers en chapeau en haut et en bas de la paillasse, étaiement du coffrage. Garde-corps 1 m, échappée 1,90 à 2 m.',
                CONSEILS.decoffrage
            ];
            return {
                resume: [{ l: 'Volume béton', v: `${fm(vol)} m³` }, { l: 'Longueur paillasse', v: `${fm(pail)} m` }],
                lignes: fusion([
                    ...lignesBeton(vol, 350, v.mode),
                    L('fer10', Math.ceil(mlFer * 1.1 / 6)),
                    L('planche', v.nb * w + 2 * pail, { d: 'contremarches et joues' })
                ]),
                infos, recette: aideBeton(vol, 350, v.mode, ctx, infos),
                mesure: { q: v.nb, u: 'marche', h: v.nb * 4 }
            };
        }
    },

    // ════════════════ MURS & OUVERTURES ════════════════
    {
        id: 'mur', cat: 'murs', ic: '🧱', nom: 'Mur en parpaings / briques',
        desc: 'Parpaing 20, 15, 10, bloc à bancher, brique',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 15 }),
            c('bloc', 'Type de bloc', Object.entries(BLOCS).map(([v, b]) => ({ v, l: b.l })), 'p20'),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true, aide: 'Porte ≈ 2 m², fenêtre ≈ 1,5 m².' }),
            n('angles', 'Angles, abouts et tableaux', 'u', 2, { zero: true, max: 50, si: v => v.bloc === 'p20' || v.bloc === 'p15', aide: 'Blocs d\'angle sur toute la hauteur.' }),
            oui('chainage', 'Chaînage en haut du mur', false),
            { ...MODE, si: v => v.bloc === 'bancher' || v.chainage }
        ],
        mots: 'agglo parpaing brique monomur bloc à bancher hourdage maçonnerie élévation cloison',
        verifier: verifOuv(),
        titre: v => `Mur ${BLOCS[v.bloc]?.l || ''} ${fm(v.L)}×${fm(v.h)} m`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const b = BLOCS[v.bloc] || BLOCS.p20;
            const angles = b.angle ? (v.angles || 0) : 0;
            const lignes = [...lignesMurBlocs(S, v.bloc, angles, v.h, v.mode)];
            if (v.chainage) lignes.push(...lignesChainage(v.L, { mode: v.mode }));
            const infos = [];
            let recette = null;
            if (b.mortierL) {
                infos.push(`Hourdage : mortier dosé 350 kg/m³, environ ${b.mortierL} L par m² (pertes comprises).`);
                recette = recetteMortier(350, ctx.sacCiment || 35);
            }
            if (b.colleKg) infos.push(`Joint mince : environ ${b.colleKg} kg de mortier-colle par m².`);
            if (b.remplissage) infos.push(`Remplissage : ≈ ${b.remplissage * 1000} L de béton fluide par m² (gravillon 4/10, pas de 4/20 : nids de cailloux). Premier rang posé au mortier. Fers verticaux selon plan.`);
            if (S > 0 && v.ouv > 0) infos.push('Linteaux : longueur = ouverture + 20 cm d\'appui de chaque côté (voir « Création d\'ouverture » pour un mur existant).');
            infos.push(`${fmtSmart(b.parM2, 1)} blocs au m² + 5 % de casse.`);
            return {
                resume: [{ l: 'Surface nette', v: `${fm(S)} m²` }, { l: 'Rangs', v: `${Math.ceil(v.h / b.h - 1e-9)}` }],
                lignes: fusion(lignes), infos, recette,
                mesure: { q: S, u: 'm²', h: S * ({ p20: 1, p15: 0.9, p10: 0.7, bancher: 1.2, brique20: 0.8, monomur30: 0.9 }[v.bloc] || 1) + (v.chainage ? v.L * 0.5 : 0) }
            };
        }
    },
    {
        id: 'pierre', cat: 'murs', ic: '🪨', nom: 'Mur en pierre',
        desc: 'Moellons hourdés à la chaux',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('h', 'Hauteur', 'm', 1.5, { demi: true, max: 10 }),
            n('ep', 'Épaisseur du mur', 'cm', 40, { max: 120, bas: 15 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            c('nhl', 'Chaux', [{ v: '2', l: 'NHL 2 (pierre tendre)' }, { v: '3.5', l: 'NHL 3,5' }], '3.5')
        ],
        mots: 'moellon pierre calcaire chaux hourdage bâti ancien parement',
        verifier: verifOuv(),
        titre: v => `Mur en pierre ${fm(v.L)}×${fm(v.h)} m, ép. ${fm(v.ep)} cm`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * v.ep / 100;
            const volM = vol * 0.30;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume de mur', v: `${fm(vol)} m³` }],
                lignes: fusion([L('moellon', vol * 1.9), ...lignesMortier(volM, { liant: 'chaux', dosage: 300 })]),
                infos: [
                    'Environ 1,9 T de pierre par m³ de mur (chutes de taille comprises). Prévoir des boutisses (pierres traversantes) tous les mètres environ.',
                    `Mortier de chaux dosé 300 kg/m³ (≈ 1 sac pour 2,5 à 3 volumes de sable) : ≈ 300 L par m³ de mur, soit ${fm(volM)} m³. Le mortier ne doit jamais être plus dur que la pierre.`,
                    `Chaux conseillée : NHL ${v.nhl === '2' ? '2' : '3,5'}.`,
                    CONSEILS.chaux
                ],
                recette: recetteMortier(300, 35, 'chaux'),
                mesure: { q: S, u: 'm²', h: S * 5 * Math.max(1, v.ep / 50) }
            };
        }
    },
    {
        id: 'muret', cat: 'murs', ic: '🚧', nom: 'Muret / mur de clôture',
        desc: 'Fondation + parpaings + chaperon + enduit',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('h', 'Hauteur hors sol', 'm', 1.2, { demi: true, max: 4 }),
            c('bloc', 'Bloc', [{ v: 'p20', l: 'Agglo de 20' }, { v: 'p15', l: 'Agglo de 15' }], 'p20'),
            n('larg', 'Largeur semelle', 'cm', 40, { demi: true, max: 100, bas: 20 }),
            n('hb', 'Épaisseur semelle', 'cm', 25, { demi: true, max: 100, bas: 10 }),
            n('prof', 'Profondeur de fouille', 'cm', 50, { max: 150 }),
            oui('chaperon', 'Chaperons'),
            c('enduit', 'Enduit monocouche', [{ v: '0', l: 'Aucun' }, { v: '1', l: '1 face' }, { v: '2', l: '2 faces' }], '2'),
            MODE
        ],
        mots: 'muret clôture mur de clôture chaperon raidisseur agglo parpaing',
        titre: v => `Muret ${fm(v.L)} m × ${fm(v.h)} m`,
        calcul(v, ctx) {
            const volS = v.L * v.larg / 100 * v.hb / 100 * PERTE_BETON;
            const hBlocs = v.h + Math.max(0, (v.prof - v.hb) / 100);
            const raid = Math.ceil(v.L / 4 - 1e-9) + 1;                 // raidisseurs tous les 4 m + extrémités
            const S = v.L * hBlocs;
            const faces = +v.enduit;
            const lignes = [
                ...lignesBeton(volS, 300, v.mode),
                L('arm_semelle', nbBarres6m(v.L)),
                ...lignesMurBlocs(S, v.bloc, raid, hBlocs, v.mode),
                ...lignesChainageVertical(raid, hBlocs, { mode: v.mode }),
                ...lignesChainage(v.L, { mode: v.mode })
            ];
            if (v.chaperon) lignes.push(L('chaperon', Math.ceil(v.L * 2 * 1.03)));
            if (faces) lignes.push(L('enduit_mono', v.L * v.h * faces * 1.5 * 17 * PERTE_MORTIER));
            const infos = [
                `Hauteur maçonnée : ${fm(hBlocs)} m (dont ${fm(hBlocs - v.h)} m enterrés), soit ${Math.ceil(hBlocs / 0.2 - 1e-9)} rangs.`,
                `${raid} raidisseurs (chaînages verticaux) : tous les 4 m environ et aux extrémités.`,
                'Chaînage horizontal en haut du mur sous les chaperons. Joint de dilatation tous les 10 à 15 m.',
                'Un muret de clôture ne doit pas retenir de terre (au-delà de 50 cm de terre : mur de soutènement calculé, avec drain et barbacanes).'
            ];
            return {
                resume: [{ l: 'Béton semelle', v: `${fm(volS)} m³` }, { l: 'Surface de mur', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), infos, recette: aideBeton(volS, 300, v.mode, ctx, infos),
                mesure: { q: v.L, u: 'm', h: v.L * (v.h * 1.4 + 0.8 + faces * v.h * 0.5) }
            };
        }
    },
    {
        id: 'ouverture', cat: 'murs', ic: '🚪', nom: 'Ouverture dans mur porteur',
        desc: 'Porte ou fenêtre dans un mur en agglo ou en pierre',
        champs: [
            c('mur', 'Le mur', [{ v: 'agglo', l: 'Agglo / brique' }, { v: 'pierre', l: 'Pierre' }], 'agglo'),
            n('larg', 'Largeur', 'm', 1.2, { demi: true, max: 6 }),
            n('haut', 'Hauteur', 'm', 2.15, { demi: true, max: 4 }),
            n('ep', 'Épaisseur du mur', 'cm', 20, { max: 120, bas: 8 }),
            c('linteau', 'Linteau', [{ v: 'ipn', l: 'IPN / HEA' }, { v: 'beton', l: 'Linteau préfa' }], 'ipn')
        ],
        mots: 'ouverture percement baie porte fenêtre ipn hea linteau étai aiguille chevalement mur porteur',
        titre: v => `Ouverture ${fm(v.larg)}×${fm(v.haut)} m (mur ${v.mur === 'pierre' ? 'pierre ' : ''}${fm(v.ep)} cm)`,
        calcul(v, ctx) {
            const pierre = v.mur === 'pierre';
            const nb = v.ep <= 25 ? 1 : v.ep <= 45 ? 2 : 3;
            const appui = v.larg > 2 ? 0.3 : 0.2;
            const lg = Math.round((v.larg + 2 * appui) * 100) / 100;
            const demol = v.larg * v.haut * v.ep / 100;
            const gravats = demol * 1.5;
            const volMort = (2 * v.haut + v.larg) * v.ep / 100 * 0.05 * PERTE_MORTIER;
            const volSommier = 2 * 0.3 * 0.2 * v.ep / 100 * PERTE_BETON;
            const lignes = [
                L(v.linteau === 'ipn' ? 'ipn' : 'linteau', nb * lg, { d: `${nb} × ${fm(lg)} m (${Math.round(appui * 100)} cm d'appui de chaque côté)` }),
                L('etai', 2 * (Math.ceil(v.larg / 0.8 - 1e-9) + 1)),
                ...lignesMortier(volMort, pierre ? { liant: 'chaux', dosage: 300 } : {}),
                ...lignesBeton(volSommier, 350),
                L('mortier_sr', 25 * nb, { d: 'calage des profilés sur les sommiers' })
            ];
            if (gravats > 0.8) lignes.push(L('benne6', Math.ceil(gravats / 6 - 1e-9)));
            return {
                resume: [{ l: 'Maçonnerie à démolir', v: `${fm(demol)} m³` }, { l: 'Gravats (≈ ' + fmtSmart(gravats * 1.5, 1) + ' T)', v: `${fm(gravats)} m³` }],
                lignes: fusion(lignes),
                infos: [
                    nb > 1 ? `Mur de ${fm(v.ep)} cm : ${nb} profilés côte à côte, solidarisés (plats + tiges filetées ou boulons).` : '1 profilé pour un mur de 20 cm.',
                    'Étaiement par aiguilles et chevalement (étais des deux côtés), pas seulement des étais contre le mur. Sommiers béton sous les appuis, calage au mortier sans retrait.',
                    pierre ? 'Mur en pierre : sonder le mur avant (fourrure, vides), ouvrir par saignées d\'un côté puis de l\'autre, reprises des tableaux à la chaux.' : null,
                    'Note de calcul d\'un bureau d\'études dès qu\'il y a un étage ou une charpente au-dessus. Mur mitoyen : accord du voisin. Façade : déclaration préalable en mairie.',
                    'Gravats de maçonnerie : benne de 6 m³ maxi (trop lourd au-delà).'
                ].filter(Boolean),
                recette: null,
                mesure: { q: 1, u: 'forfait', h: (pierre ? 32 : 24) * Math.max(1, v.ep / 30) }
            };
        }
    },

    // ════════════════ ENDUITS & JOINTS ════════════════
    {
        id: 'enduit', cat: 'enduits', ic: '🖌️', nom: 'Enduit de façade',
        desc: 'Monocouche ou traditionnel 3 couches (agglo, brique)',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('h', 'Hauteur', 'm', 3, { demi: true, max: 20 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            c('type', 'Type d\'enduit', [{ v: 'mono', l: 'Monocouche' }, { v: 'trad', l: 'Traditionnel 3 couches' }], 'mono'),
            c('liant', 'Mortier', [{ v: 'batard', l: 'Bâtard (ciment + chaux)' }, { v: 'ciment', l: 'Ciment' }], 'batard', { si: v => v.type === 'trad' }),
            n('epMono', 'Épaisseur', 'cm', 1.5, { max: 5, bas: 1, si: v => v.type === 'mono', aide: '10 mm minimum en tout point.' }),
            n('epTrad', 'Épaisseur totale', 'cm', 2.2, { max: 6, bas: 1.5, si: v => v.type === 'trad', aide: 'Gobetis 3-5 mm + corps 15-20 mm + finition 5-7 mm.' }),
            n('angles', 'Angles de façade', 'u', 0, { zero: true, aide: 'Pour les baguettes d\'angle.' })
        ],
        mots: 'crépi façade monocouche gobetis bâtard enduit ciment',
        verifier: verifOuv(),
        titre: v => `Enduit ${v.type === 'mono' ? 'monocouche' : 'traditionnel'} ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const lignes = [];
            const infos = [];
            let recette = null;
            if (v.type === 'mono') {
                lignes.push(L('enduit_mono', S * v.epMono * 17 * PERTE_MORTIER));
                infos.push('Monocouche : ≈ 17 kg par m² et par cm (≈ 25 kg/m² en 15 mm), en 2 passes frais dans frais. Pertes 10 % comprises.');
            } else {
                // Dosages dégressifs : chaque couche moins dosée que celle du dessous
                const ep = v.epTrad / 100;
                const gob = 0.004, fin = 0.006, corps = Math.max(0.005, ep - gob - fin);
                const l = v.liant;
                lignes.push(
                    ...lignesMortier(S * gob * PERTE_MORTIER, { liant: 'ciment', dosage: 500 }),
                    ...lignesMortier(S * corps * PERTE_MORTIER, { liant: l, dosage: 400 }),
                    ...lignesMortier(S * fin * PERTE_MORTIER, { liant: l, dosage: 300, sable: 'sable02' })
                );
                infos.push(`3 couches : gobetis au ciment (≈ 500 kg/m³, 4 mm), corps d'enduit ${l === 'batard' ? 'bâtard' : 'ciment'} (≈ 400, ${fmtSmart(corps * 1000, 0)} mm), finition (≈ 300, sable fin, 6 mm).`);
                if (l === 'ciment') infos.push('Le bâtard (moitié ciment, moitié chaux) fissure moins que le ciment pur.');
                recette = recetteMortier(400, ctx.sacCiment || 35, l);
            }
            infos.push(CONSEILS.pierreCiment);
            if (v.angles > 0) lignes.push(L('baguette', Math.ceil(v.angles * v.h / 3 - 1e-9)));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), infos, recette,
                mesure: { q: S, u: 'm²', h: S * (v.type === 'mono' ? 0.5 : 1.0) }
            };
        }
    },
    {
        id: 'chaux', cat: 'enduits', ic: '🎨', nom: 'Enduit à la chaux',
        desc: 'Gobetis, corps d\'enduit, finition',
        champs: [
            n('L', 'Longueur', 'm', 8, { demi: true }),
            n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 20 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            n('ep', 'Épaisseur totale', 'cm', 2.5, { max: 6, bas: 1, aide: 'Gobetis 5 mm + corps 15 mm + finition 5 mm.' })
        ],
        mots: 'enduit chaux nhl gobetis corps finition bâti ancien pierre talochée grattée',
        verifier: verifOuv(),
        titre: v => `Enduit chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const ep = v.ep / 100;
            const gob = Math.min(0.005, ep / 3), fin = Math.min(0.005, ep / 3), corps = Math.max(0, ep - gob - fin);
            const lignes = [
                ...lignesMortier(S * gob * PERTE_MORTIER, { liant: 'chaux', dosage: 450 }),
                ...lignesMortier(S * corps * PERTE_MORTIER, { liant: 'chaux', dosage: 325 }),
                ...lignesMortier(S * fin * PERTE_MORTIER, { liant: 'chaux', dosage: 275, sable: 'sable02' })
            ];
            const vol = S * ep * PERTE_MORTIER;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes),
                infos: [
                    'Dosages dégressifs : gobetis ≈ 450 kg/m³ (NHL 3,5 ou 5), corps ≈ 325 kg (NHL 3,5), finition ≈ 275 kg (NHL 2 ou chaux aérienne, sable fin 0/2). Pertes 10 % comprises.',
                    'Repère : 1 sac de 35 kg ≈ 55 L de chaux. Corps d\'enduit ≈ 1 volume de chaux pour 2 à 2,5 de sable.',
                    CONSEILS.chaux
                ],
                recette: recetteMortier(325, 35, 'chaux'),
                mesure: { q: S, u: 'm²', h: S * 1.5 }
            };
        }
    },
    {
        id: 'rejoint', cat: 'enduits', ic: '🧽', nom: 'Rejointoiement à la chaux',
        desc: 'Joints de pierre apparente',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 20 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            c('joint', 'Joints', [{ v: '8', l: 'Fins' }, { v: '15', l: 'Moyens' }, { v: '25', l: 'Larges / profonds' }], '15',
                { aide: 'Fins ≈ 8 L/m² · moyens ≈ 15 L/m² · larges ≈ 25 L/m².' })
        ],
        mots: 'joint rejointoiement dégarnissage pierre apparente chaux bâti ancien',
        verifier: verifOuv(),
        titre: v => `Rejointoiement chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * (+v.joint) / 1000 * PERTE_MORTIER;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fmtSmart(vol * 1000, 0)} L` }],
                lignes: fusion(lignesMortier(vol, { liant: 'chaux', dosage: 325 })),
                infos: [
                    'Dégarnir les joints sur 2 à 3 cm, brosser, humidifier. Mortier NHL 3,5 dosé ≈ 325 kg/m³ (1 pour 2 à 2,5) : jamais plus dur que la pierre. Pertes 10 % comprises.',
                    CONSEILS.chaux
                ],
                recette: recetteMortier(325, 35, 'chaux'),
                mesure: { q: S, u: 'm²', h: S * (v.joint === '25' ? 2 : 1.5) }
            };
        }
    },

    // ════════════════ TOITURE ════════════════
    {
        id: 'toiture', cat: 'toiture', ic: '🏠', nom: 'Charpente & couverture',
        desc: 'Fermettes ou traditionnelle, tuiles, gouttières',
        champs: [
            n('L', 'Longueur des murs', 'm', 10, { demi: true }),
            n('l', 'Largeur des murs', 'm', 8, { demi: true, max: 20 }),
            c('pans', 'Toit', [{ v: '2', l: '2 pans' }, { v: '4', l: '4 pans' }], '2'),
            n('pente', 'Pente', '%', 35, { demi: true, max: 200, aide: 'Canal ≈ 30 % · romane ≈ 35 % · ardoise ≈ 80 % · tuile plate ≈ 100 % (45°).' }),
            n('debord', 'Débord de toit', 'cm', 40, { demi: true, zero: true, max: 150 }),
            c('charpente', 'Charpente', [{ v: 'fermettes', l: 'Fermettes' }, { v: 'trad', l: 'Traditionnelle' }], 'fermettes'),
            c('couverture', 'Couverture', Object.entries(COUVERTURES).map(([v, x]) => ({ v, l: x.l })), 'meca'),
            oui('gouttieres', 'Gouttières et descentes')
        ],
        mots: 'toit toiture charpente fermette chevron panne tuile canal romane ardoise liteau écran gouttière faîtage',
        // Changement de couverture : on propose sa pente conseillée si la pente n'avait pas été retouchée
        surChoix(v, avant) {
            const a = COUVERTURES[avant.couverture], b = COUVERTURES[v.couverture];
            if (a && b && a !== b && String(v.pente).replace(',', '.') === String(a.pente)) v.pente = String(b.pente);
        },
        titre: v => `Toiture ${v.pans} pans ${fm(v.L)}×${fm(v.l)} m, pente ${fm(v.pente)} %`,
        calcul(v, ctx) {
            const r = calcToiture({ ...v, pans: +v.pans, debord: v.debord / 100 });
            return {
                resume: [
                    { l: 'Surface de toit', v: `${fm(r.surf)} m²` },
                    { l: 'Rampant', v: `${fm(r.rampant)} m` },
                    { l: 'Hauteur du faîtage', v: `${fm(r.hFaitage)} m` }
                ],
                lignes: fusion(r.lignes),
                infos: [...r.infos, 'Tuiles : + 5 % de casse et de coupes. Écran sous-toiture : + 10 % de recouvrement.'],
                recette: null,
                mesure: { q: r.surf, u: 'm²', h: r.heures }
            };
        }
    },

    // ════════════════ INTÉRIEUR ════════════════
    {
        id: 'chape', cat: 'interieur', ic: '📏', nom: 'Chape ciment',
        desc: 'Adhérente ou flottante sur isolant',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            c('pose', 'Chape', [{ v: 'adh', l: 'Adhérente' }, { v: 'flot', l: 'Flottante (sur isolant)' }], 'adh'),
            n('ep', 'Épaisseur', 'cm', 5, { max: 15, bas: 3, aide: 'Adhérente : 3 à 5 cm. Flottante : 5 cm mini (6 cm sur plancher chauffant).' }),
            n('epIso', 'Épaisseur d\'isolant', 'mm', 60, { si: v => v.pose === 'flot', max: 200, aide: 'PSE ou PU certifié pour chape (SC1 a2 Ch).' }),
            c('arme', 'Armature', [{ v: 'treillis', l: 'Treillis de chape' }, { v: 'fibres', l: 'Fibres' }], 'treillis', { si: v => v.pose === 'flot' }),
            c('dosage', 'Dosage', [{ v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }], '350'),
            oui('bande', 'Bande périphérique')
        ],
        mots: 'chape mortier sol isolant flottante adhérente règle plancher chauffant',
        verifier: v => (v.pose === 'flot' && v.ep < 5 ? { ep: 'Chape flottante : 5 cm minimum (DTU 26.2)' } : {}),
        titre: v => `Chape ${v.pose === 'flot' ? 'flottante ' : ''}${fm(v.L)}×${fm(v.l)} m, ép. ${fm(v.ep)} cm`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const vol = S * v.ep / 100 * PERTE_BETON;
            const lignes = [...lignesMortier(vol, { dosage: +v.dosage, sableM3: 1.15 })];
            if (v.bande) lignes.push(L('bande_peri', 2 * (v.L + v.l) * 1.05));
            if (v.pose === 'flot') {
                lignes.push(L('isolant_chape', S * 1.05, { d: `${fmtSmart(v.epIso, 0)} mm` }), L('polyane', S * 1.15));
                if (v.arme === 'fibres') lignes.push(L('fibres_pp', vol * 0.6));
                else lignes.push(L('treillis_chape', S * 1.10, { d: 'posé à mi-épaisseur' }));
            }
            const infos = [
                `Chape dosée ${v.dosage} kg de ciment par m³, ≈ 1,15 m³ de sable par m³ (tirée à la règle). Pertes 5 % comprises.`,
                'Joints de fractionnement : tous les 40 m² et 8 m maxi. Bande périphérique sur toute la hauteur (chape + isolant).',
                'Pas sous 5 °C. Protéger du soleil et des courants d\'air 48 h. Séchage : carrelage collé après 15 jours mini, parquet collé ≈ 1 semaine par cm.'
            ];
            if (v.pose === 'flot') infos.splice(1, 0, 'Chape flottante : armée (treillis de chape à mi-épaisseur, ou fibres 0,6 kg/m³), sur film, désolidarisée des murs.');
            if (v.ep < 3) infos.push('Moins de 3 cm : préférer un ragréage.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: recetteMortier(+v.dosage, ctx.sacCiment || 35),
                mesure: { q: S, u: 'm²', h: S * (v.pose === 'flot' ? 0.5 : 0.35) }
            };
        }
    },
    {
        id: 'ragreage', cat: 'interieur', ic: '💧', nom: 'Ragréage',
        desc: 'Mise à niveau avant revêtement',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            n('ep', 'Épaisseur moyenne', 'mm', 5, { max: 30, bas: 3 }),
            oui('primaire', 'Primaire d\'accrochage')
        ],
        mots: 'ragréage autolissant niveau sol primaire',
        titre: v => `Ragréage ${fm(v.L * v.l)} m², ${fm(v.ep)} mm`,
        calcul(v) {
            const S = v.L * v.l;
            const lignes = [L('ragreage', S * v.ep * 1.6 * PERTE_BETON)];
            if (v.primaire) lignes.push(L('primaire', S * 0.15));
            const infos = ['≈ 1,6 kg par m² et par mm d\'épaisseur. Primaire ≈ 0,15 kg/m², obligatoire selon la notice. 3 mm minimum.',
                'Circulable après ≈ 3 h, carrelage après 24 h, parquet ou sol souple après 48 à 72 h.'];
            if (v.ep > 10) infos.unshift('Plus de 10 mm : ragréage épais ou fibré (voir la notice). Au-delà de 30 mm, faire une chape.');
            infos.push('Sur plancher bois ou ancien carrelage : ragréage fibré, 5 mm minimum.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, infos, recette: null, mesure: { q: S, u: 'm²', h: S * 0.15 }
            };
        }
    },
    {
        id: 'placo', cat: 'interieur', ic: '📐', nom: 'Plaques de plâtre (placo)',
        desc: 'Doublage collé ou sur appuis, cloison, plafond',
        champs: [
            c('type', 'Ouvrage', [
                { v: 'colle', l: 'Doublage collé' }, { v: 'appuis', l: 'Doublage sur appuis' },
                { v: 'cloison', l: 'Cloison' }, { v: 'plafond', l: 'Plafond' }
            ], 'colle'),
            n('a', 'Longueur', 'm', 4, { demi: true }),
            n('b', 'Hauteur', 'm', 2.5, { demi: true, max: 5, labelSi: v => v.type === 'plafond' ? 'Largeur' : 'Hauteur' }),
            c('complexe', 'Complexe collé (PSE graphite)', Object.entries(DOUBLAGE_COLLE).map(([k, x]) => ({ v: k, l: `${x.l} · R ${String(x.R).replace('.', ',')}` })), '120', { si: v => v.type === 'colle', aide: 'Neuf / aides : viser R ≥ 3,7 (13+120 ou plus).' }),
            c('laine', 'Laine', [{ v: '100', l: '100 mm' }, { v: '120', l: '120 mm' }, { v: '140', l: '140 mm' }, { v: '160', l: '160 mm' }], '120', { si: v => v.type === 'appuis', aide: 'λ 0,032 : 120 mm ≈ R 3,75.' }),
            c('cloison', 'Cloison', [{ v: '72', l: '72/48' }, { v: '98', l: '98/48 (2 plaques/face)' }, { v: '70', l: 'Ossature M70' }], '72', { si: v => v.type === 'cloison', aide: '72/48 : 2,60 m maxi (2,95 m en montants doublés).' }),
            n('portes', 'Portes', 'u', 0, { zero: true, max: 20, si: v => v.type === 'cloison' }),
            n('ouv', 'Fenêtres / ouvertures à déduire', 'm²', 0, { zero: true, si: v => v.type !== 'plafond' }),
            c('plaque', 'Plaques', [{ v: 'std', l: 'Standard' }, { v: 'h1', l: 'Hydro H1 (salle de bain)' }, { v: 'phon', l: 'Phonique' }], 'std', { si: v => v.type !== 'colle' }),
            n('angles', 'Angles sortants (bande armée)', 'm', 0, { zero: true, max: 200, aide: 'Longueur totale des angles saillants et tableaux.' }),
            oui('isolant', 'Avec isolant (et pare-vapeur)', true, { si: v => v.type !== 'colle' })
        ],
        mots: 'placo plaque de plâtre ba13 doublage collé placomur doublissimo cloison plafond rail montant fourrure suspente optima map h1 hydrofuge',
        verifier: v => {
            if (v.type === 'cloison') {
                const lim = LIMITES_CLOISON[v.cloison] || LIMITES_CLOISON['72'];
                if (v.b > lim.double + 1e-9) return { b: v.cloison === '70' ? `Plus de ${fmtSmart(lim.double, 2)} m : voir le PV du fabricant` : `Trop haut en ${v.cloison}/48 (${fmtSmart(lim.double, 2)} m maxi) : passe en 98/48 ou M70` };
            }
            if (v.type === 'colle' && v.b > 3) return { b: 'Doublage collé : 3 m maxi d\'un seul tenant' };
            return v.type !== 'plafond' ? verifOuv('a', 'b')(v) : {};
        },
        titre: v => `${{ colle: 'Doublage collé', appuis: 'Doublage sur appuis', cloison: 'Cloison', plafond: 'Plafond' }[v.type] || 'Placo'} ${fm(v.a)}×${fm(v.b)} m`,
        calcul(v) {
            const r = calcPlaco(v.type, v.a, v.b, {
                cloison: v.cloison, plaque: v.plaque, isolant: v.isolant, ouv: v.type === 'plafond' ? 0 : v.ouv,
                portes: v.portes, laine: +v.laine, complexe: v.complexe, angles: v.angles
            });
            const infos = [...r.infos,
                'Poser hors d\'eau et hors d\'air. Plaques stockées à plat au sec, surélevées de 1 cm en pied, joints décalés de 40 cm mini.',
                'Enduit à joint en 3 passes (24 h entre passes). Salle de bain, cuisine : plaques H1.',
                'Couper le courant avant de percer. Masque FFP2 pour le ponçage et la laine.'];
            return {
                resume: [{ l: 'Surface', v: `${fm(r.S)} m²` }, ...(v.type !== 'plafond' ? [{ l: 'Plaques', v: `1,20 × ${fmtSmart(r.Lp, 2)} m` }] : [])],
                lignes: fusion(r.lignes), infos, recette: null,
                mesure: { q: r.S, u: 'm²', h: r.S * ({ colle: 0.45, appuis: 0.7, cloison: 0.9, plafond: 0.8 }[v.type] || 0.7) }
            };
        }
    },
    {
        id: 'isolation', cat: 'interieur', ic: '🧶', nom: 'Isolation des combles',
        desc: 'Laine soufflée, rouleaux, ou rampants aménagés',
        champs: [
            c('type', 'Combles', [{ v: 'souffle', l: 'Perdus : soufflé' }, { v: 'rouleau', l: 'Perdus : rouleaux' }, { v: 'rampants', l: 'Aménagés (rampants)' }], 'souffle'),
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('l', 'Largeur', 'm', 8, { demi: true, aide: 'Rampants : longueur × longueur de rampant (les 2 pans).' }),
            c('mat', 'Matériau', Object.entries(SOUFFLAGE).map(([k, x]) => ({ v: k, l: x.l })), 'verre', { si: v => v.type === 'souffle' }),
            c('R', 'Résistance visée', [{ v: '7', l: 'R 7' }, { v: '8', l: 'R 8' }, { v: '10', l: 'R 10' }], '8', { si: v => v.type === 'souffle', aide: 'Neuf (RE2020) et aides : R 8 à 10.' }),
            c('ep', 'Épaisseur', [{ v: '200', l: '200 mm' }, { v: '300', l: '300 mm' }, { v: '400', l: '400 mm' }], '300', { si: v => v.type === 'rouleau' }),
            c('lambda', 'Lambda (λ) de la laine', [{ v: '0.032', l: '0,032' }, { v: '0.035', l: '0,035' }, { v: '0.040', l: '0,040' }], '0.040', { si: v => v.type === 'rouleau', aide: 'Écrit sur le paquet. Plus il est petit, plus ça isole.' }),
            c('plaque', 'Plaques', [{ v: 'std', l: 'Standard' }, { v: 'h1', l: 'Hydro H1' }], 'std', { si: v => v.type === 'rampants' }),
            oui('pv', 'Pare-vapeur', true, { si: v => v.type !== 'rampants' })
        ],
        mots: 'isolation laine combles grenier soufflé soufflage ouate rampants pare-vapeur',
        titre: v => `Isolation ${v.type === 'rampants' ? 'sous rampants' : 'combles'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            let lignes, infos, R, h;
            if (v.type === 'souffle') {
                const r = calcSoufflage(S, v.mat, +v.R, { pareVapeur: v.pv });
                lignes = r.lignes; R = +v.R; h = S * 0.12;
                infos = [`${SOUFFLAGE[v.mat].l} : ${fmtSmart(r.eSouffle * 1000, 0)} mm à souffler (tassement compris) pour R ${v.R}. Valeurs de la notice à vérifier sur le sac.`,
                    'Piges graduées (1 pour 50 m²), rehausse de trappe, fiche de soufflage affichée près de la trappe.',
                    'Écart au feu du conduit de fumée, capots sur les spots, gaines de VMC posées sur l\'isolant.'];
            } else if (v.type === 'rouleau') {
                R = (+v.ep) / 1000 / (+v.lambda);
                lignes = [L('laine_combles', S * 1.05, { d: `${v.ep} mm, λ ${String(v.lambda).replace('.', ',')} → R ${fmtSmart(R, 1)}` })];
                if (v.pv) lignes.push(...lignesPareVapeur(S, 2 * (v.L + v.l)));
                h = S * 0.15;
                infos = [`R = épaisseur ÷ λ = ${fmtSmart(R, 1)}. En 2 couches croisées si possible. +5 % de coupes.`];
            } else {
                const r = calcRampants(S, { plaque: v.plaque });
                lignes = r.lignes; R = r.R; h = S * 1.1;
                infos = [`Laine en 2 couches (100 mm entre chevrons + 140 mm croisée), λ 0,032 : R ≈ ${fmtSmart(r.R, 1)}. Lame d'air de 2 cm sous l'écran s'il n'est pas HPV.`,
                    'Fourrures F530 perpendiculaires aux chevrons tous les 50 cm, suspentes de rampant ≈ 1,8 par m².'];
            }
            infos.push('Pare-vapeur toujours côté chaud, continu, scotché et mastiqué aux bords et aux traversées.',
                'Masque FFP2, lunettes, gants. En combles : planches de circulation, jamais marcher sur le plafond.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Résistance', v: `R ${fmtSmart(R, 1)}` }],
                lignes: fusion(lignes), infos, recette: null,
                mesure: { q: S, u: 'm²', h }
            };
        }
    },
    {
        id: 'carrelage', cat: 'interieur', ic: '🔳', nom: 'Carrelage / faïence',
        desc: 'Carreaux, colle, joints, croisillons, douche',
        champs: [
            c('support', 'Où', [{ v: 'sol', l: 'Sol' }, { v: 'mur', l: 'Mur (faïence)' }, { v: 'ext', l: 'Sol extérieur' }], 'sol'),
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3, { demi: true, labelSi: v => v.support === 'mur' ? 'Hauteur' : 'Largeur', aide: '' }),
            c('format', 'Format des carreaux', [{ v: 'petit', l: 'Jusqu\'à 30 cm' }, { v: 'moyen', l: '30 à 45 cm' }, { v: 'grand', l: '45 à 60 cm' }, { v: 'tgf', l: 'Plus de 60 cm' }], 'moyen'),
            c('joint', 'Largeur de joint', [{ v: '2', l: '2 mm' }, { v: '3', l: '3 mm' }, { v: '5', l: '5 mm' }], '3', { aide: '2 mm mini en rectifié, 3 mm en non rectifié.' }),
            c('pose', 'Pose', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            n('sDouche', 'Surface de douche à protéger (SPEC)', 'm²', 0, { zero: true, max: 50, aide: 'Murs de douche sur 2 m de haut + sol. 0 si pas de douche.' }),
            n('portes', 'Portes', 'u', 1, { zero: true, max: 10, si: v => v.support !== 'mur', aide: 'Pour retirer les plinthes au droit des portes.' }),
            oui('plinthes', 'Plinthes', true, { si: v => v.support !== 'mur' }),
            oui('primaire', 'Primaire (ragréage, anhydrite, ancien carrelage)', false),
            oui('natte', 'Natte de désolidarisation (support fissuré, plancher bois)', false, { si: v => v.support === 'sol' })
        ],
        mots: 'carrelage faïence carreau colle joint plinthe double encollage croisillon spec douche',
        titre: v => `${v.support === 'mur' ? 'Faïence' : 'Carrelage'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const marge = v.pose === 'diag' ? 1.15 : 1.10;
            const mur = v.support === 'mur', ext = v.support === 'ext';
            const dim = { petit: 0.2, moyen: 0.4, grand: 0.6, tgf: 0.9 }[v.format];          // côté représentatif (m)
            const epC = { petit: 8, moyen: 9, grand: 10, tgf: 10 }[v.format];                 // épaisseur du carreau (mm)
            const double = v.format === 'grand' || v.format === 'tgf' || (ext && v.format !== 'petit') || (mur && v.format !== 'petit' && v.format !== 'moyen');
            const colle = mur ? (double ? 6 : 3.5) : ({ petit: 3.5, moyen: 5, grand: 7, tgf: 8 }[v.format]);
            const A = dim * 1000;
            const jointKg = (2 * A) / (A * A) * epC * (+v.joint) * 1.6 * 1.10;
            const lignes = [
                L('carrelage', S * marge),
                L('colle_carrelage', S * (ext && !double ? 6 : colle)),
                L('joint_carrelage', S * jointKg),
                L('croisillon', Math.ceil(S * 1.1 / (dim * dim)))
            ];
            if (dim >= 0.45) lignes.push(L('cale_nivel', Math.ceil(S * 4.4 / (dim * dim))));
            if (v.sDouche > 0) lignes.push(L('spec', v.sDouche * 1.5), L('primaire', v.sDouche * 0.10), L('bande_spec', v.sDouche * 0.8), L('silicone', 2));
            if (v.primaire) lignes.push(L('primaire', S * 0.15));
            if (v.natte && v.support === 'sol') lignes.push(L('natte_desol', S * 1.05));
            if (!mur && v.plinthes) lignes.push(L('plinthe', Math.max(0, 2 * (v.L + v.l) - 0.9 * v.portes) * 1.10));
            if (!mur) lignes.push(L('acrylique', Math.ceil(2 * (v.L + v.l) / 10 - 1e-9), { d: 'joint périphérique' }));
            const infos = [
                `Coupes : +${Math.round((marge - 1) * 100)} %. Colle C2 ≈ ${fmtSmart(ext && !double ? 6 : colle, 1)} kg/m²${double ? ' (double encollage)' : ''}, joint ≈ ${fmtSmart(jointKg, 2)} kg/m² (joint de ${v.joint} mm).`,
                'Dos du carreau couvert à 80 % mini (soulever un carreau pour vérifier). Jointoyer après 24 h. Joint périphérique de 5 mm au mastic.',
                `Fractionnement : ${ext ? 'tous les 16-20 m² et 4-5 m en extérieur' : 'tous les 40 m² et 8 m'} (ou suivre ceux du support).`,
                'Support : dalle d\'1 mois, chape de 15 jours mini. Plancher chauffant mis en chauffe puis arrêté 48 h avant.'
            ];
            if (v.format === 'tgf') infos.splice(1, 0, 'Plus de 60 × 60 : hors DTU courant, colle C2 S1 et notice du fabricant.');
            if (v.sDouche > 0) infos.push(`SPEC sur ${fm(v.sDouche)} m² : 2 couches croisées (≈ 1,5 kg/m²) sur primaire, bandes dans les angles, manchettes aux tuyaux. Faïence de douche sur 2 m de haut mini.`);
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'À commander', v: `${fm(S * marge)} m²` }],
                lignes: fusion(lignes), recette: null, infos,
                mesure: { q: S, u: 'm²', h: S * (mur ? 1 : 0.8) * (v.pose === 'diag' ? 1.25 : 1) + v.sDouche * 0.4 }
            };
        }
    },
    {
        id: 'parquet', cat: 'interieur', ic: '🪵', nom: 'Parquet',
        desc: 'Flottant ou collé : lames, sous-couche, plinthes',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            c('mode', 'Pose', [{ v: 'flottant', l: 'Flottante' }, { v: 'colle', l: 'Collée' }], 'flottant'),
            c('pose', 'Sens', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            oui('mineral', 'Sur dalle ou chape (film 200 µm)', true, { si: v => v.mode === 'flottant', aide: 'Inutile si la sous-couche a un pare-vapeur intégré.' }),
            n('portes', 'Portes', 'u', 1, { zero: true, max: 10 }),
            oui('plinthes', 'Plinthes')
        ],
        mots: 'parquet stratifié contrecollé lame sous-couche plinthe colle',
        titre: v => `Parquet ${v.mode === 'colle' ? 'collé' : 'flottant'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const lignes = [L('parquet', S * (v.pose === 'diag' ? 1.12 : 1.07))];
            if (v.mode === 'flottant') {
                lignes.push(L('sous_couche', S * 1.05));
                if (v.mineral) lignes.push(L('polyane200', S * 1.15));
            } else lignes.push(L('colle_parquet', S * 1.1 * 1.05), L('primaire', S * 0.15, { d: 'selon le support' }));
            if (v.plinthes) lignes.push(L('plinthe', Math.max(0, 2 * (v.L + v.l) - 0.9 * v.portes) * 1.10));
            if (v.portes > 0) lignes.push(L('barre_seuil', v.portes));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, recette: null,
                infos: [
                    'Coupes : +7 % en pose droite, +12 % en diagonale. Arrondir au paquet entier.',
                    v.mode === 'colle' ? 'Colle MS polymère ≈ 1,1 kg/m² (spatule B11). Chape sèche : ≈ 1 semaine par cm, 3 % d\'humidité maxi.' : 'Film 200 µm remonté de 20 cm sur support minéral. Jeu de 8 à 10 mm en périphérie.',
                    'Acclimater les paquets 48 h dans la pièce. Fractionner au-delà de 8 m de large ou 10 m de long, et à chaque porte.'
                ],
                mesure: { q: S, u: 'm²', h: S * (v.mode === 'colle' ? 0.5 : 0.35) }
            };
        }
    },
    {
        id: 'peinture', cat: 'interieur', ic: '🖼️', nom: 'Peinture d\'une pièce',
        desc: 'Murs et plafond, impression, finition',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 8 }),
            oui('murs', 'Murs'),
            oui('plafond', 'Plafond'),
            n('ouv', 'Portes et fenêtres', 'm²', 4, { zero: true, si: v => v.murs }),
            c('couches', 'Couches de finition', [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }], '2'),
            oui('impression', 'Impression (plaques ou enduit neufs)'),
            c('lissage', 'Préparation', [{ v: '0', l: 'Aucune' }, { v: 'B', l: 'Rebouchage' }, { v: 'A', l: 'Lissage complet' }], '0')
        ],
        mots: 'peinture impression sous-couche mur plafond pot enduit lissage',
        verifier: v => (!v.murs && !v.plafond ? { L: 'Choisis murs et/ou plafond' } : {}),
        titre: v => `Peinture pièce ${fm(v.L)}×${fm(v.l)} m`,
        calcul(v) {
            const Sm = v.murs ? Math.max(0, 2 * (v.L + v.l) * v.h - (v.ouv || 0)) : 0;
            const Sp = v.plafond ? v.L * v.l : 0;
            const S = Sm + Sp;
            const k = +v.couches;
            const lignes = [];
            if (v.impression) lignes.push(L('impression', S / 8 * 1.05));
            if (Sm) lignes.push(L('peinture', Sm * k / 10 * 1.05, { d: `${k} couche(s)` }));
            if (Sp) lignes.push(L('peinture_plafond', Sp * k / 10 * 1.05, { d: `${k} couche(s)` }));
            if (v.lissage !== '0') lignes.push(L('enduit_lissage', S * (v.lissage === 'A' ? 1.0 : 0.2)));
            lignes.push(L('ruban', 2 * 2 * (v.L + v.l)), L('bache', v.L * v.l * 1.1));
            return {
                resume: [{ l: 'Murs', v: `${fm(Sm)} m²` }, { l: 'Plafond', v: `${fm(Sp)} m²` }],
                lignes, recette: null,
                infos: [
                    'Impression ≈ 8 m²/L, finition ≈ 10 m²/L par couche (voir le pot). Lissage complet : 2 passes de ≈ 0,5 kg/m².',
                    'Pas sous 5 °C ni au-dessus de 80 % d\'humidité. Plâtre sec (moins de 5 %). Impression puis 12 à 24 h avant la finition, ≈ 6 h entre couches.'
                ],
                mesure: { q: S, u: 'm²', h: S * (0.12 * (k + (v.impression ? 1 : 0)) + (v.lissage === 'A' ? 0.4 : v.lissage === 'B' ? 0.1 : 0)) }
            };
        }
    },

    // ════════════════ EXTÉRIEUR & TERRASSEMENT ════════════════
    {
        id: 'terrassement', cat: 'exterieur', ic: '🚜', nom: 'Terrassement & évacuation',
        desc: 'Déblais, mini-pelle, bennes',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('l', 'Largeur', 'm', 8, { demi: true }),
            n('p', 'Profondeur', 'm', 0.3, { max: 5 }),
            c('sol', 'Terrain', [{ v: '1.25', l: 'Terre' }, { v: '1.35', l: 'Argile' }, { v: '1.5', l: 'Roche / gravats' }], '1.25'),
            oui('evac', 'Évacuer les déblais')
        ],
        mots: 'terrassement déblai décaissement fouille mini-pelle benne évacuation terre gravats foisonnement',
        titre: v => `Terrassement ${fm(v.L * v.l * v.p)} m³`,
        calcul(v) {
            const vol = v.L * v.l * v.p;
            const volF = vol * (+v.sol);
            const jours = Math.max(1, Math.ceil(vol / 40 - 1e-9));
            const lignes = [L('mini_pelle', jours)];
            const lourd = v.sol === '1.5';
            if (v.evac) lignes.push(lourd ? L('benne6', Math.ceil(volF / 6 - 1e-9)) : L('benne', Math.ceil(volF / 8 - 1e-9)));
            const infos = [`Foisonnement ×${String(v.sol).replace('.', ',')} : la terre sortie prend plus de place.`,
                `Mini-pelle 2,5 T : environ 40 m³ par jour. ${lourd ? 'Roche / gravats : bennes de 6 m³ maxi (poids).' : 'Bennes de 8 m³ pour la terre.'}`,
                CONSEILS.dict, 'Conduite de mini-pelle : CACES R482 ou autorisation de conduite.'];
            if (v.p > 1.3) infos.unshift('Plus de 1,30 m de profondeur : blindage des parois obligatoire, personne dans la fouille sans protection.');
            return {
                resume: [{ l: 'Volume en place', v: `${fm(vol)} m³` }, { l: 'Volume foisonné', v: `${fm(volF)} m³` }],
                lignes, recette: null,
                infos,
                mesure: { q: vol, u: 'm³', h: jours * 8 }
            };
        }
    },
    {
        id: 'plots', cat: 'exterieur', ic: '🟫', nom: 'Terrasse sur plots',
        desc: 'Dalles sur plots réglables',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            c('format', 'Dalles', [{ v: '0.6', l: '60×60' }, { v: '0.5', l: '50×50' }, { v: '0.4', l: '40×40' }], '0.6'),
            oui('dalles', 'Compter les dalles'),
            oui('geotextile', 'Géotextile')
        ],
        mots: 'terrasse plot dalle sur plot géotextile',
        titre: v => `Terrasse sur plots ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l, a = +v.format;
            const plots = Math.ceil((Math.ceil(v.L / a - 1e-9) + 1) * (Math.ceil(v.l / a - 1e-9) + 1) * 1.05);
            const lignes = [L('plot', plots)];
            if (v.dalles) lignes.push(L('dalle_ter', S * 1.05));
            if (v.geotextile) lignes.push(L('geotextile', S * 1.10));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, recette: null,
                infos: ['1 plot à chaque croisement de dalles, + 5 %.'],
                mesure: { q: S, u: 'm²', h: S * 0.6 }
            };
        }
    },
    {
        id: 'piscine', cat: 'exterieur', ic: '🏊', nom: 'Piscine maçonnée',
        desc: 'Structure : radier + murs en blocs à bancher',
        champs: [
            n('L', 'Longueur', 'm', 8, { demi: true, max: 30 }),
            n('l', 'Largeur', 'm', 4, { demi: true, max: 15 }),
            n('p', 'Profondeur', 'm', 1.5, { demi: true, max: 3 }),
            n('ep', 'Épaisseur du radier', 'cm', 20, { demi: true, max: 40 }),
            oui('herisson', 'Hérisson sous radier (15 cm)'),
            oui('enduit', 'Enduit d\'étanchéité', false),
            MODE
        ],
        mots: 'piscine bassin radier bloc à bancher',
        titre: v => `Piscine ${fm(v.L)}×${fm(v.l)} m, prof. ${fm(v.p)} m`,
        calcul(v, ctx) {
            const perim = 2 * (v.L + v.l);
            const surfMurs = perim * v.p;
            const Srad = (v.L + 0.4) * (v.l + 0.4);
            const volRad = Srad * v.ep / 100 * PERTE_BETON;
            const ferML = perim / 0.4 * (v.p + 0.5) + Math.ceil(v.p / 0.4 - 1e-9) * perim;
            const terre = (v.L + 1) * (v.l + 1) * (v.p + v.ep / 100 + (v.herisson ? 0.15 : 0));
            const lignes = [
                ...lignesBeton(volRad, 350, v.mode),
                L('treillis36', Math.ceil(Srad / TREILLIS_UTILE['36'] - 1e-9) * 2, { d: '2 nappes' }),
                ...lignesMurBlocs(surfMurs, 'bancher', 0, 0, v.mode),
                L('fer10', Math.ceil(ferML * 1.1 / 6)),
                ...lignesChainage(perim, { mode: v.mode }),
                L('polyane', Srad * 1.15)
            ];
            if (v.herisson) lignes.push(L('herisson', (v.L + 1) * (v.l + 1) * 0.15 * 1.8));
            if (v.enduit) lignes.push(L('enduit_etanche', (surfMurs + v.L * v.l) * 4));
            lignes.push(L('mini_pelle', Math.max(1, Math.ceil(terre / 40 - 1e-9))));
            lignes.push(L('benne', Math.ceil(terre * 1.25 / 8 - 1e-9)));
            const volMurs = surfMurs * 0.14 * PERTE_BETON;
            const infos = [
                `Terrassement : ${fm(terre)} m³ en place (≈ ${fm(terre * 1.25)} m³ foisonnés).`,
                `Murs : ${fm(surfMurs)} m² de blocs à bancher remplis (≈ ${fm(volMurs)} m³ de béton).`,
                'Hors étanchéité / liner, filtration, margelles et plage.',
                'Prévoir drainage et puits de décompression (le bassin vide peut remonter). Clôture ou alarme obligatoire.',
                CONSEILS.dict, CONSEILS.structure
            ];
            return {
                resume: [{ l: 'Béton total', v: `${fm(volRad + volMurs + perim * 0.025 * PERTE_BETON)} m³` }, { l: 'Plan d\'eau', v: `${fm(v.L * v.l)} m²` }],
                lignes: fusion(lignes), infos,
                recette: aideBeton(volRad + volMurs, 350, v.mode, ctx, infos),
                mesure: { q: v.L * v.l, u: 'm²', h: v.L * v.l * 6 }
            };
        }
    },

    // ════════════════ RÉNOVATION & DÉMOLITION ════════════════
    {
        id: 'sousoeuvre', cat: 'renovation', ic: '🦺', nom: 'Reprise en sous-œuvre',
        desc: 'Fondation reprise sous un mur existant, par passes',
        champs: [
            n('L', 'Longueur de mur à reprendre', 'm', 6),
            n('ep', 'Épaisseur du mur', 'cm', 40, { demi: true, max: 120, bas: 15 }),
            n('larg', 'Largeur de la reprise', 'cm', 60, { demi: true, max: 150, bas: 20, aide: 'Mur + 10 cm de chaque côté environ.' }),
            n('h', 'Hauteur de béton', 'cm', 50, { demi: true, max: 200, bas: 20 }),
            n('passe', 'Longueur d\'une passe', 'm', 1, { demi: true, max: 1.5, aide: '1 à 1,20 m maxi.' }),
            MODE
        ],
        mots: 'sous-oeuvre sous-œuvre reprise fondation passe alternée clavage mortier sans retrait fissure tassement',
        titre: v => `Reprise en sous-œuvre ${fm(v.L)} m, ${fm(v.larg)}×${fm(v.h)} cm`,
        calcul(v, ctx) {
            const passes = Math.ceil(v.L / v.passe - 1e-9);
            const vol = v.L * v.larg / 100 * v.h / 100 * PERTE_BETON;
            const terre = v.L * (v.larg / 100 + 0.6) * (v.h / 100 + 0.3);
            const clavage = v.L * v.ep / 100 * 0.03 * 2000;                 // 3 cm de clavage
            const lignes = [
                ...lignesBeton(vol, 350, v.mode),
                L('fer10', Math.ceil(v.L * 4 * 1.25 / 6), { d: '4 filants + recouvrements entre passes' }),
                L('mortier_sr', clavage, { d: 'clavage sous le mur existant (3 cm)' }),
                L('etai', 2 * Math.min(passes, 3)),
                L('planche', v.L * 2 * 1.1, { d: 'blindage / coffrage' })
            ];
            const series = passes <= 3 ? passes : 3;
            const infos = [
                `${passes} passes de ${fm(v.passe)} m, faites en ${series} séries alternées (1, 4, 7… puis 2, 5, 8… puis 3, 6, 9…). Jamais deux passes voisines ouvertes en même temps.`,
                'Bétonner à 3-5 cm sous le mur, attendre 48 h, puis claver au mortier sans retrait bien bourré. Passe suivante après 7 jours.',
                `Terre à sortir : ≈ ${fm(terre)} m³ (à la main ou à la mini-pelle selon l'accès).`,
                'Travaux de structure : étude d\'un bureau d\'études obligatoire (cause du désordre, profondeur, sol). Étaiement si le mur est fissuré ou chargé.',
                CONSEILS.dict
            ];
            return {
                resume: [{ l: 'Passes', v: `${passes}` }, { l: 'Béton', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: aideBeton(vol, 350, v.mode, ctx, infos),
                mesure: { q: v.L, u: 'm', h: v.L * 8 }
            };
        }
    },
    {
        id: 'demolition', cat: 'renovation', ic: '⛏️', nom: 'Démolition & piquage',
        desc: 'Piquage d\'enduit, mur, cloison, dalle : gravats et bennes',
        champs: [
            c('type', 'Je démolis', [
                { v: 'piquage', l: 'Piquage d\'enduit' }, { v: 'joints', l: 'Dégarnissage de joints' },
                { v: 'mur', l: 'Mur' }, { v: 'cloison', l: 'Cloison' }, { v: 'dalle', l: 'Dalle béton' }
            ], 'piquage'),
            n('L', 'Longueur', 'm', 8, { demi: true }),
            n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 20, labelSi: v => v.type === 'dalle' ? 'Largeur' : 'Hauteur' }),
            n('ep', 'Épaisseur', 'cm', 3, { max: 120, labelSi: v => v.type === 'piquage' ? 'Épaisseur d\'enduit' : v.type === 'joints' ? 'Profondeur des joints' : 'Épaisseur' }),
            c('mat', 'Matériau du mur', [{ v: '1.3', l: 'Agglo creux' }, { v: '2.2', l: 'Pierre / plein' }, { v: '1.8', l: 'Brique' }], '2.2', { si: v => v.type === 'mur' })
        ],
        mots: 'démolition piquage décroûtage enduit dégarnissage joint gravats benne casse burineur',
        titre: v => ({ piquage: 'Piquage d\'enduit', joints: 'Dégarnissage de joints', mur: 'Démolition de mur', cloison: 'Démolition de cloison', dalle: 'Démolition de dalle' }[v.type] + ` ${fm(v.L * v.h)} m²`),
        calcul(v) {
            const S = v.L * v.h;
            const densite = { piquage: 1.9, joints: 1.8, cloison: 1.2, dalle: 2.4, mur: +v.mat }[v.type];
            const part = v.type === 'joints' ? 0.25 : 1;                   // joints ≈ 25 % de la surface
            const volPlace = S * v.ep / 100 * part;
            const poids = volPlace * densite;
            const volF = volPlace * 1.5;
            const nbBennes = Math.max(Math.ceil(volF / 6 - 1e-9), Math.ceil(poids / 8 - 1e-9));
            const lignes = volF > 1 ? [L('benne6', nbBennes)] : [L('bigbag_gravats', Math.max(1, Math.ceil(volF / 0.8 - 1e-9)), { d: 'remplis aux 3/4 (poids)' })];
            const heuresM2 = { piquage: 0.5 + v.ep * 0.1, joints: 0.8, cloison: 0.3, dalle: 0.8 + v.ep * 0.03, mur: 0.5 + v.ep * 0.03 }[v.type];
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Gravats', v: `${fm(volF)} m³ ≈ ${fmtSmart(poids, 1)} T` }],
                lignes, recette: null,
                infos: [
                    `Gravats foisonnés ×1,5. Poids ≈ ${fmtSmart(densite, 1)} T par m³ en place.`,
                    volF > 1 ? `Bennes de 6 m³ (8 T maxi environ) : ${nbBennes}.` : `Petit volume (${fm(volF)} m³) : big bags à gravats ou remorque.`,
                    v.type === 'mur' ? 'Mur porteur : voir « Ouverture dans mur porteur » (étaiement, bureau d\'études).' : null,
                    'Poussière : masque FFP3, lunettes, arrosage. Vérifier l\'absence d\'amiante (diagnostic avant travaux pour les bâtiments d\'avant 1997).'
                ].filter(Boolean),
                mesure: { q: S, u: 'm²', h: S * heuresM2 }
            };
        }
    },
    {
        id: 'linteau', cat: 'murs', ic: '📏', nom: 'Linteau ou poutre coulé',
        desc: 'Coffrage, ferraillage, béton',
        champs: [
            n('ouv', 'Largeur de l\'ouverture', 'm', 1.6, { demi: true, max: 6 }),
            n('nb', 'Nombre', 'u', 1, { demi: true, max: 30 }),
            n('b', 'Largeur (épaisseur du mur)', 'cm', 20, { demi: true, max: 80, bas: 10 }),
            n('h', 'Hauteur', 'cm', 20, { demi: true, max: 80, bas: 15, aide: 'Repère : 1/10 de la portée, 20 cm mini.' }),
            MODE
        ],
        mots: 'linteau poutre coulé coffrage étrier armature',
        titre: v => `${fm(v.nb)} linteau(x) coulé(s) ${fm(v.ouv)} m, ${fm(v.b)}×${fm(v.h)} cm`,
        calcul(v, ctx) {
            const lg = v.ouv + 0.4;                                          // 20 cm d'appui de chaque côté
            const b = v.b / 100, h = v.h / 100;
            const vol = lg * b * h * v.nb * PERTE_BETON;
            const lgFer = lg + 0.4;                                          // ancrages
            const lignes = [
                ...lignesBeton(vol, 350, v.mode, { fin: true }),
                L('fer12', Math.ceil(2 * lgFer * v.nb / 6 - 1e-9), { d: '2 HA12 en bas' }),
                L('fer10', Math.ceil(2 * lgFer * v.nb / 6 - 1e-9), { d: '2 HA10 en haut' }),
                L('etrier', (Math.ceil(lg / 0.2 - 1e-9) + 1) * v.nb, { d: 'HA6 tous les 20 cm' }),
                L('contreplaque', (2 * h + b) * lg * v.nb * 1.15),
                L('etai', 2 * v.nb)
            ];
            const infos = [
                `Longueur coulée : ${fm(lg)} m (ouverture + 20 cm d'appui de chaque côté). Enrobage 3 cm, cales sous les fers.`,
                'Ferraillage indicatif (HA12 en bas, HA10 en haut, étriers HA6 / 20 cm) pour un linteau courant. Au-delà de 2,50 m ou sous plancher / charpente : calcul obligatoire.',
                CONSEILS.decoffrage
            ];
            if (v.h < v.ouv * 100 / 10) infos.unshift(`Hauteur faible pour cette portée : compter au moins ${fmtSmart(Math.max(20, v.ouv * 10), 0)} cm.`);
            return {
                resume: [{ l: 'Béton', v: `${fm(vol)} m³` }, { l: 'Longueur coulée', v: `${fm(lg)} m` }],
                lignes: fusion(lignes), infos, recette: aideBeton(vol, 350, v.mode, ctx, infos),
                mesure: { q: v.nb, u: 'u', h: v.nb * (4 + lg * 2) }
            };
        }
    },
    {
        id: 'soutenement', cat: 'murs', ic: '🧗', nom: 'Mur de soutènement',
        desc: 'Retenir de la terre : semelle, voile armé, drain',
        champs: [
            n('L', 'Longueur', 'm', 8, { demi: true }),
            n('H', 'Hauteur de terre retenue', 'm', 1.2, { demi: true, max: 3, aide: 'Au-delà de 1 m, faire calculer le mur.' }),
            oui('drain', 'Drain + gravier derrière le mur'),
            MODE
        ],
        mots: 'soutènement talus terre mur poids voile barbacane drain bloc à bancher',
        titre: v => `Mur de soutènement ${fm(v.L)} m × ${fm(v.H)} m`,
        calcul(v, ctx) {
            const B = Math.max(0.8, 0.6 * v.H);                              // largeur de semelle en L
            const es = v.H > 1.5 ? 0.30 : 0.25;
            const hVoile = v.H + 0.2;
            const volSem = v.L * B * es * PERTE_BETON;
            const nbV = Math.ceil(v.L / 0.2 - 1e-9) + 1;
            const lignes = [
                ...lignesBeton(volSem, 350, v.mode),
                ...lignesMurBlocs(v.L * hVoile, 'bancher', 0, 0, v.mode),
                L('fer12', Math.ceil(nbV * (hVoile + 0.5 + B * 0.7) / 6), { d: 'verticaux en L tous les 20 cm, ancrés dans la semelle' }),
                L('fer10', Math.ceil((Math.ceil(hVoile / 0.4) * v.L + nbV * B) * 1.1 / 6), { d: 'horizontaux + semelle' }),
                L('barbacane', Math.ceil(v.L * v.H / 2)),
                L('cales', Math.ceil(v.L * B * 4))
            ];
            const infos = [
                `Semelle en L de ${fm(B)} m × ${fmtSmart(es * 100, 0)} cm (talon côté terre), voile en blocs à bancher armés sur ${fm(hVoile)} m.`,
                'Barbacanes : 1 tous les 2 m², en bas du mur. Joints de dilatation tous les 10 m environ.',
                'Au-delà de 1 m de terre, ou avec une charge en haut (voiture, maison, talus) : note de calcul obligatoire. Ferraillage ici indicatif.',
                CONSEILS.dict
            ];
            if (v.drain) {
                const d = calcDrainage(v.L, v.H, { protection: 'bitume', regards: 1, exutoire: 0 });
                lignes.push(...d.lignes, L('gravier_drain', v.L * 0.3 * v.H * 1.6, { d: 'massif drainant derrière le voile' }));
                infos.push('Gravier drainant sur 30 cm derrière le mur, séparé de la terre par le géotextile.');
            }
            return {
                resume: [{ l: 'Béton semelle', v: `${fm(volSem)} m³` }, { l: 'Voile', v: `${fm(v.L * hVoile)} m²` }],
                lignes: fusion(lignes), infos, recette: aideBeton(volSem, 350, v.mode, ctx, infos),
                mesure: { q: v.L, u: 'm', h: v.L * (2 + v.H * 2.5) }
            };
        }
    },

    // ════════════════ EXTÉRIEUR : RÉSEAUX ════════════════
    {
        id: 'drainage', cat: 'exterieur', ic: '💦', nom: 'Drainage & murs enterrés',
        desc: 'Drain, gravier, géotextile, protection du mur, arase',
        champs: [
            n('ml', 'Longueur à drainer', 'm', 40, { aide: 'Tour de la maison (côtés enterrés).' }),
            n('prof', 'Hauteur enterrée', 'm', 0.8, { demi: true, max: 4 }),
            n('regards', 'Regards', 'u', 4, { demi: true, zero: true, max: 20, aide: 'Un par angle.' }),
            c('protection', 'Protection du mur', [{ v: 'les2', l: 'Bitume + Delta MS' }, { v: 'delta', l: 'Delta MS' }, { v: 'bitume', l: 'Bitume' }, { v: 'non', l: 'Aucune' }], 'les2'),
            n('exutoire', 'Tuyau jusqu\'à l\'évacuation', 'm', 10, { zero: true, max: 200 }),
            oui('arase', 'Arase étanche (coupure de capillarité)', false)
        ],
        mots: 'drain drainage delta ms bitume humidité cave sous-sol regard géotextile arase capillarité salpêtre',
        titre: v => `Drainage ${fm(v.ml)} m`,
        calcul(v) {
            const d = calcDrainage(v.ml, v.prof, { protection: v.protection, regards: v.regards, exutoire: v.exutoire });
            const lignes = [...d.lignes];
            if (v.arase) lignes.push(L('arase', v.ml * 1.05));
            const terre = v.ml * 0.6 * (v.prof + 0.3);
            return {
                resume: [{ l: 'Longueur', v: `${fm(v.ml)} m` }, { l: 'Terre à ouvrir', v: `${fm(terre)} m³` }],
                lignes: fusion(lignes), recette: null,
                infos: [...d.infos, `Tranchée ≈ 60 cm de large au pied du mur : ${fm(terre)} m³ à ouvrir puis remblayer.`, CONSEILS.dict],
                mesure: { q: v.ml, u: 'm', h: v.ml * (0.6 + v.prof * 0.5) }
            };
        }
    },
    {
        id: 'fosse', cat: 'exterieur', ic: '🚽', nom: 'Fosse toutes eaux',
        desc: 'Assainissement individuel : fosse, regards, épandage',
        champs: [
            n('pieces', 'Pièces principales', 'u', 5, { demi: true, max: 15, aide: 'Chambres + séjour.' }),
            n('dist', 'Distance maison → fosse', 'm', 10, { demi: true, max: 100 }),
            c('traitement', 'Traitement', [{ v: 'epandage', l: 'Tranchées d\'épandage' }, { v: 'filtre', l: 'Filtre compact / micro-station' }], 'epandage'),
            n('epandage', 'Longueur d\'épandage', 'm', 45, { si: v => v.traitement === 'epandage', max: 300, aide: 'Fixée par l\'étude de sol (SPANC).' })
        ],
        mots: 'fosse septique toutes eaux assainissement spanc épandage regard eaux usées',
        titre: v => `Fosse toutes eaux ${Math.max(3, 3 + Math.max(0, v.pieces - 5))} m³`,
        calcul(v) {
            const vol = Math.max(3, 3 + Math.max(0, v.pieces - 5));
            const ep = v.traitement === 'epandage' ? v.epandage : 0;
            const lignes = [
                L('fosse', 1, { d: `${vol} m³ (${v.pieces} pièces principales)` }),
                L('regard', 2 + (ep > 0 ? 2 : 0), { d: 'sortie maison, répartition, bouclage' }),
                L('pvc100', (v.dist + 5) * 1.05, { d: 'collecte + ventilation' }),
                L('sable04', vol * 0.3 * 1.5, { d: 'lit de pose et calage de la fosse' })
            ];
            if (ep > 0) lignes.push(
                L('drain', ep * 1.05, { d: 'tuyaux d\'épandage' }),
                L('gravier_drain', ep * 0.5 * 0.4 * 1.6),
                L('geotextile', ep * 0.7 * 1.1)
            );
            const terre = vol * 1.6 + ep * 0.5 * 0.8 + v.dist * 0.4 * 0.6;
            lignes.push(L('mini_pelle', Math.max(1, Math.ceil(terre / 30 - 1e-9))));
            return {
                resume: [{ l: 'Fosse', v: `${vol} m³` }, { l: 'Terrassement', v: `${fm(terre)} m³` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'Fosse : 3 m³ jusqu\'à 5 pièces principales, +1 m³ par pièce en plus.',
                    'Étude de sol et accord du SPANC obligatoires avant travaux : ils fixent le type et la longueur du traitement.',
                    'Ventilation haute de la fosse en Ø100 au-dessus du faîtage. Fosse à 35 m mini d\'un puits.',
                    CONSEILS.dict
                ],
                mesure: { q: 1, u: 'forfait', h: 16 + ep * 0.4 }
            };
        }
    },
    {
        id: 'echafaudage', cat: 'exterieur', ic: '🏗️', nom: 'Échafaudage',
        desc: 'Location pour façade ou toiture',
        champs: [
            n('L', 'Longueur de façade', 'm', 20, { demi: true }),
            n('h', 'Hauteur', 'm', 6, { demi: true, max: 30 }),
            n('sem', 'Durée', 'sem.', 3, { max: 52 })
        ],
        mots: 'échafaudage location garde-corps façade hauteur',
        titre: v => `Échafaudage ${fm(v.L * v.h)} m², ${fm(v.sem)} sem.`,
        calcul(v) {
            return {
                resume: [{ l: 'Surface', v: `${fm(v.L * v.h)} m²` }],
                lignes: lignesEchafaudage(v.L, v.h, v.sem), recette: null,
                infos: [
                    'Location comptée au m² de façade et à la semaine (montage/démontage souvent en plus).',
                    'Garde-corps, plinthes et amarrages obligatoires. Montage par une personne formée (R408).'
                ],
                mesure: { q: v.L * v.h, u: 'm²', h: v.L * v.h * 0.3 }
            };
        }
    },
    {
        id: 'conduit', cat: 'toiture', ic: '🔥', nom: 'Conduit de fumée',
        desc: 'Boisseaux pour poêle ou cheminée',
        champs: [
            n('h', 'Hauteur totale du conduit', 'm', 7, { aide: 'Du départ jusqu\'en haut de la souche.' }),
            c('diam', 'Diamètre intérieur', [{ v: '150', l: 'Ø150' }, { v: '180', l: 'Ø180' }, { v: '200', l: 'Ø200' }], '180')
        ],
        mots: 'conduit cheminée poêle boisseau souche fumée',
        titre: v => `Conduit de fumée Ø${v.diam}, ${fm(v.h)} m`,
        calcul(v) {
            const nb = Math.ceil(v.h / 0.33 - 1e-9) + 1;
            return {
                resume: [{ l: 'Boisseaux', v: `${nb}` }],
                lignes: [
                    L('boisseau', nb, { d: `Ø${v.diam}, hauteur 33 cm` }),
                    L('mortier_refr', nb * 1.5, { d: 'joints des boisseaux' }),
                    L('chapeau', 1)
                ],
                recette: null,
                infos: [
                    'Écart au feu : 16 cm mini entre l\'intérieur du conduit et tout bois (chevrons, solives). Pas de bois au contact.',
                    'Sortie : 40 cm au-dessus du faîtage s\'il est à moins de 8 m. Trappe de ramonage en pied, plaque signalétique obligatoire.',
                    'Le diamètre est donné par la notice du poêle ou de l\'insert.'
                ],
                mesure: { q: v.h, u: 'm', h: v.h * 2 }
            };
        }
    }
];

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
