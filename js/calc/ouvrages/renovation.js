// Calculateurs « Rénovation & démolition ».

import { L, fusion, lignesBeton, lignesMurBlocs, PERTE_BETON, calcDrainage } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, MODE, fm, CONSEILS, aideBeton } from './commun.js';
export const RENOVATION = [
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
    }
];
