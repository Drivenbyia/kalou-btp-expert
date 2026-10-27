// Rendu des résultats : chiffres clés, liste « à acheter », recette, conseils,
// estimation de coût (option) et texte de partage.

import { esc, euros, fmt } from '../core/format.js';
import { affichage, libelle, texteQuantite, MATERIAUX, CATEGORIES } from '../calc/materiaux.js';
import { estimerCout } from '../calc/cout.js';
import { getReglages, getPrix } from '../core/store.js';

export function htmlKpis(resume = []) {
    if (!resume.length) return '';
    return `<div class="kpis">${resume.map(k => `<div class="kpi"><small>${esc(k.l)}</small><b>${esc(k.v)}</b></div>`).join('')}</div>`;
}

/** Une ligne matériau (clé catalogue) ou ancienne ligne libre { l, q, u }. */
export function htmlLigne(li, ctx, opts = {}) {
    let nom, v, u, d;
    if (li.k && MATERIAUX[li.k]) {
        const a = affichage(li.k, li.q, ctx);
        nom = li.l || libelle(li.k, ctx); v = a.v; u = a.u; d = [li.d, a.d].filter(Boolean).join(' · ');
    } else {
        nom = li.l; v = fmt(li.q, Number.isInteger(li.q) ? 0 : 2); u = li.u || ''; d = li.d || '';
    }
    const check = opts.check;
    return `<li class="line${check ? ' check' : ''}${opts.done ? ' done' : ''}" ${check ? `data-check="${esc(opts.cle)}" role="checkbox" aria-checked="${!!opts.done}"` : ''}>
        ${check ? `<span class="box">${opts.done ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</span>` : ''}
        <span class="nm">${esc(nom)}${d && !opts.sansDetail ? `<small>${esc(d)}</small>` : ''}</span>
        <span class="qt"><b>${esc(v)}<em>${esc(u)}</em></b></span>
    </li>`;
}

export function htmlLignes(lignes, ctx) {
    if (!lignes || !lignes.length) return '<p class="empty-res">Rien à acheter pour ces choix.</p>';
    return `<ul class="lines">${lignes.map(li => htmlLigne(li, ctx)).join('')}</ul>`;
}

export function htmlRecette(rec) {
    if (!rec) return '';
    return `<div class="recette"><b>🥣 ${esc(rec.titre)}</b><ul>${rec.lignes.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
}

export function htmlInfos(infos, titre = 'Comment c\'est calculé') {
    if (!infos || !infos.length) return '';
    return `<details class="more"><summary>${esc(titre)}</summary><ul class="infos">${infos.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`;
}

/** Bloc « Si c'était fait par une entreprise » (seulement si l'option est activée). */
export function htmlCout(lignes, heures, ctx, tva = null) {
    const r = getReglages();
    if (!r.estimation) return '';
    const c = estimerCout(lignes, heures, r, getPrix(), ctx, tva);
    return `<div class="cost">
        <h3>💶 Estimation façon entreprise</h3>
        <div class="r"><span>Matériaux (prix négoce)</span><b>${euros(c.mat)}</b></div>
        <div class="r"><span>Main d'œuvre ≈ ${fmt(c.heures)} h${c.heures >= 16 ? ` (${fmt(c.jours, c.jours % 1 ? 1 : 0)} j)` : ''} × ${fmt(r.taux)} €</span><b>${euros(c.mo)}</b></div>
        <div class="r"><span>Prix entreprise HT (matériaux +${fmt(r.margeMat)} %)</span><b>${euros(c.ht)}</b></div>
        <div class="r tot"><span>Prix entreprise TTC (TVA ${fmt(c.tva)} %)</span><b>${euros(c.ttc)}</b></div>
        <p>Ordre de grandeur pour se faire une idée, pas un devis. Prix et taux modifiables dans Réglages.</p>
    </div>`;
}

// ─── Consolidation (liste de courses d'un chantier) ─────────────────────────

/** Additionne des lignes par matériau. Renvoie [{ cle, k?, l?, q, u?, d? }]. */
export function consolider(lignes) {
    const map = new Map();
    lignes.forEach(li => {
        if (!li || !(li.q > 0)) return;
        let cle, base;
        if (li.k && MATERIAUX[li.k]) {
            cle = li.k === 'bpe' ? `bpe|${li.d || ''}` : li.k;
            base = { k: li.k, d: li.k === 'bpe' ? li.d : undefined };
        } else {
            cle = `libre|${li.l}|${li.u || ''}`;
            base = { l: li.l, u: li.u };
        }
        const cur = map.get(cle) || { cle, ...base, q: 0 };
        cur.q += li.q;
        map.set(cle, cur);
    });
    return Array.from(map.values());
}

/** Regroupe des lignes consolidées par catégorie (ordre du catalogue). */
export function parCategorie(lignes) {
    const groupes = CATEGORIES.map(c => ({ ...c, lignes: [] }));
    const autres = { id: 'autres', l: 'Autres (anciennes données)', lignes: [] };
    lignes.forEach(li => {
        const cat = li.k && MATERIAUX[li.k] ? MATERIAUX[li.k].cat : null;
        const g = groupes.find(x => x.id === cat);
        (g || autres).lignes.push(li);
    });
    return [...groupes, autres].filter(g => g.lignes.length);
}

/** Texte prêt à envoyer (SMS / WhatsApp / mail). */
export function texteListe(titre, lignes, ctx, { cats = true, sousTitre = '' } = {}) {
    const ligne = li => li.k && MATERIAUX[li.k]
        ? `• ${li.l || libelle(li.k, ctx)}${li.k === 'bpe' && li.d ? ` (${li.d})` : ''} : ${texteQuantite(li.k, li.q, ctx)}`
        : `• ${li.l} : ${fmt(li.q, Number.isInteger(li.q) ? 0 : 2)} ${li.u || ''}`.trim();
    let t = `${titre}\n`;
    if (sousTitre) t += `${sousTitre}\n`;
    if (cats) {
        parCategorie(lignes).forEach(g => { t += `\n${g.l.toUpperCase()}\n${g.lignes.map(ligne).join('\n')}\n`; });
    } else {
        t += '\n' + lignes.map(ligne).join('\n') + '\n';
    }
    return t.trim() + '\n\n— Kalou BTP';
}
