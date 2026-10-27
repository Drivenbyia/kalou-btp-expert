// Écran « Chantiers » : liste des chantiers, détail (ouvrages + liste de courses).

import { esc } from '../core/format.js';
import { OUVRAGES_PAR_ID, calculer } from '../calc/ouvrages.js';
import { calculerMaison } from '../calc/maison.js';
import {
    listeChantiers, getChantier, creerChantier, majChantier, supprimerChantier, supprimerItem, ctxCalcul,
    restaurerItem, restaurerChantier, ajouterItem, ajouterLibre, supprimerLibre, derniereSauvegarde
} from '../core/store.js';
import { quantiteAchat, affichage, MATERIAUX } from '../calc/materiaux.js';
import { ICONES, toast, partager, confirmer, demanderTexte, ouvrirFeuille, fermerFeuille, apresFeuille, dateCourte } from '../ui/dom.js';
import { htmlKpis, htmlLignes, htmlCout, consolider, parCategorie, htmlLigne, texteListe } from '../ui/resultats.js';
import { aller, entete } from '../app.js';
import { barreActions } from './commun.js';

// ─── Liste ──────────────────────────────────────────────────────────────────

export function vueChantiers(root) {
    entete({ titre: 'Mes chantiers' });
    const liste = listeChantiers();
    const dS = derniereSauvegarde();
    const rappel = liste.length && (!dS || Date.now() - dS > 30 * 864e5);
    root.innerHTML = `
        ${rappel ? `<button class="banner" id="rappel" style="width:100%;text-align:left">💾 <span><b>Pense à sauvegarder tes chantiers</b>${dS ? 'Dernière copie il y a plus d\'un mois.' : 'Aucune copie pour l\'instant : si le téléphone casse, tout est perdu.'} Touche ici.</span></button>` : ''}
        <p class="section-title">Mes chantiers</p>
        ${liste.length ? liste.map(c => `
            <button class="card ch-card" data-id="${esc(c.id)}">
                <span class="av">📋</span>
                <span class="tx"><b>${esc(c.nom)}</b><small>${c.items.length} ouvrage${c.items.length > 1 ? 's' : ''} · modifié ${esc(dateCourte(c.maj))}</small></span>
                <span class="chev">${ICONES.chev}</span>
            </button>`).join('') : `
            <div class="card" style="text-align:center;padding:28px 18px">
                <div style="font-size:44px">📋</div>
                <h2 style="margin:8px 0 6px">Aucun chantier pour l'instant</h2>
                <p class="hint">Un chantier regroupe plusieurs calculs (dalle, murs, enduit…) et fait la liste de courses complète à envoyer au négociant.</p>
            </div>`}`;
    root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => aller(`#/chantier/${b.dataset.id}`)));
    const rp = root.querySelector('#rappel');
    if (rp) rp.addEventListener('click', () => aller('#/reglages'));

    const bar = barreActions(`<button class="btn btn-primary" data-act="nouveau">${ICONES.plus}<span>Nouveau chantier</span></button>`);
    bar.addEventListener('click', async e => {
        if (!e.target.closest('[data-act]')) return;
        const nom = await demanderTexte('Nom du chantier', '', 'ex : Terrasse chez Michel', 'Créer');
        if (!nom) return;
        const c = creerChantier(nom);
        aller(`#/chantier/${c.id}`);
    });
}

// ─── Calcul d'un ouvrage enregistré ─────────────────────────────────────────

/** Recalcule un ouvrage avec les formules actuelles (ou garde les anciennes lignes). */
export function calculerItem(item, ctx) {
    try {
        if (item.ouvrage === 'maison') {
            const r = calculerMaison(item.valeurs, ctx);
            if (!Object.keys(r.erreurs).length) return { r, ic: '🏡', titre: r.titre, resume: r.resume, lignes: r.lignes, h: r.heures, tva: 20 };
        } else if (item.ouvrage && OUVRAGES_PAR_ID[item.ouvrage]) {
            const r = calculer(item.ouvrage, item.valeurs, ctx);
            if (!Object.keys(r.erreurs).length) return { r, ic: OUVRAGES_PAR_ID[item.ouvrage].ic, titre: r.titre, resume: r.resume, lignes: r.lignes, h: r.mesure.h };
        }
    } catch (e) { console.error(e); }
    return {
        r: null, ic: '📄', titre: item.titre || 'Ouvrage',
        resume: item.sousTitre ? [{ l: 'Quantité', v: item.sousTitre }] : [],
        lignes: item.lignes || [], h: (item.mesure && item.mesure.h) || 0
    };
}

// ─── Détail ─────────────────────────────────────────────────────────────────

export function vueChantier(root, id, params) {
    const ch = getChantier(id);
    if (!ch) { aller('#/chantiers', { remplacer: true }); return; }
    const ctx = ctxCalcul();
    const onglet = params.vue === 'courses' ? 'courses' : 'ouvrages';

    entete({
        titre: ch.nom,
        sous: `${ch.items.length} ouvrage${ch.items.length > 1 ? 's' : ''}`,
        parent: '#/chantiers',
        action: { html: ICONES.more, onClick: () => menu(ch) }
    });

    const calc = ch.items.map(it => ({ it, ...calculerItem(it, ctx) }));
    const libres = ch.libres || [];
    const toutes = consolider([...calc.flatMap(c => c.lignes), ...libres.map(a => ({ l: a.l, q: a.q, u: a.u }))]);
    const heures = calc.reduce((s, c) => s + (c.h || 0), 0);
    const tva = calc.some(c => c.tva === 20) && calc.every(c => c.tva === 20) ? 20 : null;

    root.innerHTML = `
        <div class="tabs2" role="tablist">
            <button data-onglet="ouvrages" class="${onglet === 'ouvrages' ? 'on' : ''}">Ouvrages (${ch.items.length})</button>
            <button data-onglet="courses" class="${onglet === 'courses' ? 'on' : ''}">Liste de courses</button>
        </div>
        <div id="contenu"></div>`;
    const contenu = root.querySelector('#contenu');

    root.querySelectorAll('[data-onglet]').forEach(b => b.addEventListener('click', () => {
        aller(`#/chantier/${ch.id}${b.dataset.onglet === 'courses' ? '?vue=courses' : ''}`, { remplacer: true });
    }));

    if (onglet === 'ouvrages') {
        contenu.innerHTML = `
            ${calc.length ? calc.map(c => `
                <details class="card item" data-item="${esc(c.it.id)}">
                    <summary><span class="ic">${c.ic}</span><span class="tx"><b>${esc(c.titre)}</b><small>${esc(c.resume.slice(0, 2).map(k => `${k.l} ${k.v}`).join(' · ') || dateCourte(c.it.date))}</small></span><span class="chev">${ICONES.down}</span></summary>
                    <div class="body">
                        ${htmlKpis(c.resume)}
                        ${htmlLignes(c.lignes, ctx)}
                        ${!c.r ? '<p class="hint" style="font-size:13px;margin-top:8px;color:var(--muted)">Ancien calcul récupéré : il n\'est plus modifiable, mais ses quantités comptent dans la liste.</p>' : ''}
                        <div class="acts">
                            ${c.r ? `<button class="btn btn-ghost btn-sm" data-modif="${esc(c.it.id)}">Modifier</button>` : ''}
                            ${c.r ? `<button class="btn btn-light btn-sm" data-dup="${esc(c.it.id)}">Dupliquer</button>` : ''}
                            <button class="btn btn-danger btn-sm" data-suppr="${esc(c.it.id)}">Retirer</button>
                        </div>
                    </div>
                </details>`).join('') : `
                <div class="card" style="text-align:center;padding:24px 18px">
                    <div style="font-size:40px">🧱</div>
                    <h2 style="margin:8px 0 6px">Chantier vide</h2>
                    <p class="hint">Ajoute les ouvrages (dalle, murs, enduit…) : les quantités s'additionnent dans la liste de courses.</p>
                </div>`}
            <div class="row" style="margin-top:12px">
                <button class="btn btn-light" data-go="#/maison?ch=${esc(ch.id)}">🏡 Maison neuve</button>
            </div>
            ${htmlCout(toutes, heures, ctx, tva)}
            <p class="section-title">Notes</p>
            <div class="card f"><textarea id="notes" placeholder="Adresse, téléphone du client, accès, à ne pas oublier…">${esc(ch.notes || '')}</textarea></div>`;

        contenu.querySelectorAll('[data-modif]').forEach(b => b.addEventListener('click', () => {
            const it = ch.items.find(x => x.id === b.dataset.modif);
            if (!it) return;
            aller(it.ouvrage === 'maison' ? `#/maison?ch=${ch.id}&item=${it.id}` : `#/calc/${it.ouvrage}?ch=${ch.id}&item=${it.id}`);
        }));
        contenu.querySelectorAll('[data-suppr]').forEach(b => b.addEventListener('click', async () => {
            const idx = ch.items.findIndex(x => x.id === b.dataset.suppr);
            if (idx < 0) return;
            const it = ch.items[idx];
            supprimerItem(ch.id, it.id);
            aller(`#/chantier/${ch.id}`, { remplacer: true });
            toast('Ouvrage retiré', { action: 'Annuler', onAction: () => {
                restaurerItem(ch.id, it, idx);
                aller(`#/chantier/${ch.id}`, { remplacer: true });
            } });
        }));
        contenu.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => aller(b.dataset.go)));
        contenu.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => {
            const it = ch.items.find(x => x.id === b.dataset.dup);
            if (!it) return;
            const { id, date, ...copie } = it;
            ajouterItem(ch.id, JSON.parse(JSON.stringify(copie)));
            aller(`#/chantier/${ch.id}`, { remplacer: true });
            toast('Ouvrage dupliqué : touche « Modifier » pour l\'ajuster');
        }));
        let tNotes;
        contenu.querySelector('#notes').addEventListener('input', e => {
            clearTimeout(tNotes);
            const val = e.target.value;
            tNotes = setTimeout(() => majChantier(ch.id, c => { c.notes = val; }), 400);
        });

        const bar = barreActions(`<button class="btn btn-primary" data-act="ajout">${ICONES.plus}<span>Ajouter un ouvrage</span></button>`);
        bar.addEventListener('click', e => { if (e.target.closest('[data-act]')) aller(`#/?ch=${ch.id}`); });
        return;
    }

    // ── Liste de courses ──
    // achete[cle] = quantité achetée (en unités d'achat). Si la quantité nécessaire
    // augmente ensuite (nouvel ouvrage), la ligne se décoche et affiche le reste à prendre.
    const achete = ch.achete || {};
    const qAchat = li => (li.k && MATERIAUX[li.k]) ? quantiteAchat(li.k, li.q, ctx) : Math.round(li.q * 100) / 100;
    const estFait = li => {
        const a = achete[li.cle];
        if (a === true) return true;
        return typeof a === 'number' && qAchat(li) <= a + 1e-9;
    };
    const resteTxt = li => {
        const a = achete[li.cle];
        if (typeof a !== 'number' || estFait(li)) return '';
        if (li.k && MATERIAUX[li.k]) {
            const unite = affichage(li.k, li.q, ctx).u;
            return `Déjà pris ${String(a).replace('.', ',')} ${unite}, reste ${String(Math.round((qAchat(li) - a) * 100) / 100).replace('.', ',')} à prendre`;
        }
        return `Déjà pris ${String(a).replace('.', ',')}, reste ${String(Math.round((qAchat(li) - a) * 100) / 100).replace('.', ',')}`;
    };
    const dessiner = () => {
        const fait = toutes.filter(estFait).length;
        contenu.innerHTML = toutes.length ? `
            <div class="card">
                <div class="res-head"><h2>À commander</h2><small style="color:var(--muted);font-weight:700">${fait} / ${toutes.length} ✔</small></div>
                <div class="progress"><i style="width:${Math.round(fait / toutes.length * 100)}%"></i></div>
                <p class="hint" style="margin:6px 0 4px;font-size:13.5px;color:var(--muted)">Touche une ligne pour la cocher quand c'est acheté.</p>
                ${parCategorie(toutes).map(g => `<p class="cat-title">${esc(g.l)}</p><ul class="lines">${g.lignes.map(li => htmlLigne(li, ctx, { check: true, cle: li.cle, done: estFait(li), reste: resteTxt(li) })).join('')}</ul>`).join('')}
            </div>
            <button class="btn btn-ghost btn-block" id="ajout-libre" style="margin-top:12px">${ICONES.plus}<span>Ajouter un article à la main</span></button>
            ${libres.length ? `<p class="section-title">Ajoutés à la main</p><div class="card">${libres.map(a => `
                <div class="set-row"><div class="tx"><b>${esc(a.l)}</b><small>${esc(String(a.q).replace('.', ','))} ${esc(a.u)}</small></div>
                <button class="btn btn-danger btn-sm" data-suppr-libre="${esc(a.id)}" aria-label="Retirer">✕</button></div>`).join('')}</div>` : ''}
            ${fait ? '<button class="btn btn-light btn-block" id="decocher" style="margin-top:12px">Tout décocher</button>' : ''}
            ${htmlCout(toutes, heures, ctx, tva)}` : `
            <div class="card" style="text-align:center;padding:24px 18px">
                <div style="font-size:40px">🛒</div>
                <h2 style="margin:8px 0 6px">Liste vide</h2>
                <p class="hint">Ajoute des ouvrages au chantier : leurs matériaux arrivent ici, additionnés.</p>
            </div>
            <button class="btn btn-ghost btn-block" id="ajout-libre" style="margin-top:12px">${ICONES.plus}<span>Ajouter un article à la main</span></button>`;
        contenu.querySelector('#ajout-libre').addEventListener('click', () => ajouterArticle(ch));
        contenu.querySelectorAll('[data-suppr-libre]').forEach(b => b.addEventListener('click', e => {
            e.stopPropagation();
            supprimerLibre(ch.id, b.dataset.supprLibre);
            aller(`#/chantier/${ch.id}?vue=courses`, { remplacer: true });
        }));
        const dec = contenu.querySelector('#decocher');
        if (dec) dec.addEventListener('click', () => {
            Object.keys(achete).forEach(k => delete achete[k]);
            majChantier(ch.id, c => { c.achete = {}; });
            dessiner();
        });
    };
    contenu.addEventListener('click', e => {
        const l = e.target.closest('[data-check]');
        if (!l) return;
        const cle = l.dataset.check;
        const li = toutes.find(x => x.cle === cle);
        if (li && estFait(li)) delete achete[cle]; else if (li) achete[cle] = qAchat(li);
        majChantier(ch.id, c => { c.achete = { ...achete }; });
        dessiner();
    });
    dessiner();

    const bar = barreActions(`<button class="btn btn-primary" data-act="partager">${ICONES.share}<span>Envoyer la liste</span></button>`);
    bar.addEventListener('click', e => {
        if (!e.target.closest('[data-act]')) return;
        envoyerListe(ch, toutes, l => !estFait(l), ctx);
    });
}

// ─── Article ajouté à la main ───────────────────────────────────────────────

const UNITES_LIBRES = ['pcs', 'sacs', 'T', 'm', 'm²', 'm³', 'L', 'jour'];

function ajouterArticle(ch) {
    let unite = 'pcs';
    ouvrirFeuille(`
        <h2>Ajouter un article</h2>
        <p style="color:var(--muted);font-size:15px;margin-bottom:10px">Ex : location bétonnière, colle, vis… Il s'ajoute à la liste de courses.</p>
        <div class="f" style="margin-bottom:12px"><label for="lib-nom">Article</label><input class="txt" id="lib-nom" placeholder="ex : Location bétonnière" autocomplete="off"></div>
        <div class="f" style="margin-bottom:12px"><label for="lib-q">Quantité</label><div class="inp"><input id="lib-q" inputmode="decimal" placeholder=""></div></div>
        <span class="lab" style="font-weight:700;display:block;margin-bottom:8px">Unité</span>
        <div class="seg" id="lib-u">${UNITES_LIBRES.map(u => `<button type="button" data-u="${u}" class="${u === unite ? 'on' : ''}">${u}</button>`).join('')}</div>
        <div class="row" style="margin-top:16px"><button class="btn btn-light" data-r="0">Annuler</button><button class="btn btn-primary" data-r="1">Ajouter</button></div>
    `, root => {
        setTimeout(() => root.querySelector('#lib-nom').focus(), 60);
        root.querySelector('#lib-u').addEventListener('click', e => {
            const b = e.target.closest('[data-u]');
            if (!b) return;
            unite = b.dataset.u;
            root.querySelectorAll('#lib-u button').forEach(x => x.classList.toggle('on', x === b));
        });
        root.querySelector('[data-r="0"]').addEventListener('click', () => fermerFeuille());
        root.querySelector('[data-r="1"]').addEventListener('click', () => {
            const nom = root.querySelector('#lib-nom').value.trim();
            const qv = Number(String(root.querySelector('#lib-q').value).replace(',', '.').replace(/\s/g, ''));
            if (!nom) { toast('Écris le nom de l\'article', true); return; }
            if (!(qv > 0)) { toast('Mets une quantité', true); return; }
            ajouterLibre(ch.id, { l: nom, q: qv, u: unite });
            fermerFeuille();
            aller(`#/chantier/${ch.id}?vue=courses`, { remplacer: true });
            toast('Article ajouté');
        });
    });
}

// ─── Envoi de la liste : tout, ou seulement ce qui reste ─────────────────────

function envoyerListe(ch, toutes, pasFait, ctx) {
    if (!toutes.length) { toast('La liste est vide', true); return; }
    const titre = `🧱 Commande — ${ch.nom}`;
    const reste = toutes.filter(pasFait);
    const tout = () => partager(`Commande — ${ch.nom}`, texteListe(titre, toutes, ctx));
    if (reste.length === toutes.length || reste.length === 0) { tout(); return; }
    ouvrirFeuille(`
        <h2>Envoyer la liste</h2>
        <p style="color:var(--muted);font-size:15px">${toutes.length - reste.length} article(s) déjà coché(s).</p>
        <button class="opt" data-e="reste"><span style="font-size:22px">🛒</span><span><b>Seulement ce qui reste (${reste.length})</b><small>Pour la prochaine commande</small></span></button>
        <button class="opt" data-e="tout"><span style="font-size:22px">📋</span><span><b>Toute la liste (${toutes.length})</b><small>Commande complète du chantier</small></span></button>
    `, root => {
        root.querySelector('[data-e="reste"]').addEventListener('click', () => {
            fermerFeuille();
            apresFeuille(() => partager(`Commande — ${ch.nom}`, texteListe(titre, reste, ctx, { sousTitre: '(articles pas encore achetés)' })));
        });
        root.querySelector('[data-e="tout"]').addEventListener('click', () => { fermerFeuille(); apresFeuille(tout); });
    });
}

// ─── Menu « ⋯ » du chantier ─────────────────────────────────────────────────

function menu(ch) {
    ouvrirFeuille(`
        <h2>${esc(ch.nom)}</h2>
        <button class="opt" data-m="renommer"><span style="font-size:22px">✏️</span><span><b>Renommer</b></span></button>
        <button class="opt" data-m="partager"><span style="font-size:22px">📤</span><span><b>Envoyer la liste de courses</b><small>SMS, WhatsApp, mail…</small></span></button>
        <button class="opt" data-m="imprimer"><span style="font-size:22px">🖨️</span><span><b>Imprimer / PDF</b></span></button>
        <button class="opt" data-m="supprimer" style="border-color:#F5C2C2"><span style="font-size:22px">🗑️</span><span><b style="color:var(--danger)">Supprimer le chantier</b></span></button>
    `, root => {
        root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', async () => {
            const m = b.dataset.m;
            fermerFeuille();
            if (m === 'renommer') {
                const nom = await demanderTexte('Renommer le chantier', ch.nom, '', 'Renommer');
                if (nom) { majChantier(ch.id, c => { c.nom = nom; }); aller(location.hash, { remplacer: true }); }
            } else if (m === 'partager') {
                const ctx = ctxCalcul();
                const toutes = consolider([...ch.items.flatMap(it => calculerItem(it, ctx).lignes), ...(ch.libres || []).map(a => ({ l: a.l, q: a.q, u: a.u }))]);
                const a = ch.achete || {};
                apresFeuille(() => envoyerListe(ch, toutes, li => {
                    const x = a[li.cle];
                    if (x === true) return false;
                    const q = li.k && MATERIAUX[li.k] ? quantiteAchat(li.k, li.q, ctx) : li.q;
                    return !(typeof x === 'number' && q <= x + 1e-9);
                }, ctx));
            } else if (m === 'imprimer') {
                aller(`#/chantier/${ch.id}?vue=courses`, { remplacer: true });
                setTimeout(() => window.print(), 300);
            } else if (m === 'supprimer') {
                if (await confirmer('Supprimer ce chantier ?', `« ${ch.nom} » et ses ${ch.items.length} ouvrage(s) seront effacés.`, 'Supprimer', true)) {
                    const copie = getChantier(ch.id);
                    supprimerChantier(ch.id);
                    aller('#/chantiers', { remplacer: true });
                    toast('Chantier supprimé', { action: 'Annuler', onAction: () => { restaurerChantier(copie); aller('#/chantiers', { remplacer: true }); } });
                }
            }
        }));
    });
}

