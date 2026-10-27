// Écran « Calculs » : liste des ouvrages + calculateur en direct.

import { esc } from '../core/format.js';
import { OUVRAGES, OUV_CATS, OUVRAGES_PAR_ID, calculer, valeursDefaut } from '../calc/ouvrages.js';
import { getSaisie, setSaisie, getChantier, ajouterItem, remplacerItem, ctxCalcul } from '../core/store.js';
import { ICONES, toast, partager } from '../ui/dom.js';
import { htmlChamps, brancherForm, afficherErreurs } from '../ui/form.js';
import { htmlKpis, htmlLignes, htmlRecette, htmlInfos, htmlCout, texteListe } from '../ui/resultats.js';
import { aller, entete, retourVers, garderSortie, armerGarde } from '../app.js';
import { choisirChantier, barreActions, BTN_PARTAGER } from './commun.js';

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ─── Liste des ouvrages ─────────────────────────────────────────────────────

export function vueListe(root, params) {
    const ch = params.ch ? getChantier(params.ch) : null;
    const suffixe = ch ? `?ch=${encodeURIComponent(ch.id)}` : '';
    if (ch) entete({ titre: 'Ajouter un ouvrage', sous: ch.nom, parent: `#/chantier/${ch.id}` });
    else entete({});

    root.innerHTML = `
        ${ch ? `<div class="banner">➕ <span><b>Ajout au chantier « ${esc(ch.nom)} »</b>Choisis l'ouvrage, règle les dimensions, puis « Ajouter ».</span></div>` : ''}
        <div class="search">${ICONES.search}<input id="q" type="search" placeholder="Chercher : dalle, mur, enduit…" autocomplete="off"></div>
        <div id="liste">
            <p class="section-title">Projet complet</p>
            <button class="hero" data-go="#/maison${suffixe}${ch ? '&via=liste' : ''}">
                <span class="ic">🏡</span>
                <span><b>Maison neuve</b><small>Fondations, murs, charpente, toiture, intérieur : tout d'un coup</small></span>
                <span class="go">${ICONES.chev}</span>
            </button>
            ${OUV_CATS.map(cat => `
                <section data-cat="${cat.id}">
                    <p class="section-title">${esc(cat.l)}</p>
                    <div class="tiles">
                        ${OUVRAGES.filter(o => o.cat === cat.id).map(o => `
                            <button class="tile" data-go="#/calc/${o.id}${suffixe}" data-txt="${esc(norm(o.nom + ' ' + o.desc + ' ' + (o.mots || '')))}">
                                <span class="ic">${o.ic}</span><b>${esc(o.nom)}</b><small>${esc(o.desc)}</small>
                            </button>`).join('')}
                    </div>
                </section>`).join('')}
            <p class="empty-res hidden" id="rien">Aucun ouvrage ne correspond.</p>
        </div>`;

    root.addEventListener('click', e => {
        const b = e.target.closest('[data-go]');
        if (b) aller(b.dataset.go);
    });
    const q = root.querySelector('#q');
    q.addEventListener('input', () => {
        const t = norm(q.value.trim());
        let total = 0;
        root.querySelectorAll('section[data-cat]').forEach(sec => {
            let n = 0;
            sec.querySelectorAll('.tile').forEach(tl => {
                const ok = !t || tl.dataset.txt.includes(t);
                tl.classList.toggle('hidden', !ok);
                if (ok) n++;
            });
            sec.classList.toggle('hidden', n === 0);
            total += n;
        });
        root.querySelector('.hero').classList.toggle('hidden', !!t && !'maison neuve construction pavillon complete'.includes(t));
        root.querySelectorAll('#liste > .section-title').forEach(s => s.classList.toggle('hidden', !!t));
        root.querySelector('#rien').classList.toggle('hidden', total > 0 || !root.querySelector('.hero').classList.contains('hidden'));
    });
}

// ─── Calculateur ────────────────────────────────────────────────────────────

/** Valeurs à afficher dans les champs (virgule française pour les nombres). */
export function versSaisie(def, v) {
    const out = { ...v };
    def.champs.forEach(ch => {
        if (ch.type === 'num' && typeof out[ch.id] === 'number') out[ch.id] = String(out[ch.id]).replace('.', ',');
    });
    return out;
}

export function vueCalcul(root, id, params) {
    const def = OUVRAGES_PAR_ID[id];
    if (!def) { aller('#/', { remplacer: true }); return; }
    const ch = params.ch ? getChantier(params.ch) : null;
    const item = ch && params.item ? ch.items.find(x => x.id === params.item) : null;
    const ctx = ctxCalcul();

    const valeurs = versSaisie(def, { ...valeursDefaut(def), ...(item ? item.valeurs : (getSaisie(id) || {})) });

    entete({
        titre: def.nom,
        sous: ch ? `Chantier : ${ch.nom}` : def.desc,
        parent: ch ? (item ? `#/chantier/${ch.id}` : `#/?ch=${ch.id}`) : '#/'
    });

    root.innerHTML = `
        <div class="card"><div class="form" id="form"></div></div>
        <p class="section-title">Résultat</p>
        <div class="card" id="res" aria-live="polite"></div>
        <button class="btn btn-light btn-block no-print" id="reset" style="margin-top:14px">Remettre les valeurs par défaut</button>`;

    const form = root.querySelector('#form');
    const res = root.querySelector('#res');
    let dernier = null;
    let tSave;

    const dessinerForm = () => { form.innerHTML = htmlChamps(def.champs, valeurs); };
    const calculerEtAfficher = () => {
        const r = calculer(def, valeurs, ctx);
        dernier = r;
        afficherErreurs(form, r.erreurs, r.alertes);
        if (Object.keys(r.erreurs).length) {
            res.innerHTML = `<p class="empty-res">✏️ Complète ou corrige les cases en rouge.</p>`;
            majBarre(false);
            return;
        }
        res.innerHTML = `
            <div class="res-head"><h2>${esc(r.titre)}</h2></div>
            ${Object.keys(r.alertes || {}).length ? '<p class="banner" style="margin:6px 0 10px">⚠️ <span>Vérifie les valeurs signalées en orange.</span></p>' : ''}
            ${htmlKpis(r.resume)}
            <p class="section-title" style="margin:14px 2px 2px">À acheter</p>
            ${htmlLignes(r.lignes, ctx)}
            ${htmlRecette(r.recette)}
            ${htmlCout(r.lignes, r.mesure && r.mesure.h, ctx)}
            ${htmlInfos(r.infos)}`;
        majBarre(true);
        if (!item) { clearTimeout(tSave); tSave = setTimeout(() => setSaisie(id, r.v), 400); }
    };

    const libBouton = item ? 'Enregistrer' : ch ? 'Ajouter au chantier' : 'Ajouter à un chantier';
    const bar = barreActions(`<button class="apercu" data-act="voir-res"><span id="apercu-txt">…</span><small>Voir ↓</small></button>
        <div class="in">${BTN_PARTAGER}<button class="btn btn-primary" data-act="ajouter">${ICONES.plus}<span>${esc(libBouton)}</span></button></div>`);
    bar.classList.add('avec-apercu');
    const btnAjout = bar.querySelector('[data-act="ajouter"]');
    let ajouteA = null;                       // chantier où le calcul actuel vient d'être ajouté
    const majBarre = ok => {
        bar.querySelectorAll('.in button').forEach(b => { b.disabled = !ok; });
        if (ok && dernier) {
            const r = dernier;
            const premier = r.lignes[0];
            const resume = r.resume.slice(0, 2).map(k => k.v);
            bar.querySelector('#apercu-txt').textContent = resume.join(' · ') || (premier ? premier.q : '');
        } else bar.querySelector('#apercu-txt').textContent = 'Complète les cases en rouge';
    };
    const remettreBouton = () => {
        if (!ajouteA) return;
        ajouteA = null;
        btnAjout.classList.remove('fait');
        btnAjout.dataset.act = 'ajouter';
        btnAjout.innerHTML = `${ICONES.plus}<span>${esc(libBouton)}</span>`;
    };

    const enregistrer = cible => {
        const r = dernier;
        const donnees = { ouvrage: def.id, titre: r.titre, valeurs: r.v, lignes: r.lignes, mesure: r.mesure };
        if (item) {
            remplacerItem(cible.id, item.id, donnees);
            toast('Modifications enregistrées');
            retourVers(`#/chantier/${cible.id}`, 1);
        } else if (ch) {
            ajouterItem(cible.id, donnees);
            toast(`Ajouté à « ${cible.nom} »`);
            retourVers(`#/chantier/${cible.id}`, 2);
        } else {
            ajouterItem(cible.id, donnees);
            toast(`Ajouté à « ${cible.nom} »`);
            ajouteA = cible;
            btnAjout.classList.add('fait');
            btnAjout.dataset.act = 'voir-ch';
            btnAjout.innerHTML = `${ICONES.check}<span>Ajouté · voir le chantier</span>`;
        }
    };

    bar.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'voir-res') { res.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (b.dataset.act === 'voir-ch' && ajouteA) { aller(`#/chantier/${ajouteA.id}`); return; }
        if (!dernier || Object.keys(dernier.erreurs).length) return;
        if (b.dataset.act === 'partager') {
            const r = dernier;
            partager(r.titre, texteListe(r.titre, r.lignes, ctx, { cats: false, sousTitre: r.resume.map(k => `${k.l} : ${k.v}`).join(' · ') }));
        } else if (b.dataset.act === 'ajouter') {
            if (ch) enregistrer(ch);
            else choisirChantier(enregistrer);
        }
    });

    // Modification d'un ouvrage enregistré : on prévient avant de perdre les changements
    const depart = JSON.stringify(valeurs);
    if (item) garderSortie(() => JSON.stringify(valeurs) !== depart);
    const apresChangement = () => { remettreBouton(); if (item) armerGarde(); };

    root.querySelector('#reset').addEventListener('click', () => {
        Object.assign(valeurs, versSaisie(def, valeursDefaut(def)));
        dessinerForm(); calculerEtAfficher();
        toast('Valeurs par défaut remises');
    });

    let avant = { ...valeurs };
    brancherForm(form, valeurs, {
        onInput: () => { calculerEtAfficher(); apresChangement(); },
        onStruct: () => {
            if (def.surChoix) def.surChoix(valeurs, avant);
            avant = { ...valeurs };
            dessinerForm(); calculerEtAfficher(); apresChangement();
        }
    });
    dessinerForm();
    calculerEtAfficher();
}
