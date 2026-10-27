// Rendu des champs de saisie (calculateurs + maison) et branchement des événements.
// Les valeurs sont gardées telles que saisies (texte) puis validées par le moteur.

import { esc } from '../core/format.js';
import { champVisible } from '../calc/ouvrages.js';

/** Valeurs « vues » par les conditions d'affichage (types corrects pour si()). */
function vuesPour(champs, valeurs) {
    const v = { ...valeurs };
    champs.forEach(ch => {
        if (ch.type === 'oui') v[ch.id] = valeurs[ch.id] === true || valeurs[ch.id] === 'true';
    });
    return v;
}

export function htmlChamp(ch, valeurs, vues) {
    const val = valeurs[ch.id];
    const label = ch.labelSi ? ch.labelSi(vues) : ch.l;
    const cls = `f${ch.demi ? ' demi' : ''}`;
    const aide = ch.aide ? `<p class="aide">${esc(ch.aide)}</p>` : '';
    if (ch.type === 'num') {
        return `<div class="${cls}" data-f="${ch.id}">
            <label for="in-${ch.id}">${esc(label)}</label>
            <div class="inp">
                <input id="in-${ch.id}" data-id="${ch.id}" type="text" inputmode="decimal" autocomplete="off"
                       enterkeyhint="next" value="${esc(val ?? '')}" placeholder="0">
                ${ch.u ? `<span class="u">${esc(ch.u)}</span>` : ''}
            </div>
            <p class="err"></p>${aide}
        </div>`;
    }
    if (ch.type === 'choix') {
        return `<div class="${cls}" data-f="${ch.id}">
            <span class="lab">${esc(label)}</span>
            <div class="seg" role="radiogroup">
                ${ch.options.map(o => `<button type="button" role="radio" aria-checked="${String(val) === o.v}"
                    class="${String(val) === o.v ? 'on' : ''}" data-choix="${ch.id}" data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('')}
            </div>${aide}
        </div>`;
    }
    if (ch.type === 'oui') {
        const on = val === true || val === 'true';
        return `<div class="${cls}" data-f="${ch.id}">
            <button type="button" role="switch" aria-checked="${on}" class="switch${on ? ' on' : ''}" data-oui="${ch.id}">
                <span>${esc(label)}</span><i></i>
            </button>${aide}
        </div>`;
    }
    return '';
}

export function htmlChamps(champs, valeurs) {
    const vues = vuesPour(champs, valeurs);
    return champs.filter(ch => champVisible(ch, vues)).map(ch => htmlChamp(ch, valeurs, vues)).join('');
}

/**
 * Branche un conteneur de formulaire.
 * @param {HTMLElement} root
 * @param {object} valeurs   objet muté en place
 * @param {object} cb        { onInput: () => void (saisie numérique), onStruct: () => void (choix → re-rendu) }
 */
export function brancherForm(root, valeurs, { onInput, onStruct }) {
    root.addEventListener('input', e => {
        const id = e.target.dataset && e.target.dataset.id;
        if (!id) return;
        valeurs[id] = e.target.value;
        onInput && onInput(id);
    });
    root.addEventListener('focusin', e => {
        if (e.target.tagName === 'INPUT' && e.target.dataset.id) setTimeout(() => { try { e.target.select(); } catch { /* */ } }, 0);
    });
    root.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !e.target.dataset || !e.target.dataset.id) return;
        e.preventDefault();
        const inputs = Array.from(root.querySelectorAll('input[data-id]'));
        const i = inputs.indexOf(e.target);
        if (i >= 0 && i < inputs.length - 1) inputs[i + 1].focus();
        else e.target.blur();
    });
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-choix],[data-oui]');
        if (!b || !root.contains(b)) return;
        if (b.dataset.choix) valeurs[b.dataset.choix] = b.dataset.v;
        else valeurs[b.dataset.oui] = !(valeurs[b.dataset.oui] === true || valeurs[b.dataset.oui] === 'true');
        onStruct && onStruct();
    });
}

/** Affiche les erreurs de validation sous les champs concernés. */
export function afficherErreurs(root, erreurs = {}) {
    root.querySelectorAll('.f[data-f]').forEach(f => {
        const msg = erreurs[f.dataset.f];
        f.classList.toggle('ko', !!msg);
        const p = f.querySelector('.err');
        if (p) p.textContent = msg || '';
    });
}
