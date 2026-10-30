// Contrôles de la PWA : tout le code doit être disponible hors ligne, versions cohérentes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const lire = f => readFileSync(join(RACINE, f), 'utf8');
const fichiers = d => readdirSync(join(RACINE, d)).flatMap(n => {
    const p = join(d, n);
    return statSync(join(RACINE, p)).isDirectory() ? fichiers(p) : [p];
});

test('hors ligne : chaque fichier JS et CSS est dans la liste du sw.js', () => {
    const sw = lire('sw.js');
    [...fichiers('js'), ...fichiers('css')].map(f => './' + relative('.', f).split('\\').join('/'))
        .forEach(f => assert.ok(sw.includes(`'${f}'`), `${f} manque dans sw.js`));
});

test('version : APP_VERSION et nom du cache identiques', () => {
    const v = lire('js/app.js').match(/APP_VERSION = '([\d.]+)'/)[1];
    assert.match(lire('sw.js'), new RegExp(`'kalou-btp-v${v.replace(/\./g, '\\.')}'`));
});
