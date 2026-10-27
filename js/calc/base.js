// === BRIQUES DE CALCUL COMMUNES ===
// Dosages et ratios de référence utilisés par tous les calculateurs et par
// l'assistant « Maison neuve ». Tout est centralisé ici pour rester cohérent.
//
// Béton (pour 1 m³ de béton en place) :
//   ciment = dosage choisi (kg) · sable 0/4 ≈ 400 L ≈ 0,65 T · gravillon 4/20 ≈ 800 L ≈ 1,15 T · eau ≈ 175 L
// Mortier (pour 1 m³ de mortier) :
//   liant = dosage (kg) · sable 0/4 ≈ 1 m³ ≈ 1,5 T
// Pertes : béton +5 %, mortier/enduit +10 %, blocs +5 %, plaques +10 %.

import { fmtSmart, fmt } from '../core/format.js';

export const BETON = { sableT: 0.65, gravierT: 1.15, sableL: 400, gravierL: 800, eauL: 175 };
export const MORTIER = { sableT: 1.5, sableL: 1000 };
export const PERTE_BETON = 1.05;
export const PERTE_MORTIER = 1.10;
export const PERTE_BLOCS = 1.05;

/** Ligne de matériau. */
export const L = (k, q, extra = {}) => ({ k, q, ...extra });

/** Additionne les lignes de même matériau (et même précision éventuelle). */
export function fusion(lignes) {
    const out = [];
    const idx = new Map();
    lignes.forEach(li => {
        if (!li || !(li.q > 0)) return;
        const cle = `${li.k}|${li.l || ''}|${li.d || ''}`;
        if (idx.has(cle)) out[idx.get(cle)].q += li.q;
        else { idx.set(cle, out.length); out.push({ ...li }); }
    });
    return out;
}

// ─── Béton ─────────────────────────────────────────────────────────────────

// Classe de résistance demandée à la centrale (toupie) selon le dosage équivalent
export const CLASSE_BPE = { 150: 'C8/10 (propreté)', 250: 'C16/20', 300: 'C20/25', 350: 'C25/30', 400: 'C30/37' };

/**
 * Matériaux pour un volume de béton (pertes déjà incluses dans vol).
 * fin = béton de remplissage (blocs à bancher, chaînages) : gravillon 4/10, béton fluide.
 */
export function lignesBeton(vol, dosage = 350, mode = 'betonniere', { fin = false } = {}) {
    if (!(vol > 0)) return [];
    if (mode === 'bpe') {
        const classe = CLASSE_BPE[dosage] || `≈ ${dosage} kg`;
        return [L('bpe', vol, { d: `${classe}${fin ? ' S4, gravillon D10 (remplissage)' : ' S3'}` })];
    }
    return [
        L('ciment', vol * dosage),
        L('sable04', vol * BETON.sableT),
        L(fin ? 'gravillon_fin' : 'gravier', vol * BETON.gravierT)
    ];
}

const demi = x => Math.max(0.5, Math.round(x * 2) / 2);

/**
 * Recette d'une gâchée pour une bétonnière courante (cuve 160 L ≈ 100-110 L de béton).
 * Aux faibles dosages, 1 sac ferait déborder la cuve : on passe à ½ sac.
 */
export function recetteBeton(dosage = 350, sac = 35) {
    let part = sac / dosage;                             // m³ de béton pour 1 sac
    const moitie = part > 0.13;
    if (moitie) part /= 2;
    const lib = moitie ? `½ sac de ${sac} kg` : `1 sac de ${sac} kg`;
    return {
        titre: `Gâchée : ${lib} de ciment (béton dosé ${dosage} kg/m³)`,
        lignes: [
            `Sable 0/4 : ${fmtSmart(demi(BETON.sableL * part / 10), 1)} seaux de 10 L`,
            `Gravillon : ${fmtSmart(demi(BETON.gravierL * part / 10), 1)} seaux de 10 L`,
            `Eau : environ ${fmt(Math.round(sac * (moitie ? 0.5 : 1) * 0.5))} L, à ajuster (sable mouillé = moins d'eau)`,
            `Donne environ ${fmtSmart(part * 1000, 0)} L de béton`,
            'Sable humide : compter ≈ 20 % de seaux en plus (il gonfle).'
        ]
    };
}

const NOM_LIANT = { ciment: 'ciment', chaux: 'chaux', batard: 'ciment + chaux (bâtard)' };

/** Recette d'une gâchée de mortier avec 1 sac de liant. */
export function recetteMortier(dosage = 350, sac = 35, liant = 'ciment') {
    const sableL = MORTIER.sableL * sac / dosage;
    const titre = liant === 'batard'
        ? `Gâchée bâtarde : ½ sac de ciment + ½ sac de chaux (mortier dosé ${dosage} kg/m³)`
        : `Gâchée : 1 sac de ${NOM_LIANT[liant] || 'ciment'} ${sac} kg (mortier dosé ${dosage} kg/m³)`;
    return {
        titre,
        lignes: [
            `Sable : ${fmtSmart(demi(sableL / 10), 1)} seaux de 10 L (≈ ${fmtSmart(sableL / 60, 1)} brouettes à ras)`,
            `Eau : environ ${fmt(Math.round(sac * 0.5))} L, à ajuster`,
            `Donne environ ${fmtSmart(sableL, 0)} L de mortier`
        ]
    };
}

// ─── Mortier ───────────────────────────────────────────────────────────────

/**
 * Matériaux pour un volume de mortier (pertes déjà incluses).
 * liant : 'ciment' | 'chaux' | 'batard' (moitié ciment, moitié chaux).
 */
export function lignesMortier(vol, { liant = 'ciment', dosage = 350, sable = 'sable04', sableM3 = 1 } = {}) {
    if (!(vol > 0)) return [];
    const out = [];
    if (liant === 'batard') out.push(L('ciment', vol * dosage / 2), L('chaux', vol * dosage / 2));
    else out.push(L(liant === 'chaux' ? 'chaux' : 'ciment', vol * dosage));
    out.push(L(sable, vol * MORTIER.sableT * sableM3));
    return out;
}

// ─── Murs en blocs ─────────────────────────────────────────────────────────

// parM2 : nombre de blocs au m² · mortierL : litres de mortier par m² (pertes comprises)
// colleKg : mortier-colle (joint mince) en kg/m² · remplissage : béton m³/m² (blocs à bancher)
export const BLOCS = {
    p20:      { l: 'Agglo (parpaing) de 20',   k: 'parpaing20', angle: 'angle20', parM2: 10,   mortierL: 20, ep: 20, h: 0.20, linteau: 'linteau' },
    p15:      { l: 'Agglo (parpaing) de 15',   k: 'parpaing15', angle: 'angle15', parM2: 10,   mortierL: 15, ep: 15, h: 0.20, linteau: 'linteau' },
    p10:      { l: 'Agglo de 10 (cloison)',     k: 'parpaing10',                  parM2: 10,   mortierL: 10, ep: 10, h: 0.20, linteau: 'linteau' },
    bancher:  { l: 'Bloc à bancher 20',         k: 'bancher20',                    parM2: 10,   remplissage: 0.14, ep: 20, h: 0.20, linteau: 'linteau' },
    brique20: { l: 'Brique rectifiée de 20',    k: 'brique20',                     parM2: 6.4,  colleKg: 2.5, ep: 20, h: 0.314, linteau: 'linteau_tc' },
    monomur30:{ l: 'Monomur de 30',             k: 'monomur30',                    parM2: 16.2, colleKg: 4,   ep: 30, h: 0.249, linteau: 'linteau_tc' }
};

/**
 * Matériaux d'un mur en blocs.
 * @param {number} surf   surface nette (ouvertures déduites)
 * @param {string} type   clé de BLOCS
 * @param {number} angles nombre d'angles/abouts (blocs d'angle sur toute la hauteur)
 * @param {number} haut   hauteur du mur (pour compter les rangs aux angles)
 */
export function lignesMurBlocs(surf, type = 'p20', angles = 0, haut = 0, mode = 'betonniere') {
    const b = BLOCS[type] || BLOCS.p20;
    const out = [];
    if (!(surf > 0)) return out;
    let nbAngle = 0;
    if (b.angle && angles > 0 && haut > 0) {
        nbAngle = Math.ceil(angles * Math.ceil(haut / b.h - 1e-9) * PERTE_BLOCS);
        out.push(L(b.angle, nbAngle));
    }
    out.push(L(b.k, Math.max(0, Math.ceil(surf * b.parM2 * PERTE_BLOCS) - nbAngle)));
    if (b.mortierL) out.push(...lignesMortier(surf * b.mortierL / 1000));
    if (b.colleKg)  out.push(L('colle_bloc', surf * b.colleKg * PERTE_BLOCS));
    if (b.remplissage) out.push(...lignesBeton(surf * b.remplissage * PERTE_BETON, 350, mode, { fin: true }));
    return out;
}

// ─── Chaînages ─────────────────────────────────────────────────────────────

/** Nombre d'armatures de 6 m (recouvrement 50 cm) pour une longueur donnée. */
export const nbBarres6m = ml => (ml > 0 ? Math.ceil(ml / 5.5 - 1e-9) : 0);

/**
 * Chaînage horizontal béton armé, en blocs U (2 par mètre).
 * Béton ≈ 25 L par mètre, dosé 350, gravillon fin. Armatures de 6 m recouvertes de 50 cm.
 */
export function lignesChainage(ml, { blocsU = true, mode = 'betonniere', angles = 0 } = {}) {
    if (!(ml > 0)) return [];
    const out = [];
    if (blocsU) out.push(L('bloc_u', Math.ceil(ml * 2 * PERTE_BLOCS)));
    out.push(L('arm_chainage', nbBarres6m(ml) + 1));
    if (angles > 0) out.push(L('equerre_ch', angles));
    out.push(...lignesBeton(ml * 0.025 * PERTE_BETON, 350, mode, { fin: true }));
    return out;
}

/**
 * Chaînages verticaux : chacun est d'un seul tenant, de la semelle (attentes) au chaînage haut.
 * 1 armature par chaînage (+ 1 par tranche de 5,5 m au-delà), 1 attente en L par chaînage.
 */
export function lignesChainageVertical(nb, hauteur, { mode = 'betonniere', attentes = true } = {}) {
    if (!(nb > 0) || !(hauteur > 0)) return [];
    const parChainage = Math.ceil((hauteur + 0.5) / 6 - 1e-9);
    const out = [L('arm_chainage', nb * parChainage)];
    if (attentes) out.push(L('attente', nb));
    out.push(...lignesBeton(nb * hauteur * 0.025 * PERTE_BETON, 350, mode, { fin: true }));
    return out;
}

// ─── Plancher poutrelles + entrevous ────────────────────────────────────────

// Surface couverte par un panneau de treillis, recouvrement de 2 mailles (maille 15 cm) déduit
export const TREILLIS_UTILE = { '36': 6.9, '6': 11.5 };

const COMPRESSION = { 12: 0.065, 16: 0.075, 20: 0.085 };   // m³ de béton par m² (dalle de 4 cm + remplissage)

/**
 * Plancher poutrelles / entrevous.
 * @param {number} longueur côté perpendiculaire aux poutrelles (m)
 * @param {number} portee   distance entre murs porteurs (m)
 */
export function calcPlancher(longueur, portee, { haut = 16, rives = true, mode = 'betonniere', pse = false } = {}) {
    const S = longueur * portee;
    const nbP = Math.max(1, Math.ceil(longueur / 0.6 - 1e-9));
    const lgP = Math.ceil((portee + 0.10) * 10 - 1e-9) / 10;             // + 5 cm d'appui de chaque côté
    const vol = S * (COMPRESSION[haut] || 0.075) * PERTE_BETON;
    const files = Math.max(1, Math.ceil(portee / 1.5 - 1e-9) - 1);
    const etais = files * (Math.ceil(longueur / 1.0 - 1e-9) + 1);
    const perim = 2 * (longueur + portee);
    const lignes = [
        L('poutrelle', nbP * lgP, { d: `${nbP} poutrelles de ${fmtSmart(lgP, 2)} m` }),
        L(pse ? 'entrevous_pse' : 'entrevous', Math.ceil(S / (0.6 * 0.2) * 1.03)),
        L('treillis36', Math.ceil(S / TREILLIS_UTILE['36'] - 1e-9)),
        ...lignesBeton(vol, 350, mode),
        L('etai', etais)
    ];
    if (rives) lignes.push(L('planelle', Math.ceil(perim * 2 * PERTE_BLOCS)));
    return { S, vol, nbP, lgP, etais, lignes };
}

// ─── Toiture : charpente + couverture ──────────────────────────────────────

// parM2 : éléments au m² · liteaux : mètres de liteau par m² · penteMin : pente conseillée (%)
export const COUVERTURES = {
    meca:    { l: 'Tuile romane (emboîtement)',     k: 'tuile_meca',  parM2: 12, liteaux: 2.9, pente: 35 },
    gm:      { l: 'Tuile mécanique grand moule',    k: 'tuile_gm',    parM2: 10, liteaux: 2.7, pente: 35 },
    canal:   { l: 'Tuile canal',                    k: 'tuile_canal', parM2: 28, liteaux: 0,   pente: 30 },
    plate:   { l: 'Tuile plate (du Périgord)',      k: 'tuile_plate', parM2: 65, liteaux: 10,  pente: 100 },
    ardoise: { l: 'Ardoise',                        k: 'ardoise',     parM2: 38, liteaux: 8.7, pente: 80 }
};

/**
 * Toiture complète. Dimensions = extérieur des murs.
 * @param {object} p { L, l, pans (2|4), pente (%), debord (m), charpente ('fermettes'|'trad'),
 *                     couverture (clé COUVERTURES), gouttieres (bool) }
 */
export function calcToiture(p) {
    const { L: Lm, l: lm, pans = 2, pente = 35, debord = 0.4, charpente = 'fermettes', couverture = 'meca', gouttieres = true } = p;
    const cv = COUVERTURES[couverture] || COUVERTURES.meca;
    const a   = Math.atan(pente / 100);
    const cos = Math.cos(a);
    const Lr = Lm + 2 * debord, lr = lm + 2 * debord;
    const surf    = Lr * lr / cos;                           // surface réelle de toiture
    const rampant = (lr / 2) / cos;                          // longueur d'un versant (débord compris)
    const hFaitage = (lm / 2) * pente / 100;                 // hauteur du faîtage au-dessus des murs

    let faitage, aretiers = 0, rives = 0, gout;
    if (pans === 4) {
        faitage  = Math.max(0, Lm - lm);
        const demi = lr / 2;
        aretiers = 4 * Math.sqrt(demi * demi + demi * demi + Math.pow(demi * pente / 100, 2));
        gout     = 2 * (Lr + lr);
    } else {
        faitage = Lr;
        rives   = 4 * rampant;
        gout    = 2 * Lr;
    }

    const lignes = [];
    const infos  = [];
    let heures = 0;

    // Charpente
    if (charpente === 'fermettes') {
        const n = Math.ceil(Lm / 0.6 - 1e-9) + 1;
        lignes.push(L('fermette', n, { d: `portée ≈ ${fmtSmart(lm, 2)} m, entraxe 60 cm` }));
        lignes.push(L('fixation_ch', n * 2));
        lignes.push(L('contreliteau', surf / 0.6 * 1.05));
        infos.push('Fermettes : le fabricant fournit le plan, le contreventement et les connecteurs. Les donner : portée, pente, débords, type de tuile.');
        if (pans === 4) infos.push('Toit 4 pans : prévoir le kit de croupe (demi-fermettes et arêtiers) avec le fabricant.');
        heures += surf * 0.35;
    } else {
        const rampantNu = (lm / 2) / cos;
        const interm = Math.max(0, Math.ceil(rampantNu / 2.2 - 1e-9) - 1);   // chevrons : portée ≤ 2,20 m entre pannes
        const nbPannes = 1 + 2 + 2 * interm;                                 // faîtière + 2 sablières + intermédiaires
        const longPanne = pans === 4 ? Lr * 0.75 : Lr;
        const fermes = Math.max(0, Math.ceil(Lm / 4.5 - 1e-9) - 1);          // pannes : portée ≤ 4,5 m
        const chevronsML = surf / 0.5 * 1.05;
        lignes.push(L('chevron', chevronsML, { d: 'entraxe 50 cm' }));
        lignes.push(L('panne', nbPannes * longPanne, { d: `${nbPannes} pannes de ≈ ${fmtSmart(longPanne, 1)} m` }));
        if (fermes > 0) lignes.push(L('ferme', fermes, { d: 'si pas de mur de refend pour porter les pannes' }));
        lignes.push(L('contreliteau', chevronsML));
        const bois = chevronsML * 0.075 * 0.1 + nbPannes * longPanne * 0.1 * 0.22;
        infos.push(`Charpente traditionnelle : environ ${fmtSmart(bois, 1)} m³ de bois. Sections indicatives, à faire valider par un charpentier.`);
        heures += surf * 0.9;
    }

    // Couverture
    lignes.push(L('ecran', surf * 1.10));
    if (cv.liteaux) lignes.push(L('liteau', surf * cv.liteaux * 1.05));
    if (couverture === 'canal') lignes.push(L('plaque_st', surf * 1.10));
    lignes.push(L(cv.k, Math.ceil(surf * cv.parM2 * 1.05)));
    const lgFaitage = faitage + aretiers;
    if (lgFaitage > 0) {
        lignes.push(L('faitiere', Math.ceil(lgFaitage * (couverture === 'canal' ? 3 : 2.5))));
        if (couverture !== 'canal') lignes.push(L('closoir', lgFaitage));       // canal : faîtage scellé au mortier
    }
    if (couverture === 'ardoise') lignes.push(L('crochet_ardoise', Math.ceil(surf * cv.parM2 * 1.05)));
    if (rives > 0 && couverture !== 'canal') lignes.push(L('tuile_rive', Math.ceil(rives * 3)));
    if (couverture === 'canal' && lgFaitage > 0) {
        lignes.push(...lignesMortier(lgFaitage * 0.010 * PERTE_MORTIER, { liant: 'batard' }));
        infos.push('Tuile canal : faîtage et rives scellés au mortier bâtard. Tuiles de courant fixées (crochets ou mousse) selon la zone de vent.');
    }
    infos.push('Sécurité : échafaudage avec garde-corps ou harnais. Fermettes contreventées avant de monter les tuiles.');
    heures += surf * (couverture === 'plate' || couverture === 'ardoise' ? 1.1 : 0.7);

    if (gouttieres) {
        lignes.push(L('gouttiere', gout * 1.05));
        lignes.push(L('descente', Math.max(2, Math.ceil(gout / 12 - 1e-9))));
        lignes.push(L('crochet', Math.ceil(gout / 0.5)));
        heures += gout * 0.3;
    }

    if (pente < cv.pente * 0.8) infos.push(`Attention : pente de ${pente} % un peu faible pour ce type de couverture (conseillé ≈ ${cv.pente} % et plus, voir la notice du fabricant).`);

    return { surf, rampant, hFaitage, faitage, aretiers, rives, gout, lignes, infos, heures };
}

// ─── Plâtrerie ─────────────────────────────────────────────────────────────

const LONGUEURS_MONTANT = [2.5, 2.6, 2.7, 2.8, 3.0];

/**
 * Plaques de plâtre sur ossature métallique.
 * @param {string} type 'doublage' | 'cloison' | 'plafond'
 * @param {number} a    longueur (m)
 * @param {number} b    hauteur (mur) ou largeur (plafond) (m)
 */
export function calcPlaco(type, a, b, { cloison = '72', isolant = true, ouv = 0 } = {}) {
    const S = Math.max(0, a * b - (ouv || 0));
    // Cloison 72/48 : 1 plaque par face · 98/48 : 2 plaques par face (même ossature)
    const faces = type === 'cloison' ? (cloison === '98' ? 4 : 2) : 1;
    const Sp = S * faces;
    const lignes = [L('ba13', Math.ceil(Sp * 1.10 / 3 - 1e-9))];
    let detail = '';

    if (type === 'plafond') {
        const rangs = Math.ceil(b / 0.6 - 1e-9) + 1;
        lignes.push(L('fourrure', Math.ceil(rangs * a * 1.10 / 3 - 1e-9)));
        lignes.push(L('suspente', rangs * (Math.ceil(a / 1.2 - 1e-9) + 1)));
        lignes.push(L('corniere', Math.ceil(2 * (a + b) / 3 - 1e-9)));
        if (isolant) lignes.push(L('laine_combles', S * 1.05), L('pare_vapeur', S * 1.10));
    } else {
        const lgM = LONGUEURS_MONTANT.find(x => x >= b - 1e-9) || 3.0;
        const parFile = b > 3 ? Math.ceil(b / 3 - 1e-9) : 1;
        const nbM = (Math.ceil(a / 0.6 - 1e-9) + 1) * parFile;
        lignes.push(L('rail', Math.ceil(2 * a * 1.05 / 3 - 1e-9)));
        lignes.push(L('montant', nbM, { d: `longueur ${fmtSmart(lgM, 2)} m` }));
        if (isolant) lignes.push(L(type === 'cloison' ? 'laine_cloison' : 'laine_mur', S * 1.05));
        detail = `montants ${fmtSmart(lgM, 2)} m`;
    }
    const Svue = S * (type === 'cloison' ? 2 : 1);           // faces visibles (bandes et enduit)
    lignes.push(L('vis_placo', Sp * (type === 'plafond' ? 20 : 15)));
    lignes.push(L('bande', Svue * 1.5));
    lignes.push(L('enduit_joint', Svue * 0.5));
    return { S, Sp, lignes, detail };
}

// ─── Drainage et protection des murs enterrés ──────────────────────────────

/**
 * Drainage périphérique : tranchée 40×40 cm en pied de fondation, drain Ø100 sous
 * chaussette, gravier lavé, géotextile, protection du mur (Delta MS ou bitume).
 * @param {number} ml     longueur de mur enterré
 * @param {number} prof   hauteur enterrée à protéger (m)
 */
export function calcDrainage(ml, prof, { protection = 'delta', regards = 4, exutoire = 10 } = {}) {
    const lignes = [
        L('drain', ml * 1.05),
        L('gravier_drain', ml * 0.4 * 0.4 * 1.6),
        L('geotextile', ml * 1.6 * 1.10),
        L('regard', regards),
        exutoire > 0 ? L('pvc100', exutoire) : null
    ];
    if (protection === 'delta') lignes.push(L('delta', ml * (prof + 0.2) * 1.10));
    if (protection === 'bitume') lignes.push(L('bitume', ml * prof * 1.5));
    if (protection === 'les2') lignes.push(L('bitume', ml * prof * 1.5), L('delta', ml * (prof + 0.2) * 1.10));
    return {
        lignes: lignes.filter(Boolean),
        infos: [
            'Drain posé au pied des fondations (jamais plus haut que le dessous du dallage), pente 0,5 à 1 % vers l\'exutoire.',
            'Regard à chaque angle pour curer. Jamais raccordé au tout-à-l\'égout des eaux usées.',
            'Mur enterré : enduit bitumineux (2 couches) puis membrane à excroissances, remblai drainant.'
        ]
    };
}

/** Échafaudage de façade en location (m² × semaines). */
export function lignesEchafaudage(longueur, hauteur, semaines) {
    const S = longueur * hauteur;
    if (!(S > 0) || !(semaines > 0)) return [];
    return [L('echaf', S * semaines, { d: `${fmtSmart(S, 0)} m² pendant ${fmtSmart(semaines, 0)} semaine(s)` })];
}
