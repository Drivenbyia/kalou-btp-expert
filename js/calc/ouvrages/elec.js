// Calculateurs « Électricité & ventilation » : quantités pour les courses (NF C 15-100).
// Ce n'est pas une étude électrique : le raccordement au tableau et la mise en service
// se font hors tension, et une installation neuve ou rénovée en totalité passe au Consuel.
// Relu par un électricien (relecture à rôle, v5.1).

import { L, fusion } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, liste } from './commun.js';

// NF C 15-100 : 8 prises maxi conseillé par circuit 2,5 mm² / 20 A (12 toléré),
// 8 points lumineux maxi par circuit 1,5 mm² / 16 A, un circuit dédié par gros appareil,
// chauffage : 3 500 W maxi par circuit 1,5 mm² / 16 A.
const PRISES_PAR_CIRCUIT = 8;
const PRISES_CUISINE = 6;             // prises du plan de travail : circuit réservé à la cuisine, 6 maxi
const POINTS_PAR_CIRCUIT = 8;
const W_PAR_CIRCUIT_CHAUFFAGE = 3500;
const ENTRE_POINTS = 3;               // m de gaine par prise, point ou interrupteur (montée, descente, liaison)
const ENTRE_PIECES = 3;               // m mini pour passer d'une pièce à la suivante sur un même circuit
const MARGE = 1.15;

// Pièces : ce qu'on y met d'habitude (proposé à l'ajout, à corriger)
export const PIECES = {
    sejour:  { l: 'Séjour / salon',        def: { prises: 5, points: 2, inter: 2, dist: 8 } },
    cuisine: { l: 'Cuisine',               def: { prises: 6, points: 2, inter: 1, dist: 6 } },
    chambre: { l: 'Chambre',               def: { prises: 3, points: 1, inter: 1, dist: 10 } },
    sdb:     { l: 'Salle de bain / d\'eau', def: { prises: 1, points: 2, inter: 1, dist: 8 } },
    wc:      { l: 'WC',                    def: { prises: 0, points: 1, inter: 1, dist: 8 } },
    entree:  { l: 'Entrée / couloir',      def: { prises: 1, points: 2, inter: 3, dist: 4 } },
    bureau:  { l: 'Bureau',                def: { prises: 4, points: 1, inter: 1, dist: 10 } },
    garage:  { l: 'Garage / cellier',      def: { prises: 2, points: 1, inter: 1, dist: 12 } },
    ext:     { l: 'Extérieur (terrasse)',  def: { prises: 1, points: 2, inter: 1, dist: 10 } },
    autre:   { l: 'Autre pièce',           def: { prises: 3, points: 1, inter: 1, dist: 10 } }
};

// Gros appareils : un circuit chacun (sauf radiateurs, regroupés par 3 500 W)
// A = calibre fixe ; cal = calibre à lire sur la notice ; prise = sur prise 16 A ; sortie = sortie de câble ; exterieur = unité dehors
const APPAREILS = {
    plaque:   { l: 'Plaque de cuisson',      A: 32, sortie: '32 A', typeA: true, def: { dist: 6 } },
    four:     { l: 'Four',                   A: 20, prise: true, def: { dist: 6 } },
    ll:       { l: 'Lave-linge',             A: 20, prise: true, typeA: true, def: { dist: 8 } },
    lv:       { l: 'Lave-vaisselle',         A: 20, prise: true, def: { dist: 6 } },
    sl:       { l: 'Sèche-linge',            A: 20, prise: true, def: { dist: 8 } },
    congel:   { l: 'Congélateur / frigo',    A: 20, prise: true, def: { dist: 8 } },
    cumulus:  { l: 'Chauffe-eau électrique', A: 20, sortie: '20 A', contacteur: true, def: { dist: 8 } },
    radiateur:{ l: 'Radiateur électrique',   chauffage: true, def: { dist: 8, w: 1000 } },
    clim:     { l: 'Clim (unité extérieure)', cal: true, exterieur: true, liaison: true, typeA: true, def: { dist: 10, cal: '16', lien: 4 } },
    pac:      { l: 'Pompe à chaleur',        cal: true, exterieur: true, typeA: true, def: { dist: 8, cal: '32' } },
    ve:       { l: 'Prise voiture électrique', A: 20, ve: true, def: { dist: 15 } },
    autre:    { l: 'Autre circuit dédié',    cal: true, sortie: true, def: { dist: 8, cal: '20' } }
};
const CALIBRES = [{ v: '16', l: '16 A' }, { v: '20', l: '20 A' }, { v: '32', l: '32 A' }];
// Section mini par calibre, puis section au-dessus si la ligne est longue (chute de tension ≤ 5 % à pleine charge)
const SECTION = { 16: 2.5, 20: 2.5, 32: 6 };
const PLUS_GROS = { 2.5: 4, 4: 6, 6: 10, 10: 16 };
const longMax = (S, A) => 255 * S / A;          // ΔU = 2 × 0,0225 × L × I / S ≤ 11,5 V
const GAINE = { 1.5: 'icta_15', 2.5: 'icta_25', 4: 'icta_4', 6: 'icta_6', 10: 'icta_10' };
const CABLE = { 1.5: 'cable_15', 2.5: 'cable_25', 4: 'cable_4', 6: 'cable_6', 10: 'cable_10' };
const DISJ = { 16: 'disj16', 20: 'disj20', 32: 'disj32' };
const mm = S => `${String(S).replace('.', ',')} mm²`;

/** Noms affichés : « Chambre 2 » quand il y en a plusieurs. */
function nommer(rows, types) {
    const vu = {};
    return rows.map(r => {
        vu[r.t] = (vu[r.t] || 0) + 1;
        if (r.nom) return r.nom;
        return types[r.t].l + (rows.filter(x => x.t === r.t).length > 1 ? ` ${vu[r.t]}` : '');
    });
}

/**
 * Regroupe des points (prises, lumières) en circuits, du plus proche au plus loin du tableau.
 * Câble d'un circuit : tableau → première pièce, puis de pièce en pièce (écart de distance,
 * 3 m mini), + 3 m par point. Une pièce trop chargée est partagée sur deux circuits.
 */
function grouper(items, cap) {
    const circuits = [];
    let cur = null;
    [...items].filter(it => it.n > 0).sort((a, b) => a.dist - b.dist).forEach(it => {
        let reste = it.n;
        while (reste > 0) {
            if (!cur || cur.n >= cap) { cur = { n: 0, noms: [], ml: it.dist, der: it.dist }; circuits.push(cur); }
            if (!cur.noms.includes(it.nom)) {
                if (cur.noms.length) { cur.ml += Math.max(ENTRE_PIECES, it.dist - cur.der); cur.der = it.dist; }
                cur.noms.push(it.nom);
            }
            const pris = Math.min(reste, cap - cur.n);
            cur.n += pris; reste -= pris;
            cur.ml += pris * ENTRE_POINTS;
        }
    });
    return circuits;
}

export const ELEC = [
    {
        id: 'electricite', cat: 'elec', ic: '💡', nom: 'Électricité',
        desc: 'Pièce par pièce et appareil par appareil, chacun à sa distance du tableau',
        champs: [
            liste('pieces', 'Les pièces', {
                aide: 'Une ligne par pièce. Distance : longueur de gaine du tableau jusqu\'à l\'entrée de la pièce, en suivant murs et plafond. Lampes = plafonniers et appliques. Dans la pièce, on ajoute 3 m par prise, lampe ou interrupteur.',
                types: PIECES, ajout: 'Ajouter une pièce', nouveau: 'chambre',
                cols: [
                    { id: 'prises', l: 'Prises', def: 3, max: 40, zero: true },
                    { id: 'points', l: 'Lampes', def: 1, max: 20, zero: true },
                    { id: 'inter', l: 'Inter.', def: 1, max: 20, zero: true },
                    { id: 'dist', l: 'Distance', u: 'm', def: 8, max: 80 }
                ],
                def: [
                    { t: 'sejour', prises: 5, points: 2, inter: 2, dist: 8 },
                    { t: 'cuisine', prises: 6, points: 2, inter: 1, dist: 6 },
                    { t: 'chambre', prises: 3, points: 1, inter: 1, dist: 10 },
                    { t: 'sdb', prises: 1, points: 2, inter: 1, dist: 8 }
                ]
            }),
            liste('appareils', 'Les gros appareils (un circuit chacun)', {
                aide: 'Distance du tableau jusqu\'à l\'appareil. Clim, pompe à chaleur : le calibre du disjoncteur est dans la notice.',
                types: APPAREILS, ajout: 'Ajouter un appareil', nouveau: 'four',
                cols: [
                    { id: 'dist', l: 'Distance', u: 'm', def: 8, max: 80 },
                    { id: 'w', l: 'Puissance', u: 'W', def: 1000, max: 5000, si: t => !!APPAREILS[t].chauffage },
                    { id: 'cal', l: 'Disjoncteur', def: '20', options: CALIBRES, si: t => !!APPAREILS[t].cal },
                    { id: 'lien', l: 'Liaison int.', u: 'm', def: 4, max: 30, si: t => !!APPAREILS[t].liaison }
                ],
                def: [{ t: 'plaque', dist: 6 }, { t: 'four', dist: 6 }, { t: 'll', dist: 8 }]
            }),
            c('pose', 'Pose', [{ v: 'placo', l: 'Encastré placo' }, { v: 'maconnerie', l: 'Encastré maçonnerie' }, { v: 'apparent', l: 'Apparent (moulure)' }], 'placo',
                { aide: 'Encastré placo : gaines dans le doublage ou la cloison. Maçonnerie : saignées rebouchées au plâtre. Apparent : câble sous moulure.' }),
            oui('tableau', 'Tableau neuf (disjoncteurs, différentiels)', false),
            oui('terre', 'Prise de terre à faire (maison)', false, { si: v => v.tableau === true || v.tableau === 'true', aide: 'Piquet de terre, câble jusqu\'au tableau et barrette de mesure.' }),
            n('dTerre', 'Distance tableau → piquet de terre', 'm', 10, { max: 60, si: v => (v.tableau === true || v.tableau === 'true') && (v.terre === true || v.terre === 'true') })
        ],
        mots: 'électricité electricite prise interrupteur lumière éclairage point lumineux gaine icta fil câble boîte dcl tableau disjoncteur différentiel terre radiateur chauffe-eau cumulus clim climatisation pompe à chaleur pac voiture électrique borne green up four plaque nf c 15-100 consuel',
        // Avant la v5.2 : des totaux et une distance moyenne → une pièce « Logement » + un appareil par circuit
        migrer(b) {
            if (Array.isArray(b.pieces) || b.prises === undefined) return b;
            const nb = x => Math.round(Number(String(x ?? 0).replace(',', '.')) || 0);
            const d = b.dist ?? 8;
            const pieces = [{ t: 'autre', prises: nb(b.prises), points: nb(b.points), inter: nb(b.inter), dist: d }];
            const appareils = [];
            for (let i = 0; i < nb(b.spe); i++) appareils.push({ t: 'autre', dist: d, cal: '20' });
            if (b.plaque === true || b.plaque === 'true') appareils.push({ t: 'plaque', dist: d });
            if (b.cumulus === true || b.cumulus === 'true') appareils.push({ t: 'cumulus', dist: d });
            const r = nb(b.radiateurs), w = Number(String(b.watts ?? 0).replace(',', '.')) || 0;
            for (let i = 0; i < r; i++) appareils.push({ t: 'radiateur', dist: d, w: Math.round(w / r) || 1000 });
            return { ...b, pieces, appareils, dTerre: Number(d) + 3 };
        },
        verifier: v => (!v.pieces.length && !v.appareils.length ? { pieces: 'Ajoute au moins une pièce ou un appareil' } : {}),
        titre: v => {
            const p = v.pieces.reduce((t, r) => t + r.prises, 0);
            return `Électricité : ${v.pieces.length} pièce${v.pieces.length > 1 ? 's' : ''}, ${p} prise${p > 1 ? 's' : ''}${v.appareils.length ? `, ${v.appareils.length} appareil${v.appareils.length > 1 ? 's' : ''}` : ''}`;
        },
        calcul(v) {
            const app = v.pose === 'apparent';
            const nomsP = nommer(v.pieces, PIECES), nomsA = nommer(v.appareils, APPAREILS);
            const tot = k => v.pieces.reduce((t, r) => t + r[k], 0);
            const prises = tot('prises'), points = tot('points'), inters = tot('inter');
            const nbSdb = v.pieces.filter(r => r.t === 'sdb').length;
            // Circuits de prises (cuisine à part), d'éclairage
            const it = (k, filtre) => v.pieces.map((r, i) => ({ n: r[k], dist: r.dist, nom: nomsP[i], t: r.t })).filter(filtre);
            const cPrises = grouper(it('prises', x => x.t !== 'cuisine'), PRISES_PAR_CIRCUIT);
            const cCuisine = grouper(it('prises', x => x.t === 'cuisine'), PRISES_CUISINE);
            const cEcl = grouper(it('points', () => true), POINTS_PAR_CIRCUIT);
            const mlInter = inters * ENTRE_POINTS;
            const somme = cs => cs.reduce((t, c) => t + c.ml, 0);
            const ml25 = (somme(cPrises) + somme(cCuisine)) * MARGE;
            const ml15 = (somme(cEcl) + mlInter) * MARGE;
            // Radiateurs : regroupés par 3 500 W, du plus proche au plus loin
            const rads = v.appareils.map((r, i) => ({ ...r, nom: nomsA[i] })).filter(r => APPAREILS[r.t].chauffage).sort((a, b) => a.dist - b.dist);
            const cChauf = [];
            rads.forEach(r => {
                let c = cChauf[cChauf.length - 1];
                if (!c || c.w + r.w > W_PAR_CIRCUIT_CHAUFFAGE) { c = { w: 0, noms: [], ml: r.dist, der: r.dist }; cChauf.push(c); }
                else { c.ml += Math.max(ENTRE_PIECES, r.dist - c.der); c.der = r.dist; }
                c.w += r.w; c.noms.push(r.nom); c.ml += ENTRE_POINTS;
            });
            const mlFp = somme(cChauf) * MARGE;
            // Circuits dédiés : section selon le calibre, au-dessus si la ligne est longue
            const lignes = [];
            const cables = {};                         // clé article → ml
            const ajouter = (k, ml) => { cables[k] = (cables[k] || 0) + ml; };
            const dedies = [];
            let nbPrisesApp = 0, nbSorties = cChauf.length ? rads.length : 0, nbTypeA = 0, nbVe = 0, nbCumulus = 0, liaison = 0, nbExt = 0;
            const parCalibre = { 16: 0, 20: 0, 32: 0 };
            v.appareils.forEach((r, i) => {
                const a = APPAREILS[r.t];
                if (a.chauffage) return;
                const A = a.cal ? Number(r.cal) : a.A;
                let S = SECTION[A];
                const ml = (r.dist + ENTRE_POINTS) * MARGE;
                let note = '';
                if (r.dist > longMax(S, A)) { S = PLUS_GROS[S]; note = ` (section au-dessus : ${fmtSmart(r.dist, 0)} m, chute de tension)`; }
                if (r.dist > longMax(S, A)) note += ' ⚠️ ligne très longue : faire calculer la section par un électricien';
                ajouter(a.exterieur || app ? CABLE[S] : GAINE[S], ml);
                if (a.liaison) liaison += r.lien * MARGE + 1;
                if (a.exterieur) nbExt++;
                if (a.prise) nbPrisesApp++;
                if (a.sortie) nbSorties++;
                if (a.typeA) nbTypeA++;
                if (a.contacteur) nbCumulus++;
                if (a.ve) nbVe++;
                else parCalibre[A]++;
                dedies.push(`${nomsA[i]} : ${A} A, ${mm(S)}, ${fmtSmart(r.dist, 1)} m${note}`);
            });
            // Câbles et gaines
            if (app) {
                if (ml15) lignes.push(L('cable_15', ml15));
                if (ml25) lignes.push(L('cable_25', ml25));
                if (mlFp) lignes.push(L('cable_fp', mlFp));
            } else {
                if (ml15) lignes.push(L('icta_15', ml15));
                if (ml25) lignes.push(L('icta_25', ml25));
                if (mlFp) lignes.push(L('icta_fp', mlFp));
            }
            Object.entries(cables).forEach(([k, ml]) => lignes.push(L(k, ml)));
            if (liaison) lignes.push(L('cable_liaison', liaison, { ref: '4G1,5 ou selon notice' }));
            if (nbExt) lignes.push(L('sectionneur', nbExt));
            const mlTotal = ml15 + ml25 + mlFp + Object.values(cables).reduce((t, x) => t + x, 0);
            if (app) {
                const mlMoulure = mlTotal * 0.8;
                lignes.push(L('moulure', mlMoulure), L('fixation', Math.ceil(mlMoulure / 2) * 3, { d: 'vis + chevilles, 3 par barre' }));
            }
            // Va-et-vient et retours : la gaine préfilée 3G1,5 ne suffit pas
            if (inters > 0) lignes.push(L('fil15', inters * 6, { d: 'navettes et retours, ≈ 2 × 3 m par interrupteur' }));
            // Boîtes
            const nbBoites = prises + inters + nbPrisesApp + nbSorties;
            if (v.pose === 'placo') lignes.push(L('boite_placo', nbBoites));
            if (v.pose === 'maconnerie') lignes.push(L('boite_sceller', nbBoites), L('platre', mlTotal * 0.5 + nbBoites * 0.3, { d: 'saignées et scellement des boîtes' }));
            if (app) lignes.push(L('boitier_saillie', prises + inters + nbPrisesApp));
            if (!app && points > 0) lignes.push(L('boite_dcl', points));
            const nbDeriv = cEcl.length ? (app ? points : cEcl.length) : 0;
            if (nbDeriv) lignes.push(L('boite_derivation', nbDeriv));
            lignes.push(L('wago', points * 3 + nbDeriv * 5 + prises + nbPrisesApp));
            // Appareillage
            if (prises + nbPrisesApp > 0) lignes.push(L('prise', prises + nbPrisesApp));
            if (inters > 0) lignes.push(L('inter', inters));
            if (points > 0) lignes.push(L('douille', points));
            v.appareils.forEach(r => {
                const a = APPAREILS[r.t];
                if (a.sortie) lignes.push(L('sortie_cable', 1, { ref: a.cal ? `${r.cal} A` : a.sortie }));
            });
            if (rads.length) lignes.push(L('sortie_cable', rads.length, { ref: 'radiateur (avec fil pilote)' }));
            if (nbVe) lignes.push(L('prise_ve', nbVe));
            // Liaison équipotentielle des salles de bain
            if (nbSdb > 0) lignes.push(L('fil_vj4', nbSdb * 10), L('collier_terre', nbSdb * 4));
            // Tableau
            const nbCircuits = cPrises.length + cCuisine.length + cEcl.length + cChauf.length + dedies.length;
            const horsVe = nbCircuits - nbVe;
            let nDiff = 0, nA = 0, rangees = 0;
            if (v.tableau) {
                // 2 interrupteurs différentiels 40 A mini, 8 circuits maxi chacun ; la prise voiture a le sien
                nA = nbTypeA ? Math.ceil(nbTypeA / 8 - 1e-9) : 0;
                nDiff = Math.max(2, Math.ceil(horsVe / 8 - 1e-9), nA + (horsVe > nbTypeA ? 1 : 0));
                const d16 = cEcl.length + cChauf.length + parCalibre[16];
                const d20 = cPrises.length + cCuisine.length + parCalibre[20] + nbVe;
                if (d16) lignes.push(L('disj16', d16));
                if (d20) lignes.push(L('disj20', d20));
                if (parCalibre[32]) lignes.push(L('disj32', parCalibre[32]));
                if (nbCumulus) lignes.push(L('contacteur', nbCumulus), L('disj2', nbCumulus, { d: 'commande du contacteur' }));
                if (nA + nbVe) lignes.push(L('diff_a', nA + nbVe, { d: nbVe ? 'dont 1 réservé à la prise voiture' : undefined }));
                if (nDiff - nA > 0) lignes.push(L('diff_ac', nDiff - nA));
                const modules = nbCircuits + 2 * nbCumulus + 2 * (nDiff + nbVe);
                rangees = Math.max(1, Math.ceil(modules * 1.2 / 13 - 1e-9));      // 20 % de réserve obligatoire
                lignes.push(L('tableau', 1, { ref: `${rangees} rangée${rangees > 1 ? 's' : ''}` }), L('peigne', rangees), L('bornier_terre', 1));
                if (v.terre) lignes.push(L('piquet_terre', 1), L('cable_terre', v.dTerre + 2), L('barrette_terre', 1));
            }
            const pl = (x, s) => `${x} ${s}${x > 1 ? 's' : ''}`;
            const txtCircuits = (cs, nom) => cs.map((c, i) => `${nom}${cs.length > 1 ? ` ${i + 1}` : ''} (${c.noms.join(', ')}) : ${fmtSmart(c.ml * MARGE, 0)} m`);
            const listeCircuits = [
                ...txtCircuits(cPrises, 'Prises'), ...txtCircuits(cCuisine, 'Prises cuisine'), ...txtCircuits(cEcl, 'Éclairage'),
                ...cChauf.map((c, i) => `Chauffage${cChauf.length > 1 ? ` ${i + 1}` : ''} (${c.noms.join(', ')}, ${fmtSmart(c.w, 0)} W) : ${fmtSmart(c.ml * MARGE, 0)} m`)
            ];
            const aExt = v.appareils.some(r => APPAREILS[r.t].exterieur);
            const infos = [
                listeCircuits.length ? `Circuits : ${listeCircuits.join(' · ')}.` : '',
                dedies.length ? `Appareils : ${dedies.join(' · ')}.` : '',
                `Comment c'est compté : chaque circuit part du tableau vers la pièce la plus proche, puis passe de pièce en pièce (on suppose les pièces en enfilade ; 3 m mini entre deux), + 3 m par prise, lumière ou interrupteur, + 15 % de marge. Prises : 8 maxi par circuit 2,5 mm² / 20 A ; cuisine sur ses propres circuits (6 maxi) ; lumières : 8 maxi par circuit 1,5 mm² / 16 A ; radiateurs : 3 500 W maxi par circuit 1,5 mm² / 16 A avec fil pilote.`,
                v.tableau ? `Tableau : ${pl(nbCircuits, 'circuit')}, ${nDiff} interrupteurs différentiels 30 mA 40 A (8 circuits maxi chacun${nA ? ', type A pour la plaque, le lave-linge, la clim ou la pompe à chaleur' : ''})${nbVe ? ' + 1 type A réservé à la prise voiture' : ''}, ${pl(rangees, 'rangée')} avec 20 % de réserve (obligatoire). Parafoudre selon la zone et la ligne (aérienne : souvent obligatoire).` : 'Tableau existant : vérifier qu\'il reste des places et qu\'il est protégé par un différentiel 30 mA.',
                aExt ? 'Clim, pompe à chaleur : calibre et section selon la notice ; interrupteur de coupure près de l\'unité extérieure ; câble R2V dehors (fourreau si enterré). Liaisons frigorifiques et mise en service : frigoriste avec attestation de capacité (sauf kit pré-chargé). Appoint électrique de la PAC : souvent un circuit en plus (voir notice).' : '',
                nbVe ? 'Prise voiture : circuit 20 A en 2,5 mm² et différentiel 30 mA type A (ou F) réservés. Borne de plus de 3,7 kW : installateur qualifié IRVE obligatoire.' : '',
                'Toujours couper au disjoncteur général et vérifier l\'absence de tension (VAT) avant de toucher un fil. Raccorder au tableau en dernier.',
                v.pieces.some(r => r.t === 'cuisine' && r.prises < 6) ? 'Cuisine : 6 prises minimum (dont 4 au-dessus du plan de travail), jamais au-dessus de l\'évier ni des feux.' : 'Cuisine : prises du plan de travail jamais au-dessus de l\'évier ni des feux.',
                nbSdb ? 'Salle de bain : volume 1 (au-dessus de la baignoire ou de la douche, jusqu\'à 2,25 m) : seulement chauffe-eau et très basse tension. Volume 2 (60 cm autour) : appareils de classe II et prise rasoir. Douche à l\'italienne sans paroi : volume 1 sur 1,20 m autour de la pomme. Liaison équipotentielle des éléments métalliques.' : '',
                'Hauteurs : axe des prises 16 et 20 A à 5 cm du sol mini, sorties 32 A à 12 cm mini. Pas de gaine noyée dans l\'isolant sans protection.',
                'Bâti ancien : pas de terre ou terre douteuse, le différentiel 30 mA ne la remplace pas. Le Consuel mesure la terre (100 Ω maxi).',
                'Rénovation complète ou installation neuve : attestation de conformité Consuel avant la mise en service. En cas de doute, faire valider par un électricien. Outil : scie cloche Ø68 pour les boîtes placo.'
            ].filter(Boolean);
            return {
                resume: [{ l: 'Circuits', v: pl(nbCircuits, 'circuit') }, { l: 'Gaines et câbles', v: `${fmtSmart(mlTotal, 0)} m` }],
                lignes: fusion(lignes), infos, recette: null,
                mesure: { q: prises + points + inters, u: 'point', h: (prises + points + inters + nbSorties + nbPrisesApp) * 0.6 + dedies.length * 1.5 + (v.tableau ? 6 : 0) }
            };
        }
    },
    {
        id: 'vmc', cat: 'elec', ic: '🌀', nom: 'VMC (ventilation)',
        desc: 'Caisson, bouches, gaines, entrées d\'air',
        champs: [
            n('sdb', 'Salles de bain / douche', 'u', 1, { demi: true, zero: true, max: 6 }),
            n('wc', 'WC', 'u', 1, { demi: true, zero: true, max: 6 }),
            oui('cuisine', 'Cuisine', true),
            n('seches', 'Pièces sèches (séjour, chambres)', 'u', 3, { zero: true, max: 15, aide: 'Une entrée d\'air par pièce sèche (dans la fenêtre ou le mur).' }),
            c('type', 'VMC', [{ v: 'auto', l: 'Autoréglable' }, { v: 'hygro', l: 'Hygroréglable (type B)' }], 'hygro', { aide: 'Hygroréglable : débit selon l\'humidité, moins de chauffage perdu.' }),
            n('dist', 'Distance moyenne caisson → bouche', 'm', 4, { demi: true, max: 20, aide: 'Le caisson va dans les combles, au plus près des bouches.' }),
            n('distTab', 'Distance tableau → caisson', 'm', 10, { demi: true, max: 60 }),
            oui('sortie', 'Sortie de toiture', true)
        ],
        mots: 'vmc ventilation simple flux hygroréglable autoréglable bouche extraction gaine entrée d\'air caisson humidité condensation',
        verifier: v => (!(v.sdb > 0) && !(v.wc > 0) && !v.cuisine ? { sdb: 'Il faut au moins une pièce humide' } : {}),
        titre: v => `VMC ${v.type === 'hygro' ? 'hygroréglable' : 'autoréglable'} : ${v.sdb + v.wc + (v.cuisine ? 1 : 0)} bouches`,
        calcul(v) {
            const hygro = v.type === 'hygro';
            const petites = v.sdb + v.wc;
            const bouches = petites + (v.cuisine ? 1 : 0);
            const lignes = [
                L('vmc_caisson', 1, { ref: `${hygro ? 'hygroréglable B' : 'autoréglable'}, ${bouches} piquage${bouches > 1 ? 's' : ''}` }),
                L('vmc_suspension', 1)
            ];
            if (v.cuisine) lignes.push(L('vmc_bouche', 1, { ref: hygro ? 'cuisine, à cordon (grande vitesse)' : 'cuisine' }));
            if (v.sdb > 0) lignes.push(L('vmc_bouche', v.sdb, { ref: hygro ? 'salle de bain, hygroréglable' : 'salle de bain' }));
            if (v.wc > 0) lignes.push(L('vmc_bouche', v.wc, { ref: hygro ? 'WC, détection de présence' : 'WC' }));
            lignes.push(L('vmc_manchon', bouches));
            if (petites) lignes.push(L('vmc_gaine80', petites * v.dist * 1.10));
            lignes.push(L('vmc_gaine125', ((v.cuisine ? v.dist : 0) + (v.sortie ? 2 : 0)) * 1.10, { d: v.sortie ? 'cuisine + rejet vers la sortie de toit' : 'cuisine' }));
            lignes.push(L('collier_vmc', 2 * bouches + 2), L('adhesif_alu', 1, { mx: true }));
            if (v.sortie) lignes.push(L('vmc_sortie', 1));
            if (v.seches > 0) lignes.push(L('entree_air', v.seches, { ref: hygro ? 'hygroréglables' : 'autoréglables' }));
            lignes.push(L('cable_15', v.distTab + 3, { d: 'alimentation du caisson' }), L('disj2', 1, { d: 'circuit dédié de la VMC' }));
            return {
                resume: [{ l: 'Bouches', v: `${bouches}` }, { l: 'Entrées d\'air', v: `${v.seches}` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'Principe : l\'air entre par les pièces sèches (entrées d\'air) et sort par les pièces humides (bouches). Portes intérieures détalonnées de 1 cm (2 cm pour la cuisine).',
                    `Caisson adapté au nombre de pièces du logement et de piquages : 1 en Ø125 pour la cuisine, les autres en Ø80 (${bouches} au total).`,
                    'Gaines tendues, sans écrasement ni point bas, posées sur l\'isolant des combles (jamais enfouies dessous). Le moins de coudes possible.',
                    'Rejet en toiture ou en façade, jamais dans les combles. Caisson suspendu ou posé sur plots anti-vibration.',
                    'Alimentation : circuit dédié protégé par un disjoncteur 2 A (compté ici). Ne jamais raccorder la hotte au réseau de VMC.',
                    'Chaudière gaz, poêle ou insert non étanche : une VMC peut faire refouler le monoxyde de carbone. Faire valider par un professionnel.',
                    'Bâti ancien très humide : une VMC aide, mais il faut d\'abord traiter les remontées d\'humidité et les enduits ciment.'
                ],
                mesure: { q: bouches, u: 'bouche', h: 6 + bouches * 1.5 + v.seches * 0.5 }
            };
        }
    }
];
