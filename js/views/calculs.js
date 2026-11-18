// Écran « Calculs » : liste des ouvrages + calculateur en direct.

import { esc, norm, motsRecherche, correspond } from '../core/format.js';
import { OUVRAGES, OUV_CATS, OUVRAGES_PAR_ID, calculer, valeursDefaut, migrer } from '../calc/ouvrages.js';
import { getSaisie, setSaisie, getChantier, ajouterItem, remplacerItem, ctxCalcul, getRecents, accueilVu, fermerAccueil, listeChantiers } from '../core/store.js';
import { ICONES, toast, partager, confirmer } from '../ui/dom.js';
import { picto } from '../ui/pictos.js';
import { POUR_PIECE_PAR_PRE, valeursPiece, nomPiece, resumePiece, piecesVersElec, piecesVersVmc } from '../calc/pieces.js';
import { htmlChamps, brancherForm, afficherErreurs } from '../ui/form.js';
import { htmlKpis, htmlLignes, htmlRecette, htmlInfos, htmlCout, texteListe, htmlComparatif } from '../ui/resultats.js';
import { aller, entete, retourVers, garderSortie, armerGarde } from '../app.js';
import { choisirChantier, barreActions, BTN_PARTAGER } from './commun.js';


const tuile = (o, suffixe, cat) => `
    <button class="tile" data-go="#/calc/${o.id}${suffixe}" data-txt="${esc(norm(o.nom + ' ' + o.desc + ' ' + (o.mots || '') + ' ' + (cat ? cat.l : '')))}">
        <span class="ic${picto(o.id) ? ' pic' : ''}">${picto(o.id) || o.ic}</span><b>${esc(o.nom)}</b><small>${esc(o.desc)}</small>
    </button>`;

// ─── Liste des ouvrages ─────────────────────────────────────────────────────
// Accueil : les familles (9 lignes) plutôt que les 48 calculs d'un coup ; la recherche
// cherche dans tous les calculs. Une famille ouverte = #/?f=<famille> (retour du téléphone).

const FAMILLES = {
    beton:      { pic: 'fondation',    ex: 'Dalle, fondation, poteau, chaînage, escalier' },
    murs:       { pic: 'mur',          ex: 'Agglos, pierre, muret, ouverture, linteau' },
    enduits:    { pic: 'enduit',       ex: 'Enduit, chaux, rejointoiement, chaux-chanvre' },
    renovation: { pic: 'demolition',   ex: 'Démolition, sous-œuvre, fissures, humidité' },
    toiture:    { pic: 'toiture',      ex: 'Charpente, tuiles, conduit de cheminée' },
    interieur:  { pic: 'placo',        ex: 'Pièce complète, placo, isolation, carrelage, peinture' },
    eau:        { pic: 'douche',       ex: 'Douche à l\'italienne, plomberie appareil par appareil' },
    elec:       { pic: 'electricite',  ex: 'Prises et lumières pièce par pièce, clim, PAC, VMC' },
    exterieur:  { pic: 'terrassement', ex: 'Terrassement, drainage, fosse, pavage, piscine' }
};

export function vueListe(root, params) {
    const ch = params.ch ? getChantier(params.ch) : null;
    const suffixe = ch ? `?ch=${encodeURIComponent(ch.id)}` : '';
    const fam = OUV_CATS.find(c => c.id === params.f);
    const accueil = `#/${suffixe}`;
    const versFamille = id => `#/?${ch ? `ch=${encodeURIComponent(ch.id)}&` : ''}f=${id}`;
    if (fam) entete({ titre: fam.l, sous: ch ? `Chantier : ${ch.nom}` : '', parent: accueil });
    else if (ch) entete({ titre: 'Ajouter un ouvrage', sous: ch.nom, parent: `#/chantier/${ch.id}` });
    else entete({});

    // Première visite : une petite carte qui dit à quoi sert l'appli (disparaît au premier chantier)
    const montrerAccueil = !fam && !ch && !accueilVu() && !listeChantiers().length;
    const recents = ch || fam ? [] : getRecents().map(id => OUVRAGES_PAR_ID[id]).filter(Boolean).slice(0, 4);
    const sections = cats => cats.map(cat => `
        <section data-cat="${cat.id}"${fam ? '' : ' class="hidden"'}>
            ${fam ? '' : `<p class="section-title">${esc(cat.l)}</p>`}
            <div class="tiles">${OUVRAGES.filter(o => o.cat === cat.id).map(o => tuile(o, suffixe, cat)).join('')}</div>
        </section>`).join('');
    root.innerHTML = `
        ${ch && !fam ? `<div class="banner">➕ <span><b>Ajout au chantier « ${esc(ch.nom)} »</b>Choisis l'ouvrage, règle les dimensions, puis « Ajouter ».</span></div>` : ''}
        ${montrerAccueil ? `<div class="card accueil" id="accueil">
            <button class="x" id="accueil-x" aria-label="Fermer">×</button>
            <b>Calcule tes matériaux, fais ta liste pour le magasin.</b>
            <p>Gratuit, sans compte, marche sans réseau. Choisis une famille ou cherche un mot, tape tes mesures : les quantités (pertes comprises) s'affichent tout de suite.</p>
            <button class="btn btn-ghost" data-go="#/calc/dalle">Essayer : une dalle de 5 × 4 m</button>
        </div>` : ''}
        <div class="search">${ICONES.search}<input id="q" type="search" placeholder="${fam ? `Chercher dans ${esc(fam.l.toLowerCase())}…` : 'Chercher : dalle, joint pierre, placo…'}" autocomplete="off" aria-label="Chercher un ouvrage"></div>
        <div id="liste">
            ${fam ? `<p class="lead" style="margin:4px 2px 12px">${esc(FAMILLES[fam.id]?.ex || '')}</p>${sections([fam])}` : `
            ${recents.length ? `<div class="hors-recherche"><p class="section-title">Utilisés récemment</p>
                <div class="tiles">${recents.map(o => tuile(o, suffixe)).join('')}</div></div>` : ''}
            <div id="bloc-maison">
                <p class="section-title">Projet complet</p>
                <button class="hero" data-go="#/maison${suffixe}${ch ? '&via=liste' : ''}">
                    <span class="ic pic">${picto('maison')}</span>
                    <span><b>Maison neuve</b><small>Fondations, murs, charpente, toiture, intérieur : tout d'un coup</small></span>
                    <span class="go">${ICONES.chev}</span>
                </button>
            </div>
            <div class="hors-recherche">
                <p class="section-title">Par famille de travaux</p>
                <div class="familles">${OUV_CATS.map(cat => {
                    const nb = OUVRAGES.filter(o => o.cat === cat.id).length;
                    const f = FAMILLES[cat.id] || {};
                    return `<button class="famille" data-go="${versFamille(cat.id)}">
                        <span class="ic pic">${picto(f.pic)}</span>
                        <span><b>${esc(cat.l)}</b><small><span class="nb">${nb} calcul${nb > 1 ? 's' : ''}</span> · ${esc(f.ex || '')}</small></span>
                        <span class="go">${ICONES.chev}</span>
                    </button>`;
                }).join('')}</div>
            </div>
            ${sections(OUV_CATS)}`}
            <p class="empty-res hidden" id="rien">Rien trouvé. Essaie un seul mot : dalle, mur, joint, placo, prise…</p>
        </div>`;

    root.addEventListener('click', e => {
        if (e.target.closest('#accueil-x')) { fermerAccueil(); root.querySelector('#accueil').remove(); return; }
        const b = e.target.closest('[data-go]');
        if (b) aller(b.dataset.go);
    });
    const q = root.querySelector('#q');
    q.addEventListener('input', () => {
        const mots = motsRecherche(q.value);
        const t = mots.join(' ');
        // Accueil : pendant la recherche, on cache les familles et on montre les calculs trouvés
        root.querySelectorAll('.hors-recherche').forEach(el => el.classList.toggle('hidden', !!t));
        let total = 0;
        root.querySelectorAll('section[data-cat]').forEach(sec => {
            let n = 0;
            sec.querySelectorAll('.tile').forEach(tl => {
                const ok = !t || correspond(tl.dataset.txt, mots);
                tl.classList.toggle('hidden', !ok);
                if (ok) n++;
            });
            sec.classList.toggle('hidden', fam ? n === 0 : (!t || n === 0));
            total += n;
        });
        const maison = !fam && !!t && correspond('maison neuve construction pavillon complete projet', mots);
        root.querySelector('#bloc-maison')?.classList.toggle('hidden', !!t && !maison);
        root.querySelector('#rien').classList.toggle('hidden', !t || total > 0 || maison);
    });
}

// ─── Calculateur ────────────────────────────────────────────────────────────

/** Valeurs à afficher dans les champs (virgule française pour les nombres). */
export function versSaisie(def, v) {
    const out = { ...v };
    def.champs.forEach(ch => {
        if (ch.type === 'num' && typeof out[ch.id] === 'number') out[ch.id] = String(out[ch.id]).replace('.', ',');
        // Listes : copie des lignes (on ne modifie pas l'ouvrage enregistré), nombres à la virgule
        if (ch.type === 'liste') out[ch.id] = (Array.isArray(out[ch.id]) ? out[ch.id] : []).map(r => Object.fromEntries(
            Object.entries(r).map(([k, x]) => [k, typeof x === 'number' ? String(x).replace('.', ',') : x])));
    });
    return out;
}

export function vueCalcul(root, id, params) {
    const def = OUVRAGES_PAR_ID[id];
    if (!def) { aller('#/', { remplacer: true }); return; }
    const ch = params.ch ? getChantier(params.ch) : null;
    const item = ch && params.item ? ch.items.find(x => x.id === params.item) : null;
    const ctx = ctxCalcul();

    // Calcul lancé depuis une pièce du chantier : ses mesures remplacent celles de la dernière saisie
    const pieceId = item ? item.piece : params.piece;
    const piece = ch && pieceId ? (ch.pieces || []).find(x => x.id === pieceId) : null;
    const pre = item ? item.pre : params.pre;
    const variante = piece && POUR_PIECE_PAR_PRE[pre] && POUR_PIECE_PAR_PRE[pre].ouv === id ? POUR_PIECE_PAR_PRE[pre] : null;
    let depart0 = migrer(def, item ? item.valeurs : (getSaisie(id) || {}));
    if (!item && variante) depart0 = { ...depart0, ...valeursPiece(pre, piece) };
    const depuisPieces = !item && ch && params.depuis === 'pieces' && (ch.pieces || []).length;
    if (depuisPieces && id === 'electricite') depart0 = { ...depart0, pieces: piecesVersElec(ch.pieces, def.champs.find(x => x.id === 'pieces').types) };
    if (depuisPieces && id === 'vmc') depart0 = { ...depart0, ...piecesVersVmc(ch.pieces) };
    const valeurs = versSaisie(def, { ...valeursDefaut(def), ...depart0 });

    entete({
        titre: def.nom,
        sous: ch ? `Chantier : ${ch.nom}` : def.desc,
        parent: ch ? (item ? `#/chantier/${ch.id}` : variante ? `#/chantier/${ch.id}?piece=${piece.id}` : depuisPieces ? `#/chantier/${ch.id}` : `#/?ch=${ch.id}`) : '#/'
    });

    // Ordinateur (iMac) : saisie à gauche, résultat collé à droite (voir .calc-grid dans app.css)
    const bandeau = variante ? `<div class="banner">📍 <span><b>${esc(nomPiece(piece))} : ${esc(variante.l.toLowerCase())}</b>Mesures reprises de la pièce (${esc(resumePiece(piece))}).${variante.note ? ` ${esc(variante.note)}` : ''}${item ? ' Si tu changes les mesures de la pièce, ce calcul suit.' : ''}</span></div>`
        : depuisPieces ? `<div class="banner">📍 <span><b>Les ${ch.pieces.length} pièces du chantier</b>${id === 'electricite' ? 'Prises, lampes et distances proposées selon le type : corrige pièce par pièce.' : 'Bouches et entrées d\'air comptées d\'après les pièces.'}</span></div>` : '';
    root.innerHTML = `${bandeau}<div class="calc-grid">
        <div class="col-saisie">
            <div class="card"><div class="form" id="form"></div></div>
            <button class="btn btn-light btn-block no-print" id="reset" style="margin-top:14px">Remettre les valeurs par défaut</button>
        </div>
        <div class="col-res">
            <p class="section-title">Résultat</p>
            <div class="card" id="res" aria-live="polite"></div>
        </div>
    </div>`;

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
            <p class="note-pertes">Pertes et coupes comprises, arrondi au sac, au paquet ou à la pièce. Le détail est dans « Comment c'est calculé ».</p>
            ${htmlLignes(r.lignes, ctx)}
            ${htmlRecette(r.recette)}
            ${htmlComparatif(r.comparatif)}
            ${htmlCout(r.lignes, r.mesure && r.mesure.h, ctx)}
            ${htmlInfos(r.infos)}
            <button class="btn btn-light btn-block no-print" data-act="partager" style="margin-top:12px">${ICONES.share}<span>Envoyer ce calcul (SMS, mail…)</span></button>`;
        majBarre(true);
        if (!item) { clearTimeout(tSave); tSave = setTimeout(() => setSaisie(id, r.v), 400); }
    };

    const libBouton = item ? 'Enregistrer' : ch ? 'Ajouter' : 'Ajouter';
    // Une seule ligne : l'aperçu du résultat (touche = voir le détail) + le bouton principal
    const bar = barreActions(`<div class="in"><button class="apercu" data-act="voir-res"><span id="apercu-txt">…</span><small>Voir le détail ↓</small></button>
        <button class="btn btn-primary" data-act="ajouter">${ICONES.plus}<span>${esc(libBouton)}</span></button></div>`);
    bar.classList.add('avec-apercu');
    const btnAjout = bar.querySelector('[data-act="ajouter"]');
    let ajouteA = null;                       // chantier où le calcul actuel vient d'être ajouté
    const majBarre = ok => {
        btnAjout.disabled = !ok;
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
        if (variante && !item) { donnees.piece = piece.id; donnees.pre = pre; }
        if (variante && !item) {
            ajouterItem(cible.id, donnees);
            toast(`Ajouté à « ${nomPiece(piece)} »`);
            retourVers(`#/chantier/${cible.id}?piece=${piece.id}`, 1);
        } else if (item) {
            remplacerItem(cible.id, item.id, donnees);
            toast('Modifications enregistrées');
            retourVers(`#/chantier/${cible.id}`, 1);
        } else if (ch) {
            ajouterItem(cible.id, donnees);
            toast(`Ajouté à « ${cible.nom} »`);
            retourVers(`#/chantier/${cible.id}`, depuisPieces ? 1 : 2);
        } else {
            ajouterItem(cible.id, donnees);
            toast(`Ajouté à « ${cible.nom} »`);
            ajouteA = cible;
            btnAjout.classList.add('fait');
            btnAjout.dataset.act = 'voir-ch';
            btnAjout.innerHTML = `${ICONES.check}<span>Voir le chantier</span>`;
        }
    };

    const agir = async e => {
        const cmp = e.target.closest('[data-cmp]');
        if (cmp) {
            valeurs[cmp.dataset.cmp] = cmp.dataset.v;
            dessinerForm(); calculerEtAfficher(); apresChangement();
            res.scrollIntoView({ behavior: 'smooth', block: 'start' });
            toast('Isolant changé : la liste est recalculée');
            return;
        }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'voir-res') { res.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (b.dataset.act === 'voir-ch' && ajouteA) { aller(`#/chantier/${ajouteA.id}`); return; }
        if (!dernier || Object.keys(dernier.erreurs).length) return;
        if (b.dataset.act === 'partager') {
            const r = dernier;
            partager(r.titre, texteListe(r.titre, r.lignes, ctx, { cats: false, sousTitre: r.resume.map(k => `${k.l} : ${k.v}`).join(' · ') }));
        } else if (b.dataset.act === 'ajouter') {
            // Valeur signalée en orange : on fait confirmer avant d'enregistrer
            const al = Object.values(dernier.alertes || {});
            if (al.length && !(await confirmer('Valeur inhabituelle', al.join(' '), 'Ajouter quand même'))) return;
            if (ch) enregistrer(ch);
            else choisirChantier(enregistrer);
        }
    };
    bar.addEventListener('click', agir);
    res.addEventListener('click', agir);

    // Modification d'un ouvrage enregistré : on prévient avant de perdre les changements
    const depart = JSON.stringify(valeurs);
    if (item) garderSortie(() => JSON.stringify(valeurs) !== depart);
    const apresChangement = () => { remettreBouton(); if (item) armerGarde(); };

    root.querySelector('#reset').addEventListener('click', () => {
        const avantReset = { ...valeurs };
        Object.assign(valeurs, versSaisie(def, valeursDefaut(def)));
        dessinerForm(); calculerEtAfficher(); apresChangement();
        toast('Valeurs par défaut remises', { action: 'Annuler', onAction: () => {
            Object.assign(valeurs, avantReset);
            dessinerForm(); calculerEtAfficher();
        } });
    });

    let avant = { ...valeurs };
    brancherForm(form, valeurs, {
        champs: def.champs,
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
