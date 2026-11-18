// Tests des dosages et quantités clés : `npm test` (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculer, OUVRAGES, valeursDefaut } from '../js/calc/ouvrages.js';
import { calculerMaison, MAISON_DEF } from '../js/calc/maison.js';
import { lignesBeton, lignesMurBlocs } from '../js/calc/base.js';
import { quantiteAchat } from '../js/calc/materiaux.js';
import { estimerCout } from '../js/calc/cout.js';

const q = (lignes, k) => lignes.filter(l => l.k === k).reduce((s, l) => s + l.q, 0);
const ctx = { sacCiment: 35 };

test('1 m³ de béton dosé 350 = 10 sacs de 35 kg, 0,65 T sable, 1,15 T gravier', () => {
    const l = lignesBeton(1, 350);
    assert.equal(quantiteAchat('ciment', q(l, 'ciment'), ctx), 10);
    assert.equal(q(l, 'sable04'), 0.65);
    assert.equal(q(l, 'gravier'), 1.15);
});

test('sacs de 25 kg : 14 sacs pour 350 kg', () => {
    assert.equal(quantiteAchat('ciment', 350, { sacCiment: 25 }), 14);
});

test('mur parpaing 20 de 10 m² : 105 blocs, 0,2 m³ de mortier', () => {
    const l = lignesMurBlocs(10, 'p20');
    assert.equal(q(l, 'parpaing20'), 105);
    assert.ok(Math.abs(q(l, 'ciment') - 70) < 1e-9);       // 0,2 m³ × 350 kg
});

test('dalle 5×4×12 cm : 2,52 m³ (pertes 5 %)', () => {
    const r = calculer('dalle', { L: 5, l: 4, ep: 12, he: 0 }, ctx);
    assert.equal(r.resume[1].v, '2,52 m³');
});

test('tous les calculateurs donnent un résultat avec les valeurs par défaut', () => {
    for (const o of OUVRAGES) {
        const r = calculer(o, valeursDefaut(o), ctx);
        assert.deepEqual(r.erreurs, {}, o.id);
        assert.ok(r.lignes.length > 0, o.id);
        r.lignes.forEach(li => assert.ok(Number.isFinite(li.q) && li.q > 0, `${o.id} ${li.k}`));
    }
});

test('saisie invalide signalée', () => {
    const r = calculer('dalle', { L: '', l: 4 }, ctx);
    assert.ok(r.erreurs.L);
    const r2 = calculer('dalle', { L: '5,5', l: 4 }, ctx);
    assert.deepEqual(r2.erreurs, {});
    assert.equal(r2.v.L, 5.5);
});

test('maison : terre-plein et vide sanitaire, plain-pied et R+1', () => {
    const d = valeursDefaut(MAISON_DEF);
    for (const bas of ['terreplein', 'vs']) for (const niveaux of ['1', '2']) for (const charpente of ['fermettes', 'trad']) {
        const r = calculerMaison({ ...d, bas, niveaux, charpente }, ctx);
        assert.deepEqual(r.erreurs, {});
        assert.ok(r.lots.length >= 8);
        r.lignes.forEach(li => assert.ok(Number.isFinite(li.q) && li.q > 0, li.k));
    }
    const pp = calculerMaison(d, ctx);
    assert.equal(q(pp.lignes, 'fermette'), 21);                  // 12 m / 0,60 + 1
});

test('estimation entreprise : matériaux + main d\'œuvre + TVA', () => {
    const c = estimerCout([{ k: 'ciment', q: 350 }], 10, { taux: 45, margeMat: 0, tva: 10 }, { ciment: 10 }, ctx);
    assert.equal(c.mat, 100);
    assert.equal(c.mo, 450);
    assert.equal(c.ttc, 605);
});

// ─── Corrections issues de la relecture « maçon » ────────────────────────────
import { lignesChainageVertical, calcPlaco, lignesMortier } from '../js/calc/base.js';
import { lireNombre } from '../js/calc/ouvrages.js';

test('chaînage vertical : 1 armature par chaînage (d\'un seul tenant) + 1 attente', () => {
    const l = lignesChainageVertical(8, 3.35);
    assert.equal(q(l, 'arm_chainage'), 8);
    assert.equal(q(l, 'attente'), 8);
    assert.equal(q(lignesChainageVertical(2, 6.45), 'arm_chainage'), 4);   // 6,95 m → 2 barres chacun
});

test('maison plain-pied : armatures de chaînages verticaux comptées une par chaînage', () => {
    const r = calculerMaison(valeursDefaut(MAISON_DEF), ctx);
    const lot = r.lots.find(l => l.id === 'chainages');
    assert.equal(q(lot.lignes, 'attente'), 8);
    assert.ok(q(lot.lignes, 'seuil') === 3);
});

test('vide sanitaire : étais conservés et entrevous isolants', () => {
    const r = calculerMaison({ ...valeursDefaut(MAISON_DEF), bas: 'vs' }, ctx);
    const lot = r.lots.find(l => l.id === 'plancherbas');
    assert.ok(q(lot.lignes, 'etai') > 0);
    assert.ok(q(lot.lignes, 'entrevous_pse') > 0);
});

test('mortier bâtard : moitié ciment, moitié chaux', () => {
    const l = lignesMortier(1, { liant: 'batard', dosage: 400 });
    assert.equal(q(l, 'ciment'), 200);
    assert.equal(q(l, 'chaux'), 200);
});

test('cloison 98/48 : deux fois plus de plaques que la 72/48', () => {
    const a = calcPlaco('cloison', 4, 2.5, { cloison: '72' });
    const b = calcPlaco('cloison', 4, 2.5, { cloison: '98' });
    assert.ok(Math.abs(q(b.lignes, 'ba13') - 2 * q(a.lignes, 'ba13')) <= 1);
    assert.equal(q(b.lignes, 'montant'), q(a.lignes, 'montant'));
});

test('carrelage 45-60 : double encollage 7 kg/m²', () => {
    const r = calculer('carrelage', { L: 4, l: 3, format: 'grand' }, ctx);
    assert.equal(q(r.lignes, 'colle_carrelage'), 84);
});

test('mur en pierre : chaux dosée 300 kg/m³', () => {
    const r = calculer('pierre', { L: 5, h: 1, ep: 40 }, ctx);
    assert.ok(Math.abs(q(r.lignes, 'chaux') - 2 * 0.3 * 300) < 1e-9);
});

test('saisie : unités collées acceptées, alerte si des mètres dans un champ en cm', () => {
    assert.equal(lireNombre('6m'), 6);
    assert.equal(lireNombre('12 cm'), 12);
    assert.ok(Number.isNaN(lireNombre('abc')));
    const r = calculer('dalle', { L: 5, l: 4, ep: '0,12' }, ctx);
    assert.ok(r.alertes.ep);
    assert.deepEqual(r.erreurs, {});
});

test('ouvertures plus grandes que le mur : erreur claire', () => {
    const r = calculer('mur', { L: 2, h: 2, ouv: 10 }, ctx);
    assert.ok(r.erreurs.ouv);
});

// ─── Phase 2 : nouveaux ouvrages ────────────────────────────────────────────

test('fosse toutes eaux : 3 m³ jusqu\'à 5 pièces, +1 m³ par pièce', () => {
    assert.match(calculer('fosse', { pieces: 5 }, ctx).lignes[0].d, /^3 m³/);
    assert.match(calculer('fosse', { pieces: 7 }, ctx).lignes[0].d, /^5 m³/);
});

test('reprise en sous-œuvre : passes de 1 m', () => {
    const r = calculer('sousoeuvre', { L: 6, passe: 1 }, ctx);
    assert.equal(r.resume[0].v, '6');
});

test('démolition : bennes limitées au poids (8 T)', () => {
    const r = calculer('demolition', { type: 'mur', L: 10, h: 3, ep: 50, mat: '2.2' }, ctx);
    assert.equal(q(r.lignes, 'benne6'), 5);   // 15 m³ en place = 33 T
});

test('maison : drainage et échafaudage en option', () => {
    const r = calculerMaison({ ...valeursDefaut(MAISON_DEF), drainage: true, echafaudage: true }, ctx);
    assert.ok(r.lots.some(l => l.id === 'drainage'));
    assert.ok(q(r.lignes, 'echaf') > 0);
});

// ─── Second œuvre (relecture plaquiste-carreleur) ───────────────────────────
import { calcSoufflage, longueurPlaque } from '../js/calc/base.js';

test('plaque toute hauteur : 2,70 m de haut → plaques de 2,70 m', () => {
    assert.equal(longueurPlaque(2.7), 2.7);
    assert.equal(longueurPlaque(2.5), 2.5);
});

test('cloison 72/48 : montants doublés au-delà de 2,60 m, refus au-delà de 2,95 m', () => {
    const a = calcPlaco('cloison', 6, 2.5, { cloison: '72' });
    const b = calcPlaco('cloison', 6, 2.8, { cloison: '72' });
    assert.equal(q(b.lignes, 'montant'), 2 * q(a.lignes, 'montant'));
    assert.ok(calculer('placo', { type: 'cloison', a: 4, b: 3.2, cloison: '72' }, ctx).erreurs.b);
    assert.deepEqual(calculer('placo', { type: 'cloison', a: 4, b: 3.2, cloison: '98' }, ctx).erreurs, {});
});

test('plafond isolé : fourrures tous les 50 cm + pare-vapeur', () => {
    const sans = calcPlaco('plafond', 5, 4, { isolant: false });
    const avec = calcPlaco('plafond', 5, 4, { isolant: true });
    assert.ok(q(avec.lignes, 'fourrure') > q(sans.lignes, 'fourrure'));
    assert.ok(q(avec.lignes, 'pare_vapeur') > 0);
});

test('doublage collé : MAP 4 kg/m²', () => {
    const r = calcPlaco('colle', 10, 2.5, {});
    assert.equal(q(r.lignes, 'map'), 100);
});

test('soufflage laine de verre R 8 ≈ 385 mm et ≈ 4,2 kg/m²', () => {
    const r = calcSoufflage(100, 'verre', 8);
    assert.ok(Math.abs(r.eSouffle - 0.3864) < 0.001);
    assert.ok(Math.abs(r.kgM2 - 4.25) < 0.01);
});

test('carrelage : joint selon format (60×60, 3 mm ≈ 0,18 kg/m²)', () => {
    const r = calcul_joint(); function calcul_joint() { return calculer('carrelage', { L: 10, l: 10, format: 'grand', joint: '3' }, ctx); }
    const kg = q(r.lignes, 'joint_carrelage') / 100;
    assert.ok(kg > 0.15 && kg < 0.2, String(kg));
});

test('chape flottante : 5 cm minimum, isolant + armature', () => {
    assert.ok(calculer('chape', { pose: 'flot', ep: 4 }, ctx).erreurs.ep);
    const r = calculer('chape', { pose: 'flot', ep: 5 }, ctx);
    assert.ok(q(r.lignes, 'isolant_chape') > 0 && q(r.lignes, 'treillis_chape') > 0);
});

// ─── Maison de forme libre (L, T, Z…) ───────────────────────────────────────
import { analyserContour } from '../js/ui/contour.js';
import { calcToiture } from '../js/calc/base.js';

test('forme libre : un rectangle saisi en « autre forme » donne les mêmes quantités', () => {
    const d = valeursDefaut(MAISON_DEF);
    const a = calculerMaison(d, ctx);
    const b = calculerMaison({ ...d, forme: 'autre', P: 42, S: 108, nAngles: 4, ailes: 1, largeur: 9 }, ctx);
    ['parpaing20', 'arm_semelle', 'fermette', 'tuile_meca', 'enduit_mono'].forEach(k => assert.equal(q(b.lignes, k), q(a.lignes, k), k));
});

test('toiture : rectangle identique en mode forme libre, noues pour un L', () => {
    const a = calcToiture({ L: 12, l: 9, pans: 2, pente: 35, debord: 0.4 });
    const b = calcToiture({ pans: 2, pente: 35, debord: 0.4, forme: { S: 108, P: 42, angles: 4, largeur: 9 } });
    assert.ok(Math.abs(a.surf - b.surf) < 1e-9 && a.gout === b.gout);
    const c = calcToiture({ pans: 2, pente: 35, debord: 0.4, forme: { S: 134.2, P: 58.1, angles: 6, largeur: 7.5, ailes: 2 } });
    assert.ok(c.noues > 0 && q(c.lignes, 'noue') > 0);
});

test('contour du plan : périmètre, surface, angles et fermeture', () => {
    const cotes = [['r', 10.72], ['d', 2.57], ['r', 7.90], ['d', 7.87], ['l', 6.84], ['u', 3.39], ['l', 11.78], ['u', 7.05]].map(([d, l]) => ({ d, l: String(l) }));
    const a = analyserContour(cotes);
    assert.ok(a.ferme && a.alterne && a.complet);
    assert.ok(Math.abs(a.P - 58.12) < 0.01);
    assert.ok(Math.abs(a.S - 134.2) < 0.2, String(a.S));
    assert.equal(a.angles, 8);
    assert.ok(!analyserContour(cotes.slice(0, 7)).ferme);
});

test('forme libre incohérente : erreurs claires', () => {
    const d = { ...valeursDefaut(MAISON_DEF), forme: 'autre' };
    assert.ok(calculerMaison({ ...d, nAngles: 7 }, ctx).erreurs.nAngles);
    assert.ok(calculerMaison({ ...d, P: 20, S: 134 }, ctx).erreurs.P);
});

// ─── Surface habitable et menuiseries sur mesure ───────────────────────────
import { menuiseriesDe } from '../js/calc/maison.js';

test('surface habitable : murs, doublage et cloisons déduits', () => {
    const d = { ...valeursDefaut(MAISON_DEF), L: 12, l: 9, cloisons: 30 };
    const hab = r => Number(r.resume.find(k => /habitable/.test(k.l)).v.replace(/[^\d,]/g, '').replace(',', '.'));
    // 12 × 9 = 108 m² ; murs 20 cm + doublage 13,3 cm = 33,3 cm ; 30 m de cloisons de 7,2 cm
    const e = 0.333, attendu = 108 - 42 * e + 4 * e * e - 30 * 0.072;
    assert.ok(Math.abs(hab(calculerMaison(d, ctx)) - attendu) < 0.6, String(attendu));
    const sansDoublage = hab(calculerMaison({ ...d, doublage: 'non' }, ctx));
    assert.ok(sansDoublage > hab(calculerMaison(d, ctx)) + 4);
});

test('menuiseries : anciennes saisies converties, tailles libres', () => {
    const anc = menuiseriesDe({ porte: 1, fenetre: '3', baie: 0, garage: 0 });
    assert.deepEqual(anc.map(m => [m.t, m.nb, m.larg, m.haut]), [['porte', 1, 90, 215], ['fenetre', 3, 120, 125]]);
    const d = valeursDefaut(MAISON_DEF);
    const std = calculerMaison(d, ctx);
    const parDefaut = calculerMaison({ ...d, menuiseries: menuiseriesDe(d) }, ctx);
    assert.equal(q(parDefaut.lignes, 'parpaing20'), q(std.lignes, 'parpaing20'));
    const deuxBaies = calculerMaison({ ...d, menuiseries: [{ t: 'baie', nb: '1', larg: '300', haut: '215' }, { t: 'baie', nb: 1, larg: '180', haut: '215' }] }, ctx);
    assert.deepEqual(deuxBaies.erreurs, {});
    assert.equal(q(deuxBaies.lignes, 'seuil'), 2);
    assert.equal(q(deuxBaies.lignes, 'appui'), 0);
    assert.ok(Math.abs(q(deuxBaies.lignes, 'linteau') - (3.4 + 2.2)) < 1e-9);
    assert.ok(calculerMaison({ ...d, menuiseries: [{ t: 'fenetre', nb: 1, larg: '1,2', haut: '125' }] }, ctx).erreurs['men-0']);
});

// ─── Lot 1 (4.8.0) : corrections issues de la relecture maçon / plaquiste / rénovateur ───
import { consolider } from '../js/ui/resultats.js';
import { barresPour } from '../js/calc/base.js';

test('liste de courses : une ligne par épaisseur / longueur / usage', () => {
    const ramp = calculer('isolation', { type: 'rampants', L: 9, l: 9 }, ctx);
    const c1 = calculer('placo', { type: 'cloison', a: 4, b: 2.5 }, ctx);
    const c2 = calculer('placo', { type: 'cloison', a: 4, b: 2.8, cloison: '72' }, ctx);
    const fai = calculer('carrelage', { support: 'mur', L: 8, l: 2 }, ctx);
    const sol = calculer('carrelage', { support: 'sol', L: 2.2, l: 1.8 }, ctx);
    const liste = consolider([...ramp.lignes, ...c1.lignes, ...c2.lignes, ...fai.lignes, ...sol.lignes]);
    const refs = k => liste.filter(l => l.k === k).map(l => l.ref).sort();
    assert.deepEqual(refs('laine_mur'), ['100 mm', '140 mm']);
    assert.deepEqual(refs('montant'), ['2,50 m', '2,80 m']);
    assert.ok(refs('ba13').length >= 2, 'plaques 2,50 et 2,80 séparées');
    assert.equal(refs('carrelage').length, 2, 'faïence et sol séparés');
    // Béton de propreté et béton de semelle : deux commandes de toupie distinctes
    const f = calculer('fondation', { mode: 'bpe' }, ctx);
    assert.equal(consolider(f.lignes).filter(l => l.k === 'bpe').length, 2);
});

test('chaux : la chaux choisie arrive dans la liste', () => {
    const p2 = calculer('pierre', { nhl: '2' }, ctx);
    assert.ok(q(p2.lignes, 'chaux_nhl2') > 0 && q(p2.lignes, 'chaux') === 0);
    const e = calculer('chaux', {}, ctx);
    assert.ok(q(e.lignes, 'chaux_nhl5') > 0 && q(e.lignes, 'chaux') > 0 && q(e.lignes, 'chaux_nhl2') > 0);
});

test('chaînage en blocs U : le rang du haut n\'est plus compté en agglos', () => {
    const sans = calculer('mur', { L: 10, h: 2.5, bloc: 'p20', angles: 0, chainage: false }, ctx);
    const avec = calculer('mur', { L: 10, h: 2.5, bloc: 'p20', angles: 0, chainage: true }, ctx);
    const diff = q(sans.lignes, 'parpaing20') - q(avec.lignes, 'parpaing20');
    assert.ok(diff >= 20 && diff <= 22, `diff ${diff}`);        // 10 m × 1 rang = 20 agglos (+5 %)
    assert.equal(q(avec.lignes, 'bloc_u'), 21);
});

test('barres de 6 m : comptées en morceaux', () => {
    assert.equal(barresPour(41, 2.46), 21);     // 2 morceaux par barre
    assert.equal(barresPour(4, 3.8), 4);
    assert.equal(barresPour(3, 2), 1);
    const s = calculer('soutenement', { L: 8, H: 1.2 }, ctx);
    assert.ok(q(s.lignes, 'fer12') >= 21);
});

test('carrelage extérieur : plus de colle en double encollage', () => {
    const petit = calculer('carrelage', { support: 'ext', L: 5, l: 4, format: 'petit' }, ctx);
    const moyen = calculer('carrelage', { support: 'ext', L: 5, l: 4, format: 'moyen' }, ctx);
    assert.ok(q(moyen.lignes, 'colle_carrelage') > q(petit.lignes, 'colle_carrelage'));
    assert.equal(q(moyen.lignes, 'colle_carrelage'), 140);   // 7 kg/m²
});

test('doublage sur appuis 10 × 2,5 m : 18 fourrures (une barre par fourrure)', () => {
    const r = calculer('placo', { type: 'appuis', a: 10, b: 2.5 }, ctx);
    assert.equal(q(r.lignes, 'fourrure'), 18);
});

test('garde-fous : ouvertures plus grandes que la surface', () => {
    assert.ok(calculer('placo', { type: 'cloison', a: 1, b: 2.5, portes: 3 }, ctx).erreurs.portes);
    assert.ok(calculer('placo', { type: 'cloison', a: 4, b: 2.5, portes: 2, ouv: 8 }, ctx).erreurs.ouv);
    assert.ok(calculer('peinture', { L: 4, l: 3.5, h: 2.5, ouv: 60 }, ctx).erreurs.ouv);
    const d = valeursDefaut(MAISON_DEF);
    const m = calculerMaison({ ...d, L: 6, l: 4, menuiseries: [{ t: 'baie', nb: 10, larg: 300, haut: 215 }] }, ctx);
    assert.ok(m.erreurs.menuiseries);
    assert.ok(calculerMaison({ ...d, l: 0.5 }, ctx).erreurs.l);
});

test('carrelage : la surface de douche est remise à 0 quand on change de support', () => {
    const def = OUVRAGES.find(o => o.id === 'carrelage');
    const v = { support: 'sol', sDouche: '4,4' };
    def.surChoix(v, { support: 'mur' });
    assert.equal(v.sDouche, '0');
});

test('toiture : rives selon la couverture, tuile canal sans écran', () => {
    const canal = calculer('toiture', { couverture: 'canal', pans: '2' }, ctx);
    assert.equal(q(canal.lignes, 'ecran'), 0);
    assert.ok(q(canal.lignes, 'plaque_st') > 0 && q(canal.lignes, 'tuile_rive') === 0);
    const ard = calculer('toiture', { couverture: 'ardoise', pans: '2' }, ctx);
    assert.ok(q(ard.lignes, 'rive_zinc') > 0 && q(ard.lignes, 'tuile_rive') === 0);
});

test('maison 10 × 8 : moins d\'agglos (rangs de chaînage déduits)', () => {
    const d = valeursDefaut(MAISON_DEF);
    const r = calculerMaison({ ...d, L: 10, l: 8, niveaux: '1' }, ctx);
    const murs = r.lots.find(l => l.id === 'murs');
    assert.ok(murs.infos.some(t => t.includes('rangs de chaînage')));
});

// ─── Lot 2 (4.9.0) : conditionnements, saisie en m², recherche ───
import { combinaisonPots, affichage, nbAchat } from '../js/calc/materiaux.js';
import { motsRecherche, correspond, norm } from '../js/core/format.js';
import { OUV_CATS } from '../js/calc/ouvrages.js';

test('peinture : pots combinés au plus juste', () => {
    assert.deepEqual(combinaisonPots(1.2).pots, [[2.5, 1]]);
    assert.deepEqual(combinaisonPots(11).pots, [[10, 1], [1, 1]]);
    assert.deepEqual(combinaisonPots(7).pots, [[10, 1]]);
    assert.deepEqual(combinaisonPots(3).pots, [[5, 1]]);
    const a = affichage('peinture', 12.3);
    assert.match(a.d, /pot de 10 L \+/);
    assert.equal(nbAchat('peinture', 12.3), a.v * 1);
});

test('conditionnements : plinthes en barres, parquet en paquets, big bags', () => {
    assert.equal(affichage('plinthe_bois', 13).v, '6');                 // 13 m / 2,40 m
    const r = calculer('parquet', { L: 4, l: 3.5, paquet: 2.13 }, ctx);
    const pq = r.lignes.find(l => l.k === 'parquet');
    assert.equal(affichage('parquet', pq.q, ctx, pq.pk).v, '8');         // 14 m² × 1,07 = 15 m² → 8 paquets
    assert.match(affichage('sable04', 1.3).d, /2 big bags/);
});

test('saisie directe en m²', () => {
    const r = calculer('rejoint', { saisie: 'surf', S: 15 }, ctx);
    assert.deepEqual(r.erreurs, {});
    assert.equal(r.resume[0].v, '15 m²');
    assert.ok(calculer('chaux', { saisie: 'surf', S: 10, ouv: 12 }, ctx).erreurs.ouv);
    const c = calculer('carrelage', { saisie: 'surf', S: 16 }, ctx);
    assert.ok(q(c.lignes, 'plinthe') > 0);
});

test('recherche : plusieurs mots, catégories, terminaisons', () => {
    const textes = OUVRAGES.map(o => ({ id: o.id, t: norm(`${o.nom} ${o.desc} ${o.mots || ''} ${OUV_CATS.find(c => c.id === o.cat).l}`) }));
    const trouve = q => textes.filter(x => correspond(x.t, motsRecherche(q))).map(x => x.id);
    assert.ok(trouve('joint pierre').includes('rejoint'));
    assert.ok(trouve('rejointoyer').includes('rejoint'));
    assert.ok(trouve('renovation').includes('demolition'));
    assert.ok(trouve('parpaings').includes('mur'));
});

// ─── Lot 3 (5.0.0) : isolation, salle d'eau, pièce complète ───
import { couchesPour } from '../js/calc/ouvrages/isoler.js';

test('isolation : épaisseur pour le R visé, membrane adaptée au mur ancien', () => {
    assert.deepEqual(couchesPour(3.7, 0.038), [145]);                    // 141 mm → 145
    assert.equal(couchesPour(7.5, 0.038, 200).length, 2);               // 285 mm → 2 couches
    const bois = calculer('isoler', { paroi: 'mur', support: 'ancien', isolant: 'bois', L: 4, h: 2.5 }, ctx);
    assert.ok(q(bois.lignes, 'frein_vapeur') > 0 && q(bois.lignes, 'pare_vapeur') === 0);
    assert.equal(bois.comparatif.options.length, 5);
    const pu = calculer('isoler', { support: 'ancien', isolant: 'pu' }, ctx);
    assert.match(pu.infos.join(' '), /proscrire/);
    const ramp = calculer('isoler', { paroi: 'rampants', support: 'recent', isolant: 'verre', R: '6', L: 9, h: 9 }, ctx);
    assert.ok(q(ramp.lignes, 'pare_vapeur') > 0);
    assert.ok(ramp.resume.find(k => k.l === 'R obtenu').v.replace(',', '.') >= 6);
});

test('salle d\'eau : plomberie par appareil et douche à l\'italienne', () => {
    const p = calculer('plomberie', { wc: 1, lavabo: 1, douche: 1, dAlim: 5, dEvac: 3 }, ctx);
    const per = p.lignes.filter(l => l.k === 'per16');
    assert.equal(per.length, 2);                                        // bleu + rouge
    assert.ok(Math.abs(q(p.lignes, 'per16') - 5 * 5 * 1.15) < 1e-9);   // 3 froids + 2 chauds
    assert.ok(q(p.lignes, 'pvc100b') > 0 && q(p.lignes, 'pvc40') > 0 && q(p.lignes, 'bati_wc') === 1);
    assert.ok(calculer('plomberie', { wc: 0, lavabo: 0, douche: 0 }, ctx).erreurs.wc);
    const d = calculer('douche', { L: 120, l: 90, fond: 'pente' }, ctx);
    assert.ok(q(d.lignes, 'natte_etanche') > 0 && q(d.lignes, 'ciment') > 0 && q(d.lignes, 'siphon_douche') === 1);
});

test('pièce complète : une saisie, toutes les lignes', () => {
    const r = calculer('piece', { nom: 'Chambre 1', L: 4, l: 3.5, h: 2.5, sol: 'parquet', murs: 'peinture', plafond: 'peinture' }, ctx);
    assert.equal(r.titre, 'Chambre 1 4 × 3,5 m');
    assert.ok(q(r.lignes, 'peinture') > 0 && q(r.lignes, 'peinture_plafond') > 0 && q(r.lignes, 'parquet') > 0 && q(r.lignes, 'plinthe_bois') > 0);
    const seule = calculer('peinture', { L: 4, l: 3.5, h: 2.5, ouv: 1.7 + 1.5, lissage: 'B' }, ctx);
    assert.ok(Math.abs(q(r.lignes, 'peinture') - q(seule.lignes, 'peinture')) < 1e-9, 'mêmes formules que le calculateur Peinture');
    assert.ok(calculer('piece', { fen: 20, fenT: 5 }, ctx).erreurs.fen);
});
