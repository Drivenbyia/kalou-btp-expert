// Calculateurs « Enduits & joints ».

import { L, fusion, lignesMortier, recetteMortier, PERTE_MORTIER } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, fm, CONSEILS, surfNette, verifOuv } from './commun.js';
export const ENDUITS = [
    // ════════════════ ENDUITS & JOINTS ════════════════
    {
        id: 'enduit', cat: 'enduits', ic: '🖌️', nom: 'Enduit de façade',
        desc: 'Monocouche ou traditionnel 3 couches (agglo, brique)',
        champs: [
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('h', 'Hauteur', 'm', 3, { demi: true, max: 20 }),
            n('ouv', 'Ouvertures à déduire', 'm²', 0, { zero: true }),
            c('type', 'Type d\'enduit', [{ v: 'mono', l: 'Monocouche' }, { v: 'trad', l: 'Traditionnel 3 couches' }], 'mono'),
            c('liant', 'Mortier', [{ v: 'batard', l: 'Bâtard (ciment + chaux)' }, { v: 'ciment', l: 'Ciment' }], 'batard', { si: v => v.type === 'trad' }),
            n('epMono', 'Épaisseur', 'cm', 1.5, { max: 5, bas: 1, si: v => v.type === 'mono', aide: '10 mm minimum en tout point.' }),
            n('epTrad', 'Épaisseur totale', 'cm', 2.2, { max: 6, bas: 1.5, si: v => v.type === 'trad', aide: 'Gobetis 3-5 mm + corps 15-20 mm + finition 5-7 mm.' }),
            n('angles', 'Angles de façade', 'u', 0, { zero: true, aide: 'Pour les baguettes d\'angle.' })
        ],
        mots: 'crépi façade monocouche gobetis bâtard enduit ciment',
        verifier: verifOuv(),
        titre: v => `Enduit ${v.type === 'mono' ? 'monocouche' : 'traditionnel'} ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const lignes = [];
            const infos = [];
            let recette = null;
            if (v.type === 'mono') {
                lignes.push(L('enduit_mono', S * v.epMono * 17 * PERTE_MORTIER));
                infos.push('Monocouche : ≈ 17 kg par m² et par cm (≈ 25 kg/m² en 15 mm), en 2 passes frais dans frais. Pertes 10 % comprises.');
            } else {
                // Dosages dégressifs : chaque couche moins dosée que celle du dessous
                const ep = v.epTrad / 100;
                const gob = 0.004, fin = 0.006, corps = Math.max(0.005, ep - gob - fin);
                const l = v.liant;
                lignes.push(
                    ...lignesMortier(S * gob * PERTE_MORTIER, { liant: 'ciment', dosage: 500 }),
                    ...lignesMortier(S * corps * PERTE_MORTIER, { liant: l, dosage: 400 }),
                    ...lignesMortier(S * fin * PERTE_MORTIER, { liant: l, dosage: 300, sable: 'sable02' })
                );
                infos.push(`3 couches : gobetis au ciment (≈ 500 kg/m³, 4 mm), corps d'enduit ${l === 'batard' ? 'bâtard' : 'ciment'} (≈ 400, ${fmtSmart(corps * 1000, 0)} mm), finition (≈ 300, sable fin, 6 mm).`);
                if (l === 'ciment') infos.push('Le bâtard (moitié ciment, moitié chaux) fissure moins que le ciment pur.');
                recette = recetteMortier(400, ctx.sacCiment || 35, l);
            }
            infos.push(CONSEILS.pierreCiment);
            if (v.angles > 0) lignes.push(L('baguette', Math.ceil(v.angles * v.h / 3 - 1e-9)));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes: fusion(lignes), infos, recette,
                mesure: { q: S, u: 'm²', h: S * (v.type === 'mono' ? 0.5 : 1.0) }
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
            n('ep', 'Épaisseur totale', 'cm', 2.5, { max: 6, bas: 1, aide: 'Gobetis 5 mm + corps 15 mm + finition 5 mm.' })
        ],
        mots: 'enduit chaux nhl gobetis corps finition bâti ancien pierre talochée grattée',
        verifier: verifOuv(),
        titre: v => `Enduit chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const ep = v.ep / 100;
            const gob = Math.min(0.005, ep / 3), fin = Math.min(0.005, ep / 3), corps = Math.max(0, ep - gob - fin);
            const lignes = [
                ...lignesMortier(S * gob * PERTE_MORTIER, { liant: 'chaux', dosage: 450 }),
                ...lignesMortier(S * corps * PERTE_MORTIER, { liant: 'chaux', dosage: 325 }),
                ...lignesMortier(S * fin * PERTE_MORTIER, { liant: 'chaux', dosage: 275, sable: 'sable02' })
            ];
            const vol = S * ep * PERTE_MORTIER;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes),
                infos: [
                    'Dosages dégressifs : gobetis ≈ 450 kg/m³ (NHL 3,5 ou 5), corps ≈ 325 kg (NHL 3,5), finition ≈ 275 kg (NHL 2 ou chaux aérienne, sable fin 0/2). Pertes 10 % comprises.',
                    'Repère : 1 sac de 35 kg ≈ 55 L de chaux. Corps d\'enduit ≈ 1 volume de chaux pour 2 à 2,5 de sable.',
                    CONSEILS.chaux
                ],
                recette: recetteMortier(325, 35, 'chaux'),
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
        mots: 'joint rejointoiement dégarnissage pierre apparente chaux bâti ancien',
        verifier: verifOuv(),
        titre: v => `Rejointoiement chaux ${fm(surfNette(v.L, v.h, v.ouv))} m²`,
        calcul(v, ctx) {
            const S = surfNette(v.L, v.h, v.ouv);
            const vol = S * (+v.joint) / 1000 * PERTE_MORTIER;
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Mortier', v: `${fmtSmart(vol * 1000, 0)} L` }],
                lignes: fusion(lignesMortier(vol, { liant: 'chaux', dosage: 325 })),
                infos: [
                    'Dégarnir les joints sur 2 à 3 cm, brosser, humidifier. Mortier NHL 3,5 dosé ≈ 325 kg/m³ (1 pour 2 à 2,5) : jamais plus dur que la pierre. Pertes 10 % comprises.',
                    CONSEILS.chaux
                ],
                recette: recetteMortier(325, 35, 'chaux'),
                mesure: { q: S, u: 'm²', h: S * (v.joint === '25' ? 2 : 1.5) }
            };
        }
    }
];
