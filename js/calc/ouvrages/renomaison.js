// « Toute la maison » (rénovation) : à partir des pièces du chantier, on coche les travaux
// et tout se calcule d'un coup, une seule liste. Réutilise les calculateurs existants
// (Placo, Isolation, Carrelage, Parquet, Ragréage, Peinture, Électricité, Plomberie, VMC).
// Les cloisons sont saisies une fois pour toute la maison (pas de doublon entre deux pièces).
// N'apparaît pas dans l'accueil : on l'ouvre depuis un chantier qui a des pièces.

import { fusion } from '../base.js';
import { calculer } from '../ouvrages.js';
import { normaliser, metre, nomPiece, piecesVersElec, piecesVersVmc, appareilsEau } from '../pieces.js';
import { ELEC } from './elec.js';
import { n, c, oui, titre, fm } from './commun.js';

const HUMIDES = ['sdb', 'wc'];
const SOLS = [{ v: 'rien', l: 'On garde' }, { v: 'carrelage', l: 'Carrelage' }, { v: 'parquet', l: 'Parquet' }, { v: 'ragreage', l: 'Ragréage' }];
const pieces = v => (Array.isArray(v.pieces) ? v.pieces : []).map(normaliser);
const aEtage = v => pieces(v).some(p => p.niveau === 'etage');
const sur = k => v => v[k] === true || v[k] === 'true';
const champApp = ELEC[0].champs.find(ch => ch.id === 'appareils');

export const RENOMAISON = {
    id: 'renomaison', cat: 'interieur', ic: '🏠', nom: 'Toute la maison (rénovation)', chantierSeul: true,
    desc: 'Tous les travaux à partir des pièces du chantier',
    champs: [
        titre('Murs et cloisons'),
        oui('doublage', 'Doublage isolé des murs donnant dehors', true, { aide: 'Murs donnant dehors : saisis dans chaque pièce. Plaques H1 en salle de bain et WC.' }),
        c('laineDoub', 'Épaisseur de laine', [{ v: '100', l: '100 mm' }, { v: '120', l: '120 mm' }, { v: '140', l: '140 mm' }, { v: '160', l: '160 mm' }], '100', { si: sur('doublage') }),
        oui('cloisons', 'Cloisons neuves (72/48, laine 45 mm)', true),
        n('mlCloison', 'Longueur totale de cloisons', 'm', 10, { demi: true, si: sur('cloisons'), aide: 'Toute la maison, chaque cloison une seule fois.' }),
        n('portesCloison', 'Portes dans ces cloisons', 'u', 2, { demi: true, zero: true, max: 30, si: sur('cloisons') }),
        titre('Plafonds'),
        c('plafond', 'Plafonds', [{ v: 'rien', l: 'On garde' }, { v: 'placo', l: 'Placo sur fourrures' }], 'placo'),
        oui('combles', 'Isoler les combles (laine soufflée)', false, { aide: 'Au-dessus des pièces du dernier niveau.' }),
        titre('Sols'),
        c('solRdc', 'Sol du rez-de-chaussée', SOLS, 'carrelage'),
        c('solEtage', 'Sol de l\'étage', SOLS, 'rien', { si: aEtage }),
        titre('Finitions'),
        oui('peinture', 'Peinture murs et plafonds', true),
        c('lissage', 'Préparation', [{ v: '0', l: 'Aucune' }, { v: 'B', l: 'Rebouchage' }, { v: 'A', l: 'Lissage complet' }], 'B', { si: sur('peinture') }),
        titre('Électricité'),
        oui('elec', 'Électricité (prises, lampes, radiateurs des pièces)', true),
        { ...champApp, l: 'Gros appareils (clim, plaque, four…)', def: [], si: sur('elec'), aide: 'Les radiateurs et le ballon viennent des pièces et de la case « Ballon » : pas besoin de les ajouter ici.' },
        c('pose', 'Pose', [{ v: 'placo', l: 'Encastré placo' }, { v: 'maconnerie', l: 'Encastré maçonnerie' }, { v: 'apparent', l: 'Apparent' }], 'placo', { si: sur('elec') }),
        oui('tableau', 'Tableau neuf', true, { si: sur('elec') }),
        titre('Plomberie et eau chaude'),
        oui('plomb', 'Plomberie (eau froide, eau chaude, PVC)', true, { aide: 'Appareils pris dans les pièces d\'eau (salle de bain, WC, cuisine).' }),
        c('wcType', 'Type de WC', [{ v: 'suspendu', l: 'Suspendu' }, { v: 'pose', l: 'Posé au sol' }], 'suspendu', { si: sur('plomb') }),
        n('dArr', 'Arrivée d\'eau → nourrice', 'm', 0, { zero: true, max: 80, si: sur('plomb'), aide: '0 si déjà en place.' }),
        oui('ballon', 'Ballon d\'eau chaude électrique', false),
        n('dBallonEau', 'Ballon → nourrices', 'm', 6, { demi: true, max: 60, si: sur('ballon'), aide: 'Ex. ballon dans les combles.' }),
        n('dBallonTab', 'Ballon → tableau', 'm', 10, { demi: true, max: 80, si: sur('ballon') }),
        oui('vmc', 'VMC', false)
    ],
    mots: 'rénovation maison complète toutes les pièces',
    verifier: v => {
        if (!pieces(v).length) return { doublage: 'Ajoute d\'abord les pièces dans le chantier' };
        if (!v.doublage && !v.cloisons && v.plafond === 'rien' && !v.combles && v.solRdc === 'rien' && (!aEtage(v) || v.solEtage === 'rien') && !v.peinture && !v.elec && !v.plomb && !v.vmc && !v.ballon)
            return { doublage: 'Coche au moins un travail' };
        return {};
    },
    titre: v => {
        const P = pieces(v);
        return `Toute la maison : ${P.length} pièce${P.length > 1 ? 's' : ''}, ${fm(P.reduce((t, p) => t + metre(p).S, 0))} m²`;
    },
    calcul(v, ctx) {
        const P = pieces(v);
        const lignes = [], lots = [], plus = [];
        let h = 0;
        const sous = (id, val) => {
            const r = calculer(id, val, ctx);
            if (r && !Object.keys(r.erreurs).length) { lignes.push(...r.lignes); h += (r.mesure && r.mesure.h) || 0; return r; }
            return null;
        };
        const Stot = P.reduce((t, p) => t + metre(p).S, 0);
        const hMax = Math.max(...P.map(p => p.h));
        // Doublage : murs donnant dehors, regroupés par hauteur et par pièces sèches / humides (plaques H1)
        if (v.doublage) {
            const groupes = new Map();
            P.filter(p => p.murExt > 0).forEach(p => {
                const hum = HUMIDES.includes(p.type);
                const cle = `${p.h}|${hum}`;
                const g = groupes.get(cle) || { h: p.h, hum, a: 0, ouv: 0 };
                g.a += p.murExt;
                g.ouv += Math.min(metre(p).fenS, p.murExt * p.h * 0.8);       // fenêtres = dans les murs extérieurs
                groupes.set(cle, g);
            });
            let ml = 0, S = 0;
            groupes.forEach(g => {
                const r = sous('placo', { type: 'appuis', a: g.a, b: g.h, ouv: g.ouv, laine: v.laineDoub, plaque: g.hum ? 'h1' : 'std', isolant: true });
                if (r) { ml += g.a; S += g.a * g.h - g.ouv; }
            });
            if (ml) lots.push(`Doublage isolé ${v.laineDoub} mm : ${fm(ml)} m de murs donnant dehors, ${fm(S)} m² (fenêtres déduites).`);
            else plus.push('⚠️ Doublage : aucun mur donnant dehors renseigné dans les pièces (case « Murs donnant dehors »).');
        }
        if (v.cloisons && v.mlCloison > 0) {
            if (sous('placo', { type: 'cloison', a: v.mlCloison, b: hMax, cloison: '72', portes: v.portesCloison, isolant: true }))
                lots.push(`Cloisons 72/48 laine 45 mm : ${fm(v.mlCloison)} m × ${fm(hMax)} m, ${v.portesCloison} porte${v.portesCloison > 1 ? 's' : ''}. Pièces d'eau : plaques H1 à prévoir côté salle de bain.`);
        }
        // Plafonds pièce par pièce (fourrures coupées à la pièce)
        const dernier = aEtage(v) ? 'etage' : 'rdc';
        const sousCombles = p => p.niveau === dernier || (dernier === 'rdc' && p.niveau === 'autre');
        if (v.plafond === 'placo') {
            P.forEach(p => { const m = metre(p); sous('placo', { type: 'plafond', a: m.L, b: m.l, plaque: HUMIDES.includes(p.type) ? 'h1' : 'std', isolant: v.combles && sousCombles(p) }); });
            lots.push(`Plafonds en placo : ${fm(Stot)} m² (plaques H1 en salle de bain et WC).`);
        }
        if (v.combles) {
            const Sc = P.filter(sousCombles).reduce((t, p) => t + metre(p).S, 0);
            if (Sc > 0 && sous('isolation', { type: 'souffle', L: Math.round(Sc * 100) / 100, l: 1 })) lots.push(`Combles : ${fm(Sc)} m² de laine soufflée au-dessus du ${dernier === 'etage' ? 'l\'étage' : 'rez-de-chaussée'}.`);
        }
        // Sols : choix du niveau, ou choix propre à la pièce
        const solsFaits = {};
        P.forEach(p => {
            const s = p.sol !== 'niveau' ? p.sol : (p.niveau === 'etage' ? v.solEtage : v.solRdc);
            const m = metre(p);
            if (s === 'carrelage') sous('carrelage', { support: 'sol', saisie: 'dim', L: m.L, l: m.l, portes: p.portes });
            else if (s === 'parquet') sous('parquet', { L: m.L, l: m.l, portes: p.portes });
            else if (s === 'ragreage') sous('ragreage', { saisie: 'dim', L: m.L, l: m.l });
            else return;
            solsFaits[s] = (solsFaits[s] || 0) + m.S;
        });
        Object.entries(solsFaits).forEach(([s, S]) => lots.push(`Sol en ${s === 'ragreage' ? 'ragréage' : s} : ${fm(S)} m².`));
        if (v.peinture) {
            let Sm = 0;
            P.forEach(p => {
                const m = metre(p);
                sous('peinture', { L: m.L, l: m.l, h: p.h, ouv: m.ouv, murs: true, plafond: true, impression: v.plafond === 'placo' || v.doublage || v.cloisons, lissage: v.lissage, couches: '2' });
                Sm += m.Sm;
            });
            lots.push(`Peinture : ${fm(Sm)} m² de murs et ${fm(Stot)} m² de plafonds, 2 couches.`);
        }
        if (v.elec) {
            const types = ELEC[0].champs.find(ch => ch.id === 'pieces').types;
            const appareils = [...(v.appareils || [])];
            P.filter(p => p.chauffage > 0).forEach(p => appareils.push({ t: 'radiateur', dist: p.dist, w: Math.min(p.chauffage, 5000), nom: `Radiateur ${nomPiece(p)}` }));
            if (v.ballon) appareils.push({ t: 'cumulus', dist: v.dBallonTab, nom: 'Ballon d\'eau chaude' });
            const r = sous('electricite', { pieces: piecesVersElec(P, types), appareils, pose: v.pose, tableau: v.tableau });
            if (r) { lots.push(`Électricité : ${r.resume.map(k => k.v).join(', ')} de gaines et câbles.`); plus.push(...r.infos.slice(0, 2)); }
        }
        if (v.plomb) {
            const app = P.flatMap(appareilsEau);
            if (app.length) {
                const r = sous('plomberie', { app, wcType: v.wcType, nourrice: true, dArr: v.dArr, ce: v.ballon, dCE: v.dBallonEau });
                if (r) { lots.push(`Plomberie : ${r.resume.map(k => k.v).join(', ')}.`); plus.push(r.infos[0]); }
            } else plus.push('⚠️ Plomberie : aucun appareil dans les pièces (salle de bain, WC, cuisine).');
        } else if (v.ballon) {
            sous('plomberie', { app: [{ t: 'ext', alim: 0.5 }], ce: true, dCE: v.dBallonEau, nourrice: false });
        }
        if (v.vmc && sous('vmc', piecesVersVmc(P))) lots.push('VMC : bouches dans les pièces d\'eau, entrées d\'air dans les pièces sèches.');
        return {
            resume: [{ l: 'Pièces', v: `${P.length} pièce${P.length > 1 ? 's' : ''}` }, { l: 'Surface', v: `${fm(Stot)} m²` }],
            lignes: fusion(lignes), recette: null,
            infos: [
                ...lots,
                ...plus,
                'Une seule liste pour toute la maison : les consommables (bandes, enduit, colle, joint…) sont additionnés puis arrondis une fois, sans doublon d\'une pièce à l\'autre.',
                'Chaque pièce garde ses mesures dans le chantier : change-les là-bas, ce calcul suit.'
            ],
            mesure: { q: Stot, u: 'm²', h }
        };
    }
};
