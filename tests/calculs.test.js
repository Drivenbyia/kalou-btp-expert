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
