// === ASSISTANT « MAISON NEUVE » ===
// Calcule toutes les quantités d'une maison rectangulaire, lot par lot :
// terrassement → fondations → soubassement → plancher bas → murs → chaînages/linteaux
// → plancher d'étage → charpente/couverture → façade → intérieur.
// Deux modes de plancher bas : dalle sur terre-plein OU vide sanitaire + hourdis.

import {
    L, fusion, lignesBeton, lignesMortier, lignesMurBlocs, lignesChainage, nbBarres6m,
    calcPlancher, calcToiture, calcPlaco, BLOCS, COUVERTURES, PERTE_BETON, PERTE_MORTIER,
    lignesChainageVertical, TREILLIS_UTILE, calcDrainage, lignesEchafaudage
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
            n('L', 'Longueur', 'm', 12, { demi: true, max: 40, aide: 'Côtes extérieures.' }),
            n('l', 'Largeur', 'm', 9, { demi: true, max: 20, aide: 'Côtes extérieures.' }),
            c('niveaux', 'Niveaux', [{ v: '1', l: 'Plain-pied' }, { v: '2', l: 'Étage (R+1)' }], '1'),
            n('hMur', 'Hauteur des murs par niveau', 'm', 2.7, { max: 4, bas: 2.4, aide: 'Plain-pied ≈ 2,70 m. Rez-de-chaussée d\'un R+1 ≈ 2,80 m (plancher + isolant + sol).' }),
            n('refend', 'Murs de refend porteurs', 'm', 0, { zero: true, max: 60, aide: 'Longueur des murs intérieurs porteurs (0 si aucun).' })
        ]
    },
    {
        id: 'fondations', titre: 'Fondations & plancher bas', ic: '🏗️',
        champs: [
            c('bas', 'Plancher bas', [{ v: 'terreplein', l: 'Dalle sur terre-plein' }, { v: 'vs', l: 'Vide sanitaire' }], 'terreplein'),
            n('semL', 'Largeur des semelles', 'cm', 50, { demi: true, max: 120 }),
            n('semH', 'Épaisseur de semelle', 'cm', 35, { demi: true, max: 100, bas: 20 }),
            n('prof', 'Profondeur de fouille', 'cm', 80, { demi: true, max: 200, bas: 50, aide: 'Hors gel. Sol argileux : 80 cm mini, 1,20 m en aléa fort.' }),
            n('hVS', 'Hauteur du vide sanitaire', 'cm', 60, { demi: true, max: 150, si: v => v.bas === 'vs' }),
            n('dalleEp', 'Épaisseur de dalle', 'cm', 12, { demi: true, max: 30, si: v => v.bas === 'terreplein' }),
            n('he', 'Hérisson', 'cm', 20, { demi: true, zero: true, max: 60, si: v => v.bas === 'terreplein' }),
            oui('isolSol', 'Isolant sous dalle', true, { si: v => v.bas === 'terreplein' }),
            oui('drainage', 'Drainage + protection des murs enterrés', false, { aide: 'Conseillé sur terrain argileux, en pente ou humide.' }),
            c('mode', 'Le béton', [{ v: 'bpe', l: 'Toupie (conseillé)' }, { v: 'betonniere', l: 'Bétonnière' }], 'bpe')
        ]
    },
    {
        id: 'murs', titre: 'Murs & ouvertures', ic: '🧱',
        champs: [
            c('bloc', 'Murs en', [{ v: 'p20', l: 'Agglo de 20' }, { v: 'brique20', l: 'Brique de 20' }, { v: 'monomur30', l: 'Monomur de 30' }], 'p20'),
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
            c('couverture', 'Couverture', Object.entries(COUVERTURES).map(([v, x]) => ({ v, l: x.l })), 'meca'),
            n('pente', 'Pente', '%', 35, { demi: true, max: 200, aide: 'Canal ≈ 30 % · romane ≈ 35 % · ardoise ≈ 80 % · plate ≈ 100 %.' }),
            n('debord', 'Débord', 'cm', 40, { demi: true, zero: true, max: 150 }),
            oui('gouttieres', 'Gouttières et descentes')
        ]
    },
    {
        id: 'facade', titre: 'Façade', ic: '🖌️',
        champs: [
            c('enduit', 'Enduit extérieur', [{ v: 'mono', l: 'Monocouche' }, { v: 'chaux', l: 'Chaux' }, { v: 'aucun', l: 'Aucun' }], 'mono'),
            oui('echafaudage', 'Échafaudage en location', true),
            n('semEchaf', 'Durée de location', 'sem.', 6, { si: v => v.echafaudage === true || v.echafaudage === 'true', max: 52, aide: 'Murs + toiture + enduit : souvent 6 à 10 semaines.' })
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
    const nbT = v.refend > 0 ? 2 * Math.max(1, Math.round(v.refend / Math.max(1, lint))) : 0;   // jonctions refend / façade
    const nbChV = 4 + nbT + Math.floor(perimAxe / 10);               // angles, refends, ~ tous les 10 m

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
        L('arm_semelle', nbBarres6m(mlSemelles)),
        L('equerre_sem', 4 + nbT),
        L('cales', Math.ceil(mlSemelles * 1.5))
    ], [
        `Semelles filantes : ${fm(mlSemelles)} m (tour des murs à l'axe${v.refend ? ' + refends' : ''}).`,
        `Béton de propreté ${fm(volProp)} m³ (dosé 150) + semelles ${fm(volSem)} m³ (béton C25/30).`,
        `Équerres préfa aux 4 angles${nbT ? ` et aux ${nbT} jonctions en T` : ''}, attentes des ${nbChV} chaînages verticaux, cales 3-4 cm.`,
        v.prof < 80 ? 'Sol argileux (fréquent en Dordogne) : 80 cm minimum, 1,20 m en aléa fort.' : null,
        'Étude de sol G1/G2 obligatoire en zone argile (loi ELAN). Déclaration DICT avant de creuser.'
    ], volSem * 3);

    // 3. Soubassement
    const surfSoub = mlSemelles * hSoub;
    const lSoub = [
        ...lignesMurBlocs(surfSoub, 'p20', 4, hSoub, mode),
        ...lignesChainage(mlSemelles, { mode, angles: 4 + nbT }),
        L('arase', mlSemelles * 1.05)
    ];
    const infSoub = [
        `Hauteur de soubassement : ${fm(hSoub)} m (${Math.ceil(hSoub / 0.2 - 1e-9)} rangs d'agglo de 20), dont ${fm(hHorsSol)} m hors sol.`,
        'Chaînage en tête de soubassement, puis arase étanche (coupure de capillarité) à 15 cm mini au-dessus du sol extérieur.',
        'Les chaînages verticaux partent des attentes de la semelle : ils sont comptés dans le lot « Chaînages ».'
    ];
    if (vs) {
        lSoub.push(L('grille_vs', Math.max(4, Math.ceil(perimExt / 4 - 1e-9))));
        infSoub.push('Grilles d\'aération du vide sanitaire : environ 1 tous les 4 m.');
    }
    lot('soubassement', vs ? 'Soubassement & vide sanitaire' : 'Soubassement', '🧱', lSoub, infSoub, surfSoub * 1.1 + mlSemelles * 0.5);

    // 3 bis. Drainage et protection des murs enterrés
    if (v.drainage) {
        const d = calcDrainage(perimExt, v.prof / 100, { protection: 'les2', regards: 4, exutoire: 10 });
        lot('drainage', 'Drainage & murs enterrés', '💦', d.lignes, [
            `Drain périphérique sur ${fm(perimExt)} m, protection des murs enterrés sur ${fm(v.prof / 100)} m de haut.`,
            ...d.infos
        ], perimExt * 1.0);
    }

    // 4. Plancher bas
    if (vs) {
        const p = calcPlancher(Lint, portee, { haut: 16, rives: false, mode, pse: true });
        const mult = v.refend > 0 ? 2 : 1;
        const lignes = p.lignes.map(li => li.k === 'poutrelle'
            ? { ...li, q: li.q * mult, d: `${p.nbP * mult} poutrelles de ${fm(p.lgP)} m${mult > 1 ? ' (2 travées)' : ''}` }
            : { ...li, q: li.q * mult });
        lot('plancherbas', 'Plancher bas (hourdis isolant)', '🔲', lignes, [
            `Plancher poutrelles + entrevous isolants PSE 16+4 sur vide sanitaire : ${fm(Sniv)} m², portée ${fm(portee)} m.`,
            'Étais compris : on ne les supprime que si le plan du fabricant indique « sans étai ». Rupteurs de pont thermique en rive (RE2020).',
            'Prévoir une trappe de visite du vide sanitaire et les réservations (eaux usées, fourreaux).'
        ], Sniv * 0.8);
    } else {
        const vol = Sniv * v.dalleEp / 100 * PERTE_BETON;
        const lignes = [
            ...lignesBeton(vol, 350, mode),
            L('treillis36', Math.ceil(Sniv / TREILLIS_UTILE['36'] - 1e-9)),
            L('cales', Math.ceil(Sniv * 4)),
            L('polyane', Sniv * 1.15)
        ];
        if (v.he > 0) lignes.push(L('herisson', Sniv * v.he / 100 * 1.8));
        if (v.isolSol) lignes.push(L('isolant_sol', Sniv * 1.05));
        lot('plancherbas', 'Dalle sur terre-plein', '⬛', lignes, [
            `Dalle de ${v.dalleEp} cm sur ${fm(Sniv)} m² : ${fm(vol)} m³ de béton dosé 350.`,
            v.he > 0 ? `Hérisson compacté de ${fm(v.he)} cm (cailloux 20/40). Remblai complémentaire selon le terrain.` : null,
            v.isolSol ? 'Isolant sous dalle + relevé d\'isolant en périphérie (pont thermique).' : null,
            'Réservations et fourreaux (eaux usées, électricité, eau) à poser avant de couler.'
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
        b.mortierL ? `Hourdage au mortier dosé 350 : ≈ ${b.mortierL} L par m².` : `Joint mince : ≈ ${b.colleKg} kg de mortier-colle par m².`,
        niv === 2 && v.hMur < 2.8 ? 'R+1 : avec 2,70 m par niveau, le plafond fini du rez-de-chaussée tombe vers 2,40 m. Compter plutôt 2,80 m.' : null
    ], (surfMurs + surfRefend) * 1.0);

    // 6. Chaînages & linteaux
    const mlChH = (perimAxe + v.refend) * niv;
    const mlRampants = pignons ? 2 * 2 * Math.sqrt(Math.pow(v.l / 2, 2) + hFaitage * hFaitage) : 0;
    const hChV = hSoub + hMurs;                                       // de la semelle au chaînage haut, d'un seul tenant
    const mlChV = nbChV * hChV;
    const nbSeuils = v.porte + v.baie;
    lot('chainages', 'Chaînages, linteaux, appuis & seuils', '⛓️', [
        ...lignesChainage(mlChH, { mode, angles: (4 + nbT) * niv }),
        ...lignesChainage(mlRampants, { mode }),
        ...lignesChainageVertical(nbChV, hChV, { mode }),
        mlLinteaux > 0 ? L(b.linteau || 'linteau', mlLinteaux, { d: detLinteaux.join(' + ') }) : null,
        v.fenetre > 0 ? L('appui', v.fenetre) : null,
        nbSeuils > 0 ? L('seuil', nbSeuils) : null
    ], [
        `Chaînage horizontal en haut de chaque niveau : ${fm(mlChH)} m, équerres à chaque angle.`,
        pignons ? `Chaînages rampants des pignons : ${fm(mlRampants)} m.` : null,
        `${nbChV} chaînages verticaux de ${fm(hChV)} m (angles, refends, environ tous les 10 m), chacun d'un seul tenant depuis les attentes de la semelle.`,
        `Linteaux${b.linteau === 'linteau_tc' ? ' terre cuite (ou coffres de volet roulant)' : ''} : longueur = ouverture + 20 cm d'appui de chaque côté.`,
        'Vérifier la zone sismique de la commune : en zone 2 et plus, chaînages renforcés.'
    ], (mlChH + mlRampants + mlChV) * 0.5 + nbOuvTotal * 1.5);

    // 7. Plancher d'étage
    if (niv === 2) {
        const p = calcPlancher(Lint, portee, { haut: 16, rives: true, mode });
        const mult = v.refend > 0 ? 2 : 1;
        const lignes = p.lignes.map(li => li.k === 'poutrelle'
            ? { ...li, q: li.q * mult, d: `${p.nbP * mult} poutrelles de ${fm(p.lgP)} m` }
            : { ...li, q: li.q * mult });
        lot('etage', 'Plancher d\'étage', '🔲', lignes, [
            `Poutrelles-hourdis 16+4 : ${fm(Sniv)} m², portée ${fm(portee)} m. Prévoir la trémie d'escalier (chevêtre). Étais 21 à 28 jours.`,
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

    // 9. Façade (+ échafaudage)
    const surfFacade = Math.max(0, perimExt * (hMurs + hHorsSol) + surfPignons - surfOuv);
    const lEchaf = v.echafaudage ? lignesEchafaudage(perimExt + 4, hMurs + hHorsSol + 1, v.semEchaf) : [];
    if (v.enduit !== 'aucun') {
        const lignes = v.enduit === 'mono'
            ? [L('enduit_mono', surfFacade * 1.5 * 17 * PERTE_MORTIER)]
            : [
                ...lignesMortier(surfFacade * 0.005 * PERTE_MORTIER, { liant: 'chaux', dosage: 450 }),
                ...lignesMortier(surfFacade * 0.015 * PERTE_MORTIER, { liant: 'chaux', dosage: 325 }),
                ...lignesMortier(surfFacade * 0.005 * PERTE_MORTIER, { liant: 'chaux', dosage: 275, sable: 'sable02' })
            ];
        lignes.push(L('baguette', Math.ceil(4 * (hMurs + hHorsSol) / 3 - 1e-9) + nbOuvTotal * 2));
        lignes.push(...lEchaf);
        lot('facade', 'Façade & échafaudage', '🖌️', lignes, [
            `Surface enduite : ${fm(surfFacade)} m² (ouvertures déduites).`,
            v.enduit === 'mono' ? 'Monocouche 15 mm : ≈ 25 kg/m², en 2 passes.' : 'Enduit chaux 3 couches (2,5 cm), dosages dégressifs 450 / 325 / 275 kg/m³.',
            v.echafaudage ? `Échafaudage : tour de la maison sur ${fm(hMurs + hHorsSol + 1)} m de haut, ${fmtSmart(v.semEchaf, 0)} semaines.` : 'Échafaudage non compté.'
        ], surfFacade * (v.enduit === 'mono' ? 0.5 : 1.5) + (v.echafaudage ? (perimExt + 4) * (hMurs + 1) * 0.3 : 0));
    } else if (lEchaf.length) {
        lot('facade', 'Échafaudage', '🏗️', lEchaf, [`Tour de la maison, ${fmtSmart(v.semEchaf, 0)} semaines.`], (perimExt + 4) * (hMurs + 1) * 0.3);
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
            infos.push(`Doublage isolé : ${fm(r.S)} m² (100 mm ≈ R 3,15 ; en RE2020 viser 120-140 mm).`);
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
        // Chape : partout si demandée ; à l'étage d'office si carrelage (pas de carrelage collé sur la dalle de compression)
        const sChape = v.chape ? Shab : (v.carrelage && niv === 2 ? Sniv : 0);
        if (sChape > 0) {
            lignes.push(...lignesMortier(sChape * 0.05 * PERTE_BETON, { sableM3: 1.15 }), L('bande_peri', perimInt * (sChape / Sniv) * 1.05));
            h += sChape * 0.35;
            infos.push(v.chape ? `Chape 5 cm : ${fm(sChape)} m².` : `Chape 5 cm à l'étage (${fm(sChape)} m²) : on ne colle pas le carrelage directement sur la dalle de compression.`);
        }
        if (v.carrelage) {
            lignes.push(L('carrelage', Shab * 1.10), L('colle_carrelage', Shab * 7), L('joint_carrelage', Shab * 0.4), L('plinthe', (perimInt * niv + mlCloisons * 2) * 1.05));
            h += Shab * 0.8;
            infos.push(`Carrelage : ${fm(Shab)} m², format 60×60 en double encollage (≈ 7 kg de colle/m²).`);
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
    const rd = x => fmtSmart(x, x >= 50 ? 0 : 1);           // grandes valeurs arrondies à l'unité
    const resume = [
        { l: 'Emprise au sol', v: `${rd(v.L * v.l)} m²` },
        { l: 'Surface habitable ≈', v: `${rd(Shab)} m²` },
        { l: 'Murs', v: `${rd(surfMurs)} m²` },
        { l: 'Toiture', v: `${rd(toit.surf)} m²` }
    ];
    const bpe = toutes.filter(li => li.k === 'bpe').reduce((t, li) => t + li.q, 0);
    if (bpe > 0) resume.push({ l: 'Béton toupie', v: `${rd(bpe)} m³` });

    return {
        erreurs: {}, v,
        titre: MAISON_DEF.titre(v),
        resume, lots,
        lignes: toutes,
        infos: [
            'Maison rectangulaire, dimensions extérieures. Quantités pertes comprises.',
            'Non compté : menuiseries, électricité, plomberie, chauffage, escalier, raccordements (voir « Fosse toutes eaux » pour l\'assainissement).',
            'Ordre de grandeur pour commander et prévoir : le plan, l\'étude de sol et le plan de charpente restent la référence.'
        ],
        heures,
        mesure: { q: v.L * v.l, u: 'm²', h: heures }
    };
}

export { COUVERTURES };
