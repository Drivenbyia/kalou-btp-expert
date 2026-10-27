// === Kalou BTP — point d'entrée ===
// Navigation par adresse (#/...) : le bouton « retour » du téléphone fonctionne.

import { migrer } from './core/store.js';
import { ICONES, toast, cacherToast, oublierFeuille, apresFeuille, gererPopFeuille, confirmer } from './ui/dom.js';
import { esc } from './core/format.js';
import { vueListe, vueCalcul } from './views/calculs.js';
import { vueMaison } from './views/maison.js';
import { vueChantiers, vueChantier } from './views/chantiers.js';
import { vueReglages } from './views/reglages.js';
import { barreActions } from './views/commun.js';

export const APP_VERSION = '4.4.0';

const main = () => document.getElementById('vue');
let _profondeur = 0;          // pages ouvertes depuis le lancement (pour « retour »)
let _saut = 0;
let _navInterne = false;                // nombre de pages remontées par le prochain retour

/** Va à une adresse (#/...). */
export function aller(hash, { remplacer = false } = {}) {
    apresFeuille(() => {
        if (remplacer) { history.replaceState(null, '', hash); rendre(); return; }
        if (location.hash === hash) { rendre(); return; }
        _profondeur++;
        _navInterne = true;              // Chrome émet aussi « popstate » sur un changement d'ancre
        location.hash = hash;
    });
}

/** Retour : historique si possible, sinon page parente. */
export function retour(parent = '#/') {
    apresFeuille(() => {
        if (_garde.active || _profondeur > 0) history.back();
        else aller(parent, { remplacer: true });
    });
}

/**
 * Revient n pages en arrière (ex. chantier ← liste ← calcul) si c'est le chemin suivi,
 * sinon remplace la page par `hash`. Évite les allers-retours dans l'historique.
 */
export function retourVers(hash, n = 1) {
    apresFeuille(() => {
        const extra = libererGarde();
        if (_profondeur >= n) { _saut = n; if (extra) _garde.sortieOk = false; history.go(-(n + extra)); }
        else if (extra) { history.go(-extra); setTimeout(() => aller(hash, { remplacer: true }), 60); }
        else aller(hash, { remplacer: true });
    });
}

// ─── Garde « Quitter sans enregistrer ? » ───────────────────────────────────
const _garde = { active: false, estModifie: null, sortieOk: false };

/** Protège l'écran : si estModifie() est vrai, le retour demande confirmation. */
export function garderSortie(estModifie) {
    _garde.estModifie = estModifie;
}
/** À appeler dès la première modification. */
export function armerGarde() {
    if (_garde.active || !_garde.estModifie) return;
    _garde.active = true;
    history.pushState({ garde: 1 }, '');
}
function libererGarde() {
    const extra = _garde.active ? 1 : 0;
    _garde.active = false; _garde.estModifie = null;
    if (extra) _garde.sortieOk = true;
    return extra;
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
    oublierFeuille();
    cacherToast();
    _garde.active = false; _garde.estModifie = null;
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

    window.addEventListener('popstate', async () => {
        if (_navInterne) { _navInterne = false; return; }
        if (gererPopFeuille()) return;
        if (_garde.sortieOk) { _garde.sortieOk = false; return; }
        if (!_garde.active) { _profondeur = Math.max(0, _profondeur - (_saut || 1)); _saut = 0; }
        // On a quitté l'étape « garde » : modifications non enregistrées ?
        if (_garde.active && history.state?.garde !== 1) {
            if (_garde.estModifie && _garde.estModifie()) {
                history.pushState({ garde: 1 }, '');
                if (await confirmer('Quitter sans enregistrer ?', 'Tes modifications de cet ouvrage seront perdues.', 'Quitter', true)) {
                    apresFeuille(() => { _garde.active = false; _garde.sortieOk = true; if (_profondeur > 0) _profondeur--; history.go(-2); });
                }
            } else {
                _garde.active = false;
                if (_profondeur > 0) _profondeur--;
                history.back();
            }
        }
    });
    window.addEventListener('hashchange', () => { _navInterne = false; rendre(); });

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
