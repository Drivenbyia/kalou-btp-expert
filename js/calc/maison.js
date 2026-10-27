// === ASSISTANT « MAISON NEUVE » ===
// Calcule toutes les quantités d'une maison rectangulaire, lot par lot :
// terrassement → fondations → soubassement → plancher bas → murs → chaînages/linteaux
// → plancher d'étage → charpente/couverture → façade → intérieur.
// Deux modes de plancher bas : dalle sur terre-plein OU vide sanitaire + hourdis.

import {
    L, fusion, lignesBeton, lignesMortier, lignesMurBlocs, lignesChainage, nbBarres6m,
    calcPlancher, calcToiture, calcPlaco, BLOCS, COUVERTURES, PERTE_BETON, PERTE_MORTIER
} from './base.js';
import { valider as validerOuvrage } from './ouvrages.js';
import { fmtSmart } from '../core/format.js';

const fm = x => fmtSmart(x, 2);
const n = (id, l, u, def, o = {}) => ({ id, type: 'num', l, u, def, ...o });
const c = (id, l, options, def, o = {}) => ({ id, type: 'choix', l, options, def, ...o });
const oui = (id, l, def = true, o = {}) => ({ id, type: 'oui', l, def, ...o });

// Tailles standard des ouvertures (largeur × hauteur, m)
export const OUVERTURES = {
    porte:   { l: 'Porte d\'entrée / de service', larg: 0.9, haut: 2.15 },
    fenetre: { l: 'Fenêtre',                       larg: 1.2, haut: 1.25 },
    baie:    { l: 'Baie vitrée / porte-fenêtre',   larg: 2.4, haut: 2.15 },
    garage:  { l: 'Porte de garage',               larg: 2.4, haut: 2.0 }
};

/** Étapes du formulaire (chaque étape = une carte). */
export const ETAPES = [
    {
        id: 'maison', titre: 'La maison', ic: '🏠',
        champs: [
            n('L', 'Longueur extérieure', 'm', 12, { demi: true, max: 40 }),
            n('l', 'Largeur extérieure', 'm', 9, { demi: true, max: 20 }),
            c('niveaux', 'Niveaux', [{ v: '1', l: 'Plain-pied' }, { v: '2', l: 'Étage (R+1)' }], '1'),
            n('hMur', 'Hauteur des murs par niveau', 'm', 2.7, { max: 4, aide: '2,50 m sous plafond + plancher/chaînage ≈ 2,70 m.' }),
            n('refend', 'Murs de refend porteurs', 'm', 0, { zero: true, max: 60, aide: 'Longueur des murs intérieurs porteurs (0 si aucun).' })
        ]
    },
    {
        id: 'fondations', titre: 'Fondations & plancher bas', ic: '🏗️',
        champs: [
            c('bas', 'Plancher bas', [{ v: 'terreplein', l: 'Dalle sur terre-plein' }, { v: 'vs', l: 'Vide sanitaire' }], 'terreplein'),
            n('semL', 'Largeur des semelles', 'cm', 50, { demi: true, max: 120 }),
            n('semH', 'Hauteur de béton', 'cm', 35, { demi: true, max: 100 }),
            n('prof', 'Profondeur hors gel', 'cm', 80, { demi: true, max: 200, aide: 'Fond de fouille sous le terrain naturel.' }),
            n('hVS', 'Hauteur du vide sanitaire', 'cm', 60, { demi: true, max: 150, si: v => v.bas === 'vs' }),
            n('dalleEp', 'Épaisseur de dalle', 'cm', 12, { demi: true, max: 30, si: v => v.bas === 'terreplein' }),
            n('he', 'Hérisson', 'cm', 20, { demi: true, zero: true, max: 60, si: v => v.bas === 'terreplein' }),
            oui('isolSol', 'Isolant sous dalle', true, { si: v => v.bas === 'terreplein' }),
            c('mode', 'Le béton', [{ v: 'bpe', l: 'Toupie (conseillé)' }, { v: 'betonniere', l: 'Bétonnière' }], 'bpe')
        ]
    },
    {
        id: 'murs', titre: 'Murs & ouvertures', ic: '🧱',
        champs: [
            c('bloc', 'Murs en', [{ v: 'p20', l: 'Parpaing 20' }, { v: 'brique20', l: 'Brique R20' }, { v: 'monomur30', l: 'Monomur 30' }], 'p20'),
            n('porte', 'Portes extérieures', 'u', 2, { demi: true, zero: true, max: 20, aide: '0,90 × 2,15 m' }),
            n('fenetre', 'Fenêtres', 'u', 8, { demi: true, zero: true, max: 60, aide: '1,20 × 1,25 m' }),
            n('baie', 'Baies vitrées', 'u', 1, { demi: true, zero: true, max: 20, aide: '2,40 × 2,15 m' }),
            n('garage', 'Portes de garage', 'u', 0, { demi: true, zero: true, max: 5, aide: '2,40 × 2,00 m' })
        ]
    },
    {
        id: 'toit', titre: 'Charpente & toiture', ic: '🪵',
        champs: [
            c('pans', 'Toit', [{ v: '2', l: '2 pans (pignons)' }, { v: '4', l: '4 pans' }], '2'),
            c('charpente', 'Charpente', [{ v: 'fermettes', l: 'Fermettes' }, { v: 'trad', l: 'Traditionnelle' }], 'fermettes'),
            c('couverture', 'Couverture', [
                { v: 'meca', l: 'Tuile romane' }, { v: 'canal', l: 'Tuile canal' }, { v: 'plate', l: 'Tuile plate' }, { v: 'ardoise', l: 'Ardoise' }
            ], 'meca'),
            n('pente', 'Pente', '%', 35, { demi: true, max: 200, aide: 'Canal ≈ 30 % · romane ≈ 35 % · ardoise ≈ 80 % · plate ≈ 100 %.' }),
            n('debord', 'Débord', 'cm', 40, { demi: true, zero: true, max: 150 }),
            oui('gouttieres', 'Gouttières et descentes')
        ]
    },
    {
        id: 'facade', titre: 'Façade', ic: '🖌️',
        champs: [
            c('enduit', 'Enduit extérieur', [{ v: 'mono', l: 'Monocouche' }, { v: 'chaux', l: 'Chaux' }, { v: 'aucun', l: 'Aucun' }], 'mono')
        ]
    },
    {
        id: 'interieur', titre: 'Intérieur (second œuvre)', ic: '📐',
        champs: [
            oui('interieur', 'Compter l\'intérieur', true),
            oui('doublage', 'Doublage isolé des murs', true, { si: v => v.interieur && v.bloc !== 'monomur30' }),
            oui('plafonds', 'Plafonds placo + isolation combles', true, { si: v => v.interieur }),
            n('cloisons', 'Cloisons', 'm', 0, { zero: true, max: 300, si: v => v.interieur, aide: '0 = estimation automatique (≈ 0,35 m par m² habitable).' }),
            oui('chape', 'Chape (sur isolant)', false, { si: v => v.interieur }),
            oui('carrelage', 'Carrelage partout', true, { si: v => v.interieur }),
            oui('peinture', 'Peinture murs et plafonds', true, { si: v => v.interieur })
        ]
    }
];

export const MAISON_DEF = {
    id: 'maison',
    nom: 'Maison neuve',
    champs: ETAPES.flatMap(e => e.champs),
    titre: v => `Maison ${fm(v.L)}×${fm(v.l)} m ${v.niveaux === '2' ? 'R+1' : 'plain-pied'}`
};

/**
 * Calcule la maison complète.
 * @returns {{ titre, v, resume, lots: Array<{id,titre,ic,lignes,infos,heures}>, lignes, infos, heures, erreurs }}
 */
export function calculerMaison(brut, ctx = {}) {
    // Validation avec le même moteur que les calculateurs
    const { v, erreurs } = validerOuvrage({ champs: MAISON_DEF.champs }, brut);
    if (Object.keys(erreurs).length) return { erreurs, v };
    if (v.l > v.L) { const t = v.L; v.L = v.l; v.l = t; }       // L = plus grand côté

    const niv = +v.niveaux;
    const mode = v.mode;
    const b = BLOCS[v.bloc] || BLOCS.p20;
    const ep = b.ep / 100;
    const perimExt = 2 * (v.L + v.l);
    const perimAxe = 2 * (v.L + v.l) - 4 * ep;
    const perimInt = 2 * (v.L - 2 * ep + v.l - 2 * ep);
    const Lint = v.L - 2 * ep, lint = v.l - 2 * ep;
    const Sniv = Lint * lint;                           // surface intérieure d'un niveau
    const Shab = Sniv * niv;
    const mlSemelles = perimAxe + v.refend;
    const portee = v.refend > 0 ? lint / 2 : lint;     // poutrelles dans le sens de la largeur
    const vs = v.bas === 'vs';
    const hSousSol = Math.max(0, (v.prof - v.semH) / 100);   // blocs enterrés au-dessus de la semelle
    const hHorsSol = vs ? v.hVS / 100 : 0.20;                 // arase du plancher bas au-dessus du terrain
    const hSoub = hSousSol + hHorsSol;
    const pente = v.pente;
    const hFaitage = v.l / 2 * pente / 100;
    const pignons = v.pans === '2';
    const surfPignons = pignons ? v.l * hFaitage : 0;         // 2 triangles = l × hFaîtage

    // Ouvertures
    const nbOuv = { porte: v.porte, fenetre: v.fenetre, baie: v.baie, garage: v.garage };
    let surfOuv = 0, mlLinteaux = 0;
    const detLinteaux = [];
    Object.entries(nbOuv).forEach(([k, nb]) => {
        if (!(nb > 0)) return;
        const o = OUVERTURES[k];
        surfOuv += nb * o.larg * o.haut;
        const lg = Math.round((o.larg + 0.4) * 100) / 100;
        mlLinteaux += nb * lg;
        detLinteaux.push(`${nb} × ${fm(lg)} m`);
    });
    const nbOuvTotal = v.porte + v.fenetre + v.baie + v.garage;

    const lots = [];
    const lot = (id, titre, ic, lignes, infos, heures) => lots.push({ id, titre, ic, lignes: fusion(lignes), infos: infos.filter(Boolean), heures });

    // 1. Terrassement
    const decap = (v.L + 2) * (v.l + 2) * 0.20;
    const fouilles = mlSemelles * v.semL / 100 * v.prof / 100;
    const deblais = decap + fouilles;
    const joursPelle = Math.max(1, Math.ceil(deblais / 40 - 1e-9));
    lot('terrassement', 'Terrassement', '🚜', [
        L('mini_pelle', joursPelle),
        L('benne', Math.ceil(fouilles * 1.25 / 8 - 1e-9), { d: 'terre des fouilles (la terre végétale reste sur place)' })
    ], [
        `Décapage de la terre végétale (20 cm, 1 m autour) : ${fm(decap)} m³.`,
        `Fouilles des semelles : ${fm(mlSemelles)} m × ${v.semL} cm × ${v.prof} cm = ${fm(fouilles)} m³.`
    ], joursPelle * 8);

    // 2. Fondations
    const volSem = mlSemelles * v.semL / 100 * v.semH / 100 * PERTE_BETON;
    const volProp = mlSemelles * v.semL / 100 * 0.05 * PERTE_BETON;
    lot('fondations', 'Fondations', '🏗️', [
        ...lignesBeton(volProp, 150, mode),
        ...lignesBeton(volSem, 350, mode),
        L('arm_semelle', nbBarres6m(mlSemelles) + 4)
    ], [
        `Semelles filantes : ${fm(mlSemelles)} m (tour des murs à l'axe${v.refend ? ' + refends' : ''}).`,
        `Béton de propreté ${fm(volProp)} m³ (dosé 150) + semelles ${fm(volSem)} m³ (dosé 350).`
    ], volSem * 3);

    // 3. Soubassement
    const surfSoub = mlSemelles * hSoub;
    const lSoub = [
        ...lignesMurBlocs(surfSoub, 'p20', 4, hSoub, mode),
        ...lignesChainage(mlSemelles, { mode })
    ];
    const infSoub = [
        `Hauteur de soubassement : ${fm(hSoub)} m (${Math.ceil(hSoub / 0.2 - 1e-9)} rangs de parpaing 20), dont ${fm(hHorsSol)} m hors sol.`,
        'Chaînage (arase) en tête de soubassement.'
    ];
    if (vs) {
        lSoub.push(L('grille_vs', Math.max(4, Math.ceil(perimExt / 4 - 1e-9))));
        infSoub.push('Grilles d\'aération du vide sanitaire : environ 1 tous les 4 m.');
    }
    lot('soubassement', vs ? 'Soubassement & vide sanitaire' : 'Soubassement', '🧱', lSoub, infSoub, surfSoub * 1.1 + mlSemelles * 0.5);

    // 4. Plancher bas
    if (vs) {
        const p = calcPlancher(Lint, portee, { haut: 16, rives: false, mode });
        const lignes = v.refend > 0 ? p.lignes.map(li => li.k === 'poutrelle'
            ? { ...li, q: li.q * 2, d: `${p.nbP * 2} poutrelles de ${fm(p.lgP)} m (2 travées)` }
            : (li.k === 'etai' ? null : { ...li, q: li.q * 2 })).filter(Boolean)
            : p.lignes.filter(li => li.k !== 'etai');
        lot('plancherbas', 'Plancher bas (hourdis)', '🔲', lignes, [
            `Plancher poutrelles-hourdis 16+4 sur vide sanitaire : ${fm(Sniv)} m², portée ${fm(portee)} m.`,
            'Pas d\'étais sur vide sanitaire si les poutrelles sont autoportantes (sinon voir le fabricant).'
        ], Sniv * 0.8);
    } else {
        const vol = Sniv * v.dalleEp / 100 * PERTE_BETON;
        const lignes = [
            ...lignesBeton(vol, 350, mode),
            L('treillis36', Math.ceil(Sniv / 7.3 - 1e-9)),
            L('cales', Math.ceil(Sniv * 4)),
            L('polyane', Sniv * 1.15)
        ];
        if (v.he > 0) lignes.push(L('herisson', Sniv * v.he / 100 * 1.8));
        if (v.isolSol) lignes.push(L('isolant_sol', Sniv * 1.05));
        lot('plancherbas', 'Dalle sur terre-plein', '⬛', lignes, [
            `Dalle de ${v.dalleEp} cm sur ${fm(Sniv)} m² : ${fm(vol)} m³ de béton dosé 350.`,
            v.he > 0 ? `Hérisson compacté de ${v.he} cm. Remblai complémentaire selon le terrain.` : null
        ], Sniv * 1.0);
    }

    // 5. Élévation des murs
    const hMurs = v.hMur * niv;
    const surfMursBrute = perimAxe * hMurs + surfPignons;
    const surfMurs = Math.max(0, surfMursBrute - surfOuv);
    const surfRefend = v.refend * hMurs;
    const lMurs = [...lignesMurBlocs(surfMurs, v.bloc, 4, hMurs, mode)];
    if (surfRefend > 0) lMurs.push(...lignesMurBlocs(surfRefend, 'p20', 0, 0, mode));
    lot('murs', 'Élévation des murs', '🧱', lMurs, [
        `Murs : ${fm(perimAxe)} m × ${fm(hMurs)} m${pignons ? ` + 2 pignons (${fm(surfPignons)} m²)` : ''} − ${fm(surfOuv)} m² d'ouvertures = ${fm(surfMurs)} m².`,
        surfRefend > 0 ? `Refends en parpaing 20 : ${fm(surfRefend)} m².` : null,
        b.mortierL ? `Hourdage au mortier dosé 350 : ≈ ${b.mortierL} L par m².` : `Joint mince : ≈ ${b.colleKg} kg de mortier-colle par m².`
    ], (surfMurs + surfRefend) * 1.0);

    // 6. Chaînages & linteaux
    const mlChH = (perimAxe + v.refend) * niv;
    const mlRampants = pignons ? 2 * 2 * Math.sqrt(Math.pow(v.l / 2, 2) + hFaitage * hFaitage) : 0;
    const nbChV = 4 + 2 * (v.refend > 0 ? Math.ceil(v.refend / 8) : 0) + Math.floor(perimAxe / 10);
    const mlChV = nbChV * hMurs;
    lot('chainages', 'Chaînages, linteaux & appuis', '⛓️', [
        ...lignesChainage(mlChH, { mode }),
        ...lignesChainage(mlRampants, { mode }),
        ...lignesChainage(mlChV, { vertical: true, mode }),
        mlLinteaux > 0 ? L('linteau', mlLinteaux, { d: detLinteaux.join(' + ') }) : null,
        v.fenetre > 0 ? L('appui', v.fenetre) : null
    ], [
        `Chaînage horizontal en haut de chaque niveau : ${fm(mlChH)} m.`,
        pignons ? `Chaînages rampants des pignons : ${fm(mlRampants)} m.` : null,
        `${nbChV} chaînages verticaux (angles, refends, environ tous les 10 m).`,
        `Linteaux : longueur = ouverture + 20 cm d'appui de chaque côté.`
    ], (mlChH + mlRampants + mlChV) * 0.5 + nbOuvTotal * 1.5);

    // 7. Plancher d'étage
    if (niv === 2) {
        const p = calcPlancher(Lint, portee, { haut: 16, rives: true, mode });
        const mult = v.refend > 0 ? 2 : 1;
        const lignes = p.lignes.map(li => li.k === 'poutrelle'
            ? { ...li, q: li.q * mult, d: `${p.nbP * mult} poutrelles de ${fm(p.lgP)} m` }
            : { ...li, q: li.q * mult });
        lot('etage', 'Plancher d\'étage', '🔲', lignes, [
            `Poutrelles-hourdis 16+4 : ${fm(Sniv)} m², portée ${fm(portee)} m. Prévoir la trémie d'escalier.`,
            'Escalier : voir le calculateur « Escalier béton » ou un escalier bois.'
        ], Sniv * 0.8);
    }

    // 8. Charpente & couverture
    const toit = calcToiture({
        L: v.L, l: v.l, pans: +v.pans, pente, debord: v.debord / 100,
        charpente: v.charpente, couverture: v.couverture, gouttieres: v.gouttieres
    });
    lot('toiture', 'Charpente & couverture', '🏠', toit.lignes, [
        `Surface de toit : ${fm(toit.surf)} m² (rampant ${fm(toit.rampant)} m, faîtage à ${fm(toit.hFaitage)} m au-dessus des murs).`,
        ...toit.infos
    ], toit.heures);

    // 9. Façade
    const surfFacade = Math.max(0, perimExt * (hMurs + hHorsSol) + surfPignons - surfOuv);
    if (v.enduit !== 'aucun') {
        const lignes = v.enduit === 'mono'
            ? [L('enduit_mono', surfFacade * 1.5 * 17 * PERTE_MORTIER)]
            : lignesMortier(surfFacade * 0.02 * PERTE_MORTIER, { liant: 'chaux' });
        lignes.push(L('baguette', Math.ceil(4 * (hMurs + hHorsSol) / 3 - 1e-9) + nbOuvTotal * 2));
        lot('facade', 'Façade', '🖌️', lignes, [
            `Surface enduite : ${fm(surfFacade)} m² (ouvertures déduites).`,
            v.enduit === 'mono' ? 'Monocouche 15 mm : ≈ 25 kg/m².' : 'Enduit chaux 3 couches, 2 cm.'
        ], surfFacade * (v.enduit === 'mono' ? 0.5 : 1.5));
    }

    // 10. Intérieur
    if (v.interieur) {
        const lignes = [];
        const infos = [];
        let h = 0;
        const hsp = Math.max(2.3, v.hMur - 0.2);
        if (v.doublage && v.bloc !== 'monomur30') {
            const r = calcPlaco('doublage', perimInt * niv, hsp, { isolant: true, ouv: surfOuv });
            lignes.push(...r.lignes); h += r.S * 0.6;
            infos.push(`Doublage isolé : ${fm(r.S)} m².`);
        }
        if (v.plafonds) {
            const r = calcPlaco('plafond', Lint, lint, { isolant: false });
            r.lignes.forEach(li => lignes.push({ ...li, q: li.q * niv }));
            lignes.push(L('laine_combles', Sniv * 1.05, { d: 'épaisseur 300 mm' }));
            h += Sniv * niv * 0.8 + Sniv * 0.15;
            infos.push(`Plafonds : ${fm(Sniv * niv)} m² + isolation des combles ${fm(Sniv)} m².`);
        }
        const mlCloisons = v.cloisons > 0 ? v.cloisons : Math.round(Shab * 0.35);
        if (mlCloisons > 0) {
            const r = calcPlaco('cloison', mlCloisons, hsp, { isolant: true });
            lignes.push(...r.lignes); h += r.S * 0.9;
            infos.push(`Cloisons : ${fm(mlCloisons)} m${v.cloisons > 0 ? '' : ' (estimation)'} × ${fm(hsp)} m.`);
        }
        if (v.chape) {
            lignes.push(...lignesMortier(Shab * 0.05 * PERTE_BETON), L('bande_peri', perimInt * niv * 1.05));
            h += Shab * 0.35;
            infos.push(`Chape 5 cm : ${fm(Shab)} m².`);
        }
        if (v.carrelage) {
            lignes.push(L('carrelage', Shab * 1.10), L('colle_carrelage', Shab * 5), L('joint_carrelage', Shab * 0.4), L('plinthe', (perimInt * niv + mlCloisons * 2) * 1.05));
            h += Shab * 0.8;
            infos.push(`Carrelage : ${fm(Shab)} m² (format 30 à 60 cm).`);
        }
        if (v.peinture) {
            const sMurs = perimInt * niv * hsp - surfOuv + mlCloisons * 2 * hsp;
            const sP = Math.max(0, sMurs) + Shab;
            lignes.push(L('impression', sP / 10 * 1.05), L('peinture', sP * 2 / 10 * 1.05, { d: '2 couches' }));
            h += sP * 0.36;
            infos.push(`Peinture : ${fm(sP)} m² (murs + plafonds).`);
        }
        if (lignes.length) lot('interieur', 'Intérieur', '📐', lignes, infos, h);
    }

    // Résumé
    const toutes = fusion(lots.flatMap(lt => lt.lignes.map(li => ({ k: li.k, q: li.q, d: li.k === 'bpe' ? li.d : undefined }))));
    const heures = lots.reduce((s, lt) => s + (lt.heures || 0), 0);
    const resume = [
        { l: 'Emprise au sol', v: `${fm(v.L * v.l)} m²` },
        { l: 'Surface habitable ≈', v: `${fm(Shab)} m²` },
        { l: 'Murs', v: `${fm(surfMurs)} m²` },
        { l: 'Toiture', v: `${fm(toit.surf)} m²` }
    ];
    const bpe = toutes.filter(li => li.k === 'bpe').reduce((t, li) => t + li.q, 0);
    if (bpe > 0) resume.push({ l: 'Béton toupie', v: `${fm(bpe)} m³` });

    return {
        erreurs: {}, v,
        titre: MAISON_DEF.titre(v),
        resume, lots,
        lignes: toutes,
        infos: [
            'Maison rectangulaire, dimensions extérieures. Quantités pertes comprises.',
            'Non compté : menuiseries, électricité, plomberie, chauffage, escalier, VRD et raccordements.',
            'Ordre de grandeur pour commander et prévoir : le plan, l\'étude de sol et le plan de charpente restent la référence.'
        ],
        heures,
        mesure: { q: v.L * v.l, u: 'm²', h: heures }
    };
}

export { COUVERTURES };
