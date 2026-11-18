// Calculateurs « Salle d'eau & plomberie » : douche à l'italienne, alimentation et évacuations.
// Périmètre volontairement simple (rénovateur) : on compte les appareils et deux distances.
// Pas de calcul de débit, de chauffe-eau ni de pompe : à voir avec un plombier.

import { L, fusion, lignesMortier, PERTE_MORTIER } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, fm } from './commun.js';

// Appareils : eau chaude ? diamètre d'évacuation · siphon fourni à part ?
const APPAREILS = {
    wc:      { l: 'WC',                     chaud: false, evac: 100 },
    lavabo:  { l: 'Lavabo / vasque',        chaud: true,  evac: 40, siphon: true, flex: 2 },
    douche:  { l: 'Douche',                 chaud: true,  evac: 40 },
    bain:    { l: 'Baignoire',              chaud: true,  evac: 40 },
    evier:   { l: 'Évier',                  chaud: true,  evac: 40, siphon: true, flex: 2 },
    ll:      { l: 'Lave-linge',             chaud: false, evac: 40, siphon: true },
    lv:      { l: 'Lave-vaisselle',         chaud: false, evac: 40, siphon: true }
};

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
        desc: 'PER, nourrices, PVC Ø40 / Ø100, raccords : par appareil',
        champs: [
            n('wc', 'WC', 'u', 1, { demi: true, zero: true, max: 10 }),
            n('lavabo', 'Lavabos / vasques', 'u', 1, { demi: true, zero: true, max: 10 }),
            n('douche', 'Douches', 'u', 1, { demi: true, zero: true, max: 10 }),
            n('bain', 'Baignoires', 'u', 0, { demi: true, zero: true, max: 10 }),
            n('evier', 'Éviers', 'u', 0, { demi: true, zero: true, max: 10 }),
            n('ll', 'Lave-linge', 'u', 0, { demi: true, zero: true, max: 10 }),
            n('lv', 'Lave-vaisselle', 'u', 0, { zero: true, max: 10 }),
            c('wcType', 'Type de WC', [{ v: 'suspendu', l: 'Suspendu (bâti-support)' }, { v: 'pose', l: 'Posé au sol' }], 'suspendu', { si: v => v.wc > 0 }),
            n('dAlim', 'Distance moyenne nourrice → appareil', 'm', 5, { max: 50, aide: 'Longueur de tuyau jusqu\'à chaque appareil, en suivant les murs et le sol.' }),
            n('dEvac', 'Distance moyenne appareil → chute', 'm', 3, { max: 30, aide: 'Jusqu\'à la descente ou au collecteur. WC : au plus court, 1 m idéal.' }),
            oui('nourrice', 'Nourrices (eau froide + eau chaude)', true, { aide: 'Un tuyau par appareil depuis la nourrice : pas de raccord caché dans les murs.' })
        ],
        mots: 'plomberie per multicouche nourrice collecteur raccord sertir évacuation pvc 40 100 wc lavabo évier douche baignoire lave-linge siphon colle eau chaude froide salle d\'eau',
        verifier: v => (Object.keys(APPAREILS).every(k => !(v[k] > 0)) ? { wc: 'Mets au moins un appareil' } : {}),
        titre: v => {
            const nb = Object.keys(APPAREILS).reduce((t, k) => t + (v[k] || 0), 0);
            return `Plomberie : ${nb} appareil${nb > 1 ? 's' : ''}`;
        },
        calcul(v) {
            const lignes = [];
            let nbFroid = 0, nbChaud = 0, ml40 = 0, ml100 = 0, nb40 = 0, nb100 = 0, siphons = 0, flex = 0;
            const detail = [];
            Object.entries(APPAREILS).forEach(([k, a]) => {
                const nb = Math.round(v[k] || 0);
                if (!nb) return;
                detail.push(`${nb} ${a.l.toLowerCase()}`);
                nbFroid += nb;
                if (a.chaud) nbChaud += nb;
                if (a.evac === 100) { ml100 += nb * v.dEvac; nb100 += nb; } else { ml40 += nb * v.dEvac; nb40 += nb; }
                if (a.siphon) siphons += nb;
                if (a.flex) flex += nb * a.flex;
            });
            const circuits = nbFroid + nbChaud;
            // Alimentation PER prégainé : un circuit par appareil (froid) + un par appareil à eau chaude
            lignes.push(L('per16', nbFroid * v.dAlim * 1.15, { ref: 'bleu (eau froide)' }));
            if (nbChaud) lignes.push(L('per16', nbChaud * v.dAlim * 1.15, { ref: 'rouge (eau chaude)' }));
            if (v.nourrice) {
                lignes.push(L('nourrice', 1, { ref: `eau froide ${nbFroid} départs` }));
                if (nbChaud) lignes.push(L('nourrice', 1, { ref: `eau chaude ${nbChaud} départs` }));
            }
            lignes.push(
                L('raccord_per', circuits, { d: 'départs de nourrice' }),
                L('applique', circuits, { d: 'sorties de cloison' }),
                L('robinet_arret', circuits + 2, { d: 'un par appareil + 2 en tête de nourrice' }),
                L('teflon', 1)
            );
            if (flex) lignes.push(L('flexible', flex));
            if (v.wc > 0) lignes.push(L('flexible', v.wc, { d: 'alimentation du réservoir' }));
            // Évacuations
            if (ml40) lignes.push(
                L('pvc40', ml40 * 1.15),
                L('coude40', nb40 * 3),
                L('manchon40', Math.ceil(ml40 / 2) + nb40),
                L('collier40', Math.ceil(ml40 / 0.6))
            );
            if (ml100) lignes.push(
                L('pvc100b', ml100 * 1.15),
                L('coude100', nb100 * 2),
                L('manchon100', Math.ceil(ml100 / 2) + nb100),
                L('collier100', Math.ceil(ml100 / 1.0) + nb100),
                L('pipe_wc', v.wc)
            );
            if (v.wc > 0 && v.wcType === 'suspendu') lignes.push(L('bati_wc', v.wc));
            if (siphons) lignes.push(L('siphon', siphons));
            if (v.bain > 0) lignes.push(L('vidage_bain', v.bain));
            lignes.push(L('colle_pvc', Math.max(1, Math.ceil((nb40 * 6 + nb100 * 4) / 40))));
            return {
                resume: [{ l: 'Appareils', v: `${nbFroid} appareil${nbFroid > 1 ? 's' : ''}` }, { l: 'Tuyaux PER', v: `${fmtSmart((nbFroid + nbChaud) * v.dAlim * 1.15, 0)} m de PER` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    `${detail.join(', ')} : ${nbFroid} circuit${nbFroid > 1 ? 's' : ''} d'eau froide, ${nbChaud} d'eau chaude (PER Ø16, Ø12 possible pour un lavabo ou un WC). 15 % de marge comprise.`,
                    'Évacuations : Ø40 pour lavabo, douche, baignoire, évier et machines ; Ø100 pour le WC. Pente 1 à 3 % (1 à 3 cm par mètre), colliers tous les 60 cm (Ø40) et 1 m (Ø100).',
                    'PER : gaine annelée continue de la nourrice à l\'appareil, sans raccord caché dans les murs ou le sol. Rayon de courbure mini ≈ 8 × le diamètre.',
                    'Chute et ventilation : chaque chute ventilée en toiture (ou clapet aérateur accessible). Siphons accessibles pour le nettoyage.',
                    v.douche > 0 ? 'Siphon, receveur et étanchéité de la douche : voir « Douche à l\'italienne ». Mitigeurs et robinetterie non comptés.' : 'Mitigeurs et robinetterie non comptés.',
                    'Ordre de grandeur pour faire les courses (DTU 60.1 / 60.11) : un plombier vérifie le dimensionnement, le chauffe-eau et la pression.'
                ],
                mesure: { q: nbFroid, u: 'appareil', h: nbFroid * 4 + (ml40 + ml100) * 0.3 }
            };
        }
    }
];
