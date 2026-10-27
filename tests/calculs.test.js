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
