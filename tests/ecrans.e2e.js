// Parcours des écrans dans un vrai navigateur (Chromium) : `npm run test:ecrans`.
// Vérifie que chaque écran s'affiche sans erreur JS, sur un téléphone de 360 px de large.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, extname, normalize } from 'node:path';
import { OUVRAGES } from '../js/calc/ouvrages.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

let serveur, nav, base;

before(async () => {
    serveur = createServer(async (req, res) => {
        const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
        try {
            const corps = await readFile(join(RACINE, chemin.endsWith('/') ? chemin + 'index.html' : chemin));
            res.writeHead(200, { 'content-type': TYPES[extname(chemin) || '.html'] || 'application/octet-stream' });
            res.end(corps);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(r => serveur.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${serveur.address().port}/`;
    nav = await chromium.launch();
});
after(async () => { await nav?.close(); serveur?.close(); });

/** Nouvelle page de téléphone qui collecte les erreurs JS. */
async function page() {
    const ctx = await nav.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.erreurs = [];
    p.on('pageerror', e => p.erreurs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') p.erreurs.push(m.text()); });
    return p;
}
const pasDeDebordement = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test('accueil, chantiers, réglages : affichage sans erreur', async () => {
    const p = await page();
    for (const ecran of ['#/', '#/chantiers', '#/reglages', '#/maison']) {
        await p.goto(base + ecran);
        await p.waitForSelector('main .card, main .tile, main .hero, main p', { timeout: 5000 });
        assert.ok(!(await p.textContent('main')).includes('Oups'), ecran);
        assert.ok(await pasDeDebordement(p), `${ecran} : déborde en largeur`);
    }
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});

test('les 33 calculateurs donnent un résultat avec les valeurs par défaut', async () => {
    const p = await page();
    for (const o of OUVRAGES) {
        await p.goto(base + '#/calc/' + o.id);
        await p.waitForSelector('.line, .empty-res', { timeout: 5000 });
        assert.ok(await p.$('.line'), `${o.id} : pas de résultat`);
        assert.ok(await pasDeDebordement(p), `${o.id} : déborde en largeur`);
    }
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});

test('maison : menuiseries modifiables, résultat recalculé', async () => {
    const p = await page();
    await p.goto(base + '#/maison');
    await p.click('[data-etape="murs"] summary');
    await p.click('[data-men-ajout]');
    const n = (await p.$$('[data-mi]')).length;
    await p.click(`[data-mi="${n - 1}"] [data-men-type="baie"]`);
    await p.fill(`[data-mi="${n - 1}"] [data-men="larg"]`, '180');
    await p.waitForTimeout(400);
    assert.match(await p.textContent('[data-resume="murs"]'), /2 baies vitrées/);
    assert.ok(await p.$('.kpi'));
    await p.fill(`[data-mi="0"] [data-men="haut"]`, '2');
    await p.waitForTimeout(400);
    assert.ok((await p.textContent('[data-mi="0"] .err')).length > 0, 'erreur attendue (mètres au lieu de cm)');
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});

test('enregistrer un calcul dans un nouveau chantier, puis voir la liste de courses', async () => {
    const p = await page();
    await p.goto(base + '#/calc/dalle');
    await p.waitForSelector('.line');
    await p.click('#actionbar [data-act="ajouter"]');
    await p.click('[data-new]');
    await p.fill('#sheet-txt', 'Terrasse test');
    await p.click('[data-r="1"]');
    // Le bouton devient « Ajouté · voir le chantier »
    await p.click('#actionbar [data-act="voir-ch"]');
    await p.waitForFunction(() => location.hash.startsWith('#/chantier/'), null, { timeout: 5000 });
    assert.match(await p.textContent('main'), /Terrasse test|Dalle/);
    await p.click('[data-onglet="courses"]');
    await p.waitForSelector('.line', { timeout: 5000 });
    await p.goto(base + '#/chantiers');
    await p.waitForSelector('main');
    assert.match(await p.textContent('main'), /Terrasse test/);
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});
