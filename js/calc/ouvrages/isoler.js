// Calculateur « Isoler un mur ou des rampants » : choix de l'isolant pour une résistance R visée,
// adapté au bâti ancien (isolants perspirants + frein-vapeur hygrorégulant), avec comparaison.

import { L, fusion, calcPlaco, lignesPareVapeur } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, fm, SAISIE, champSurface, dim, surfaceBrute } from './commun.js';

// λ : valeur courante du commerce (voir l'étiquette du paquet) · perspirant : ouvert à la vapeur et capillaire
// pierre : 'oui' conseillé sur mur ancien · 'membrane' possible avec frein-vapeur hygro · 'non' à proscrire
export const ISOLANTS = {
    verre:   { l: 'Laine de verre',        k: 'iso_verre',   lambda: 0.035, dens: 15, perspirant: false, pierre: 'membrane' },
    roche:   { l: 'Laine de roche',        k: 'iso_roche',   lambda: 0.036, dens: 40, perspirant: false, pierre: 'membrane' },
    bois:    { l: 'Fibre de bois',         k: 'iso_bois',    lambda: 0.038, dens: 50, perspirant: true,  pierre: 'oui' },
    chanvre: { l: 'Laine de chanvre',      k: 'iso_chanvre', lambda: 0.040, dens: 35, perspirant: true,  pierre: 'oui' },
    ouate:   { l: 'Ouate de cellulose',    k: 'iso_ouate',   lambda: 0.039, dens: 50, perspirant: true,  pierre: 'oui' },
    pu:      { l: 'Polyuréthane PU / PIR', k: 'iso_pu',      lambda: 0.022, dens: 32, perspirant: false, pierre: 'non' }
};

// Épaisseurs vendues (mm)
const EPAISSEURS = [40, 45, 50, 60, 80, 100, 120, 140, 145, 160, 180, 200, 220, 240];
const epVendue = mm => EPAISSEURS.find(e => e >= mm - 0.5) || Math.ceil(mm / 10) * 10;

/** Couches à poser pour atteindre R : 1 couche jusqu'à maxCouche mm, sinon 2 couches croisées. */
export function couchesPour(R, lambda, maxCouche = 200) {
    const besoin = R * lambda * 1000;
    if (besoin <= maxCouche) return [epVendue(besoin)];
    const c1 = epVendue(besoin / 2);
    return [c1, epVendue(besoin - c1)];
}

const R_DEFAUT = { mur: '3.7', rampants: '6' };

export const ISOLER = [
    {
        id: 'isoler', cat: 'interieur', ic: '🌡️', nom: 'Isoler un mur ou des rampants',
        desc: 'Choix de l\'isolant pour un R visé, bâti ancien compris',
        champs: [
            c('paroi', 'J\'isole', [{ v: 'mur', l: 'Un mur (par l\'intérieur)' }, { v: 'rampants', l: 'Des rampants (combles aménagés)' }], 'mur'),
            c('support', 'Le mur ou la maison', [{ v: 'ancien', l: 'Ancien (pierre, brique, pisé)' }, { v: 'recent', l: 'Récent (agglo, béton)' }], 'ancien',
                { aide: 'Bâti ancien : le mur doit pouvoir sécher. On prend un isolant qui laisse passer la vapeur et une membrane hygrorégulante.' }),
            SAISIE,
            dim(n('L', 'Longueur', 'm', 4, { demi: true, labelSi: v => v.paroi === 'rampants' ? 'Longueur du toit' : 'Longueur du mur' })),
            dim(n('h', 'Hauteur', 'm', 2.5, { demi: true, max: 10, labelSi: v => v.paroi === 'rampants' ? 'Rampants (les 2 pans)' : 'Hauteur' })),
            champSurface(10, 'Surface à isoler, ouvertures non déduites.'),
            n('ouv', 'Fenêtres et portes à déduire', 'm²', 0, { zero: true, si: v => v.paroi === 'mur' }),
            c('R', 'Résistance visée', [{ v: '3.7', l: 'R 3,7' }, { v: '4.5', l: 'R 4,5' }, { v: '6', l: 'R 6' }, { v: '7.5', l: 'R 7,5' }], '3.7',
                { aide: 'Aides de l\'État : murs R ≥ 3,7 · rampants R ≥ 6. Sur mur ancien épais, R 2,5 à 3 est souvent un bon compromis (moins de place perdue).' }),
            c('isolant', 'Isolant', Object.entries(ISOLANTS).map(([v, x]) => ({ v, l: x.l })), 'bois'),
            n('paquet', 'Surface d\'un paquet ou rouleau', 'm²', 3, { max: 20, aide: 'Écrite sur le paquet (souvent 2 à 6 m²). Sert à compter les paquets.' }),
            c('plaque', 'Plaques', [{ v: 'std', l: 'Standard' }, { v: 'h1', l: 'Hydro H1 (salle de bain)' }], 'std')
        ],
        mots: 'isolation isoler mur doublage rampant comble aménagé laine verre roche fibre bois chanvre ouate polyuréthane pu frein vapeur hygrorégulant pierre bâti ancien perspirant résistance',
        surChoix(v, avant) {
            if (avant && v.paroi !== avant.paroi && v.R === R_DEFAUT[avant.paroi]) v.R = R_DEFAUT[v.paroi];
        },
        verifier: v => (v.paroi === 'mur' && v.ouv > 0 && v.ouv >= surfaceBrute(v) ? { ouv: `Plus grand que le mur (${fm(surfaceBrute(v))} m²) : vérifie` } : {}),
        titre: v => `Isolation ${v.paroi === 'rampants' ? 'des rampants' : 'du mur'} ${ISOLANTS[v.isolant].l.charAt(0).toLowerCase() + ISOLANTS[v.isolant].l.slice(1)} R ${fmtSmart(+v.R, 1)} · ${fm(Math.max(0, surfaceBrute(v) - (v.paroi === 'mur' ? v.ouv : 0)))} m²`,
        calcul(v) {
            const mur = v.paroi === 'mur';
            const ancien = v.support === 'ancien';
            const R = +v.R;
            const iso = ISOLANTS[v.isolant] || ISOLANTS.bois;
            const brute = surfaceBrute(v);
            // Longueur et hauteur (en saisie directe : hauteur courante de 2,50 m)
            const b = v.saisie === 'surf' ? (mur ? 2.5 : 4) : v.h;
            const a = brute / b;
            const S = Math.max(0, brute - (mur ? v.ouv : 0));
            const maxCouche = mur ? 200 : 240;
            const couches = couchesPour(R, iso.lambda, maxCouche);
            const ep = couches.reduce((t, x) => t + x, 0);
            const Robt = ep / 1000 / iso.lambda;
            const lignes = [];
            const infos = [];

            // Isolant : une ligne par épaisseur, comptée en paquets
            couches.forEach((e, i) => lignes.push(L(iso.k, S * 1.05, {
                ref: `${e} mm`, pk: v.paquet, d: couches.length > 1 ? (i === 0 ? '1re couche' : '2e couche, croisée') : undefined
            })));

            // Ossature et plaques
            if (mur) {
                const r = calcPlaco('appuis', a, b, { isolant: false, ouv: v.ouv, plaque: v.plaque });
                lignes.push(...r.lignes);
                infos.push(`Doublage sur ossature : fourrures F530 tous les 60 cm, appuis ${ep > 140 ? 'longs (isolant épais) ' : ''}tous les 1,35 m de haut, isolant derrière les fourrures.`);
            } else {
                lignes.push(
                    L(v.plaque === 'h1' ? 'ba13_h1' : 'ba13', Math.ceil(S * 1.10 / 3 - 1e-9), { ref: '1,20 × 2,50 m' }),
                    L('fourrure', Math.ceil(S / 0.5 * 1.10 / 3 - 1e-9), { d: 'entraxe 50 cm' }),
                    L('suspente', Math.ceil(S * 1.8), { ref: `rampant, pour ${ep} mm d'isolant` }),
                    L('fixation', Math.ceil(S * 1.8)),
                    L('vis_placo', S * 20),
                    L('bande', S * 1.5),
                    L('enduit_joint', S * 0.4)
                );
                infos.push(`Rampants : ${couches.length > 1 ? `1re couche de ${couches[0]} mm entre chevrons, 2e de ${couches[1]} mm croisée sous les chevrons` : `${couches[0]} mm d'isolant`}, fourrures tous les 50 cm, suspentes de rampant ≈ 1,8 par m².`,
                    'Laisser 2 cm de lame d\'air sous l\'écran de toiture s\'il n\'est pas HPV.');
            }

            // Membrane côté chaud
            const hygro = ancien || iso.perspirant;
            const perim = mur ? 2 * (a + b) : 4 * Math.sqrt(S);
            if (iso.k === 'iso_pu') {
                lignes.push(L('adhesif_pv', S * 0.7 + perim, { d: 'adhésif alu sur les joints des panneaux' }));
                infos.push('PU / PIR : le parement alu fait pare-vapeur, joints scotchés à l\'adhésif alu.');
            } else if (hygro) {
                lignes.push(L('frein_vapeur', S * 1.10), L('adhesif_pv', S * 0.7 + perim), L('mastic_pv', Math.ceil(perim / 10 - 1e-9)));
                infos.push('Membrane frein-vapeur hygrorégulante (Sd variable) côté chaud : elle bloque la vapeur l\'hiver et laisse sécher le mur l\'été. Continue, scotchée, mastiquée en périphérie.');
            } else {
                lignes.push(...lignesPareVapeur(S, perim));
                infos.push('Pare-vapeur côté chaud, continu, scotché et mastiqué en périphérie et autour des boîtiers.');
            }

            // Alertes bâti ancien
            if (ancien && iso.pierre === 'non') infos.unshift('⚠️ Sur mur ancien (pierre, brique, pisé), le polyuréthane est à proscrire : il enferme l\'humidité dans le mur. Prendre fibre de bois, chanvre ou ouate.');
            else if (ancien && iso.pierre === 'membrane') infos.unshift('Mur ancien : laine minérale possible, mais seulement avec une membrane hygrorégulante (comptée ici). Les isolants biosourcés (fibre de bois, chanvre, ouate) tolèrent mieux l\'humidité.');
            if (ancien && mur) infos.push('Avant d\'isoler un mur ancien : supprimer les causes d\'humidité (enduit ciment extérieur à piquer, drainage, gouttières). Jamais de doublage collé ni de polystyrène sur la pierre. Laisser 1 à 2 cm d\'air entre le mur et l\'isolant.');

            infos.unshift(`${iso.l} λ ${fmtSmart(iso.lambda, 3)} : ${couches.join(' + ')} mm → R ${fmtSmart(Robt, 1)} (visé ${fmtSmart(R, 1)}). Vérifier le λ sur le paquet.`);
            infos.push(`Paquets : ${fm(S * 1.05)} m² (5 % de coupes) ÷ ${fmtSmart(v.paquet, 2)} m² par paquet, par épaisseur.`,
                'Masque FFP2, gants et lunettes pour poser la laine. Couper le courant avant de percer.');

            // Comparaison : les autres isolants pour le même R
            const options = Object.entries(ISOLANTS).filter(([k]) => k !== v.isolant).map(([k, x]) => {
                const cs = couchesPour(R, x.lambda, maxCouche);
                const e = cs.reduce((t, y) => t + y, 0);
                const paquets = cs.length * Math.ceil(S * 1.05 / v.paquet - 1e-9);
                const kg = S * e / 1000 * x.dens;
                const pierre = !ancien ? null : x.pierre === 'oui' ? { ok: true, t: 'Convient au mur ancien' } : x.pierre === 'non' ? { ok: false, t: 'À proscrire sur mur ancien' } : { ok: null, t: 'Possible avec membrane hygro' };
                return {
                    v: k, titre: x.l,
                    lignes: [`${cs.join(' + ')} mm`, `≈ ${paquets} paquets`, `≈ ${fmtSmart(kg, 0)} kg`, x.perspirant ? 'Laisse respirer le mur' : 'Ne respire pas'],
                    badge: pierre
                };
            });

            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Épaisseur', v: `${ep} mm` }, { l: 'R obtenu', v: fmtSmart(Robt, 1) }],
                lignes: fusion(lignes), infos, recette: null,
                comparatif: { champ: 'isolant', titre: `Autres isolants pour R ${fmtSmart(R, 1)}`, options },
                mesure: { q: S, u: 'm²', h: S * (mur ? 0.8 : 1.1) }
            };
        }
    }
];
