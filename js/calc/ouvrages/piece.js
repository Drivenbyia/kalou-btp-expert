// Calculateur « Pièce complète » : on tape la pièce une seule fois (longueur × largeur × hauteur),
// puis on coche ce qu'on refait (murs, plafond, sol, plinthes). Il réutilise les calculateurs
// Placo, Peinture, Parquet, Carrelage et Ragréage : mêmes formules, une seule saisie.
// « Dupliquer » dans le chantier permet d'enchaîner les pièces d'un appartement.

import { L, fusion } from '../base.js';
import { calculer } from '../ouvrages.js';
import { n, c, oui, texte, fm } from './commun.js';

const ouvertures = v => v.portes * 1.7 + v.fen * v.fenT;

export const PIECE = [
    {
        id: 'piece', cat: 'interieur', ic: '🛋️', nom: 'Pièce complète (rénovation)',
        desc: 'Murs, plafond, sol et plinthes d\'une pièce en une seule saisie',
        champs: [
            texte('nom', 'Nom de la pièce', 'Pièce', { ph: 'Chambre 1, séjour…' }),
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 6 }),
            n('portes', 'Portes', 'u', 1, { demi: true, zero: true, max: 10 }),
            n('fen', 'Fenêtres', 'u', 1, { demi: true, zero: true, max: 20 }),
            n('fenT', 'Taille d\'une fenêtre', 'm²', 1.5, { si: v => v.fen > 0, max: 10, aide: 'Largeur × hauteur. Fenêtre ≈ 1,5 m², porte-fenêtre ≈ 2,7 m².' }),
            c('murs', 'Les murs', [{ v: 'rien', l: 'Rien' }, { v: 'peinture', l: 'Peinture' }, { v: 'doublage', l: 'Doublage isolé + peinture' }], 'peinture'),
            c('plafond', 'Le plafond', [{ v: 'rien', l: 'Rien' }, { v: 'peinture', l: 'Peinture' }, { v: 'placo', l: 'Placo + peinture' }], 'peinture'),
            c('prep', 'Préparation des murs', [{ v: '0', l: 'Aucune' }, { v: 'B', l: 'Rebouchage' }, { v: 'A', l: 'Lissage complet' }], 'B', { si: v => v.murs !== 'rien' || v.plafond !== 'rien' }),
            c('sol', 'Le sol', [{ v: 'rien', l: 'Rien' }, { v: 'parquet', l: 'Parquet' }, { v: 'carrelage', l: 'Carrelage' }, { v: 'ragreage', l: 'Ragréage seul' }], 'parquet'),
            n('paquet', 'Surface d\'un paquet de parquet', 'm²', 2, { si: v => v.sol === 'parquet', max: 10 }),
            oui('plinthes', 'Plinthes', true, { si: v => v.sol !== 'ragreage' })
        ],
        mots: 'pièce chambre séjour salon appartement rénovation murs plafond sol peinture parquet carrelage plinthes dupliquer',
        verifier: v => (ouvertures(v) >= 2 * (v.L + v.l) * v.h * 0.8 ? { fen: 'Portes et fenêtres plus grandes que les murs : vérifie' } : {}),
        titre: v => `${v.nom || 'Pièce'} ${fm(v.L)} × ${fm(v.l)} m`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const P = 2 * (v.L + v.l);
            const ouv = ouvertures(v);
            const Sm = Math.max(0, P * v.h - ouv);
            const sous = [];
            const ajoute = (id, val) => { const r = calculer(id, val, ctx); if (r && !Object.keys(r.erreurs).length) sous.push(r); return r; };
            if (v.murs === 'doublage') ajoute('placo', { type: 'appuis', a: P, b: v.h, ouv, laine: '120', isolant: true });
            if (v.plafond === 'placo') ajoute('placo', { type: 'plafond', a: v.L, b: v.l, isolant: false });
            if (v.murs !== 'rien' || v.plafond !== 'rien') {
                ajoute('peinture', {
                    L: v.L, l: v.l, h: v.h, ouv, murs: v.murs !== 'rien', plafond: v.plafond !== 'rien',
                    impression: v.murs === 'doublage' || v.plafond === 'placo', lissage: v.prep, couches: '2'
                });
            }
            const plinthesSol = v.plinthes && v.sol !== 'ragreage';
            if (v.sol === 'parquet') ajoute('parquet', { L: v.L, l: v.l, portes: v.portes, plinthes: plinthesSol, paquet: v.paquet });
            if (v.sol === 'carrelage') ajoute('carrelage', { support: 'sol', L: v.L, l: v.l, portes: v.portes, plinthes: plinthesSol });
            if (v.sol === 'ragreage') ajoute('ragreage', { L: v.L, l: v.l });
            const lignes = sous.flatMap(r => r.lignes);
            if (v.sol === 'rien' && v.plinthes) lignes.push(L('plinthe_bois', Math.max(0, P - 0.9 * v.portes) * 1.10));
            const fait = [v.murs === 'doublage' ? 'doublage isolé des murs' : null, v.plafond === 'placo' ? 'plafond en placo' : null,
                v.murs !== 'rien' ? 'peinture des murs' : null, v.plafond !== 'rien' ? 'peinture du plafond' : null,
                v.sol !== 'rien' ? { parquet: 'parquet', carrelage: 'carrelage', ragreage: 'ragréage' }[v.sol] : null].filter(Boolean);
            return {
                resume: [{ l: 'Sol', v: `${fm(S)} m²` }, { l: 'Murs', v: `${fm(Sm)} m²` }, { l: 'Plafond', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `${v.nom || 'Pièce'} : ${fm(v.L)} × ${fm(v.l)} m, ${fm(v.h)} m sous plafond. Murs ${fm(P * v.h)} m² − ${fm(ouv)} m² de portes et fenêtres = ${fm(Sm)} m².`,
                    fait.length ? `Compté : ${fait.join(', ')}.` : 'Rien de coché : choisis ce que tu refais dans la pièce.',
                    'Mêmes calculs que les calculateurs Placo, Peinture, Parquet, Carrelage et Ragréage (2 couches de peinture, doublage laine 120 mm). Pour un réglage fin, utilise-les séparément.',
                    'Plusieurs pièces : ajoute celle-ci au chantier, puis « Dupliquer » et change les mesures. La liste de courses additionne tout.',
                    ...sous.flatMap(r => r.infos || []).filter(t => /amiante|plomb|pierre/i.test(t)).slice(0, 2)
                ],
                mesure: { q: S, u: 'm²', h: sous.reduce((t, r) => t + ((r.mesure && r.mesure.h) || 0), 0) }
            };
        }
    }
];
