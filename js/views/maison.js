// Écran « Maison neuve » : formulaire par étapes + résultat lot par lot.

import { esc } from '../core/format.js';
import { ETAPES, MAISON_DEF, calculerMaison, menuiseriesDe, OUVERTURES, NOMS_MENUISERIES } from '../calc/maison.js';
import { valeursDefaut } from '../calc/ouvrages.js';
import { COUVERTURES } from '../calc/base.js';
import { getSaisie, setSaisie, getChantier, ajouterItem, remplacerItem, ctxCalcul } from '../core/store.js';
import { ICONES, toast, partager } from '../ui/dom.js';
import { htmlChamps, brancherForm, afficherErreurs } from '../ui/form.js';
import { htmlKpis, htmlLignes, htmlInfos, htmlCout, texteListe, consolider, parCategorie, htmlLigne } from '../ui/resultats.js';
import { aller, entete, retourVers, garderSortie, armerGarde } from '../app.js';
import { choisirChantier, barreActions, BTN_PARTAGER } from './commun.js';
import { versSaisie } from './calculs.js';
import { ouvrirContour } from '../ui/contour.js';

/** Petit résumé sous le titre de chaque étape (pour s'y retrouver fermé). */
function resumeEtape(id, v) {
    const s = x => String(x ?? '').replace('.', ',');
    switch (id) {
        case 'maison': return `${v.forme === 'autre' ? `${s(v.S)} m² au sol, ${s(v.nAngles)} angles` : `${s(v.L)} × ${s(v.l)} m`} · ${v.niveaux === '2' ? 'R+1' : 'plain-pied'}`;
        case 'fondations': return (v.bas === 'vs' ? 'Vide sanitaire + hourdis' : 'Dalle sur terre-plein') + (v.drainage === true || v.drainage === 'true' ? ' · drainage' : '');
        case 'murs': {
            const nb = {};
            (v.menuiseries || []).forEach(m => { const x = Number(String(m.nb).replace(',', '.')); if (x > 0) nb[m.t] = (nb[m.t] || 0) + x; });
            const pl = (t, x) => `${x} ${NOMS_MENUISERIES[t].toLowerCase()}${x > 1 ? 's' : ''}`.replace('baie vitrées', 'baies vitrées');
            const txt = Object.keys(NOMS_MENUISERIES).filter(t => nb[t]).map(t => pl(t, nb[t])).join(', ');
            return `${{ p20: 'Parpaing 20', brique20: 'Brique R20', monomur30: 'Monomur 30' }[v.bloc]} · ${txt || 'aucune menuiserie'}`;
        }
        case 'toit': return `${v.charpente === 'trad' ? 'Traditionnelle' : 'Fermettes'} · ${(COUVERTURES[v.couverture] || {}).l?.split(' (')[0] || ''} · ${s(v.pente)} %`;
        case 'facade': return { mono: 'Enduit monocouche', chaux: 'Enduit chaux', aucun: 'Pas d\'enduit' }[v.enduit] + (v.echafaudage === true || v.echafaudage === 'true' ? ' · échafaudage' : '');
        case 'interieur': return v.interieur === true || v.interieur === 'true' ? 'Placo, isolation, carrelage, peinture' : 'Non compté';
        default: return '';
    }
}

const cmTxt = x => String(x ?? '').replace('.', ',');

/** Liste des menuiseries : une ligne par taille (type, nombre, largeur × hauteur en cm). */
function htmlMenuiseries(liste) {
    return `<div class="f men-titre"><span class="lab">Menuiseries extérieures</span>
        <p class="aide">Une ligne par taille : deux baies de tailles différentes = deux lignes. Taille du trou fini (tableau), en cm.</p></div>
        ${liste.map((m, i) => `
        <div class="f men" data-f="men-${i}" data-mi="${i}">
            <div class="men-haut">
                <div class="seg">${Object.entries(NOMS_MENUISERIES).map(([t, l]) =>
                    `<button type="button" data-men-type="${t}" class="${m.t === t ? 'on' : ''}" aria-pressed="${m.t === t}">${esc(l)}</button>`).join('')}</div>
                <button type="button" class="men-suppr" data-men-suppr aria-label="Retirer cette ligne">✕</button>
            </div>
            <div class="men-dims">
                <div><span class="men-lab">Nombre</span><div class="inp"><input data-men="nb" inputmode="numeric" autocomplete="off" value="${esc(cmTxt(m.nb))}"></div></div>
                <div><span class="men-lab">Largeur</span><div class="inp"><input data-men="larg" inputmode="decimal" autocomplete="off" value="${esc(cmTxt(m.larg))}"><span class="u">cm</span></div></div>
                <div><span class="men-lab">Hauteur</span><div class="inp"><input data-men="haut" inputmode="decimal" autocomplete="off" value="${esc(cmTxt(m.haut))}"><span class="u">cm</span></div></div>
            </div>
            <p class="err"></p>
        </div>`).join('')}
        <div class="f"><button type="button" class="btn btn-ghost btn-block btn-sm" data-men-ajout>＋ Ajouter une menuiserie</button></div>`;
}

export function vueMaison(root, params) {
    const ch = params.ch ? getChantier(params.ch) : null;
    const item = ch && params.item ? ch.items.find(x => x.id === params.item) : null;
    const ctx = ctxCalcul();
    const valeurs = versSaisie(MAISON_DEF, { ...valeursDefaut(MAISON_DEF), ...(item ? item.valeurs : (getSaisie('maison') || {})) });
    valeurs.menuiseries = menuiseriesDe(valeurs);
    const ouvertes = new Set(['maison']);
    let couvPrec = valeurs.couverture;

    entete({
        titre: 'Maison neuve',
        sous: ch ? `Chantier : ${ch.nom}` : 'Toutes les quantités, du terrassement à la peinture',
        parent: ch ? (item ? `#/chantier/${ch.id}` : `#/?ch=${ch.id}`) : (params.depuis === 'calc' ? '#/' : null)
    });

    root.innerHTML = `
        <p class="lead">Renseigne les dimensions et tes choix : tout se recalcule en direct. Le résultat est en bas, lot par lot.</p>
        <div id="etapes"></div>
        <p class="section-title" id="ancre-res">Résultat</p>
        <div id="res" aria-live="polite"></div>
        <button class="btn btn-light btn-block" id="reset" style="margin-top:14px">Remettre les valeurs par défaut</button>`;

    const etapes = root.querySelector('#etapes');
    const res = root.querySelector('#res');
    let dernier = null, tSave, tRes;

    const dessinerEtapes = () => {
        etapes.innerHTML = ETAPES.map((e, i) => `
            <details class="card step" data-etape="${e.id}" ${ouvertes.has(e.id) ? 'open' : ''}>
                <summary><span class="ic">${e.ic}</span><b>${i + 1}. ${esc(e.titre)}<small data-resume="${e.id}">${esc(resumeEtape(e.id, valeurs))}</small></b><span class="chev">${ICONES.down}</span></summary>
                <div class="body"><div class="form">${htmlChamps(e.champs, valeurs)}${e.id === 'murs' ? `<div class="men-liste" style="display:contents">${htmlMenuiseries(valeurs.menuiseries)}</div>` : ''}</div>
                ${e.id === 'maison' && valeurs.forme === 'autre' ? '<button class="btn btn-dark btn-block" style="margin-top:14px" data-contour>📐 Calculer à partir des côtés du plan</button>' : ''}
                ${i < ETAPES.length - 1 ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:14px" data-suivant="${ETAPES[i + 1].id}">Étape suivante : ${esc(ETAPES[i + 1].titre)} ↓</button>`
                    : `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:14px" data-voir-res>Voir le résultat ↓</button>`}</div>
            </details>`).join('');
    };

    const majResumes = () => ETAPES.forEach(e => {
        const el = etapes.querySelector(`[data-resume="${e.id}"]`);
        if (el) el.textContent = resumeEtape(e.id, valeurs);
    });

    const dessinerResultat = () => {
        const r = calculerMaison(valeurs, ctx);
        dernier = r;
        afficherErreurs(etapes, r.erreurs, r.alertes);
        majResumes();
        if (Object.keys(r.erreurs).length) {
            res.innerHTML = `<div class="card"><p class="empty-res">✏️ Complète ou corrige les cases en rouge.</p></div>`;
            majBarre(false);
            return;
        }
        const total = consolider(r.lignes);
        res.innerHTML = `
            <div class="card">
                <div class="res-head"><h2>${esc(r.titre)}</h2></div>
                ${htmlKpis(r.resume)}
                ${htmlCout(r.lignes, r.heures, ctx, 20)}
                ${htmlInfos(r.infos, 'À savoir')}
            </div>
            <p class="section-title">Lot par lot</p>
            ${r.lots.map(lt => `
                <details class="card lot">
                    <summary><span class="ic">${lt.ic}</span><b>${esc(lt.titre)}</b><small>${lt.lignes.length} article${lt.lignes.length > 1 ? 's' : ''}</small><span class="chev">${ICONES.down}</span></summary>
                    <div class="body">${htmlLignes(lt.lignes, ctx)}${htmlInfos(lt.infos, 'Détail du calcul')}</div>
                </details>`).join('')}
            <details class="card lot">
                <summary><span class="ic">🛒</span><b>Liste de courses complète</b><small>${total.length} articles</small><span class="chev">${ICONES.down}</span></summary>
                <div class="body">${parCategorie(total).map(g => `<p class="cat-title">${esc(g.l)}</p><ul class="lines">${g.lignes.map(li => htmlLigne(li, ctx)).join('')}</ul>`).join('')}</div>
            </details>`;
        majBarre(true);
        if (!item) { clearTimeout(tSave); tSave = setTimeout(() => setSaisie('maison', r.v), 400); }
    };
    // Le résultat est long : on le recalcule un court instant après la frappe
    const planifier = () => { clearTimeout(tRes); tRes = setTimeout(dessinerResultat, 180); };

    const libBouton = item ? 'Enregistrer' : ch ? 'Ajouter au chantier' : 'Enregistrer en chantier';
    const bar = barreActions(`<button class="apercu" data-act="voir-res"><span id="apercu-txt">…</span><small>Résultat ↓</small></button>
        <div class="in">${BTN_PARTAGER}<button class="btn btn-primary" data-act="ajouter">${ICONES.plus}<span>${esc(libBouton)}</span></button></div>`);
    const majBarre = ok => {
        bar.querySelectorAll('.in button').forEach(b => { b.disabled = !ok; });
        const r = dernier;
        bar.querySelector('#apercu-txt').textContent = ok && r
            ? r.resume.filter(k => /Murs|Toiture|toupie/i.test(k.l)).map(k => `${k.l.replace('Béton toupie', 'Béton').replace('Toiture', 'Toit')} ${k.v}`).join(' · ')
            : 'Complète les cases en rouge';
    };
    const depart = JSON.stringify(valeurs);
    if (item) garderSortie(() => JSON.stringify(valeurs) !== depart);

    const enregistrer = cible => {
        const r = dernier;
        const donnees = { ouvrage: 'maison', titre: r.titre, valeurs: r.v, lignes: r.lignes, mesure: r.mesure };
        if (item) {
            remplacerItem(cible.id, item.id, donnees);
            toast('Modifications enregistrées');
            retourVers(`#/chantier/${cible.id}`, 1);
        } else {
            ajouterItem(cible.id, donnees);
            toast(`Enregistré dans « ${cible.nom} »`);
            if (ch) retourVers(`#/chantier/${cible.id}`, params.via === 'liste' ? 2 : 1);
            else aller(`#/chantier/${cible.id}`);
        }
    };

    bar.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (b && b.dataset.act === 'voir-res') { root.querySelector('#ancre-res').scrollIntoView({ behavior: 'smooth' }); return; }
        if (!b || !dernier || Object.keys(dernier.erreurs).length) return;
        if (b.dataset.act === 'partager') {
            const r = dernier;
            partager(r.titre, texteListe(r.titre, consolider(r.lignes), ctx, { sousTitre: r.resume.map(k => `${k.l} ${k.v}`).join(' · ') }));
        } else if (ch) enregistrer(ch);
        else choisirChantier(enregistrer, `Maison ${String(valeurs.L).replace('.', ',')}×${String(valeurs.l).replace('.', ',')}`);
    });

    etapes.addEventListener('toggle', e => {
        const d = e.target;
        if (!d.dataset || !d.dataset.etape) return;
        if (d.open) ouvertes.add(d.dataset.etape); else ouvertes.delete(d.dataset.etape);
    }, true);
    // Menuiseries : saisie dans la liste, re-rendu de la seule liste quand on ajoute / retire / change de type
    const redessinerMenuiseries = focusDernier => {
        const zone = etapes.querySelector('.men-liste');
        if (zone) zone.innerHTML = htmlMenuiseries(valeurs.menuiseries);
        if (item) armerGarde();
        dessinerResultat();
        if (focusDernier && zone) { const ins = zone.querySelectorAll('[data-men="nb"]'); ins.length && ins[ins.length - 1].focus(); }
    };
    etapes.addEventListener('input', e => {
        const k = e.target.dataset && e.target.dataset.men;
        const row = k && e.target.closest('[data-mi]');
        if (!row) return;
        valeurs.menuiseries[+row.dataset.mi][k] = e.target.value;
        planifier();
        if (item) armerGarde();
    });
    etapes.addEventListener('focusin', e => {
        if (e.target.dataset && e.target.dataset.men) setTimeout(() => { try { e.target.select(); } catch { /* */ } }, 0);
    });
    etapes.addEventListener('click', e => {
        const row = e.target.closest('[data-mi]');
        const bt = e.target.closest('[data-men-type]');
        if (row && bt) {
            const m = valeurs.menuiseries[+row.dataset.mi];
            const anc = OUVERTURES[m.t], nouv = OUVERTURES[bt.dataset.menType];
            // Taille standard du nouveau type si l'ancienne n'avait pas été retouchée
            const std = o => String(m.larg).replace(',', '.') === String(Math.round(o.larg * 100)) && String(m.haut).replace(',', '.') === String(Math.round(o.haut * 100));
            if (!String(m.larg).trim() || !String(m.haut).trim() || std(anc)) { m.larg = String(Math.round(nouv.larg * 100)); m.haut = String(Math.round(nouv.haut * 100)); }
            m.t = bt.dataset.menType;
            redessinerMenuiseries();
            return;
        }
        if (row && e.target.closest('[data-men-suppr]')) {
            valeurs.menuiseries.splice(+row.dataset.mi, 1);
            redessinerMenuiseries();
            return;
        }
        if (e.target.closest('[data-men-ajout]')) {
            const o = OUVERTURES.fenetre;
            valeurs.menuiseries.push({ t: 'fenetre', nb: '1', larg: String(Math.round(o.larg * 100)), haut: String(Math.round(o.haut * 100)) });
            redessinerMenuiseries(true);
            return;
        }
        if (e.target.closest('[data-contour]')) {
            ouvrirContour(getSaisie('maison_contour'), r => {
                valeurs.P = String(r.P).replace('.', ',');
                valeurs.S = String(r.S).replace('.', ',');
                valeurs.nAngles = String(r.angles);
                setSaisie('maison_contour', r.cotes);
                if (item) armerGarde();
                dessinerEtapes(); dessinerResultat();
                toast(`Forme prise en compte : ${valeurs.P} m de tour, ${valeurs.S} m²`);
            });
            return;
        }
        const s = e.target.closest('[data-suivant]');
        if (s) {
            const cur = s.closest('details');
            cur.open = false;
            const nxt = etapes.querySelector(`[data-etape="${s.dataset.suivant}"]`);
            nxt.open = true;
            setTimeout(() => nxt.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
            return;
        }
        if (e.target.closest('[data-voir-res]')) root.querySelector('#ancre-res').scrollIntoView({ behavior: 'smooth' });
    });

    root.querySelector('#reset').addEventListener('click', () => {
        Object.assign(valeurs, versSaisie(MAISON_DEF, valeursDefaut(MAISON_DEF)));
        valeurs.menuiseries = menuiseriesDe({});
        dessinerEtapes(); dessinerResultat();
        toast('Valeurs par défaut remises');
    });

    brancherForm(etapes, valeurs, {
        onInput: () => { planifier(); if (item) armerGarde(); },
        onStruct: () => {
            // Couverture changée : on propose la pente conseillée si l'ancienne était celle par défaut
            if (valeurs.couverture !== couvPrec) {
                const anc = COUVERTURES[couvPrec], nouv = COUVERTURES[valeurs.couverture];
                if (anc && nouv && String(valeurs.pente).replace(',', '.') === String(anc.pente)) valeurs.pente = String(nouv.pente);
                couvPrec = valeurs.couverture;
            }
            if (item) armerGarde();
            const y = window.scrollY;
            dessinerEtapes(); dessinerResultat();
            window.scrollTo(0, y);
        }
    });
    dessinerEtapes();
    dessinerResultat();
}
