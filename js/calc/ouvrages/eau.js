// Calculateurs « Salle d'eau & plomberie » : douche à l'italienne, alimentation et évacuations.
// Plomberie : une ligne par appareil avec ses propres distances (arrivée d'eau, évacuation).
// Pas de calcul de débit, de chauffe-eau ni de pompe : à voir avec un plombier.

import { L, fusion, lignesMortier, PERTE_MORTIER } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, fm, liste } from './commun.js';

// Appareils : eau chaude ? diamètre d'évacuation (0 = aucune) · siphon fourni à part ? flexibles
// def : distances proposées quand on ajoute l'appareil (à remplacer par les vraies mesures).
const APPAREILS = {
    wc:      { l: 'WC',                 chaud: false, evac: 100, def: { alim: 4, evac: 1 } },
    lavabo:  { l: 'Lavabo / vasque',    chaud: true,  evac: 40, siphon: true, flex: 2, def: { alim: 5, evac: 2 } },
    lavemain:{ l: 'Lave-mains',         chaud: false, evac: 40, siphon: true, flex: 1, def: { alim: 4, evac: 1.5 } },
    douche:  { l: 'Douche',             chaud: true,  evac: 40, def: { alim: 5, evac: 2 } },
    bain:    { l: 'Baignoire',          chaud: true,  evac: 40, def: { alim: 5, evac: 2 } },
    evier:   { l: 'Évier',              chaud: true,  evac: 40, siphon: true, flex: 2, def: { alim: 8, evac: 3 } },
    ll:      { l: 'Lave-linge',         chaud: false, evac: 40, siphon: true, def: { alim: 6, evac: 2 } },
    lv:      { l: 'Lave-vaisselle',     chaud: false, evac: 40, siphon: true, def: { alim: 8, evac: 2 } },
    ext:     { l: 'Robinet extérieur',  chaud: false, evac: 0, def: { alim: 6, evac: 0 } }
};
const COURONNE = 25;                  // m, couronne de PER prégainé
const MARGE_PER = 1.10;               // 10 % + 0,5 m de raccordement par circuit
const nomsLignes = (rows, types) => {
    const vu = {};
    return rows.map(r => {
        vu[r.t] = (vu[r.t] || 0) + 1;
        const nb = rows.filter(x => x.t === r.t).length;
        if (r.nom) return `${types[r.t].l} (${r.nom})`;
        return types[r.t].l + (nb > 1 ? ` ${vu[r.t]}` : '');
    });
};
/** Couronnes nécessaires pour couper ces longueurs (un tuyau d'un seul tenant par circuit). */
function couronnes(longs) {
    const restes = [];
    [...longs].sort((a, b) => b - a).forEach(lg => {
        if (lg > COURONNE) { restes.push(0); return; }      // circuit plus long qu'une couronne : signalé à part
        const i = restes.findIndex(r => r >= lg);
        if (i >= 0) restes[i] -= lg; else restes.push(COURONNE - lg);
    });
    return restes.length;
}

export const EAU = [
    {
        id: 'douche', cat: 'eau', ic: '🚿', nom: 'Douche à l\'italienne',
        desc: 'Receveur à carreler ou forme de pente, étanchéité, siphon',
        champs: [
            n('L', 'Longueur de la douche', 'cm', 120, { demi: true, max: 400, bas: 70 }),
            n('l', 'Largeur', 'cm', 90, { demi: true, max: 300, bas: 70 }),
            c('fond', 'Le fond', [{ v: 'receveur', l: 'Receveur à carreler (prêt à poser)' }, { v: 'pente', l: 'Forme de pente au mortier' }], 'receveur',
                { aide: 'Receveur à carreler : plus rapide, pente déjà faite. Forme de pente : sur dalle béton, 1 à 2 % vers le siphon.' }),
            c('evac', 'Évacuation', [{ v: 'siphon', l: 'Siphon central' }, { v: 'caniveau', l: 'Caniveau linéaire' }], 'siphon'),
            n('murs', 'Murs carrelés dans la douche', 'u', 2, { zero: true, max: 3, aide: 'Douche dans un angle : 2. En niche : 3.' }),
            n('hFai', 'Hauteur de faïence', 'm', 2, { max: 3, aide: '2 m minimum dans la douche (DTU 52.2).' })
        ],
        mots: 'douche italienne receveur à carreler siphon caniveau sel spec natte étanchéité salle de bain pente plomberie',
        titre: v => `Douche à l'italienne ${fm(v.L)} × ${fm(v.l)} cm`,
        calcul(v) {
            const Lm = v.L / 100, lm = v.l / 100;
            const Ssol = Lm * lm;
            // Murs de la douche : on prend les côtés les plus longs d'abord
            const cotes = [Lm, lm, Lm, lm].sort((a, b) => b - a).slice(0, v.murs);
            const lgMurs = cotes.reduce((t, x) => t + x, 0);
            const Smurs = lgMurs * v.hFai;
            const lignes = [];
            if (v.fond === 'receveur') lignes.push(L('receveur_carreler', 1, { ref: `${fmtSmart(v.L, 0)} × ${fmtSmart(v.l, 0)} cm` }));
            else lignes.push(...lignesMortier(Ssol * 0.04 * PERTE_MORTIER, { dosage: 350 }));        // forme de pente ≈ 4 cm moyen
            lignes.push(L(v.evac === 'caniveau' ? 'caniveau' : 'siphon_douche', 1, { ref: v.evac === 'caniveau' ? `${fmtSmart(Math.min(v.L, v.l), 0)} cm` : undefined }));
            // Étanchéité : natte SEL au sol (+ 10 cm en remontée), SPEC sur les murs
            lignes.push(
                L('natte_etanche', (Ssol + lgMurs * 0.10) * 1.10),
                L('colle_s1', (Ssol + lgMurs * 0.10) * 3, { d: 'collage de la natte' }),
                L('spec', Smurs * 1.5), L('primaire', Smurs * 0.10),
                L('bande_spec', (lgMurs + Math.max(0, v.murs - 1) * v.hFai) * 1.10),
                L('angle_etanche', Math.max(1, v.murs) + (v.murs >= 2 ? 1 : 0)),
                L('manchette', 3, { d: 'arrivées du mitigeur + douchette' }),
                L('silicone', 2)
            );
            return {
                resume: [{ l: 'Sol de douche', v: `${fm(Ssol)} m²` }, { l: 'Murs à protéger', v: `${fm(Smurs)} m²` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'Étanchéité : natte SEL collée au sol avec remontée de 10 cm, SPEC (2 couches croisées, ≈ 1,5 kg/m²) sur les murs de douche, bandes dans tous les angles, manchettes à chaque tuyau.',
                    v.fond === 'pente' ? 'Forme de pente : mortier dosé 350, 1 à 2 % vers le siphon (≈ 2 cm de différence par mètre), siphon posé et raccordé avant.' : 'Receveur à carreler : posé à plat sur un support sain, collé et raccordé au siphon fourni ou au siphon à part selon le modèle.',
                    'Siphon : évacuation Ø40 mini, pente 1 à 3 %, accès possible pour le nettoyage. Plancher bois : renfort et receveur adapté, avis du fabricant.',
                    'Carrelage et faïence de la douche : voir « Carrelage / faïence » (colle C2 S1, petits formats au sol pour suivre la pente).',
                    'Murs : plaques H1 (ou plaques ciment en zone très exposée), jamais de plaque standard dans la douche.'
                ],
                mesure: { q: 1, u: 'u', h: 10 + Ssol * 2 + Smurs * 1 }
            };
        }
    },
    {
        id: 'plomberie', cat: 'eau', ic: '🚰', nom: 'Plomberie (alimentation et évacuations)',
        desc: 'Appareil par appareil : PER, nourrices, PVC Ø40 / Ø100, raccords',
        champs: [
            liste('app', 'Les appareils', {
                aide: 'Une ligne par appareil, avec ses vraies distances. Arrivée : longueur de tuyau de la nourrice à l\'appareil, en suivant murs et sol. Évacuation : de l\'appareil jusqu\'à la chute ou au collecteur (0 si juste à côté).',
                types: APPAREILS, ajout: 'Ajouter un appareil',
                cols: [
                    { id: 'alim', l: 'Arrivée d\'eau', u: 'm', def: 5, max: 60 },
                    { id: 'evac', l: 'Évacuation', u: 'm', def: 2, max: 40, zero: true, si: t => APPAREILS[t].evac > 0 }
                ],
                def: [{ t: 'wc', alim: 4, evac: 1 }, { t: 'lavabo', alim: 5, evac: 2 }, { t: 'douche', alim: 5, evac: 2 }]
            }),
            c('wcType', 'Type de WC', [{ v: 'suspendu', l: 'Suspendu (bâti-support)' }, { v: 'pose', l: 'Posé au sol' }], 'suspendu', { si: v => (v.app || []).some(r => r.t === 'wc') }),
            oui('nourrice', 'Nourrices (eau froide + eau chaude)', true, { aide: 'Un tuyau par appareil depuis la nourrice : pas de raccord caché dans les murs.' }),
            n('dArr', 'Arrivée d\'eau → nourrice', 'm', 0, { demi: true, zero: true, max: 80, aide: 'Du compteur ou de l\'arrivée générale. 0 si déjà en place.' }),
            oui('ce', 'Chauffe-eau à raccorder', false),
            n('dCE', 'Chauffe-eau → nourrices', 'm', 3, { max: 50, si: v => v.ce === true || v.ce === 'true', aide: 'Un tuyau d\'eau froide vers le chauffe-eau et un d\'eau chaude vers la nourrice : on compte 2 fois cette distance.' })
        ],
        mots: 'plomberie per multicouche nourrice collecteur raccord sertir évacuation pvc 40 100 wc lavabo évier douche baignoire lave-linge siphon colle eau chaude froide salle d\'eau chauffe-eau cumulus groupe de sécurité robinet extérieur',
        // Avant la v5.2 : un nombre par appareil et deux distances moyennes → une ligne par appareil
        migrer(b) {
            if (Array.isArray(b.app) || b.dAlim === undefined) return b;
            const app = [];
            Object.keys(APPAREILS).forEach(t => {
                for (let i = 0; i < Math.round(Number(b[t]) || 0); i++) app.push({ t, alim: b.dAlim, evac: t === 'wc' ? Math.min(Number(b.dEvac) || 1, 3) : b.dEvac });
            });
            return { ...b, app };
        },
        verifier: v => (!v.app.length ? { app: 'Ajoute au moins un appareil' } : {}),
        titre: v => `Plomberie : ${v.app.length} appareil${v.app.length > 1 ? 's' : ''}`,
        calcul(v) {
            const lignes = [];
            const noms = nomsLignes(v.app, APPAREILS);
            const froid = [], chaud = [], detail = [];
            let ml40 = 0, ml100 = 0, nb40 = 0, nb100 = 0, siphons = 0, flex = 0, cou40 = 0, cou100 = 0, man40 = 0, man100 = 0, col40 = 0, col100 = 0;
            const nbType = t => v.app.filter(r => r.t === t).length;
            v.app.forEach((r, i) => {
                const a = APPAREILS[r.t];
                const lg = r.alim * MARGE_PER + 0.5;
                froid.push(lg);
                if (a.chaud) chaud.push(lg);
                let ev = '';
                if (a.evac === 100) {
                    ml100 += r.evac; nb100++; cou100 += 2; man100 += Math.ceil(r.evac / 2); col100 += Math.ceil(r.evac) + 1;
                    ev = `, évacuation Ø100 ${fmtSmart(r.evac, 1)} m`;
                } else if (a.evac) {
                    ml40 += r.evac; nb40++; cou40 += r.evac > 2 ? 3 : 2; man40 += Math.ceil(r.evac / 2); col40 += Math.ceil(r.evac / 0.6) + 1;
                    ev = `, évacuation Ø40 ${fmtSmart(r.evac, 1)} m`;
                }
                if (a.siphon) siphons++;
                if (a.flex) flex += a.flex;
                detail.push(`${noms[i]} : PER ${fmtSmart(r.alim, 1)} m${a.chaud ? ' × 2 (froid + chaud)' : ''}${ev}`);
            });
            const circuits = froid.length + chaud.length;
            const somme = t => t.reduce((s, x) => s + x, 0);
            // Couronnes de 25 m : on coupe un tuyau entier par circuit (pas de raccord caché)
            const qPer = (longs) => Math.max(somme(longs), couronnes(longs) * COURONNE - 0.01);
            lignes.push(L('per16', qPer(froid), { ref: 'bleu (eau froide)', d: 'un tuyau d\'un seul tenant par appareil' }));
            if (chaud.length) lignes.push(L('per16', qPer(chaud), { ref: 'rouge (eau chaude)', d: 'un tuyau d\'un seul tenant par appareil' }));
            if (v.nourrice) {
                lignes.push(L('nourrice', 1, { ref: `eau froide ${froid.length + (v.ce ? 1 : 0)} départs` }));
                if (chaud.length) lignes.push(L('nourrice', 1, { ref: `eau chaude ${chaud.length} départs` }));
            }
            lignes.push(
                L('raccord_per', circuits * 2, { d: 'départ de nourrice + sortie' }),
                L('applique', circuits, { d: 'sorties de cloison' }),
                L('robinet_arret', froid.length + 2, { d: 'un par appareil + 2 en tête de nourrice' }),
                L('teflon', 1, { mx: true })
            );
            if (flex) lignes.push(L('flexible', flex));
            const nWc = nbType('wc');
            if (nWc) lignes.push(L('flexible', nWc, { d: 'alimentation du réservoir' }));
            if (nbType('ext')) lignes.push(L('robinet_ext', nbType('ext')));
            // Arrivée générale et chauffe-eau
            const mlArr = v.dArr > 0 ? v.dArr * MARGE_PER + 0.5 : 0;
            const mlCE = v.ce ? 2 * (v.dCE * MARGE_PER + 0.5) : 0;
            if (mlArr + mlCE) lignes.push(L('per20', mlArr + mlCE, { d: [mlArr ? 'arrivée → nourrice' : '', mlCE ? 'chauffe-eau aller + retour' : ''].filter(Boolean).join(', ') }));
            if (v.ce) lignes.push(L('groupe_secu', 1), L('raccord_dielec', 2), L('siphon_groupe', 1), L('pvc40', 1, { d: 'vidange du groupe de sécurité' }));
            // Évacuations : longueurs réelles appareil par appareil, barres de 2 m, 10 % de coupes
            if (ml40) lignes.push(L('pvc40', ml40 * 1.10), L('coude40', cou40), L('manchon40', man40 + nb40), L('collier40', col40), L('culotte', nb40, { ref: 'Ø40 (piquage sur collecteur ou chute)' }));
            if (ml100 || nWc) lignes.push(L('pvc100b', Math.max(ml100, 0.5) * 1.10), L('coude100', cou100), L('manchon100', man100 + nb100), L('collier100', col100), L('culotte', nb100, { ref: 'Ø100 (piquage sur la chute)' }));
            if (nWc) lignes.push(L('pipe_wc', nWc));
            if (nWc && v.wcType === 'suspendu') lignes.push(L('bati_wc', nWc));
            if (siphons) lignes.push(L('siphon', siphons));
            if (nbType('bain')) lignes.push(L('vidage_bain', nbType('bain')));
            if (nb40 + nb100) lignes.push(L('colle_pvc', (nb40 * 6 + nb100 * 4) / 40));
            const longs = [...froid, ...chaud].filter(x => x > COURONNE);
            const mlPer = somme(froid) + somme(chaud);
            return {
                resume: [
                    { l: 'Appareils', v: `${v.app.length} appareil${v.app.length > 1 ? 's' : ''}` },
                    { l: 'Tuyau PER', v: `${fmtSmart(mlPer, 0)} m de PER` },
                    (ml40 + ml100) ? { l: 'Évacuations', v: `${fmtSmart(ml40 + ml100, 1)} m de PVC` } : null
                ],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `Appareil par appareil : ${detail.join(' · ')}.`,
                    `Comment c'est compté : PER Ø16 = la distance de chaque appareil + 10 % + 0,5 m de raccordement, un tuyau entier par appareil (eau froide, et eau chaude s'il y en a). PVC = la distance d'évacuation de chaque appareil + 10 % de coupes, en barres de 2 m.`,
                    longs.length ? `⚠️ ${longs.length} circuit${longs.length > 1 ? 's' : ''} de plus de 25 m : prendre une couronne de 50 m pour ne pas raccorder dans le mur.` : '',
                    'Évacuations : Ø40 pour lavabo, douche, baignoire, évier et machines (Ø32 possible pour un lavabo seul) ; Ø100 pour le WC, au plus court. Pente 1 à 3 % (1 à 3 cm par mètre), colliers tous les 60 cm (Ø40) et 1 m (Ø100).',
                    'PER : gaine annelée continue de la nourrice à l\'appareil, sans raccord caché dans les murs ou le sol. Rayon de courbure mini ≈ 8 × le diamètre.',
                    v.ce ? 'Chauffe-eau : groupe de sécurité obligatoire sur l\'eau froide (jamais de robinet entre les deux), raccords diélectriques sur un ballon acier, vidange du groupe vers un siphon. Pression au-delà de 3 bars : réducteur de pression.' : '',
                    'Chute et ventilation : chaque chute ventilée en toiture (ou clapet aérateur accessible). Siphons accessibles pour le nettoyage.',
                    nbType('douche') ? 'Siphon, receveur et étanchéité de la douche : voir « Douche à l\'italienne ». Mitigeurs et robinetterie non comptés.' : 'Mitigeurs et robinetterie non comptés.',
                    'Ordre de grandeur pour faire les courses (DTU 60.1 / 60.11) : un plombier vérifie le dimensionnement, le chauffe-eau et la pression.'
                ].filter(Boolean),
                mesure: { q: v.app.length, u: 'appareil', h: v.app.length * 4 + (ml40 + ml100) * 0.3 + (v.ce ? 2 : 0) }
            };
        }
    }
];
