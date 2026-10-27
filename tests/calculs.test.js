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
