// Calculateurs « Extérieur : réseaux ».

import { L, fusion, calcDrainage, lignesEchafaudage } from '../base.js';

import { n, c, oui, fm, CONSEILS } from './commun.js';
export const RESEAUX = [
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
