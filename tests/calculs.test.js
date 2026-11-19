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
    // Une ligne par appareil, chacun avec ses distances
    const app = [{ t: 'wc', alim: 4, evac: 1 }, { t: 'lavabo', alim: 5, evac: 2.5 }, { t: 'douche', alim: 6, evac: 2 }];
    const p = calculer('plomberie', { app }, ctx);
    assert.deepEqual(p.erreurs, {});
    assert.equal(p.lignes.filter(l => l.k === 'per16').length, 2);     // bleu + rouge
    assert.ok(Math.abs(q(p.lignes, 'pvc40') - (2.5 + 2) * 1.1) < 1e-9, 'PVC Ø40 = évacuations réelles du lavabo et de la douche');
    assert.ok(Math.abs(q(p.lignes, 'pvc100b') - 1 * 1.1) < 1e-9, 'PVC Ø100 = évacuation du WC');
    assert.ok(q(p.lignes, 'bati_wc') === 1 && q(p.lignes, 'culotte') === 3);
    const lg = x => x * 1.1 + 0.5;
    assert.equal(p.resume[1].v, `${Math.round(lg(4) + 2 * lg(5) + 2 * lg(6))} m de PER`);
    assert.match(p.infos[0], /WC : PER 4 m, évacuation Ø100 1 m/);
    // Un appareil plus loin = plus de tuyau
    const loin = calculer('plomberie', { app: [{ t: 'lavabo', alim: 18, evac: 6 }] }, ctx);
    assert.ok(q(loin.lignes, 'pvc40') > q(calculer('plomberie', { app: [{ t: 'lavabo', alim: 3, evac: 1 }] }, ctx).lignes, 'pvc40'));
    // Couronnes de 25 m : 3 circuits de 11,5 m ne tiennent pas dans une seule
    const cour = calculer('plomberie', { app: [{ t: 'wc', alim: 10, evac: 1 }, { t: 'll', alim: 10, evac: 1 }, { t: 'lv', alim: 10, evac: 1 }] }, ctx);
    assert.ok(q(cour.lignes, 'per16') > 25 * 1.5, '2 couronnes');
    // Robinet extérieur : pas d'évacuation ; chauffe-eau : groupe de sécurité
    const ext = calculer('plomberie', { app: [{ t: 'ext', alim: 6 }], ce: true, dCE: 3, dArr: 10 }, ctx);
    assert.ok(q(ext.lignes, 'robinet_ext') === 1 && q(ext.lignes, 'groupe_secu') === 1 && q(ext.lignes, 'per20') > 10 + 6);
    assert.equal(q(ext.lignes, 'pvc40'), 1, 'seulement la vidange du groupe de sécurité');
    assert.ok(calculer('plomberie', { app: [] }, ctx).erreurs.app);
    // Ancienne saisie (nombres + distances moyennes) convertie en lignes
    const ancien = calculer('plomberie', { wc: 1, lavabo: 2, douche: 0, dAlim: 5, dEvac: 3 }, ctx);
    assert.equal(ancien.v.app.length, 3);
    assert.ok(q(ancien.lignes, 'pvc40') > 0 && q(ancien.lignes, 'pvc100b') > 0);
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

// ─── Lot 4 (5.1.0) : électricité et VMC (relecture électricien) ───
test('électricité : circuits, différentiels, réserve du tableau, pose apparente', () => {
    const r = calculer('electricite', { prises: 24, points: 9, inter: 10, spe: 4, plaque: true, cumulus: true, tableau: true, terre: true }, ctx);
    assert.deepEqual(r.erreurs, {});
    assert.equal(q(r.lignes, 'disj20'), 3 + 4 + 1);                     // 24 prises / 8 + 4 dédiés + chauffe-eau
    assert.equal(q(r.lignes, 'disj32'), 1);
    assert.equal(q(r.lignes, 'diff_a') + q(r.lignes, 'diff_ac'), 2);
    assert.ok(q(r.lignes, 'contacteur') === 1 && q(r.lignes, 'piquet_terre') === 1 && q(r.lignes, 'fil15') > 0);
    // petit tableau : 2 différentiels mini même avec peu de circuits
    const p = calculer('electricite', { prises: 8, points: 4, tableau: true }, ctx);
    assert.equal(q(p.lignes, 'diff_ac') + q(p.lignes, 'diff_a'), 2);
    // pose apparente : câble R2V, pas de gaine ICTA, boîtiers en saillie
    const a = calculer('electricite', { pose: 'apparent', plaque: true }, ctx);
    assert.equal(q(a.lignes, 'icta_6') + q(a.lignes, 'icta_15') + q(a.lignes, 'icta_25'), 0);
    assert.ok(q(a.lignes, 'cable_6') > 0 && q(a.lignes, 'boitier_saillie') > 0);
});

test('électricité pièce par pièce : distances propres, cuisine à part, gros appareils', () => {
    const pieces = [
        { t: 'cuisine', prises: 6, points: 2, inter: 1, dist: 5 },
        { t: 'sejour', prises: 5, points: 2, inter: 2, dist: 4 },
        { t: 'chambre', prises: 3, points: 1, inter: 1, dist: 10 }
    ];
    const r = calculer('electricite', { pieces, appareils: [], tableau: true }, ctx);
    assert.deepEqual(r.erreurs, {});
    assert.equal(q(r.lignes, 'disj20'), 2, 'séjour + chambre (8 prises) et la cuisine sur son propre circuit');
    // Une pièce plus loin du tableau = plus de gaine
    const loin = calculer('electricite', { pieces: [{ ...pieces[2], dist: 25 }], appareils: [] }, ctx);
    const pres = calculer('electricite', { pieces: [{ ...pieces[2], dist: 2 }], appareils: [] }, ctx);
    assert.ok(Math.abs(q(loin.lignes, 'icta_25') - q(pres.lignes, 'icta_25') - 23 * 1.15) < 1e-9);
    // Pompe à chaleur loin : section au-dessus, câble R2V dehors, coupure près de l'unité
    const pac = calculer('electricite', { pieces: [], appareils: [{ t: 'pac', dist: 55, cal: '32' }], tableau: true }, ctx);
    assert.ok(q(pac.lignes, 'cable_10') > 55 && q(pac.lignes, 'sectionneur') === 1 && q(pac.lignes, 'disj32') === 1);
    assert.match(pac.infos.join(' '), /section au-dessus/);
    // Clim : câble de liaison ; prise voiture : différentiel type A réservé
    const cv = calculer('electricite', { pieces: [], appareils: [{ t: 'clim', dist: 10, cal: '16', lien: 4 }, { t: 've', dist: 15 }], tableau: true }, ctx);
    assert.ok(q(cv.lignes, 'cable_liaison') > 4 && q(cv.lignes, 'prise_ve') === 1);
    assert.equal(q(cv.lignes, 'diff_a'), 2, 'clim (type A) + prise voiture');
    // Radiateurs : 3 500 W maxi par circuit
    const rad = calculer('electricite', { pieces: [], appareils: [1500, 1500, 1500].map(w => ({ t: 'radiateur', dist: 8, w })), tableau: true }, ctx);
    assert.equal(q(rad.lignes, 'disj16'), 2);
    assert.ok(q(rad.lignes, 'icta_fp') > 0);
    assert.ok(calculer('electricite', { pieces: [], appareils: [] }, ctx).erreurs.pieces);
});

test('VMC : bouches par pièce, circuit dédié 2 A', () => {
    const r = calculer('vmc', { sdb: 1, wc: 1, cuisine: true, seches: 4 }, ctx);
    assert.equal(q(r.lignes, 'vmc_bouche'), 3);
    assert.equal(q(r.lignes, 'entree_air'), 4);
    assert.equal(q(r.lignes, 'disj2'), 1);
    assert.match(r.infos.join(' '), /hotte/);
});

// ─── Lot 6 (5.1.0) : bâti ancien, extérieur, menuiserie, carreaux exacts ───
test('bâti ancien : sol et enduit chaux-chanvre, agrafage, injection', () => {
    const s = calculer('solchaux', { L: 5, l: 4, ep: 10, epH: 15 }, ctx);
    assert.ok(Math.abs(q(s.lignes, 'liant_chanvre') - 20 * 0.10 * 1.10 * 220) < 1e-6);
    assert.equal(q(s.lignes, 'polyane'), 0, 'pas de film étanche sous un sol à la chaux');
    const e = calculer('enduitchanvre', { saisie: 'surf', S: 10, ep: 5 }, ctx);
    assert.ok(q(e.lignes, 'chenevotte') > 0);
    const f = calculer('fissure', { ml: 2, ep: 40, pas: 35 }, ctx);
    assert.equal(f.resume[0].v, String((Math.ceil(2 / 0.35) + 1) * 2));
    assert.equal(q(f.lignes, 'fer10'), barresPour((Math.ceil(2 / 0.35) + 1) * 2, 0.6));
    const i = calculer('injection', { ml: 10, ep: 40, mur: 'brique' }, ctx);
    assert.ok(Math.abs(q(i.lignes, 'injection') - 2.8) < 1e-9);
});

test('extérieur et menuiserie : tranchée, pavage, portes, OSB, lambris', () => {
    const t = calculer('tranchee', { L: 15, coudes: 2 }, ctx);
    assert.equal(q(t.lignes, 'regard'), 4);
    assert.ok(t.lignes.find(l => l.k === 'pvc_cr8').ref === 'Ø100');
    const p = calculer('pavage', { L: 6, l: 4, usage: 'voiture', bord: 0 }, ctx);
    assert.ok(Math.abs(q(p.lignes, 'grave') - 24 * 0.25 * 2.1) < 1e-9);
    assert.equal(q(calculer('portes', { nb: 3 }, ctx).lignes, 'chambranle'), 6);
    const o = calculer('osb', { L: 5, l: 4, entraxe: '60' }, ctx);
    assert.equal(o.lignes[0].ref, '22 mm');
    assert.equal(q(o.lignes, 'osb'), Math.ceil(20 * 1.08 / (2.05 * 0.675)));
    assert.ok(q(calculer('lambris', { L: 4, l: 2.5 }, ctx).lignes, 'lambris') === 11);
});

test('carrelage en taille exacte = même résultat que la tranche équivalente', () => {
    const g = k => r => r.lignes.filter(l => l.k === k).reduce((s, l) => s + l.q, 0);
    const exact = calculer('carrelage', { L: 4, l: 5, format: 'exact', cL: 60, cl: 60 }, ctx);
    const tranche = calculer('carrelage', { L: 4, l: 5, format: 'grand' }, ctx);
    assert.equal(g('colle_carrelage')(exact), g('colle_carrelage')(tranche));
    const long = calculer('carrelage', { L: 4, l: 5, format: 'exact', cL: 120, cl: 20 }, ctx);
    assert.equal(g('colle_carrelage')(long), 140);                     // 2 400 cm² → double encollage
    assert.equal(long.lignes.find(l => l.k === 'carrelage').ref, 'sol intérieur · 120 × 20 cm');
});

test('laine en paquets quand la surface du paquet est connue', () => {
    const r = calculer('placo', { type: 'appuis', a: 10, b: 2.5, paquetLaine: 4.8 }, ctx);
    const li = r.lignes.find(l => l.k === 'laine_mur');
    assert.equal(affichage(li.k, li.q, ctx, li.pk).v, String(Math.ceil(25 * 1.05 / 4.8)));
});

// ─── 5.3.0 : pièces d'un chantier réutilisées par les calculateurs ───
import { POUR_PIECE, valeursPiece, metre, piecesVersElec, piecesVersVmc } from '../js/calc/pieces.js';
import { OUVRAGES_PAR_ID } from '../js/calc/ouvrages.js';
test('pièces du chantier : chaque calcul reprend les mesures et donne un résultat', () => {
    const p = { type: 'chambre', nom: 'Chambre 1', L: 4, l: 3.5, h: 2.5, portes: 1, fen: 1, fenT: 1.5 };
    const m = metre(p);
    assert.ok(Math.abs(m.S - 14) < 1e-9 && Math.abs(m.P - 15) < 1e-9 && Math.abs(m.Sm - (15 * 2.5 - 3.2)) < 1e-9);
    POUR_PIECE.forEach(x => {
        const r = calculer(x.ouv, valeursPiece(x.pre, p), ctx);
        assert.deepEqual(r.erreurs, {}, `${x.pre} sans erreur`);
        assert.ok(r.lignes.length > 0, `${x.pre} donne des matériaux`);
    });
    assert.ok(Math.abs(q(calculer('chape', valeursPiece('chape', p), ctx).lignes, 'ciment') - q(calculer('chape', { L: 4, l: 3.5 }, ctx).lignes, 'ciment')) < 1e-9);
    const pieces = [p, { ...p, type: 'cuisine', nom: '' }, { ...p, type: 'sdb', nom: 'SDB' }, { ...p, type: 'wc', nom: '' }];
    const el = calculer('electricite', { pieces: piecesVersElec(pieces, OUVRAGES_PAR_ID.electricite.champs.find(c => c.id === 'pieces').types), appareils: [] }, ctx);
    assert.deepEqual(el.erreurs, {});
    assert.equal(el.v.pieces[0].nom, 'Chambre 1');
    assert.match(el.infos.join(' '), /Chambre 1/);
    assert.deepEqual(piecesVersVmc(pieces), { sdb: 1, wc: 1, cuisine: true, seches: 1 });
});

// ─── 5.4.0 : « Toute la maison » à partir des pièces (exemple réel de l'utilisateur) ───
import { appareilsEau, normaliser } from '../js/calc/pieces.js';
test('toute la maison : salon, cuisine, 2 chambres, salle de bain + WC, palier', () => {
    const P = [
        { type: 'sejour', nom: 'Salon', niveau: 'rdc', saisie: 'surf', S: 35, P: 0, h: 2.5, portes: 2, fen: 2, fenT: 1.5, murExt: 13, dist: 6 },
        { type: 'cuisine', niveau: 'rdc', saisie: 'surf', S: 15, P: 0, h: 2.5, portes: 1, fen: 1, fenT: 1.2, murExt: 7, dist: 4, distEau: 4, distEvac: 2 },
        { type: 'chambre', nom: 'Chambre 1', niveau: 'etage', saisie: 'surf', S: 15, P: 0, h: 2.4, portes: 1, fen: 1, fenT: 1.2, murExt: 8, dist: 12, chauffage: 1500 },
        { type: 'chambre', nom: 'Chambre 2', niveau: 'etage', saisie: 'surf', S: 10, P: 0, h: 2.4, portes: 1, fen: 1, fenT: 1.2, murExt: 6, dist: 14, chauffage: 1000 },
        { type: 'sdb', niveau: 'etage', saisie: 'surf', S: 15, P: 0, h: 2.4, portes: 1, fen: 1, fenT: 0.8, murExt: 4, sol: 'carrelage', dist: 12, chauffage: 1500, wcIn: true, distEau: 3, distEvac: 2 },
        { type: 'entree', nom: 'Palier', niveau: 'etage', saisie: 'surf', S: 5, P: 0, h: 2.4, portes: 0, fen: 0, murExt: 0, dist: 10 }
    ];
    const r = calculer('renomaison', { pieces: P, mlCloison: 14, portesCloison: 4, ballon: true, dBallonEau: 6, dBallonTab: 12,
        appareils: [{ t: 'clim', dist: 8, cal: '16', lien: 4 }] }, ctx);
    assert.deepEqual(r.erreurs, {});
    assert.equal(r.titre, 'Toute la maison : 6 pièces, 95 m²');
    // Doublage 100 mm sur les seuls murs donnant dehors, cloisons en laine 45 une seule fois
    assert.ok(r.lignes.some(l => l.k === 'laine_mur' && l.ref === '100 mm'));
    assert.ok(Math.abs(r.lignes.filter(l => l.k === 'laine_cloison').reduce((t, l) => t + l.q, 0) - (14 * 2.5 - 4 * 1.7) * 1.05) < 1e-9);
    // Carrelage : RDC (50 m²) + salle de bain (15 m²) ; l'étage garde son parquet
    assert.match(r.infos.join(' '), /Sol en carrelage : 65 m²/);
    assert.equal(q(r.lignes, 'parquet'), 0);
    // Électricité : clim, ballon, 3 radiateurs de l'étage ; plomberie : évier, LV, lavabo, douche, WC + ballon
    assert.ok(q(r.lignes, 'sectionneur') === 1 && q(r.lignes, 'contacteur') === 1 && q(r.lignes, 'sortie_cable') >= 4);
    assert.ok(q(r.lignes, 'groupe_secu') === 1 && q(r.lignes, 'pipe_wc') === 1 && q(r.lignes, 'pvc100b') > 0);
    assert.equal(appareilsEau(normaliser(P[4])).map(a => a.t).join(','), 'lavabo,douche,wc');
    // Un seul rouleau de téflon pour toute la maison
    assert.equal(q(r.lignes, 'teflon'), 1);
    assert.ok(calculer('renomaison', { pieces: [] }, ctx).erreurs.doublage);
});
