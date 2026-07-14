import { showToast } from './toast.js';
import { getMateriaux, getOuvrages, getProfil } from '../pricing/tarifs.js';
import { TVA_OPTIONS } from '../data/prices.default.js';
import { imprimerDevis } from './print_devis.js';
import {
    listDevis, getDevisById, creerDevis, creerLigne, calculerTotaux, totalLigne,
    sauvegarderDevis, supprimerDevis, dupliquerDevis, changerType, lignesDepuisResultats
} from '../pricing/devis.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmt(n) {
    return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── État module ──────────────────────────────────────────────────────────────

let _devis = null;
let _picker = null; // 'ouvrage' | 'calcul' | null
let _config = null; // configurateur d'ouvrage en cours : { id, dims:{}, opts:{} }

// ─── Liste des devis / estimations ───────────────────────────────────────────

export function renderDevisList() {
    const container = document.getElementById('devis-list-container');
    const tous = listDevis().sort((a, b) => b.id - a.id);

    if (tous.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-gray-200">
                <p class="text-gray-600 font-black text-lg mb-1">Aucun devis pour l'instant</p>
                <p class="text-gray-400 text-sm">Crée une estimation rapide ou un devis complet ci-dessus.</p>
            </div>`;
        return;
    }

    container.innerHTML = tous.map(d => {
        const t = calculerTotaux(d);
        const isDevis = d.type === 'devis';
        const statutColors = {
            brouillon: 'bg-gray-100 text-gray-500', envoye: 'bg-amber-50 text-amber-600',
            accepte: 'bg-emerald-50 text-emerald-600', refuse: 'bg-red-50 text-red-500'
        };
        const statutLabels = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' };
        return `
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex justify-between items-start gap-3">
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${isDevis ? 'bg-kalou-dark text-white' : 'bg-gray-100 text-gray-500'}">${isDevis ? 'Devis' : 'Estimation'}</span>
                        <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${statutColors[d.statut] || statutColors.brouillon}">${statutLabels[d.statut] || 'Brouillon'}</span>
                    </div>
                    <p class="font-black text-lg mt-1 truncate">${esc(d.client.nom) || 'Client à renseigner'}</p>
                    <p class="text-xs text-gray-400 font-bold truncate">${esc(d.num)} · ${esc(d.chantier.description) || 'Chantier'}</p>
                </div>
                <div class="text-right shrink-0">
                    <p class="font-black text-xl text-kalou-orange">${fmt(t.totalTTC)} €</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase">TTC</p>
                </div>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="window.ouvrirDevis(${d.id})" class="flex-1 bg-kalou-dark text-white font-black text-xs uppercase h-11 rounded-xl active:scale-95 transition-all">Ouvrir</button>
                <button onclick="window.dupliquerDevisUI(${d.id})" class="bg-gray-100 text-gray-600 font-black text-xs uppercase h-11 px-4 rounded-xl active:scale-95 transition-all">Dupliquer</button>
                <button onclick="window.supprimerDevisUI(${d.id})" class="bg-red-50 text-red-500 font-black text-xs uppercase h-11 px-4 rounded-xl active:scale-95 transition-all">Suppr.</button>
            </div>
        </div>`;
    }).join('');
}

// ─── Ouverture / création ────────────────────────────────────────────────────

export function nouveauDevis(type) {
    _devis = creerDevis(type);
    _picker = null;
    openEditor();
}

export function ouvrirDevis(id) {
    _devis = getDevisById(id);
    if (!_devis) return showToast('Devis introuvable', true);
    _picker = null;
    openEditor();
}

/** Crée une estimation à partir d'un calcul de métré (bouton "+ Devis" des résultats). */
export function ajouterAuDevis(nom, categorie, data) {
    _devis = creerDevis('estimation');
    _devis.chantier.description = nom;
    _devis.lignes = lignesDepuisResultats(data, getMateriaux());
    sauvegarderDevis(_devis);
    _picker = null;
    window.switchTab('devis');
    openEditor();
    showToast('Chiffrage ajouté — complète les prix manquants');
}

function openEditor() {
    _config = null;
    document.getElementById('devis-list-view').classList.add('hidden');
    document.getElementById('devis-editor-view').classList.remove('hidden');
    renderEditor();
}

export function fermerEditeurDevis() {
    document.getElementById('devis-editor-view').classList.add('hidden');
    document.getElementById('devis-list-view').classList.remove('hidden');
    renderDevisList();
}

// ─── Actions sur le devis courant ─────────────────────────────────────────────

function persist(rerender = false) {
    sauvegarderDevis(_devis);
    if (rerender) renderEditor();
}

export function majChamp(chemin, valeur) {
    const parts = chemin.split('.');
    let obj = _devis;
    while (parts.length > 1) obj = obj[parts.shift()];
    obj[parts[0]] = valeur;
    if (chemin === 'acomptePct' || chemin === 'regimeTVA') renderEditor();
    else persist();
}

export function majLigne(ligneId, champ, valeur) {
    const l = _devis.lignes.find(x => x.id === ligneId);
    if (!l) return;
    l[champ] = (champ === 'qte' || champ === 'puHT') ? (parseFloat(String(valeur).replace(',', '.')) || 0) : valeur;
    persist();
    const cell = document.getElementById('lt-' + ligneId);
    if (cell) cell.textContent = fmt(totalLigne(l));
    renderTotauxPanel();
}

export function supprimerLigne(ligneId) {
    _devis.lignes = _devis.lignes.filter(l => l.id !== ligneId);
    persist(true);
}

export function ajouterLigneManuelle() {
    _devis.lignes.push(creerLigne({ designation: 'Nouvelle ligne', qte: 1, unite: 'u', puHT: 0 }));
    _picker = null;
    persist(true);
}

export function togglePicker(type) {
    _picker = _picker === type ? null : type;
    _config = null;
    renderEditor();
}

export function ajouterLigneOuvrage(id) {
    const o = getOuvrages().find(x => x.id === id);
    if (!o) return;
    _devis.lignes.push(creerLigne({ designation: o.label, detail: o.detail, qte: 1, unite: o.unite, puHT: o.prix }));
    _picker = null;
    _config = null;
    persist(true);
}

// ─── Configurateur d'ouvrage (dimensions + prestations comprises) ─────────────

export function ouvrirConfigOuvrage(id) {
    const o = getOuvrages().find(x => x.id === id);
    if (!o || !o.config) return ajouterLigneOuvrage(id);
    const dims = {}; o.config.dims.forEach(d => dims[d.id] = d.default);
    const opts = {}; o.config.options.forEach(op => opts[op.id] = op.defaut);
    _config = { id: o.id, dims, opts };
    _picker = 'ouvrage';
    renderEditor();
}

export function majConfigDim(dimId, val) {
    if (!_config) return;
    _config.dims[dimId] = parseFloat(String(val).replace(',', '.')) || 0;
    renderEditor();
}

export function toggleConfigOpt(optId) {
    if (!_config) return;
    _config.opts[optId] = !_config.opts[optId];
    renderEditor();
}

export function annulerConfig() {
    _config = null;
    renderEditor();
}

/** Compose la ligne de devis à partir de l'état du configurateur. */
function composeConfig() {
    const o = getOuvrages().find(x => x.id === _config.id);
    const c = o.config;
    const dims = _config.dims;
    const inclus = c.options.filter(op => _config.opts[op.id]);

    let detail = c.resume(dims);
    const liste = inclus.map(op => op.label).join(' ; ');
    detail += liste ? `. Comprend : ${liste}.` : '.';
    if (c.exclusions) detail += ' ' + c.exclusions;

    let qte, unite, puHT;
    if (c.mode === 'm2') {
        qte   = Math.round(Object.values(dims).reduce((a, b) => a * (parseFloat(b) || 0), 1) * 100) / 100;
        unite = 'm²';
        puHT  = o.prix;
    } else {
        qte   = 1;
        unite = 'forfait';
        const base = typeof c.base === 'function' ? c.base(dims) : (c.base || o.prix);
        puHT = base + inclus.reduce((s, op) => s + (op.prix || 0), 0);
    }
    return { designation: o.label, detail, qte, unite, puHT };
}

export function validerConfig() {
    if (!_config) return;
    _devis.lignes.push(creerLigne(composeConfig()));
    _config = null;
    _picker = null;
    persist(true);
    showToast('Ligne ajoutée au devis');
}

export function importerCalcul(entryId) {
    const historique = JSON.parse(localStorage.getItem('kalou_btp_v3') || '[]');
    const entry = historique.find(h => h.id === entryId);
    if (!entry) return;
    const nouvelles = lignesDepuisResultats(entry.data, getMateriaux());
    _devis.lignes.push(...nouvelles);
    if (!_devis.chantier.description) _devis.chantier.description = entry.name;
    _picker = null;
    persist(true);
    showToast('Calcul importé — vérifie les prix');
}

export function changerTypeDevis(type) {
    if (_devis.type === type) return;
    changerType(_devis, type);
    persist(true);
}

export function dupliquerDevisUI(id) {
    const d = getDevisById(id);
    if (!d) return;
    dupliquerDevis(d);
    renderDevisList();
    showToast('Devis dupliqué');
}

export function supprimerDevisUI(id) {
    if (!confirm('Supprimer ce document ?')) return;
    supprimerDevis(id);
    renderDevisList();
}

export function exporterPdf() {
    if (_devis.lignes.length === 0) return showToast('Ajoute au moins une ligne avant l\'export', true);
    persist();
    imprimerDevis(_devis);
}

// ─── Rendu de l'éditeur ───────────────────────────────────────────────────────

function renderEditor() {
    const container = document.getElementById('devis-editor-view');
    const t = calculerTotaux(_devis);
    const isDevis = _devis.type === 'devis';
    const materiaux = getMateriaux();
    const ouvrages  = getOuvrages();
    const historique = JSON.parse(localStorage.getItem('kalou_btp_v3') || '[]');
    const ouvragesParCat = ouvrages.reduce((acc, o) => { (acc[o.cat] = acc[o.cat] || []).push(o); return acc; }, {});

    container.innerHTML = `
    <button onclick="window.fermerEditeurDevis()" class="flex items-center gap-1 text-sm font-bold text-gray-500 mb-4">
        ← Retour à la liste
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div class="space-y-6">
        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest">${isDevis ? 'Devis n°' : 'Estimation'}</p>
              <p class="text-xl font-black">${esc(_devis.num)}</p>
            </div>
            <select onchange="window.majChampDevis('statut', this.value)" class="text-xs font-black uppercase px-3 py-2 rounded-xl border-2 border-gray-100 bg-gray-50">
              ${['brouillon','envoye','accepte','refuse'].map(s => `<option value="${s}" ${_devis.statut === s ? 'selected' : ''}>${({brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé'})[s]}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div class="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest">Client</p>
              <input placeholder="Nom du client" value="${esc(_devis.client.nom)}" onchange="window.majChampDevis('client.nom', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm bg-white">
              <input placeholder="Adresse" value="${esc(_devis.client.adresse)}" onchange="window.majChampDevis('client.adresse', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm bg-white">
              <input placeholder="Téléphone" value="${esc(_devis.client.tel)}" onchange="window.majChampDevis('client.tel', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm bg-white">
            </div>
            <div class="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest">Chantier</p>
              <input placeholder="Ex: Terrasse + mur pierre" value="${esc(_devis.chantier.description)}" onchange="window.majChampDevis('chantier.description', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm bg-white">
              <input placeholder="Adresse du chantier (si différente)" value="${esc(_devis.chantier.adresse)}" onchange="window.majChampDevis('chantier.adresse', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm bg-white">
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Lignes du devis</p>
          <div class="space-y-3">
            ${_devis.lignes.length === 0 ? `<p class="text-sm text-gray-400 font-bold py-6 text-center">Aucune ligne — ajoute-en une ci-dessous.</p>` : _devis.lignes.map(l => `
            <div class="border border-gray-100 rounded-2xl p-4">
              <div class="flex justify-between items-start gap-2 mb-3">
                <input value="${esc(l.designation)}" onchange="window.majLigneDevis('${l.id}','designation',this.value)" class="font-black text-sm flex-1 bg-transparent border-b-2 border-transparent focus:border-kalou-orange outline-none">
                <button onclick="window.supprimerLigneDevis('${l.id}')" class="text-red-300 hover:text-red-500 text-xs font-black px-2">✕</button>
              </div>
              <textarea rows="2" placeholder="Détail / prestations (optionnel)" onchange="window.majLigneDevis('${l.id}','detail',this.value)" class="w-full text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3 outline-none resize-none focus:bg-white border border-transparent focus:border-gray-100">${esc(l.detail)}</textarea>
              <div class="grid grid-cols-4 gap-2 items-end">
                <div><label class="text-[9px] font-bold text-gray-400 uppercase">Qté</label><input type="number" step="any" value="${l.qte}" onchange="window.majLigneDevis('${l.id}','qte',this.value)" class="w-full h-10 px-2 rounded-lg border-2 border-gray-100 bg-gray-50 font-bold text-sm"></div>
                <div><label class="text-[9px] font-bold text-gray-400 uppercase">Unité</label><input value="${esc(l.unite)}" onchange="window.majLigneDevis('${l.id}','unite',this.value)" class="w-full h-10 px-2 rounded-lg border-2 border-gray-100 bg-gray-50 font-bold text-sm"></div>
                <div><label class="text-[9px] font-bold text-gray-400 uppercase">PU HT</label><input type="number" step="any" value="${l.puHT}" onchange="window.majLigneDevis('${l.id}','puHT',this.value)" class="w-full h-10 px-2 rounded-lg border-2 border-gray-100 bg-gray-50 font-bold text-sm"></div>
                <div class="text-right"><label class="text-[9px] font-bold text-gray-400 uppercase block">Total HT</label><span id="lt-${l.id}" class="font-black text-base">${fmt(totalLigne(l))}</span></div>
              </div>
            </div>`).join('')}
          </div>

          <div class="flex gap-2 flex-wrap mt-4">
            <button onclick="window.togglePickerDevis('calcul')" class="text-xs font-black uppercase px-4 py-3 rounded-xl border-2 ${_picker === 'calcul' ? 'border-kalou-orange bg-orange-50 text-kalou-orange' : 'border-dashed border-gray-200 text-gray-500'}">+ Depuis un calcul</button>
            <button onclick="window.togglePickerDevis('ouvrage')" class="text-xs font-black uppercase px-4 py-3 rounded-xl border-2 ${_picker === 'ouvrage' ? 'border-kalou-orange bg-orange-50 text-kalou-orange' : 'border-dashed border-gray-200 text-gray-500'}">+ Ouvrage type</button>
            <button onclick="window.ajouterLigneManuelleDevis()" class="text-xs font-black uppercase px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500">+ Ligne manuelle</button>
          </div>

          ${_picker === 'ouvrage' ? (_config ? renderConfigHTML() : renderOuvrageListHTML(ouvragesParCat)) : ''}

          ${_picker === 'calcul' ? `
          <div class="mt-4 bg-gray-50 rounded-2xl p-4 max-h-72 overflow-y-auto space-y-2">
            ${historique.length === 0 ? `<p class="text-sm text-gray-400 font-bold text-center py-4">Aucun calcul sauvegardé.</p>` : historique.map(h => `
              <button onclick="window.importerCalculDevis(${h.id})" class="w-full flex justify-between items-center bg-white rounded-xl px-3 py-2.5 text-left hover:bg-orange-50">
                <span><span class="font-bold text-sm block">${esc(h.name)}</span><span class="text-[10px] text-gray-400 font-bold uppercase">${esc(h.cat)} · ${esc(h.date)}</span></span>
                <span class="text-xs font-black text-gray-400">${h.data.length} lignes</span>
              </button>`).join('')}
          </div>` : ''}
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-4">
        <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div class="flex bg-gray-100 p-1 rounded-2xl mb-4">
            <button onclick="window.changerTypeDevisUI('estimation')" class="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${!isDevis ? 'bg-kalou-dark text-white' : 'text-gray-500'}">Estimation</button>
            <button onclick="window.changerTypeDevisUI('devis')" class="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${isDevis ? 'bg-kalou-dark text-white' : 'text-gray-500'}">Devis</button>
          </div>
          ${!isDevis ? `<p class="text-[11px] text-amber-600 font-bold bg-amber-50 rounded-xl p-3 mb-1">Non contractuel — bascule en "Devis" une fois ton entreprise déclarée pour ajouter les mentions légales.</p>` : ''}

          <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-4 mb-2">Régime TVA</p>
          <div class="space-y-2 mb-3">
            ${TVA_OPTIONS.map(o => `
            <label class="flex items-center gap-2 text-sm font-bold ${_devis.regimeTVA === o.v ? 'text-kalou-dark' : 'text-gray-400'} cursor-pointer">
              <input type="radio" name="regimeTVA" value="${o.v}" ${_devis.regimeTVA === o.v ? 'checked' : ''} onchange="window.majChampDevis('regimeTVA', this.value)" class="accent-kalou-orange w-4 h-4">
              ${o.label}
            </label>`).join('')}
          </div>

          <div class="flex items-center justify-between text-sm font-bold text-gray-500 mb-1">
            <span>Acompte</span>
            <span class="flex items-center gap-1"><input type="number" value="${_devis.acomptePct}" onchange="window.majChampDevis('acomptePct', parseFloat(this.value)||0)" class="w-14 h-8 text-right px-1 rounded-lg border-2 border-gray-100 bg-gray-50 font-black">%</span>
          </div>
        </div>

        <div id="devis-totaux-panel">${renderTotauxHTML(t)}</div>

        <div class="space-y-2">
          <button onclick="window.exporterPdfDevis()" class="w-full bg-kalou-orange text-white font-black text-sm uppercase h-14 rounded-2xl shadow-lg active:scale-95 transition-all">⤓ Aperçu / Export PDF</button>
          <button onclick="window.dupliquerDevisUI(${_devis.id})" class="w-full bg-white border-2 border-gray-100 text-gray-600 font-black text-sm uppercase h-12 rounded-2xl active:scale-95 transition-all">Dupliquer</button>
        </div>
      </aside>
    </div>`;
}

function renderTotauxHTML(t) {
    return `
    <div class="bg-kalou-dark text-white rounded-3xl p-5 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-28 h-28 bg-kalou-orange/10 rounded-full -mr-14 -mt-14 blur-2xl"></div>
      <div class="relative z-10 space-y-1.5">
        <div class="flex justify-between text-sm"><span class="text-gray-400">Total HT</span><b>${fmt(t.totalHT)} €</b></div>
        ${t.mentionFranchise
            ? `<p class="text-[10px] text-gray-400 pt-1">TVA non applicable, art. 293 B du CGI</p>`
            : t.parTaux.map(g => `<div class="flex justify-between text-sm"><span class="text-gray-400">TVA ${g.taux}%</span><b>${fmt(g.montant)} €</b></div>`).join('')}
        <div class="flex justify-between items-center pt-3 mt-2 border-t border-white/10">
          <span class="text-xs font-black uppercase tracking-widest">Total TTC</span>
          <span class="text-2xl font-black text-kalou-orange">${fmt(t.totalTTC)} €</span>
        </div>
        <div class="bg-white/5 rounded-xl p-3 mt-2 space-y-1">
          <div class="flex justify-between text-xs"><span class="text-gray-400">Acompte</span><b>${fmt(t.acompte)} €</b></div>
          <div class="flex justify-between text-xs"><span class="text-gray-400">Solde</span><b>${fmt(t.solde)} €</b></div>
        </div>
      </div>
    </div>`;
}

function renderTotauxPanel() {
    const panel = document.getElementById('devis-totaux-panel');
    if (panel) panel.innerHTML = renderTotauxHTML(calculerTotaux(_devis));
}

function renderOuvrageListHTML(ouvragesParCat) {
    return `
    <div class="mt-4 bg-gray-50 rounded-2xl p-4 max-h-80 overflow-y-auto space-y-4">
      ${Object.entries(ouvragesParCat).map(([cat, list]) => `
        <div>
          <p class="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2">${esc(cat)}</p>
          <div class="space-y-1">
            ${list.map(o => `
            <button onclick="window.${o.config ? 'ouvrirConfigOuvrageDevis' : 'ajouterLigneOuvrageDevis'}('${o.id}')"
                    class="w-full flex justify-between items-center gap-2 bg-white rounded-xl px-3 py-2.5 text-left hover:bg-orange-50">
              <span class="font-bold text-sm">${esc(o.label)}${o.config ? ' <span class="text-[9px] font-black text-kalou-orange uppercase">· à configurer</span>' : ''}</span>
              <span class="text-xs font-black text-gray-400 shrink-0">${o.config && o.config.mode === 'forfait' ? 'forfait' : fmt(o.prix) + ' €/' + esc(o.unite)}</span>
            </button>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function renderConfigHTML() {
    const o = getOuvrages().find(x => x.id === _config.id);
    const c = o.config;
    const preview = composeConfig();
    const colClass = c.dims.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';

    return `
    <div class="mt-4 bg-gray-50 rounded-2xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <p class="font-black text-sm">${esc(o.label)}</p>
        <button onclick="window.annulerConfigDevis()" class="text-xs font-bold text-gray-400 uppercase">Annuler</button>
      </div>

      <div class="grid ${colClass} gap-2">
        ${c.dims.map(d => `
        <div>
          <label class="block text-[9px] font-bold text-gray-400 uppercase mb-1">${esc(d.label)} (${esc(d.unit)})</label>
          <input type="number" step="any" value="${_config.dims[d.id]}" onchange="window.majConfigDimDevis('${d.id}', this.value)"
                 class="w-full h-10 px-2 rounded-lg border-2 border-gray-100 bg-white font-bold text-sm">
        </div>`).join('')}
      </div>

      <div>
        <p class="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2">Ce qui apparaît dans le devis</p>
        <div class="space-y-1.5">
          ${c.options.map(op => `
          <label class="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 cursor-pointer">
            <span class="flex items-center gap-2 text-sm font-bold ${_config.opts[op.id] ? 'text-kalou-dark' : 'text-gray-400'}">
              <input type="checkbox" ${_config.opts[op.id] ? 'checked' : ''} onchange="window.toggleConfigOptDevis('${op.id}')" class="accent-kalou-orange w-4 h-4 shrink-0">
              ${esc(op.label)}
            </span>
            ${op.prix ? `<span class="text-xs font-black shrink-0 ${_config.opts[op.id] ? 'text-gray-500' : 'text-gray-300'}">+${fmt(op.prix)} €</span>` : ''}
          </label>`).join('')}
        </div>
      </div>

      <div class="bg-white rounded-xl p-3 border border-gray-100">
        <p class="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Aperçu de la ligne</p>
        <p class="text-xs text-gray-600 leading-relaxed">${esc(preview.detail)}</p>
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
          <span class="text-xs font-bold text-gray-400">${preview.qte} ${esc(preview.unite)}${c.mode === 'm2' ? ' × ' + fmt(preview.puHT) + ' €' : ''}</span>
          <span class="font-black text-kalou-dark">${fmt(preview.qte * preview.puHT)} €</span>
        </div>
      </div>

      <button onclick="window.validerConfigDevis()" class="w-full bg-kalou-orange text-white font-black text-sm uppercase h-12 rounded-2xl active:scale-95 transition-all">
        Ajouter au devis
      </button>
    </div>`;
}
