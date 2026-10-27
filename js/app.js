// === Kalou BTP — point d'entrée ===
// Navigation par adresse (#/...) : le bouton « retour » du téléphone fonctionne.

import { migrer } from './core/store.js';
import { ICONES, fermerFeuille, feuilleOuverte, toast } from './ui/dom.js';
import { esc } from './core/format.js';
import { vueListe, vueCalcul } from './views/calculs.js';
import { vueMaison } from './views/maison.js';
import { vueChantiers, vueChantier } from './views/chantiers.js';
import { vueReglages } from './views/reglages.js';
import { barreActions } from './views/commun.js';

export const APP_VERSION = '4.0.0';

const main = () => document.getElementById('vue');
let _profondeur = 0;          // pages ouvertes depuis le lancement (pour « retour »)

/** Va à une adresse (#/...). */
export function aller(hash, { remplacer = false } = {}) {
    if (remplacer) { history.replaceState(null, '', hash); rendre(); return; }
    if (location.hash === hash) { rendre(); return; }
    _profondeur++;
    location.hash = hash;
}

/** Retour : historique si possible, sinon page parente. */
export function retour(parent = '#/') {
    if (_profondeur > 0) { _profondeur--; history.back(); }
    else aller(parent, { remplacer: true });
}

/**
 * En-tête de page.
 * @param {object} o { titre, sous, parent (adresse du retour, sinon logo), action: { html, onClick } }
 */
export function entete({ titre = '', sous = '', parent = null, action = null } = {}) {
    const top = document.getElementById('topbar');
    if (parent === null) {
        top.innerHTML = `<div class="brand"><div class="brand-logo">K</div><b>Kalou <span>BTP</span></b></div>
            ${titre ? `<div class="titles" style="text-align:right;flex:none"><div class="sub">${esc(titre)}</div></div>` : ''}`;
    } else {
        top.innerHTML = `<button class="back" aria-label="Retour" id="btn-back">${ICONES.back}</button>
            <div class="titles"><h1>${esc(titre)}</h1>${sous ? `<div class="sub">${esc(sous)}</div>` : ''}</div>
            ${action ? `<button class="action" id="btn-top-action">${action.html}</button>` : ''}`;
        top.querySelector('#btn-back').addEventListener('click', () => retour(parent));
    }
    if (action && parent !== null) top.querySelector('#btn-top-action').addEventListener('click', action.onClick);
    document.title = titre ? `${titre} — Kalou BTP` : 'Kalou BTP';
}

function lireAdresse() {
    const h = location.hash || '#/';
    const [chemin, qs] = h.slice(1).split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    const parts = chemin.split('/').filter(Boolean);
    return { parts, params };
}

function ongletActif(nom) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nom));
}

function rendre() {
    fermerFeuille();
    barreActions(null);
    const { parts, params } = lireAdresse();
    // Nouveau conteneur à chaque écran : aucun écouteur ne reste d'une page à l'autre
    const ancien = main();
    const root = ancien.cloneNode(false);
    ancien.replaceWith(root);
    window.scrollTo(0, 0);
    const [p0, p1] = parts;
    try {
        if (!p0)                    { ongletActif(params.ch ? 'chantiers' : 'calculs'); vueListe(root, params); }
        else if (p0 === 'calc')     { ongletActif(params.ch ? 'chantiers' : 'calculs'); vueCalcul(root, p1, params); }
        else if (p0 === 'maison')   { ongletActif(params.ch ? 'chantiers' : 'maison'); vueMaison(root, params); }
        else if (p0 === 'chantiers'){ ongletActif('chantiers'); vueChantiers(root, params); }
        else if (p0 === 'chantier') { ongletActif('chantiers'); vueChantier(root, p1, params); }
        else if (p0 === 'reglages') { ongletActif('reglages'); vueReglages(root, params); }
        else aller('#/', { remplacer: true });
    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="card"><h2>Oups</h2><p class="hint">Un problème est survenu sur cet écran.</p>
            <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="location.hash='#/'">Revenir à l'accueil</button></div>`;
    }
}

// ─── Démarrage ──────────────────────────────────────────────────────────────

function demarrer() {
    // Menu du bas
    document.querySelectorAll('.tab').forEach(t => {
        t.innerHTML = `<span class="tab-ic">${ICONES[t.dataset.icon]}</span><span>${t.dataset.label}</span>`;
        t.addEventListener('click', () => {
            const cible = t.dataset.href;
            _profondeur = 0;
            if (location.hash !== cible) history.replaceState(null, '', cible);
            rendre();
        });
    });

    window.addEventListener('hashchange', () => {
        if (feuilleOuverte()) fermerFeuille();
        rendre();
    });

    try {
        const nb = migrer();
        if (nb > 0) setTimeout(() => toast(`${nb} ancien(s) chantier(s) récupéré(s) dans « Chantiers »`), 600);
    } catch (e) { console.error('Migration', e); }

    rendre();

    // Hors ligne : service worker (mise en cache de l'appli)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
else demarrer();
