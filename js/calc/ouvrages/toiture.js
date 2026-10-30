// Calculateurs « Toiture ».

import { L, fusion, calcToiture, COUVERTURES } from '../base.js';

import { n, c, oui, fm } from './commun.js';
export const TOITURE = [
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
    }
];
