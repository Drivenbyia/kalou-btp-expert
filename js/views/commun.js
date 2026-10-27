// Éléments partagés entre les écrans : choix du chantier, barre d'actions, en-tête.

import { esc } from '../core/format.js';
import { listeChantiers, creerChantier, getChantier } from '../core/store.js';
import { ouvrirFeuille, fermerFeuille, demanderTexte, dateCourte, ICONES } from '../ui/dom.js';

/**
 * Feuille « Ajouter à quel chantier ? ». Appelle onChoix(chantier).
 * @param {string} nomPropose  nom proposé pour un nouveau chantier
 */
export function choisirChantier(onChoix, nomPropose = '') {
    const liste = listeChantiers().slice(0, 8);
    ouvrirFeuille(`
        <h2>Ajouter à un chantier</h2>
        <p style="color:var(--muted);font-size:14.5px">Les quantités s'additionnent dans la liste de courses du chantier.</p>
        <button class="opt" data-new style="border-color:var(--brand);background:var(--brand-soft)">
            <span style="font-size:24px">＋</span><span><b>Nouveau chantier</b><small>Donne-lui un nom (client, lieu…)</small></span>
        </button>
        ${liste.map(c => `<button class="opt" data-id="${esc(c.id)}">
            <span style="font-size:24px">📋</span>
            <span style="flex:1;min-width:0"><b>${esc(c.nom)}</b><small>${c.items.length} ouvrage${c.items.length > 1 ? 's' : ''} · ${esc(dateCourte(c.maj))}</small></span>
        </button>`).join('')}
    `, root => {
        root.querySelector('[data-new]').addEventListener('click', async () => {
            fermerFeuille();
            const nom = await demanderTexte('Nom du chantier', nomPropose, 'ex : Terrasse chez Michel', 'Créer');
            if (!nom) return;
            onChoix(creerChantier(nom));
        });
        root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
            fermerFeuille();
            onChoix(getChantier(b.dataset.id));
        }));
    });
}

/** Barre d'actions collée en bas (au-dessus du menu). */
export function barreActions(html) {
    const ancien = document.getElementById('actionbar');
    const bar = ancien.cloneNode(false);           // repart sans écouteurs
    ancien.replaceWith(bar);
    if (!html) { bar.classList.add('hidden'); bar.innerHTML = ''; return null; }
    bar.innerHTML = `<div class="in">${html}</div>`;
    bar.classList.remove('hidden');
    return bar;
}

export const BTN_PARTAGER = `<button class="btn btn-light" data-act="partager" aria-label="Partager">${ICONES.share}</button>`;
