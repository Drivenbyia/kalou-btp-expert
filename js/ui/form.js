// Rendu des champs de saisie (calculateurs + maison) et branchement des événements.
// Les valeurs sont gardées telles que saisies (texte) puis validées par le moteur.

import { esc } from '../core/format.js';
import { champVisible, lireNombre } from '../calc/ouvrages.js';

/** Valeurs « vues » par les conditions d'affichage (types corrects pour si()). */
function vuesPour(champs, valeurs) {
    const v = { ...valeurs };
    champs.forEach(ch => {
        if (ch.type === 'oui') v[ch.id] = valeurs[ch.id] === true || valeurs[ch.id] === 'true';
    });
    return v;
}

const demiPossible = ch => ch.demi && !(ch.aide && ch.aide.length > 38);

export function htmlChamp(ch, valeurs, vues, demiForce) {
    const val = valeurs[ch.id];
    const label = ch.labelSi ? ch.labelSi(vues) : ch.l;
    // Une aide longue ne tient pas en demi-largeur : le champ passe en pleine largeur
    const demi = demiForce ?? demiPossible(ch);
    const cls = `f${demi ? ' demi' : ''}`;
    const aide = ch.aide ? `<p class="aide">${esc(ch.aide)}</p>` : '';
    if (ch.type === 'num') {
        return `<div class="${cls}" data-f="${ch.id}">
            <label for="in-${ch.id}">${esc(label)}</label>
            <div class="inp">
                <input id="in-${ch.id}" data-id="${ch.id}" type="text" inputmode="decimal" autocomplete="off"
                       enterkeyhint="next" value="${esc(val ?? '')}" placeholder="">
                ${ch.u ? `<span class="u">${esc(ch.u)}</span>` : ''}
            </div>
            <p class="err"></p><p class="warn"></p>${aide}
        </div>`;
    }
    if (ch.type === 'texte') {
        return `<div class="${cls}" data-f="${ch.id}">
            <label for="in-${ch.id}">${esc(label)}</label>
            <div class="inp"><input id="in-${ch.id}" data-id="${ch.id}" type="text" autocomplete="off" maxlength="40"
                enterkeyhint="next" value="${esc(val ?? '')}" placeholder="${esc(ch.ph || '')}"></div>${aide}
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
    if (ch.type === 'liste') return htmlListe(ch, Array.isArray(val) ? val : []);
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

const txtNb = x => (typeof x === 'number' ? String(x).replace('.', ',') : String(x ?? ''));

/** Valeur par défaut d'une colonne pour un type de ligne. */
export const defColonne = (ch, col, t) => {
    const d = ch.types[t] && ch.types[t].def;
    return d && d[col.id] !== undefined ? d[col.id] : col.def;
};

/** Nouvelle ligne d'une liste (valeurs par défaut du type). */
export function nouvelleLigne(ch, t) {
    const r = { t };
    ch.cols.forEach(col => { r[col.id] = txtNb(defColonne(ch, col, t)); });
    return r;
}

/**
 * Liste de lignes (une par appareil, par pièce…) : type au choix + quelques cases.
 * Chaque ligne a ses propres mesures (ex. sa distance au tableau).
 */
function htmlListe(ch, rows) {
    const types = Object.entries(ch.types);
    const vu = {};
    return `<div class="f liste-titre" data-f="${ch.id}"><span class="lab">${esc(ch.l)}</span>
            ${ch.aide ? `<p class="aide">${esc(ch.aide)}</p>` : ''}<p class="err"></p></div>
        ${rows.map((r, i) => {
            const t = ch.types[r.t] ? r.t : types[0][0];
            vu[t] = (vu[t] || 0) + 1;
            const nb = rows.filter(x => x.t === t).length;
            const nom = ch.types[t].l + (nb > 1 ? ` ${vu[t]}` : '');
            const cols = ch.cols.filter(col => !col.si || col.si(t));
            return `<div class="f liste-ligne" data-f="${ch.id}-${i}" data-liste="${ch.id}" data-li="${i}">
                <div class="ll-haut">
                    <div class="inp sel"><select data-lt aria-label="Type">${types.map(([k, o]) =>
                        `<option value="${esc(k)}"${k === t ? ' selected' : ''}>${esc(o.l)}${k === t && nb > 1 ? ` ${vu[t]}` : ''}</option>`).join('')}</select></div>
                    <button type="button" class="men-suppr" data-lsuppr aria-label="Retirer ${esc(nom)}">✕</button>
                </div>
                <div class="ll-cols" style="--n:${Math.min(4, cols.length)}">${cols.map(col => `<div>
                    <span class="men-lab">${esc(col.l)}</span>
                    ${col.options
                        ? `<div class="inp sel"><select data-col="${col.id}">${col.options.map(o => `<option value="${esc(o.v)}"${String(r[col.id]) === o.v ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>`
                        : `<div class="inp"><input data-col="${col.id}" inputmode="decimal" autocomplete="off" enterkeyhint="next" value="${esc(txtNb(r[col.id]))}" aria-label="${esc(nom + ' : ' + col.l)}">${col.u ? `<span class="u">${esc(col.u)}</span>` : ''}</div>`}
                </div>`).join('')}</div>
                <p class="err"></p>
            </div>`;
        }).join('')}
        <div class="f"><button type="button" class="btn btn-ghost btn-block btn-sm" data-lajout="${ch.id}">＋ ${esc(ch.ajout || 'Ajouter une ligne')}</button></div>`;
}

export function htmlChamps(champs, valeurs) {
    const vues = vuesPour(champs, valeurs);
    const visibles = champs.filter(ch => champVisible(ch, vues));
    // Les demi-largeurs vont par deux ; une case restée seule passe en pleine largeur
    const demi = visibles.map(demiPossible);
    for (let i = 0; i < demi.length; i++) {
        if (!demi[i]) continue;
        if (demi[i + 1]) { i++; continue; }
        demi[i] = false;
    }
    return visibles.map((ch, i) => htmlChamp(ch, valeurs, vues, demi[i])).join('');
}

/**
 * Branche un conteneur de formulaire.
 * @param {HTMLElement} root
 * @param {object} valeurs   objet muté en place
 * @param {object} cb        { onInput: () => void (saisie numérique), onStruct: () => void (choix → re-rendu),
 *                             champs: définition des champs (nécessaire pour les listes) }
 */
export function brancherForm(root, valeurs, { onInput, onStruct, champs }) {
    const listeDe = el => {
        const row = el.closest('[data-liste]');
        return row ? { row, rows: valeurs[row.dataset.liste], i: +row.dataset.li } : null;
    };
    const defListe = id => (champs || []).find(ch => ch.id === id);
    root.addEventListener('input', e => {
        if (e.target.tagName === 'INPUT' && e.target.dataset.col) {
            const l = listeDe(e.target);
            if (l && l.rows[l.i]) { l.rows[l.i][e.target.dataset.col] = e.target.value; onInput && onInput(l.row.dataset.liste); }
            return;
        }
        const id = e.target.dataset && e.target.dataset.id;
        if (!id) return;
        valeurs[id] = e.target.value;
        onInput && onInput(id);
    });
    root.addEventListener('change', e => {
        if (e.target.tagName !== 'SELECT') return;
        const l = listeDe(e.target);
        if (!l || !l.rows[l.i]) return;
        const r = l.rows[l.i];
        if (e.target.dataset.col) { r[e.target.dataset.col] = e.target.value; onInput && onInput(l.row.dataset.liste); return; }
        // Nouveau type : les cases restées aux valeurs par défaut prennent celles du nouveau type
        const ch = defListe(l.row.dataset.liste);
        const ancien = r.t;
        r.t = e.target.value;
        if (ch) ch.cols.forEach(col => {
            const avant = defColonne(ch, col, ancien), apres = defColonne(ch, col, r.t);
            const cur = col.options ? String(r[col.id]) : lireNombre(r[col.id]);
            if (r[col.id] === undefined || String(cur) === String(avant) || (col.si && !col.si(ancien))) r[col.id] = txtNb(apres);
        });
        onStruct && onStruct();
    });
    root.addEventListener('focusin', e => {
        if (e.target.tagName === 'INPUT' && (e.target.dataset.id || e.target.dataset.col)) setTimeout(() => { try { e.target.select(); } catch { /* */ } }, 0);
    });
    root.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !e.target.dataset || !(e.target.dataset.id || e.target.dataset.col)) return;
        e.preventDefault();
        const inputs = Array.from(root.querySelectorAll('input[data-id],input[data-col]'));
        const i = inputs.indexOf(e.target);
        if (i >= 0 && i < inputs.length - 1) inputs[i + 1].focus();
        else e.target.blur();
    });
    root.addEventListener('click', e => {
        const sup = e.target.closest('[data-lsuppr]');
        if (sup) {
            const l = listeDe(sup);
            if (l) { l.rows.splice(l.i, 1); onStruct && onStruct(); }
            return;
        }
        const aj = e.target.closest('[data-lajout]');
        if (aj) {
            const id = aj.dataset.lajout, ch = defListe(id);
            if (!ch) return;
            if (!Array.isArray(valeurs[id])) valeurs[id] = [];
            const rows = valeurs[id];
            rows.push(nouvelleLigne(ch, ch.nouveau || (rows.length ? rows[rows.length - 1].t : Object.keys(ch.types)[0])));
            onStruct && onStruct();
            const der = root.querySelector(`[data-liste="${id}"][data-li="${rows.length - 1}"]`);
            if (der) { der.scrollIntoView({ block: 'center' }); der.querySelector('select')?.focus(); }
            return;
        }
        const b = e.target.closest('[data-choix],[data-oui]');
        if (!b || !root.contains(b)) return;
        if (b.dataset.choix) valeurs[b.dataset.choix] = b.dataset.v;
        else valeurs[b.dataset.oui] = !(valeurs[b.dataset.oui] === true || valeurs[b.dataset.oui] === 'true');
        onStruct && onStruct();
    });
}

/** Affiche les erreurs (rouge, bloquant) et les alertes (orange, non bloquant) sous les champs. */
export function afficherErreurs(root, erreurs = {}, alertes = {}) {
    root.querySelectorAll('.f[data-f]').forEach(f => {
        const msg = erreurs[f.dataset.f];
        const al = !msg && alertes[f.dataset.f];
        f.classList.toggle('ko', !!msg);
        f.classList.toggle('alerte', !!al);
        const p = f.querySelector('.err');
        if (p) p.textContent = msg || '';
        const w = f.querySelector('.warn');
        if (w) w.textContent = al || '';
    });
}
