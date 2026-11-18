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

test('tous les calculateurs donnent un résultat avec les valeurs par défaut', async () => {
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

test('liste de courses envoyée en PDF : le fichier est créé', async () => {
    const p = await page();
    await p.goto(base + '#/reglages');
    await p.fill('#r-nom', 'Pascal');
    await p.press('#r-nom', 'Tab');
    await p.goto(base + '#/calc/dalle');
    await p.waitForSelector('.line');
    await p.click('#actionbar [data-act="ajouter"]');
    await p.click('[data-new]');
    await p.fill('#sheet-txt', 'Dalle garage');
    await p.click('[data-r="1"]');
    await p.click('#actionbar [data-act="voir-ch"]');
    await p.waitForFunction(() => location.hash.startsWith('#/chantier/'), null, { timeout: 5000 });
    await p.click('[data-onglet="courses"]');
    await p.waitForSelector('.line.check');
    await p.click('.line.check');                      // une ligne cochée → choix « ce qui reste / tout »
    await p.click('#actionbar [data-act="partager"]');
    await p.waitForSelector('#env-quoi');
    assert.ok(await pasDeDebordement(p));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-e="pdf"]')]);
    assert.match(dl.suggestedFilename(), /^Liste materiaux - Dalle garage - \d{4}-\d\d-\d\d\.pdf$/);
    const chemin = await dl.path();
    const contenu = await readFile(chemin);
    assert.equal(contenu.subarray(0, 8).toString('latin1'), '%PDF-1.4');
    assert.ok(contenu.toString('latin1').includes(Buffer.from('Pascal', 'latin1').toString('hex').toUpperCase()));
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});

test('isoler un mur ancien : comparer puis choisir un autre isolant ; pièce complète', async () => {
    const p = await page();
    await p.goto(base + '#/calc/isoler');
    await p.waitForSelector('.cmp-carte');
    assert.ok((await p.textContent('#res')).includes('Fibre de bois'));
    await p.click('.cmp-carte[data-v="chanvre"]');
    await p.waitForFunction(() => document.querySelector('[data-choix="isolant"][data-v="chanvre"]').classList.contains('on'));
    assert.ok((await p.textContent('#res')).includes('chanvre'));
    assert.ok(await pasDeDebordement(p));
    // Pièce complète : le nom tapé arrive dans le titre
    await p.goto(base + '#/calc/piece');
    await p.waitForSelector('.line');
    await p.fill('#in-nom', 'Chambre 2');
    await p.waitForFunction(() => document.querySelector('#res h2').textContent.includes('Chambre 2'));
    assert.ok(await pasDeDebordement(p));
    assert.deepEqual(p.erreurs, []);
    await p.context().close();
});

test('accueil par familles, recherche ; listes par pièce et par appareil', async () => {
    const p = await page();
    await p.goto(base + '#/');
    await p.waitForSelector('.famille');
    assert.equal(await p.locator('.famille').count(), 9);
    assert.equal(await p.locator('.tile:visible').count(), 0, 'pas les 48 calculs d\'un coup');
    await p.fill('#q', 'prise');
    assert.ok(await p.locator('.tile:visible').count() >= 1);
    await p.goto(base + '#/?f=eau');
    await p.waitForSelector('.tile');
    assert.equal(await p.locator('.tile:visible').count(), 2);
    // Électricité : ajouter une pompe à chaleur loin du tableau
    await p.goto(base + '#/calc/electricite');
    await p.waitForSelector('[data-liste="appareils"]');
    await p.click('[data-lajout="appareils"]');
    const der = p.locator('[data-liste="appareils"]').last();
    await der.locator('select[data-lt]').selectOption('pac');
    await p.locator('[data-liste="appareils"]').last().locator('input[data-col="dist"]').fill('60');
    await p.waitForFunction(() => /Pompe à chaleur : 32 A, 10 mm²/.test(document.querySelector('#res').textContent));
    // Plomberie : retirer un appareil, une case vide bloque
    await p.goto(base + '#/calc/plomberie');
    await p.waitForSelector('[data-liste="app"]');
    await p.locator('[data-liste="app"] [data-lsuppr]').first().click();
    assert.equal(await p.locator('[data-liste="app"]').count(), 2);
    await p.locator('[data-liste="app"] input[data-col="alim"]').first().fill('');
    await p.waitForSelector('.liste-ligne.ko');
    assert.ok(await pasDeDebordement(p));
    assert.deepEqual(p.erreurs, []);
});

test('ordinateur (1440 px) : saisie et résultat côte à côte, pas de débordement', async () => {
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const erreurs = [];
    p.on('pageerror', e => erreurs.push(e.message));
    for (const ecran of ['#/', '#/calc/dalle', '#/calc/electricite', '#/maison']) {
        await p.goto(base + ecran);
        await p.waitForSelector('main .tile, main .line, main .step, main .card', { timeout: 5000 });
        assert.ok(await pasDeDebordement(p), `${ecran} : déborde`);
    }
    await p.goto(base + '#/calc/dalle');
    await p.waitForSelector('#res .line');
    const [f, r] = await p.evaluate(() => [document.querySelector('.col-saisie').getBoundingClientRect(), document.querySelector('.col-res').getBoundingClientRect()].map(x => ({ x: x.left, y: x.top })));
    assert.ok(r.x > f.x + 300 && Math.abs(r.y - f.y) < 60, 'résultat à droite de la saisie');
    assert.deepEqual(erreurs, []);
    await b.close();
});
