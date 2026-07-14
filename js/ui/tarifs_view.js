import { showToast } from './toast.js';
import { getProfil, updateProfil, getMateriaux, getOuvrages, setPrix, resetPrix } from '../pricing/tarifs.js';
import { calculerDebourse } from '../pricing/debourse.js';
import { TVA_OPTIONS } from '../data/prices.default.js';
import { construireSauvegarde, estSauvegardeValide, resumeSauvegarde, fusionnerSauvegarde } from '../pricing/backup.js';

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmt(n) {
    return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderReglages() {
    const container = document.getElementById('reglages-container');
    const p = getProfil();

    container.innerHTML = `
    <div class="space-y-6">

      <!-- Sauvegarde & transfert -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-black text-lg mb-1">Sauvegarde &amp; transfert</h3>
        <p class="text-xs text-gray-400 font-bold mb-4">Le téléphone et le PC ne partagent pas leurs données. Exporte un fichier ici, ré-importe-le sur l'autre appareil. À faire aussi de temps en temps par sécurité.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onclick="window.exporterSauvegarde()" class="bg-kalou-dark text-white font-black text-sm uppercase h-14 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
            ⤓ Exporter mes données
          </button>
          <button onclick="window.importerSauvegarde()" class="bg-white border-2 border-gray-200 text-gray-600 font-black text-sm uppercase h-14 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
            ⤒ Importer une sauvegarde
          </button>
        </div>
        <p class="text-[11px] text-gray-400 mt-3">L'import <b>fusionne</b> avec tes données actuelles — rien n'est supprimé.</p>
      </div>

      <!-- Profil entreprise -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-black text-lg mb-1">Mon entreprise</h3>
        <p class="text-xs text-gray-400 font-bold mb-4">Renseigné une fois, imprimé automatiquement sur chaque devis.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${champTexte('entreprise', 'Nom de l\'entreprise', p.entreprise)}
          ${champTexte('artisan', 'Ton nom', p.artisan)}
          ${champTexte('adresse', 'Adresse', p.adresse)}
          ${champTexte('tel', 'Téléphone', p.tel)}
          ${champTexte('email', 'Email', p.email)}
          ${champTexte('siret', 'SIRET', p.siret)}
          ${champTexte('ape', 'Code APE', p.ape)}
          ${champTexte('rib', 'RIB (pour tes clients)', p.rib)}
        </div>
      </div>

      <!-- Assurance décennale -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-black text-lg mb-1">Assurance décennale</h3>
        <p class="text-xs text-gray-400 font-bold mb-4">Obligatoire sur tout devis de maçonnerie — sans elle, un devis n'est pas conforme.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${champTexte('assureurDecennale', 'Assureur', p.assureurDecennale)}
          ${champTexte('contratDecennale', 'N° de contrat', p.contratDecennale)}
          ${champTexte('zoneDecennale', 'Zone de couverture', p.zoneDecennale)}
          ${champTexte('mediateur', 'Médiateur de la consommation', p.mediateur)}
        </div>
      </div>

      <!-- Régime TVA -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-black text-lg mb-1">Régime TVA par défaut</h3>
        <p class="text-xs text-gray-400 font-bold mb-4">Utilisé pour chaque nouveau devis — modifiable ensuite au cas par cas.</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          ${TVA_OPTIONS.map(o => `
          <button onclick="window.majProfilChamp('regimeTVA','${o.v}')" class="text-left px-4 py-3 rounded-2xl border-2 font-bold text-sm ${p.regimeTVA === o.v ? 'border-kalou-orange bg-orange-50 text-kalou-dark' : 'border-gray-100 text-gray-500'}">
            ${o.label}
          </button>`).join('')}
        </div>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Acompte par défaut (%)</label>
            <input type="number" value="${p.acomptePct}" onchange="window.majProfilChamp('acomptePct', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Validité du devis</label>
            <input value="${esc(p.validite)}" onchange="window.majProfilChamp('validite', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
          </div>
        </div>
      </div>

      <!-- Mon taux horaire -->
      ${renderDebourse(p)}

      <!-- Tarifs matériaux -->
      ${renderCatalogue('materiaux', 'Tarifs matériaux', getMateriaux())}

      <!-- Tarifs ouvrages -->
      ${renderCatalogue('ouvrages', 'Tarifs des ouvrages (fourni-posé)', getOuvrages())}

    </div>`;
}

function champTexte(champ, label, valeur) {
    return `
    <div>
      <label class="block text-xs font-bold text-gray-400 uppercase mb-1">${esc(label)}</label>
      <input value="${esc(valeur)}" onchange="window.majProfilChamp('${champ}', this.value)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
    </div>`;
}

function renderDebourse(p) {
    const d = p.debourse;
    const res = calculerDebourse(d);
    return `
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-black text-lg mb-1">Mon taux horaire</h3>
      <p class="text-xs text-gray-400 font-bold mb-4">"Combien prendre ?" — calculé, pas deviné : revenu voulu + cotisations + frais, divisé par tes heures réellement facturables.</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Revenu net voulu / mois (€)</label>
          <input type="number" value="${d.revenuMensuel}" onchange="window.majDebourse('revenuMensuel', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Frais généraux / an (€)</label>
          <input type="number" value="${d.fraisAnnuels}" onchange="window.majDebourse('fraisAnnuels', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Heures facturables / an</label>
          <input type="number" value="${d.heuresFacturables}" onchange="window.majDebourse('heuresFacturables', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Cotisations (% du CA)</label>
          <input type="number" step="0.1" value="${d.cotisationsPct}" onchange="window.majDebourse('cotisationsPct', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Marge de sécurité (%)</label>
          <input type="number" value="${d.margePct}" onchange="window.majDebourse('margePct', parseFloat(this.value)||0)" class="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold">
        </div>
      </div>

      <div class="bg-kalou-dark text-white rounded-2xl p-5 mt-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest">Coût de revient horaire</p>
          <p class="text-lg font-black">${fmt(res.coutRevientHoraire)} € / h</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-black uppercase text-kalou-orange tracking-widest">Prix de vente conseillé</p>
          <p class="text-2xl font-black">${fmt(res.prixVenteHoraire)} € / h</p>
        </div>
      </div>
      <button onclick="window.appliquerTauxDebourse(${res.prixVenteHoraire})" class="w-full mt-3 bg-kalou-orange text-white font-black text-sm uppercase h-12 rounded-2xl active:scale-95 transition-all">
        Utiliser ${fmt(res.prixVenteHoraire)} €/h comme mon taux
      </button>
      <p class="text-xs text-gray-400 font-bold mt-3 text-center">Taux actuellement utilisé pour les devis : <b class="text-kalou-dark">${fmt(p.tauxHoraire)} €/h</b></p>
    </div>`;
}

function renderCatalogue(type, titre, items) {
    const parCat = items.reduce((acc, it) => { (acc[it.cat] = acc[it.cat] || []).push(it); return acc; }, {});
    return `
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-black text-lg mb-1">${esc(titre)}</h3>
      <p class="text-xs text-gray-400 font-bold mb-4">Modifie un prix pour l'ajuster à ton négociant — enregistré immédiatement.</p>
      <div class="space-y-5">
        ${Object.entries(parCat).map(([cat, list]) => `
        <div>
          <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">${esc(cat)}</p>
          <div class="space-y-1.5">
            ${list.map(it => `
            <div class="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2">
              <span class="font-bold text-sm truncate">${esc(it.label)}</span>
              <span class="flex items-center gap-2 shrink-0">
                <input type="number" step="any" value="${it.prix}" onchange="window.majPrix('${type}','${it.id}', parseFloat(this.value)||0)" class="w-24 h-10 px-2 text-right rounded-lg border-2 border-gray-100 bg-white font-black">
                <span class="text-xs text-gray-400 font-bold w-14">€/${esc(it.unite)}</span>
                <button onclick="window.resetPrixCatalogue('${type}','${it.id}')" title="Revenir au prix par défaut" class="text-gray-300 hover:text-kalou-orange font-black text-sm px-1">↺</button>
              </span>
            </div>`).join('')}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export function majProfilChamp(champ, valeur) {
    updateProfil({ [champ]: valeur });
    renderReglages();
    showToast('Enregistré');
}

export function majDebourse(champ, valeur) {
    const p = getProfil();
    updateProfil({ debourse: { ...p.debourse, [champ]: valeur } });
    renderReglages();
}

export function appliquerTauxDebourse(taux) {
    updateProfil({ tauxHoraire: taux });
    renderReglages();
    showToast('Taux horaire mis à jour');
}

export function majPrix(type, id, prix) {
    setPrix(type, id, prix);
    showToast('Prix mis à jour');
}

export function resetPrixCatalogue(type, id) {
    resetPrix(type, id);
    renderReglages();
    showToast('Prix par défaut restauré');
}

// ─── Sauvegarde / restauration ────────────────────────────────────────────────

export function exporterSauvegarde() {
    const sauvegarde = construireSauvegarde();
    const contenu    = JSON.stringify(sauvegarde, null, 2);
    const date       = new Date().toISOString().slice(0, 10);
    const nomFichier = `kalou-sauvegarde-${date}.json`;
    const blob       = new Blob([contenu], { type: 'application/json' });

    // Sur mobile : privilégier le partage natif (fichier) si disponible
    if (navigator.canShare) {
        const fichier = new File([blob], nomFichier, { type: 'application/json' });
        if (navigator.canShare({ files: [fichier] })) {
            navigator.share({ files: [fichier], title: 'Sauvegarde Kalou BTP' })
                .then(() => showToast('Sauvegarde partagée'))
                .catch(() => { /* annulé par l'utilisateur : rien à faire */ });
            return;
        }
    }
    // Sinon : téléchargement classique
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Sauvegarde exportée');
}

export function importerSauvegarde() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
        const fichier = input.files && input.files[0];
        if (!fichier) return;
        const reader = new FileReader();
        reader.onload = () => {
            let obj;
            try { obj = JSON.parse(reader.result); }
            catch { return showToast('Fichier illisible', true); }

            if (!estSauvegardeValide(obj)) return showToast('Ce n\'est pas une sauvegarde Kalou BTP', true);

            const r = resumeSauvegarde(obj);
            const details = [
                `• ${r.devis} devis / estimation${r.devis > 1 ? 's' : ''}`,
                `• ${r.chantiers} chantier${r.chantiers > 1 ? 's' : ''}`,
                r.profil ? '• profil entreprise' : null,
                r.prix   ? '• tarifs personnalisés' : null
            ].filter(Boolean).join('\n');

            if (!confirm(`Importer cette sauvegarde ?\n\n${details}\n\nElle sera fusionnée avec tes données actuelles (rien n'est supprimé).`)) return;

            fusionnerSauvegarde(obj);
            renderReglages();
            showToast('Sauvegarde importée');
        };
        reader.readAsText(fichier);
    });
    input.click();
}
