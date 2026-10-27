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
    lignesChainage, nbBarres6m, calcPlancher, calcToiture, calcPlaco, BLOCS, COUVERTURES,
    PERTE_BETON, PERTE_MORTIER
} from './base.js';
import { fmtSmart } from '../core/format.js';

export const OUV_CATS = [
    { id: 'beton',     l: 'Fondations & béton' },
    { id: 'murs',      l: 'Murs & ouvertures' },
    { id: 'enduits',   l: 'Enduits & joints' },
    { id: 'toiture',   l: 'Toiture' },
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
], 'betonniere');

const DOSAGE = c('dosage', 'Dosage du béton', [
    { v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }, { v: '400', l: '400 kg' }
], '350', { aide: '350 kg/m³ = dalles, poteaux, chaînages. 300 = fondations courantes.' });

const fm = x => fmtSmart(x, 2);

/** Conseils communs béton : recette ou toupie. */
function aideBeton(vol, dosage, mode, ctx, infos) {
    if (mode === 'bpe') return null;
    if (vol > 3) infos.push(`Avec ${fm(vol)} m³ de béton, pense à la toupie : ça évite environ ${Math.ceil(vol * 10)} gâchées.`);
    return recetteBeton(dosage, ctx.sacCiment || 35);
}

const surfNette = (Lg, h, o) => Math.max(0, Lg * h - (o || 0));

// ─── Définitions ─────────────────────────────────────────────────────────────

export const OUVRAGES = [
    // ════════════════ FONDATIONS & BÉTON ════════════════
    {
        id: 'fondation', cat: 'beton', ic: '🏗️', nom: 'Fondations (semelles)',
        desc: 'Semelles filantes sous les murs',
        champs: [
            n('ml', 'Longueur de semelles', 'm', 30, { aide: 'Tour de la construction + murs de refend.' }),
            n('larg', 'Largeur', 'cm', 50, { demi: true, max: 150 }),
            n('haut', 'Hauteur de béton', 'cm', 35, { demi: true, max: 150 }),
            n('prof', 'Profondeur de fouille', 'cm', 80, { aide: 'Hors gel : 50 à 80 cm en Dordogne.', max: 300 }),
            c('dosage', 'Dosage du béton', [{ v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }], '350'),
            MODE,
            oui('proprete', 'Béton de propreté (5 cm, dosé 150)'),
            oui('armature', 'Armatures préfabriquées')
        ],
        titre: v => `Fondations ${fm(v.ml)} m — ${v.larg}×${v.haut} cm`,
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
                v.armature ? L('arm_semelle', nbBarres6m(v.ml) + 1) : null
            ];
            if (v.haut > v.prof) infos.push('La hauteur de béton dépasse la profondeur de fouille : vérifie les cotes.');
            infos.push(`Terre à sortir : ${fm(terre)} m³ en place, soit ≈ ${fm(terre * 1.25)} m³ foisonnés (≈ ${Math.max(1, Math.ceil(terre / 40))} jour(s) de mini-pelle).`);
            if (v.armature) infos.push('Armatures de 6 m posées avec 50 cm de recouvrement, + 1 pour les angles.');
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
            n('ep', 'Épaisseur du béton', 'cm', 12, { max: 50, aide: 'Terrasse/allée : 10-12 cm. Garage : 12-15 cm.' }),
            DOSAGE,
            MODE,
            n('he', 'Hérisson (cailloux)', 'cm', 15, { zero: true, max: 60, aide: '0 = pas de hérisson.' }),
            c('treillis', 'Treillis soudé', [{ v: '36', l: '2,40×3,60' }, { v: '6', l: '2,40×6,00' }, { v: 'non', l: 'Sans' }], '36'),
            oui('polyane', 'Film polyane sous la dalle'),
            oui('isolant', 'Isolant sous dalle (maison)', false),
            oui('desactive', 'Finition béton désactivé', false)
        ],
        titre: v => `Dalle béton ${fm(v.L)}×${fm(v.l)} m — ép. ${v.ep} cm`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const vol = S * v.ep / 100 * PERTE_BETON;
            const dos = +v.dosage;
            const infos = [];
            const lignes = [...lignesBeton(vol, dos, v.mode)];
            if (v.treillis === '36') lignes.push(L('treillis36', Math.ceil(S / 7.3 - 1e-9)));
            if (v.treillis === '6')  lignes.push(L('treillis6', Math.ceil(S / 12.2 - 1e-9)));
            if (v.treillis !== 'non') lignes.push(L('cales', Math.ceil(S * 4)));
            if (v.he > 0) lignes.push(L('herisson', S * v.he / 100 * 1.8));
            if (v.polyane) lignes.push(L('polyane', S * 1.15));
            if (v.isolant) lignes.push(L('isolant_sol', S * 1.05));
            if (v.desactive) lignes.push(L('desactivant', S * 0.2));
            lignes.push(L('planche', 2 * (v.L + v.l) * 1.05, { d: 'coffrage de rive' }));
            const deblai = S * (v.ep + (v.he || 0)) / 100;
            infos.push(`Décaissement : ${fm(deblai)} m³ de terre en place (≈ ${fm(deblai * 1.25)} m³ foisonnés).`);
            if (v.treillis !== 'non') infos.push('Treillis : recouvrement de 2 mailles compris. Cales : 4 par m².');
            if (S > 40) infos.push('Au-delà de 40 m², prévoir des joints de fractionnement (carrés de 25 m² max environ).');
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
            ], '350', { aide: 'kg par m³. Béton : 150 propreté · 250 gros béton · 300 fondations · 350 dalles/poteaux. Mortier : 300-350.' }),
            c('liant', 'Liant', [{ v: 'ciment', l: 'Ciment' }, { v: 'chaux', l: 'Chaux NHL' }], 'ciment', { si: v => v.type === 'mortier' }),
            { ...MODE, si: v => v.type === 'beton' }
        ],
        titre: v => `${v.type === 'beton' ? 'Béton' : 'Mortier'} ${fm(v.vol)} m³ dosé ${v.dosage}`,
        calcul(v, ctx) {
            const dos = +v.dosage;
            const infos = [];
            if (v.type === 'beton') {
                const vol = v.vol * PERTE_BETON;
                infos.push('Pour 1 m³ de béton : ' + (dos / 35).toFixed(0) + ' sacs de 35 kg, ≈ 400 L de sable et ≈ 800 L de gravier, ≈ 175 L d\'eau. Pertes 5 % comprises.');
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
                recette: recetteMortier(dos, v.liant === 'chaux' ? 35 : (ctx.sacCiment || 35), v.liant),
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
        titre: v => `${v.nb} poteau(x) ${v.a}×${v.b} cm, h ${fm(v.h)} m`,
        calcul(v, ctx) {
            const vol = v.a / 100 * v.b / 100 * v.h * v.nb * PERTE_BETON;
            const dos = +v.dosage;
            const infos = ['Armature : 1 cage préfabriquée par poteau (+ 50 cm d\'attente pour le chaînage).', 'Coffrage : blocs poteaux ou planches/contreplaqué.'];
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
            n('ml', 'Longueur totale', 'm', 20),
            c('sens', 'Type', [{ v: 'h', l: 'Horizontal' }, { v: 'v', l: 'Vertical (angles)' }], 'h'),
            oui('blocsU', 'En blocs U', true, { si: v => v.sens === 'h' }),
            MODE
        ],
        titre: v => `Chaînage ${v.sens === 'v' ? 'vertical' : 'horizontal'} ${fm(v.ml)} m`,
        calcul(v, ctx) {
            const lignes = lignesChainage(v.ml, { vertical: v.sens === 'v', blocsU: v.blocsU, mode: v.mode });
            const vol = v.ml * 0.025 * PERTE_BETON;
            const infos = ['Béton ≈ 25 L par mètre (section 15×15 cm environ), dosé 350. Armatures de 6 m avec 50 cm de recouvrement.'];
            return {
                resume: [{ l: 'Volume béton', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: aideBeton(vol, 350, v.mode, ctx, infos),
                mesure: { q: v.ml, u: 'm', h: v.ml * 0.5 }
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
            oui('rives', 'Planelles de rive'),
            MODE
        ],
        titre: v => `Plancher ${fm(v.long)}×${fm(v.portee)} m (${v.haut}+4)`,
        calcul(v, ctx) {
            const r = calcPlancher(v.long, v.portee, { haut: +v.haut, rives: v.rives, mode: v.mode });
            const infos = [
                `Poutrelles tous les 60 cm. Dalle de compression de 4 cm avec treillis : ≈ ${fm(r.vol)} m³ de béton dosé 350.`,
                `Étaiement : ${r.etais} étais à laisser en place 21 jours environ.`,
                'Le plan de pose du fabricant reste la référence (portée et charges).'
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
        titre: v => `Escalier béton ${v.nb} marches, larg. ${v.w} cm`,
        calcul(v, ctx) {
            const h = v.hm / 100, g = v.g / 100, w = v.w / 100, e = v.ep / 100;
            const volMarches = v.nb * (g * h / 2) * w;
            const pail = Math.sqrt(Math.pow(v.nb * g, 2) + Math.pow(v.nb * h, 2));
            const vol = (volMarches + pail * w * e) * PERTE_BETON;
            const mlFer = (Math.ceil(w / 0.15) + 1) * (pail + 0.6) + (Math.ceil(pail / 0.25) + 1) * w;
            const blondel = 2 * v.hm + v.g;
            const infos = [
                `Paillasse de ${fm(pail)} m de long. Ferraillage : HA10 tous les 15 cm + répartition tous les 25 cm.`,
                `Confort (Blondel) : 2 × hauteur + giron = ${fmtSmart(blondel, 1)} cm ${blondel >= 59 && blondel <= 65 ? '✔ (idéal 60 à 64)' : '⚠ idéal entre 60 et 64 cm'}.`,
                `Hauteur totale montée : ${fmtSmart(v.nb * v.hm, 0)} cm.`
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
            n('angles', 'Angles / bouts de mur', 'u', 2, { zero: true, max: 50, si: v => v.bloc === 'p20' || v.bloc === 'p15' }),
            oui('chainage', 'Chaînage en haut du mur', false),
            { ...MODE, si: v => v.bloc === 'bancher' || v.chainage }
        ],
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
            if (b.remplissage) infos.push(`Remplissage : ≈ ${b.remplissage * 1000} L de béton par m² de mur. Fers verticaux selon plan.`);
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
            n('ep', 'Épaisseur du mur', 'cm', 40, { max: 120 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true })
        ],
        titre: v => `Mur en pierre ${fm(v.L)}×${fm(v.h)} m, ép. ${v.ep} cm`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * v.ep / 100;
            const volM = vol * 0.30;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume de mur', v: `${fm(vol)} m³` }],
                lignes: fusion([L('moellon', vol * 1.9), ...lignesMortier(volM, { liant: 'chaux', dosage: 350 })]),
                infos: [
                    'Environ 1,9 T de pierre par m³ de mur (chutes de taille comprises).',
                    `Mortier de chaux : ≈ 300 L par m³ de mur, soit ${fm(volM)} m³.`
                ],
                recette: recetteMortier(350, 35, 'chaux'),
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
            c('bloc', 'Bloc', [{ v: 'p20', l: 'Parpaing 20' }, { v: 'p15', l: 'Parpaing 15' }], 'p20'),
            n('larg', 'Largeur semelle', 'cm', 40, { demi: true, max: 100 }),
            n('hb', 'Hauteur béton', 'cm', 25, { demi: true, max: 100 }),
            n('prof', 'Profondeur de fouille', 'cm', 50, { max: 150 }),
            oui('chaperon', 'Chaperons'),
            c('enduit', 'Enduit monocouche', [{ v: '0', l: 'Aucun' }, { v: '1', l: '1 face' }, { v: '2', l: '2 faces' }], '2'),
            MODE
        ],
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
                ...lignesChainage(raid * hBlocs, { vertical: true, mode: v.mode }),
                ...lignesChainage(v.L, { mode: v.mode })
            ];
            if (v.chaperon) lignes.push(L('chaperon', Math.ceil(v.L * 2 * 1.03)));
            if (faces) lignes.push(L('enduit_mono', v.L * v.h * faces * 1.5 * 17 * PERTE_MORTIER));
            const infos = [
                `Hauteur maçonnée : ${fm(hBlocs)} m (dont ${fm(hBlocs - v.h)} m enterrés), soit ${Math.ceil(hBlocs / 0.2 - 1e-9)} rangs.`,
                `${raid} raidisseurs (chaînages verticaux) : tous les 4 m environ et aux extrémités.`,
                'Chaînage horizontal en haut du mur sous les chaperons.'
            ];
            return {
                resume: [{ l: 'Béton semelle', v: `${fm(volS)} m³` }, { l: 'Surface de mur', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), infos, recette: aideBeton(volS, 300, v.mode, ctx, infos),
                mesure: { q: v.L, u: 'm', h: v.L * (v.h * 1.4 + 0.8 + faces * v.h * 0.5) }
            };
        }
    },
    {
        id: 'ouverture', cat: 'murs', ic: '🚪', nom: 'Création d\'ouverture',
        desc: 'Porte ou fenêtre dans un mur porteur',
        champs: [
            n('larg', 'Largeur', 'm', 1.2, { demi: true, max: 6 }),
            n('haut', 'Hauteur', 'm', 2.15, { demi: true, max: 4 }),
            n('ep', 'Épaisseur du mur', 'cm', 20, { max: 120 }),
            c('linteau', 'Linteau', [{ v: 'ipn', l: 'IPN / HEA acier' }, { v: 'beton', l: 'Linteau béton' }], 'ipn')
        ],
        titre: v => `Ouverture ${fm(v.larg)}×${fm(v.haut)} m (mur ${v.ep} cm)`,
        calcul(v, ctx) {
            const nb = v.ep > 25 ? 2 : 1;
            const lg = Math.round((v.larg + 0.4) * 100) / 100;
            const demol = v.larg * v.haut * v.ep / 100;
            const gravats = demol * 1.5;
            const volMort = (2 * v.haut + v.larg) * v.ep / 100 * 0.05 * PERTE_MORTIER;
            const volSommier = 2 * 0.3 * 0.2 * v.ep / 100 * PERTE_BETON;
            const lignes = [
                L(v.linteau === 'ipn' ? 'ipn' : 'linteau', nb * lg, { d: `${nb} × ${fm(lg)} m (20 cm d'appui de chaque côté)` }),
                L('etai', 2 * (Math.ceil(v.larg / 0.8 - 1e-9) + 1)),
                ...lignesMortier(volMort),
                ...lignesBeton(volSommier, 350)
            ];
            if (gravats > 1.5) lignes.push(L('benne', Math.ceil(gravats / 8 - 1e-9)));
            return {
                resume: [{ l: 'Maçonnerie à démolir', v: `${fm(demol)} m³` }, { l: 'Gravats', v: `${fm(gravats)} m³` }],
                lignes: fusion(lignes),
                infos: [
                    nb > 1 ? 'Mur épais : 2 profilés côte à côte (ou linteau coulé sur place).' : '1 profilé pour un mur de 20 cm.',
                    'La section de l\'IPN / HEA se calcule selon les charges (étage, toiture) : à faire valider.',
                    'Étaiement des deux côtés avant d\'ouvrir. Sommiers béton sous les appuis.'
                ],
                recette: null,
                mesure: { q: 1, u: 'forfait', h: v.ep > 30 ? 32 : 24 }
            };
        }
    },

    // ════════════════ ENDUITS & JOINTS ════════════════
    {
        id: 'enduit', cat: 'enduits', ic: '🖌️', nom: 'Enduit de façade',
        desc: 'Monocouche ou traditionnel au ciment',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('h', 'Hauteur', 'm', 3, { demi: true, max: 20 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            c('type', 'Type d\'enduit', [{ v: 'mono', l: 'Monocouche' }, { v: 'trad', l: 'Traditionnel' }], 'mono'),
            n('ep', 'Épaisseur', 'cm', 1.5, { max: 5 }),
            n('angles', 'Angles de façade', 'u', 0, { zero: true, aide: 'Pour les baguettes d\'angle.' })
        ],
        titre: v => `Enduit ${v.type === 'mono' ? 'monocouche' : 'traditionnel'} ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const lignes = [];
            const infos = [];
            let recette = null;
            if (v.type === 'mono') {
                lignes.push(L('enduit_mono', S * v.ep * 17 * PERTE_MORTIER));
                infos.push('Monocouche : ≈ 17 kg par m² et par cm (≈ 25 kg/m² en 15 mm). Pertes 10 % comprises.');
            } else {
                const vol = S * v.ep / 100 * PERTE_MORTIER;
                lignes.push(...lignesMortier(vol, { dosage: 400 }));
                infos.push('Traditionnel en 3 couches : gobetis (≈ 500 kg/m³), corps d\'enduit (≈ 400), finition (≈ 300, sable fin). Moyenne 400.');
                recette = recetteMortier(400, ctx.sacCiment || 35);
            }
            if (v.angles > 0) lignes.push(L('baguette', Math.ceil(v.angles * v.h / 3 - 1e-9)));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), infos, recette,
                mesure: { q: S, u: 'm²', h: S * (v.type === 'mono' ? 0.5 : 0.9) }
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
            n('ep', 'Épaisseur totale', 'cm', 2, { max: 6, aide: '3 couches : 1,5 à 2,5 cm au total.' })
        ],
        titre: v => `Enduit chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * v.ep / 100 * PERTE_MORTIER;
            const volFin = Math.min(vol, S * 0.005 * PERTE_MORTIER);        // 5 mm de finition au sable fin
            const lignes = [...lignesMortier(vol - volFin, { liant: 'chaux' }), ...lignesMortier(volFin, { liant: 'chaux', sable: 'sable02' })];
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes),
                infos: ['Chaux NHL 3,5 dosée 350 kg par m³ de sable (≈ 1 volume de chaux pour 2,5 de sable). Finition 5 mm au sable fin. Pertes 10 % comprises.'],
                recette: recetteMortier(350, 35, 'chaux'),
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
        titre: v => `Rejointoiement chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * (+v.joint) / 1000 * PERTE_MORTIER;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fmtSmart(vol * 1000, 0)} L` }],
                lignes: fusion(lignesMortier(vol, { liant: 'chaux', dosage: 400 })),
                infos: ['Mortier de joint un peu plus riche : chaux NHL dosée 400 kg/m³. Pertes 10 % comprises.'],
                recette: recetteMortier(400, 35, 'chaux'),
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
            c('couverture', 'Couverture', Object.entries(COUVERTURES).map(([v, x]) => ({ v, l: x.l.replace(' (romane, grand moule)', ' romane') })), 'meca'),
            oui('gouttieres', 'Gouttières et descentes')
        ],
        titre: v => `Toiture ${v.pans} pans ${fm(v.L)}×${fm(v.l)} m, pente ${v.pente} %`,
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
        desc: 'Chape traditionnelle sable-ciment',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            n('ep', 'Épaisseur', 'cm', 5, { max: 15, aide: 'Adhérente : 3-5 cm. Flottante (sur isolant) : 5-6 cm.' }),
            c('dosage', 'Dosage', [{ v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }], '350'),
            oui('bande', 'Bande périphérique')
        ],
        titre: v => `Chape ${fm(v.L)}×${fm(v.l)} m, ép. ${v.ep} cm`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const vol = S * v.ep / 100 * PERTE_BETON;
            const lignes = [...lignesMortier(vol, { dosage: +v.dosage })];
            if (v.bande) lignes.push(L('bande_peri', 2 * (v.L + v.l) * 1.05));
            const infos = ['Chape dosée ' + v.dosage + ' kg de ciment par m³ de sable. Pertes 5 % comprises.'];
            if (v.ep < 3) infos.push('Moins de 3 cm : préférer un ragréage.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: recetteMortier(+v.dosage, ctx.sacCiment || 35),
                mesure: { q: S, u: 'm²', h: S * 0.35 }
            };
        }
    },
    {
        id: 'ragreage', cat: 'interieur', ic: '💧', nom: 'Ragréage',
        desc: 'Mise à niveau avant revêtement',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            n('ep', 'Épaisseur moyenne', 'mm', 5, { max: 50 })
        ],
        titre: v => `Ragréage ${fm(v.L * v.l)} m², ${v.ep} mm`,
        calcul(v) {
            const S = v.L * v.l;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: [L('ragreage', S * v.ep * 1.6 * PERTE_BETON)],
                infos: ['≈ 1,6 kg par m² et par mm d\'épaisseur. Primaire d\'accrochage à prévoir selon le support.'],
                recette: null, mesure: { q: S, u: 'm²', h: S * 0.15 }
            };
        }
    },
    {
        id: 'placo', cat: 'interieur', ic: '📐', nom: 'Placo (BA13)',
        desc: 'Doublage, cloison ou plafond sur ossature',
        champs: [
            c('type', 'Ouvrage', [{ v: 'doublage', l: 'Doublage' }, { v: 'cloison', l: 'Cloison' }, { v: 'plafond', l: 'Plafond' }], 'doublage'),
            n('a', 'Longueur', 'm', 4, { demi: true }),
            n('b', 'Hauteur', 'm', 2.5, { demi: true, max: 12, labelSi: v => v.type === 'plafond' ? 'Largeur' : 'Hauteur' }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true, si: v => v.type !== 'plafond' }),
            oui('double', 'Ossature double (cloison 98)', false, { si: v => v.type === 'cloison' }),
            oui('isolant', 'Avec isolant')
        ],
        titre: v => `${{ doublage: 'Doublage', cloison: 'Cloison', plafond: 'Plafond' }[v.type]} BA13 ${fm(v.a)}×${fm(v.b)} m`,
        calcul(v) {
            const r = calcPlaco(v.type, v.a, v.b, { double: v.double, isolant: v.isolant, ouv: v.type === 'plafond' ? 0 : v.ouv });
            const infos = ['Plaques 1,20 × 2,50 m (+10 % de coupes). Ossature tous les 60 cm.',
                v.type === 'plafond' ? 'Suspentes tous les 1,20 m maxi.' : 'Montants à la hauteur du mur, éclissés au-delà de 3 m.'];
            return {
                resume: [{ l: 'Surface', v: `${fm(r.S)} m²` }],
                lignes: fusion(r.lignes), infos, recette: null,
                mesure: { q: r.S, u: 'm²', h: r.S * ({ doublage: 0.6, cloison: 0.9, plafond: 0.8 }[v.type]) }
            };
        }
    },
    {
        id: 'isolation', cat: 'interieur', ic: '🧶', nom: 'Isolation des combles',
        desc: 'Laine en rouleaux sur plancher de combles',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('l', 'Largeur', 'm', 8, { demi: true }),
            c('ep', 'Épaisseur', [{ v: '200', l: '200 mm' }, { v: '300', l: '300 mm' }, { v: '400', l: '400 mm' }], '300', { aide: '300 mm ≈ R 7 : bon niveau pour des combles perdus.' })
        ],
        titre: v => `Isolation combles ${fm(v.L * v.l)} m², ${v.ep} mm`,
        calcul(v) {
            const S = v.L * v.l;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: [L('laine_combles', S * 1.05, { d: `épaisseur ${v.ep} mm` })],
                infos: ['+5 % de coupes. En 2 couches croisées si possible.'],
                recette: null, mesure: { q: S, u: 'm²', h: S * 0.15 }
            };
        }
    },
    {
        id: 'carrelage', cat: 'interieur', ic: '🔳', nom: 'Carrelage / faïence',
        desc: 'Carreaux, colle, joints, plinthes',
        champs: [
            c('support', 'Où', [{ v: 'sol', l: 'Sol' }, { v: 'mur', l: 'Mur (faïence)' }], 'sol'),
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3, { demi: true, labelSi: v => v.support === 'mur' ? 'Hauteur' : 'Largeur' }),
            c('format', 'Format des carreaux', [{ v: 'petit', l: 'Jusqu\'à 30 cm' }, { v: 'moyen', l: '30 à 60 cm' }, { v: 'grand', l: 'Plus de 60 cm' }], 'moyen'),
            c('pose', 'Pose', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            oui('plinthes', 'Plinthes', true, { si: v => v.support === 'sol' })
        ],
        titre: v => `${v.support === 'mur' ? 'Faïence' : 'Carrelage'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const marge = v.pose === 'diag' ? 1.15 : 1.10;
            const colle = { sol: { petit: 3.5, moyen: 5, grand: 7 }, mur: { petit: 3, moyen: 4, grand: 5 } }[v.support][v.format];
            const joint = { petit: 0.8, moyen: 0.4, grand: 0.3 }[v.format];
            const lignes = [L('carrelage', S * marge), L('colle_carrelage', S * colle), L('joint_carrelage', S * joint)];
            if (v.support === 'sol' && v.plinthes) lignes.push(L('plinthe', 2 * (v.L + v.l) * 1.10));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, recette: null,
                infos: [`Coupes : +${Math.round((marge - 1) * 100)} %. Colle ≈ ${colle} kg/m²${v.format === 'grand' ? ' (double encollage)' : ''}, joint ≈ ${joint} kg/m².`],
                mesure: { q: S, u: 'm²', h: S * (v.support === 'mur' ? 1 : 0.8) * (v.pose === 'diag' ? 1.25 : 1) }
            };
        }
    },
    {
        id: 'parquet', cat: 'interieur', ic: '🪵', nom: 'Parquet flottant',
        desc: 'Lames, sous-couche, plinthes',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            c('pose', 'Pose', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            oui('plinthes', 'Plinthes')
        ],
        titre: v => `Parquet ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const lignes = [L('parquet', S * (v.pose === 'diag' ? 1.12 : 1.07)), L('sous_couche', S * 1.05)];
            if (v.plinthes) lignes.push(L('plinthe', 2 * (v.L + v.l) * 1.10));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, recette: null,
                infos: ['Coupes : +7 % en pose droite, +12 % en diagonale. Arrondir au paquet entier.'],
                mesure: { q: S, u: 'm²', h: S * 0.35 }
            };
        }
    },
    {
        id: 'peinture', cat: 'interieur', ic: '🖼️', nom: 'Peinture d\'une pièce',
        desc: 'Murs et plafond',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 8 }),
            oui('murs', 'Murs'),
            oui('plafond', 'Plafond'),
            n('ouv', 'Portes et fenêtres', 'm²', 4, { zero: true, si: v => v.murs }),
            c('couches', 'Couches', [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }], '2'),
            oui('impression', 'Sous-couche d\'impression')
        ],
        titre: v => `Peinture pièce ${fm(v.L)}×${fm(v.l)} m`,
        calcul(v) {
            const Sm = v.murs ? Math.max(0, 2 * (v.L + v.l) * v.h - (v.ouv || 0)) : 0;
            const Sp = v.plafond ? v.L * v.l : 0;
            const S = Sm + Sp;
            const lignes = [L('peinture', S * (+v.couches) / 10 * 1.05, { d: `${v.couches} couche(s), ≈ 10 m² par litre` })];
            if (v.impression) lignes.push(L('impression', S / 10 * 1.05));
            return {
                resume: [{ l: 'Murs', v: `${fm(Sm)} m²` }, { l: 'Plafond', v: `${fm(Sp)} m²` }],
                lignes, recette: null,
                infos: ['Rendement moyen 10 m² par litre et par couche (voir le pot).'],
                mesure: { q: S, u: 'm²', h: S * 0.12 * (+v.couches + (v.impression ? 1 : 0)) }
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
        titre: v => `Terrassement ${fm(v.L * v.l * v.p)} m³`,
        calcul(v) {
            const vol = v.L * v.l * v.p;
            const volF = vol * (+v.sol);
            const jours = Math.max(1, Math.ceil(vol / 40 - 1e-9));
            const lignes = [L('mini_pelle', jours)];
            if (v.evac) lignes.push(L('benne', Math.ceil(volF / 8 - 1e-9)));
            return {
                resume: [{ l: 'Volume en place', v: `${fm(vol)} m³` }, { l: 'Volume foisonné', v: `${fm(volF)} m³` }],
                lignes, recette: null,
                infos: [`Foisonnement ×${String(v.sol).replace('.', ',')} : la terre sortie prend plus de place.`, 'Mini-pelle 2,5 T : environ 40 m³ par jour. Bennes / camions de 8 m³.'],
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
                L('treillis36', Math.ceil(Srad / 7.3 - 1e-9) * 2, { d: '2 nappes' }),
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
                'Hors étanchéité / liner, filtration, margelles et plage.'
            ];
            return {
                resume: [{ l: 'Béton total', v: `${fm(volRad + volMurs + perim * 0.025 * PERTE_BETON)} m³` }, { l: 'Plan d\'eau', v: `${fm(v.L * v.l)} m²` }],
                lignes: fusion(lignes), infos,
                recette: aideBeton(volRad + volMurs, 350, v.mode, ctx, infos),
                mesure: { q: v.L * v.l, u: 'm²', h: v.L * v.l * 6 }
            };
        }
    }
];

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
export function valider(def, brut) {
    const v = { ...valeursDefaut(def), ...brut };
    const erreurs = {};
    def.champs.forEach(ch => {
        if (ch.type === 'num') {
            const s = String(v[ch.id] ?? '').trim().replace(/\s/g, '').replace(',', '.');
            const x = s === '' ? NaN : Number(s);
            if (!champVisible(ch, v)) { v[ch.id] = isNaN(x) ? (ch.def || 0) : x; return; }
            if (isNaN(x)) { erreurs[ch.id] = ch.zero ? 'Mets 0 si aucun' : 'À remplir'; return; }
            if (x < 0 || (!ch.zero && x <= 0)) { erreurs[ch.id] = 'Doit être plus grand que 0'; return; }
            const max = ch.max ?? (ch.u === 'm' ? 200 : ch.u === 'cm' ? 500 : ch.u === 'm²' ? 5000 : 100000);
            if (x > max) { erreurs[ch.id] = `Trop grand ? (max ${fmtSmart(max)} ${ch.u || ''})`; return; }
            v[ch.id] = x;
        } else if (ch.type === 'oui') {
            v[ch.id] = v[ch.id] === true || v[ch.id] === 'true';
        } else if (ch.type === 'choix') {
            if (!ch.options.some(o => o.v === String(v[ch.id]))) v[ch.id] = ch.def;
            else v[ch.id] = String(v[ch.id]);
        }
    });
    return { v, erreurs };
}

/** Calcul complet d'un ouvrage (null si saisie invalide). */
export function calculer(defOrId, brut, ctx = {}) {
    const def = typeof defOrId === 'string' ? OUVRAGES_PAR_ID[defOrId] : defOrId;
    if (!def) return null;
    const { v, erreurs } = valider(def, brut);
    if (Object.keys(erreurs).length) return { erreurs, v };
    const r = def.calcul(v, ctx);
    r.resume = (r.resume || []).filter(Boolean);
    r.lignes = (r.lignes || []).filter(li => li && li.q > 0);
    r.titre = def.titre(v);
    r.v = v;
    r.erreurs = {};
    return r;
}
