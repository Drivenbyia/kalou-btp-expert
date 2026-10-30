// Calculateurs « Fondations & béton ».

import { L, fusion, lignesBeton, lignesMortier, recetteMortier, lignesChainage, lignesChainageVertical, nbBarres6m, calcPlancher, PERTE_BETON, PERTE_MORTIER, TREILLIS_UTILE } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, MODE, DOSAGE, fm, CONSEILS, aideBeton } from './commun.js';
export const BETON = [
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
    }
];
