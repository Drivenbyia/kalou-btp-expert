// Calculateurs complémentaires (relecture croisée, lot 6) : bâti ancien, réseaux, extérieur,
// menuiserie et bois. Ratios « ordre de grandeur » : les fiches des fabricants font foi.

import { L, fusion, lignesBeton, lignesMortier, barresPour, PERTE_BETON, PERTE_MORTIER } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, fm, CONSEILS, SAISIE, champSurface, dim, surfaceBrute } from './commun.js';

// Béton de chanvre (sol ou enduit) : ≈ 220 kg de liant formulé et ≈ 110 kg de chènevotte par m³ en place
const CHANVRE = { liant: 220, chanvre: 110 };

export const COMPLEMENTS = [
    // ── Rénovation / bâti ancien ────────────────────────────────────────────
    {
        id: 'solchaux', cat: 'renovation', ic: '🟫', nom: 'Sol à la chaux (bâti ancien)',
        desc: 'Hérisson ventilé + dalle chaux-chanvre : un sol qui respire',
        champs: [
            SAISIE,
            dim(n('L', 'Longueur', 'm', 5, { demi: true })),
            dim(n('l', 'Largeur', 'm', 4, { demi: true })),
            champSurface(20, 'Surface du sol, entre murs.'),
            c('herisson', 'Hérisson', [{ v: 'cailloux', l: 'Cailloux 20/40' }, { v: 'billes', l: 'Billes d\'argile' }], 'cailloux',
                { aide: 'Billes d\'argile : plus isolant et léger, à poser sur géotextile.' }),
            n('epH', 'Épaisseur du hérisson', 'cm', 15, { max: 40, bas: 10 }),
            n('ep', 'Épaisseur de chaux-chanvre', 'cm', 10, { max: 25, bas: 6 }),
            oui('chape', 'Chape de finition à la chaux (4 cm)', true, { aide: 'Pour recevoir tomettes, carrelage ou parquet collé.' })
        ],
        mots: 'sol chaux chanvre hérisson ventilé billes argile terre battue bâti ancien remontées humidité perspirant dalle respirante',
        titre: v => `Sol chaux-chanvre ${fm(surfaceBrute(v, 'L', 'l'))} m²`,
        calcul(v) {
            const S = surfaceBrute(v, 'L', 'l');
            const volCh = S * v.ep / 100 * 1.10;
            const lignes = [
                L('geotextile', S * 1.15),
                v.herisson === 'billes' ? L('billes_argile', S * v.epH / 100 * 1000 * 1.15) : L('herisson', S * v.epH / 100 * 1.8),
                L('liant_chanvre', volCh * CHANVRE.liant),
                L('chenevotte', volCh * CHANVRE.chanvre)
            ];
            if (v.chape) lignes.push(...lignesMortier(S * 0.04 * PERTE_MORTIER, { liant: 'chaux', dosage: 350, chaux: 'chaux_nhl5' }));
            const deblai = S * (v.epH + v.ep + (v.chape ? 4 : 0)) / 100;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Chaux-chanvre', v: `${fm(volCh)} m³` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Décaisser ≈ ${fm(deblai)} m³ (hérisson ${fm(v.epH)} cm + chaux-chanvre ${fm(v.ep)} cm${v.chape ? ' + chape 4 cm' : ''}), sans descendre sous le pied des fondations des murs.`,
                    `Chaux-chanvre ≈ ${CHANVRE.liant} kg de liant formulé et ${CHANVRE.chanvre} kg de chanvre par m³ (10 % de tassement compris) : ordre de grandeur, suivre la fiche du fabricant (dosage et eau).`,
                    'Pas de film polyane ni de chape ciment : le sol doit laisser passer l\'humidité, sinon elle remonte dans les murs.',
                    'Séchage lent : 1 semaine par cm environ, bien ventiler. Finition : tomettes, terre cuite ou parquet sur lambourdes.',
                    CONSEILS.chaux
                ],
                mesure: { q: S, u: 'm²', h: S * 1.2 }
            };
        }
    },
    {
        id: 'enduitchanvre', cat: 'enduits', ic: '🧱', nom: 'Enduit correcteur chaux-chanvre',
        desc: 'Enduit épais isolant sur mur ancien (3 à 8 cm)',
        champs: [
            SAISIE,
            dim(n('L', 'Longueur', 'm', 5, { demi: true })),
            dim(n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 10 })),
            champSurface(12, 'Surface du mur à enduire.'),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            n('ep', 'Épaisseur', 'cm', 5, { max: 12, bas: 3, aide: '3 à 8 cm en plusieurs passes de 2 à 3 cm.' }),
            oui('finition', 'Finition enduit chaux fin (5 mm)', true)
        ],
        mots: 'enduit chanvre chaux correcteur thermique isolant mur pierre bâti ancien perspirant intérieur',
        verifier: v => (v.ouv > 0 && v.ouv >= surfaceBrute(v) ? { ouv: 'Plus grand que le mur : vérifie' } : {}),
        titre: v => `Enduit chaux-chanvre ${fm(Math.max(0, surfaceBrute(v) - v.ouv))} m², ${fm(v.ep)} cm`,
        calcul(v) {
            const S = Math.max(0, surfaceBrute(v) - v.ouv);
            const vol = S * v.ep / 100 * 1.10;
            const lignes = [L('liant_chanvre', vol * CHANVRE.liant), L('chenevotte', vol * CHANVRE.chanvre)];
            if (v.finition) lignes.push(...lignesMortier(S * 0.005 * PERTE_MORTIER, { liant: 'chaux', dosage: 275, sable: 'sable02', chaux: 'chaux_nhl2' }));
            const R = v.ep / 100 / 0.09;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Correcteur thermique, pas un isolant : ${fm(v.ep)} cm donnent R ≈ ${fmtSmart(R, 1)} (λ ≈ 0,09). Il supprime l'effet de paroi froide et régule l'humidité.`,
                    `≈ ${CHANVRE.liant} kg de liant formulé et ${CHANVRE.chanvre} kg de chanvre fin par m³ : ordre de grandeur, suivre la fiche du fabricant.`,
                    'Mur sain, dépoussiéré, humidifié ; passes de 2 à 3 cm, 1 semaine de séchage entre passes. Jamais sur un mur qui reste mouillé.',
                    CONSEILS.chaux
                ],
                mesure: { q: S, u: 'm²', h: S * (0.8 + v.ep * 0.15) }
            };
        }
    },
    {
        id: 'fissure', cat: 'renovation', ic: '🩹', nom: 'Reprise de fissure (agrafage)',
        desc: 'Agrafes, scellement, injection de coulis, témoins',
        champs: [
            n('ml', 'Longueur de fissure', 'm', 2, { demi: true, max: 30 }),
            n('ep', 'Épaisseur du mur', 'cm', 40, { demi: true, max: 120, bas: 15 }),
            c('mur', 'Le mur', [{ v: 'pierre', l: 'Pierre (chaux)' }, { v: 'agglo', l: 'Agglo / brique' }], 'pierre'),
            n('pas', 'Une agrafe tous les', 'cm', 35, { max: 60, bas: 25, aide: '30 à 40 cm, en quinconce des deux côtés si le mur est épais.' })
        ],
        mots: 'fissure agrafe agrafage couture lézarde témoin jauge mur pierre coulis injection reprise',
        titre: v => `Agrafage de fissure ${fm(v.ml)} m (mur ${fm(v.ep)} cm)`,
        calcul(v) {
            const faces = v.ep >= 35 ? 2 : 1;
            const nb = (Math.ceil(v.ml / (v.pas / 100) - 1e-9) + 1) * faces;
            const lignes = [
                L('fer10', barresPour(nb, 0.6), { d: `${nb} agrafes en U de 60 cm` }),
                L('mortier_sr', nb * 2, { d: 'scellement des agrafes dans les saignées' }),
                L(v.mur === 'pierre' ? 'chaux_nhl5' : 'mortier_sr', v.ml * v.ep / 100 * 0.01 * 1600 * 1.5, { d: 'coulis injecté dans la fissure' }),
                L('temoin', 2)
            ];
            return {
                resume: [{ l: 'Agrafes', v: `${nb}` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'D\'abord trouver la cause (tassement, argile, fuite, arbre) : poser 2 témoins datés et les suivre quelques mois. Fissure qui bouge ou de plus de 2 mm : bureau d\'études.',
                    `Agrafes HA10 en U de 60 cm tous les ${fm(v.pas)} cm${faces > 1 ? ', sur les 2 faces' : ''}, en travers de la fissure, scellées dans des saignées de 4 × 4 cm.`,
                    v.mur === 'pierre' ? 'Mur en pierre : coulis et rebouchage à la chaux (NHL 5), jamais au ciment.' : 'Agglo ou brique : mortier sans retrait.',
                    CONSEILS.structure
                ],
                mesure: { q: v.ml, u: 'm', h: 3 + nb * 0.4 }
            };
        }
    },
    {
        id: 'injection', cat: 'renovation', ic: '💉', nom: 'Remontées capillaires (injection)',
        desc: 'Barrière par injection de crème dans le pied du mur',
        champs: [
            n('ml', 'Longueur de mur', 'm', 10, { demi: true, max: 200 }),
            n('ep', 'Épaisseur du mur', 'cm', 40, { demi: true, max: 120, bas: 15 }),
            c('mur', 'Le mur', [{ v: 'pierre', l: 'Pierre (hétérogène)' }, { v: 'brique', l: 'Brique / agglo' }], 'pierre')
        ],
        mots: 'remontées capillaires humidité salpêtre injection crème barrière étanche pied de mur bâti ancien',
        titre: v => `Injection contre les remontées ${fm(v.ml)} m (mur ${fm(v.ep)} cm)`,
        calcul(v) {
            const trous = Math.ceil(v.ml / 0.12 - 1e-9) + 1;
            const litres = v.ml * v.ep / 100 * 0.7 * (v.mur === 'pierre' ? 2 : 1);
            return {
                resume: [{ l: 'Trous Ø12', v: `${trous}` }, { l: 'Produit', v: `${fmtSmart(litres, 1)} L` }],
                lignes: [L('injection', litres)],
                recette: null,
                infos: [
                    `Trous Ø12 tous les 12 cm, à 10-15 cm du sol, profonds des 2/3 de l'épaisseur (≈ ${fmtSmart(v.ep * 2 / 3, 0)} cm). Consommation ≈ 0,7 L par mètre et par mètre d'épaisseur${v.mur === 'pierre' ? ', doublée en pierre (joints et vides)' : ''} : voir la notice du produit.`,
                    v.mur === 'pierre' ? 'Mur en pierre : l\'injection marche mal dans un mur hétérogène. D\'abord drainer, supprimer les enduits ciment et les sols étanches, et laisser le mur sécher.' : 'Laisser sécher plusieurs mois avant de refaire les enduits (enduit assainissant ou chaux).',
                    'Outil : perforateur et mèche Ø12 longue. Gants et lunettes.'
                ],
                mesure: { q: v.ml, u: 'm', h: v.ml * 0.6 }
            };
        }
    },
    // ── Réseaux / extérieur ─────────────────────────────────────────────────
    {
        id: 'tranchee', cat: 'exterieur', ic: '🕳️', nom: 'Tranchée d\'évacuation (eaux usées / pluviales)',
        desc: 'Tuyau CR8, lit de sable, regards, grillage avertisseur',
        champs: [
            n('L', 'Longueur', 'm', 15, { demi: true, max: 300 }),
            n('prof', 'Profondeur moyenne', 'cm', 60, { demi: true, max: 200, bas: 30 }),
            c('diam', 'Diamètre', [{ v: '100', l: 'Ø100' }, { v: '125', l: 'Ø125' }, { v: '160', l: 'Ø160' }], '100',
                { aide: 'Eaux usées d\'une maison : Ø100 (Ø125 conseillé vers le tout-à-l\'égout). Pluviales : Ø100 par descente.' }),
            c('reseau', 'Réseau', [{ v: 'eu', l: 'Eaux usées' }, { v: 'ep', l: 'Eaux pluviales' }], 'eu'),
            n('coudes', 'Changements de direction', 'u', 2, { zero: true, max: 30, aide: 'Un regard à chaque changement de direction.' })
        ],
        mots: 'tranchée évacuation eaux usées pluviales tout-à-l\'égout raccordement pvc cr8 regard sable grillage avertisseur pente',
        titre: v => `Tranchée ${v.reseau === 'eu' ? 'eaux usées' : 'eaux pluviales'} Ø${v.diam}, ${fm(v.L)} m`,
        calcul(v) {
            const terre = v.L * 0.5 * v.prof / 100;
            const sable = v.L * 0.5 * 0.30 * 1.5 * 1.10;                   // lit de 10 cm + enrobage 20 cm
            const lignes = [
                L('pvc_cr8', v.L * 1.05, { ref: `Ø${v.diam}` }),
                L('coude_cr8', v.coudes * 2, { ref: `Ø${v.diam}` }),
                L('regard', v.coudes + 2, { d: 'départ, arrivée et chaque changement de direction' }),
                L('sable04', sable, { d: 'lit de pose 10 cm + enrobage' }),
                L('grillage_avert', v.L * 1.05, { ref: v.reseau === 'eu' ? 'marron (assainissement)' : 'marron' }),
                L('colle_pvc', v.L / 30)
            ];
            if (terre > 3) lignes.push(L('mini_pelle', Math.max(1, Math.ceil(terre / 30 - 1e-9))));
            return {
                resume: [{ l: 'Terre à sortir', v: `${fm(terre)} m³` }, { l: 'Dénivelé à 2 %', v: `${fmtSmart(v.L * 2, 0)} cm` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Pente 1 à 3 % (${fmtSmart(v.L, 0)} m à 2 % = ${fmtSmart(v.L * 2, 0)} cm de dénivelé). Tranchée de 50 cm de large, lit de sable 10 cm, tuyau enrobé de sable, grillage avertisseur 20 cm au-dessus.`,
                    'Eaux usées et pluviales toujours séparées. Raccordement au tout-à-l\'égout : demande à la mairie ou au service des eaux.',
                    CONSEILS.dict
                ],
                mesure: { q: v.L, u: 'm', h: v.L * 0.8 + v.coudes }
            };
        }
    },
    {
        id: 'pavage', cat: 'exterieur', ic: '🔶', nom: 'Pavage / dallage sur sable',
        desc: 'Pavés ou dalles posés sur lit de sable, bordures',
        champs: [
            SAISIE,
            dim(n('L', 'Longueur', 'm', 6, { demi: true })),
            dim(n('l', 'Largeur', 'm', 4, { demi: true })),
            champSurface(24),
            c('usage', 'Usage', [{ v: 'pieton', l: 'Piéton (terrasse, allée)' }, { v: 'voiture', l: 'Voiture' }], 'pieton'),
            n('bord', 'Longueur de bordures', 'm', 20, { zero: true, max: 500, aide: 'Tour du pavage là où il n\'y a pas de mur. 0 si aucune.' })
        ],
        mots: 'pavé pavage dalle allée terrasse sable grave fond de forme bordure jointoiement voiture',
        titre: v => `Pavage ${fm(surfaceBrute(v, 'L', 'l'))} m²${v.usage === 'voiture' ? ' (voiture)' : ''}`,
        calcul(v) {
            const S = surfaceBrute(v, 'L', 'l');
            const epG = v.usage === 'voiture' ? 0.25 : 0.15;
            const lignes = [
                L('geotextile', S * 1.10),
                L('grave', S * epG * 2.1),
                L('sable04', S * 0.04 * 1.6, { d: 'lit de pose 3 à 4 cm' }),
                L('paves', S * 1.05, { ref: v.usage === 'voiture' ? 'épaisseur 8 cm' : 'épaisseur 6 cm' }),
                L('sable02', S * 0.005, { d: 'sable sec de jointoiement' })
            ];
            if (v.bord > 0) lignes.push(L('bordure', Math.ceil(v.bord * 1.05)), ...lignesBeton(v.bord * 0.03 * PERTE_BETON, 250, 'betonniere'));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Décaissement', v: `${fm(S * (epG + 0.04 + (v.usage === 'voiture' ? 0.08 : 0.06)))} m³` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Fond de forme en grave 0/31,5 sur ${fmtSmart(epG * 100, 0)} cm, compacté à la plaque vibrante par couches de 10 cm, sur géotextile. Lit de sable de 3 à 4 cm tiré à la règle, non compacté.`,
                    'Pente 1,5 à 2 % pour l\'eau, à l\'opposé de la maison. Bordures scellées sur un solin de béton.',
                    'Après la pose : sable sec balayé dans les joints, passage de la plaque vibrante avec tapis de protection, puis on recommence.'
                ],
                mesure: { q: S, u: 'm²', h: S * 0.9 + v.bord * 0.3 }
            };
        }
    },
    // ── Intérieur : menuiserie et bois ──────────────────────────────────────
    {
        id: 'portes', cat: 'interieur', ic: '🚪', nom: 'Portes intérieures',
        desc: 'Blocs-portes, poignées, chambranles, mousse',
        champs: [
            n('nb', 'Nombre de portes', 'u', 3, { max: 40 }),
            c('larg', 'Largeur de passage', [{ v: '73', l: '73 cm' }, { v: '83', l: '83 cm' }, { v: '93', l: '93 cm' }], '83',
                { aide: '83 cm conseillé (accessibilité). 73 cm pour un WC ou un placard.' }),
            c('cloison', 'Épaisseur de cloison', [{ v: '72', l: '72 mm' }, { v: '98', l: '98 mm' }, { v: 'autre', l: 'Mur maçonné' }], '72'),
            oui('chambranles', 'Chambranles (les 2 faces)', true)
        ],
        mots: 'porte intérieure bloc-porte huisserie poignée serrure chambranle menuiserie',
        titre: v => `${fm(v.nb)} porte${v.nb > 1 ? 's' : ''} intérieure${v.nb > 1 ? 's' : ''} ${v.larg} cm`,
        calcul(v) {
            const ref = `passage ${v.larg} cm, huisserie ${v.cloison === 'autre' ? 'à adapter au mur' : v.cloison + ' mm'}`;
            const lignes = [L('bloc_porte', v.nb, { ref }), L('poignee', v.nb), L('mousse_pu', Math.ceil(v.nb / 2)), L('fixation', v.nb * 8, { d: 'fixation des huisseries' })];
            if (v.chambranles) lignes.push(L('chambranle', v.nb * 2));
            return {
                resume: [{ l: 'Portes', v: `${v.nb}` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Réservation dans la cloison : largeur de passage + ≈ 10 cm, hauteur ≈ 2,10 m (porte de 2,04 m). Vérifier les côtes du fabricant.`,
                    'Huisserie d\'aplomb et de niveau, calée puis moussée. Détalonnage de 1 à 2 cm pour la VMC.',
                    'Mur maçonné ancien : huisserie à adapter à l\'épaisseur (fourrure ou ébrasement).'
                ],
                mesure: { q: v.nb, u: 'porte', h: v.nb * 2.5 }
            };
        }
    },
    {
        id: 'osb', cat: 'interieur', ic: '🟧', nom: 'Plancher OSB sur solives',
        desc: 'Dalles rainurées, vis, colle (grenier, étage)',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            c('entraxe', 'Écart entre solives', [{ v: '40', l: '40 cm' }, { v: '50', l: '50 cm' }, { v: '60', l: '60 cm' }], '60',
                { aide: 'De milieu à milieu de deux solives. Au-delà de 60 cm, ajouter des solives.' })
        ],
        mots: 'plancher osb aggloméré dalle bois solive grenier étage plancher bois',
        titre: v => `Plancher OSB ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const ep = v.entraxe === '40' ? 18 : 22;
            const nb = Math.ceil(S * 1.08 / (2.05 * 0.675) - 1e-9);
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Dalles', v: `${nb}` }],
                lignes: [L('osb', nb, { ref: `${ep} mm` }), L('vis_bois', S * 15, { d: '≈ 15 vis par m², tous les 30 cm sur chaque solive' }), L('colle_bois', Math.max(1, Math.ceil(S / 20)), { d: 'dans les rainures' })],
                recette: null,
                infos: [
                    `OSB 3 rainure-languette ${ep} mm pour un entraxe de ${v.entraxe} cm (18 mm jusqu'à 40-50 cm, 22 mm à 60 cm). Pose en quinconce, perpendiculaire aux solives, joints sur solive.`,
                    'Jeu de 1 cm en périphérie. Vérifier que les solives sont saines et assez fortes pour l\'usage (chambre, salle de bain, baignoire : demander conseil).'
                ],
                mesure: { q: S, u: 'm²', h: S * 0.35 }
            };
        }
    },
    {
        id: 'lambris', cat: 'interieur', ic: '🪵', nom: 'Lambris bois',
        desc: 'Lames, tasseaux, clips (mur ou plafond)',
        champs: [
            SAISIE,
            dim(n('L', 'Longueur', 'm', 4, { demi: true })),
            dim(n('l', 'Hauteur ou largeur', 'm', 2.5, { demi: true })),
            champSurface(10),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            oui('tasseaux', 'Sur tasseaux (support pas plan)', true)
        ],
        mots: 'lambris bois lame pvc tasseau clip plafond mur habillage',
        verifier: v => (v.ouv > 0 && v.ouv >= surfaceBrute(v, 'L', 'l') ? { ouv: 'Plus grand que la surface : vérifie' } : {}),
        titre: v => `Lambris ${fm(Math.max(0, surfaceBrute(v, 'L', 'l') - v.ouv))} m²`,
        calcul(v) {
            const S = Math.max(0, surfaceBrute(v, 'L', 'l') - v.ouv);
            const lignes = [L('lambris', S * 1.10), L('clips_lambris', S * 20)];
            if (v.tasseaux) lignes.push(L('tasseau', S / 0.45 * 1.05), L('fixation', Math.ceil(S / 0.45 / 0.6)));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'Lames : +10 % de coupes. Tasseaux tous les 40 à 50 cm, perpendiculaires aux lames, 20 clips par m².',
                    'Acclimater les lames 48 h dans la pièce. Jeu de 5 mm en périphérie (caché par la moulure). Laisser une lame d\'air derrière sur mur ancien.'
                ],
                mesure: { q: S, u: 'm²', h: S * 0.6 }
            };
        }
    }
];
