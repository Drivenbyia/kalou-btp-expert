// Calculateurs « Extérieur & terrassement ».

import { L, fusion, lignesBeton, lignesMurBlocs, lignesChainage, PERTE_BETON, TREILLIS_UTILE } from '../base.js';

import { n, c, oui, MODE, fm, CONSEILS, aideBeton } from './commun.js';
export const EXTERIEUR = [
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
    }
];
