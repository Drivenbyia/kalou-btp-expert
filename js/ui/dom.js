// Petits outils d'interface : icônes, toast, feuille du bas, partage, confirmation.

import { esc } from '../core/format.js';

export const ICONES = {
    back:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    chev:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    down:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    share:   '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
    plus:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    search:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    more:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
    calc:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01"/></svg>',
    maison:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    chantier:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5V2.5h6v1"/><path d="M8.5 9.5l1.5 1.5 3-3M8.5 15.5l1.5 1.5 3-3M15 10h1M15 16h1"/></svg>',
    reglages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
};

// ─── Toast ──────────────────────────────────────────────────────────────────
let _t;
export function toast(msg, err = false) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('err', !!err);
    el.classList.add('show');
    clearTimeout(_t);
    _t = setTimeout(() => el.classList.remove('show'), 2600);
}

// ─── Feuille du bas ─────────────────────────────────────────────────────────
let _sheet = null;
export function fermerFeuille() {
    if (_sheet) { _sheet.remove(); _sheet = null; }
}
/**
 * Ouvre une feuille modale en bas de l'écran.
 * @param {string} html  contenu
 * @param {(root:HTMLElement)=>void} bind  branchement des événements
 */
export function ouvrirFeuille(html, bind) {
    fermerFeuille();
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) fermerFeuille(); });
    document.body.appendChild(bg);
    _sheet = bg;
    if (bind) bind(bg.querySelector('.sheet'));
    return bg;
}
export const feuilleOuverte = () => !!_sheet;

/** Confirmation simple dans une feuille. */
export function confirmer(titre, texte, libelleOk = 'Confirmer', danger = false) {
    return new Promise(resolve => {
        let fini = false;
        ouvrirFeuille(`
            <h2>${esc(titre)}</h2>
            <p class="hint" style="margin:6px 0 16px;color:var(--muted)">${esc(texte)}</p>
            <div class="row">
                <button class="btn btn-light" data-r="0">Annuler</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(libelleOk)}</button>
            </div>`, root => {
            root.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
                fini = true; fermerFeuille(); resolve(b.dataset.r === '1');
            }));
        });
        // Fermeture par le fond = annuler
        const obs = new MutationObserver(() => { if (!feuilleOuverte() && !fini) { fini = true; obs.disconnect(); resolve(false); } });
        obs.observe(document.body, { childList: true });
    });
}

/** Demande un texte (nom de chantier…). */
export function demanderTexte(titre, valeur = '', placeholder = '', libelleOk = 'Valider') {
    return new Promise(resolve => {
        let fini = false;
        ouvrirFeuille(`
            <h2>${esc(titre)}</h2>
            <input class="txt" style="margin:12px 0 14px" id="sheet-txt" value="${esc(valeur)}" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="done">
            <div class="row">
                <button class="btn btn-light" data-r="0">Annuler</button>
                <button class="btn btn-primary" data-r="1">${esc(libelleOk)}</button>
            </div>`, root => {
            const inp = root.querySelector('#sheet-txt');
            setTimeout(() => inp.focus(), 50);
            const ok = () => { fini = true; const v = inp.value.trim(); fermerFeuille(); resolve(v || null); };
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
            root.querySelector('[data-r="1"]').addEventListener('click', ok);
            root.querySelector('[data-r="0"]').addEventListener('click', () => { fini = true; fermerFeuille(); resolve(null); });
        });
        const obs = new MutationObserver(() => { if (!feuilleOuverte() && !fini) { fini = true; obs.disconnect(); resolve(null); } });
        obs.observe(document.body, { childList: true });
    });
}

// ─── Partage (SMS, WhatsApp, mail…) ─────────────────────────────────────────
export async function partager(titre, texte) {
    if (navigator.share) {
        try { await navigator.share({ title: titre, text: texte }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
        await navigator.clipboard.writeText(texte);
        toast('Copié : colle-le dans un SMS ou WhatsApp');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = texte; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('Copié !'); } catch { toast('Impossible de copier', true); }
        ta.remove();
    }
}

export function dateCourte(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const auj = new Date();
    if (d.toDateString() === auj.toDateString()) return 'aujourd\'hui';
    const hier = new Date(auj); hier.setDate(auj.getDate() - 1);
    if (d.toDateString() === hier.toDateString()) return 'hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === auj.getFullYear() ? undefined : 'numeric' });
}
