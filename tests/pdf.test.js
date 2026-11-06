// Liste de courses en PDF : fichier valide, rangé, lisible (npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encoder, largeur, couper } from '../js/core/pdf.js';
import { pdfListe, nomFichierPdf, ligneDoc } from '../js/ui/liste-pdf.js';
import { calculer, OUVRAGES, valeursDefaut } from '../js/calc/ouvrages.js';
import { consolider } from '../js/ui/resultats.js';

const ctx = { sacCiment: 35 };
const texte = o => Buffer.from(o).toString('latin1');
const hexDe = s => encoder(s).map(o => o.toString(16).padStart(2, '0')).join('').toUpperCase();

function chantier(ids) {
    const calc = ids.map(id => calculer(id, valeursDefaut(OUVRAGES.find(o => o.id === id)), ctx));
    return { calc, lignes: consolider(calc.flatMap(c => c.lignes)) };
}

/** Vérifie la table xref : chaque position pointe bien sur « n 0 obj ». */
function verifierStructure(pdf) {
    assert.ok(pdf.startsWith('%PDF-1.4\n'));
    assert.ok(pdf.trimEnd().endsWith('%%EOF'));
    const xref = Number(pdf.match(/startxref\n(\d+)\n%%EOF/)[1]);
    assert.equal(pdf.slice(xref, xref + 4), 'xref');
    const [, nb] = pdf.slice(xref).match(/^xref\n0 (\d+)\n/).map(Number);
    const entrees = pdf.slice(xref).split('\n').slice(3, 2 + nb);
    entrees.forEach((e, i) => {
        const pos = Number(e.slice(0, 10));
        assert.equal(pdf.slice(pos, pos + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`, `objet ${i + 1}`);
    });
    // Longueur déclarée des flux = longueur réelle
    for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
        const debut = m.index + m[0].length;
        assert.equal(pdf.slice(debut + Number(m[1]), debut + Number(m[1]) + 10), '\nendstream');
    }
}

test('encodage : accents, m², Ø et € lisibles ; ≈ et emojis remplacés', () => {
    assert.deepEqual(encoder('é à ç'), [0xE9, 0x20, 0xE0, 0x20, 0xE7]);
    assert.deepEqual(encoder('m²'), [0x6D, 0xB2]);
    assert.deepEqual(encoder('€œ'), [0x80, 0x9C]);
    assert.equal(Buffer.from(encoder('≈ 2 m³')).toString('latin1'), 'env. 2 m³');
    assert.deepEqual(encoder('🧱'), []);
    assert.deepEqual(encoder('1 234'), [0x31, 0xA0, 0x32, 0x33, 0x34]);
});

test('coupure des lignes : rien ne dépasse la colonne', () => {
    const t = 'Gravillon 4/10 (remplissage blocs, chaînages) et beaucoup d\'autres mots encore pour couper';
    const ls = couper(t, 10, 120, true);
    assert.ok(ls.length > 1);
    ls.forEach(l => assert.ok(largeur(l, 10, true) <= 120 + 0.01, l));
    assert.equal(ls.join(' '), t);
});

test('PDF d\'un petit chantier : structure valide, contenu identifiable', () => {
    const { calc, lignes } = chantier(['dalle', 'mur']);
    const r = pdfListe({ nom: 'Terrasse chez Michel', lignes, ctx, id: 'k1ab2cd',
        ouvrages: calc.map(c => ({ titre: c.titre, resume: c.resume })), auteur: 'Pascal', tel: '06 12 34 56 78',
        date: new Date(2026, 10, 6) });
    const pdf = texte(r.octets);
    verifierStructure(pdf);
    assert.equal(r.ref, 'KB-261106-B2CD');
    assert.equal(r.nomFichier, 'Liste materiaux - Terrasse chez Michel - 2026-11-06.pdf');
    for (const s of ['LISTE DE MATÉRIAUX', 'Terrasse chez Michel', 'Pascal · 06 12 34 56 78', 'Prix unit. HT', 'Total TTC', 'SABLE, GRAVIER & BÉTON'])
        assert.ok(pdf.includes(hexDe(s)), s);
    // Chaque article est écrit avec sa quantité, et numéroté
    lignes.forEach((li, i) => {
        const d = ligneDoc(li, ctx);
        assert.ok(pdf.includes(hexDe(d.qte)), d.nom);
        assert.ok(pdf.includes(`<${hexDe(String(i + 1))}>`), `n° ${i + 1}`);
    });
    assert.match(pdf, /\/Count 1 /);
});

test('PDF d\'une grosse liste : plusieurs pages numérotées', () => {
    const { lignes } = chantier(OUVRAGES.map(o => o.id));
    const r = pdfListe({ nom: 'Tout', lignes: [...lignes, { cle: 'libre|x', l: 'Location bétonnière', q: 2, u: 'jour' }], ctx, partiel: true, total: 200 });
    const pdf = texte(r.octets);
    verifierStructure(pdf);
    assert.ok(r.pages >= 3);
    assert.match(pdf, new RegExp(`/Count ${r.pages} `));
    assert.ok(pdf.includes(hexDe(`Page ${r.pages} / ${r.pages}`)));
    assert.ok(pdf.includes(hexDe('(SUITE)')));
    assert.ok(pdf.includes(hexDe('Location bétonnière')));
});

test('nom de fichier sans caractères interdits', () => {
    assert.equal(nomFichierPdf('Mur / clôture: "Jean"', new Date(2026, 0, 2)), 'Liste materiaux - Mur clôture Jean - 2026-01-02.pdf');
    assert.equal(nomFichierPdf('', new Date(2026, 0, 2)), 'Liste materiaux - Chantier - 2026-01-02.pdf');
});
