// Calculateurs « Murs & ouvertures ».

import { L, fusion, lignesBeton, lignesMortier, recetteMortier, lignesMurBlocs, lignesChainage, lignesChainageVertical, nbBarres6m, BLOCS, PERTE_BETON, PERTE_MORTIER } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, MODE, fm, CONSEILS, aideBeton, surfNette, verifOuv } from './commun.js';
export const MURS = [
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
    }
];
