import { calculerTotaux, totalLigne } from '../pricing/devis.js';
import { getProfil } from '../pricing/tarifs.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmt(n) {
    return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// ─── Impression ───────────────────────────────────────────────────────────────

export function imprimerDevis(devis) {
    const profil = getProfil();
    const t = calculerTotaux(devis);
    const sheet = document.getElementById('devis-print-sheet');
    sheet.innerHTML = buildHTML(devis, profil, t);
    window.print();
}

function buildHTML(devis, profil, t) {
    const isEstimation = devis.type === 'estimation';
    const isFacture    = devis.type === 'facture';
    const netAPayer    = Math.round((t.totalTTC - t.acompte) * 100) / 100;
    const regimeTaux = { franchise: 0, '10': 10, '20': 20 }[devis.regimeTVA] ?? 0;
    const tauxLigne = l => (l.tva !== null && l.tva !== undefined) ? l.tva : regimeTaux;

    const enTeteEntreprise = `
        <div class="pp-co-nm">${esc(profil.entreprise) || 'Nom de l\'entreprise à renseigner'}${profil.formeJuridique ? `<span class="pp-ei">${esc(profil.formeJuridique)}</span>` : ''}</div>
        <div class="pp-co-li">
            ${esc(profil.artisan)}${profil.artisan ? ' — ' : ''}Entrepreneur Individuel<br>
            ${esc(profil.adresse) || 'Adresse à renseigner'} ${profil.tel ? '· ' + esc(profil.tel) : ''}<br>
            ${profil.siret ? `SIRET ${esc(profil.siret)} · ` : ''}APE ${esc(profil.ape)}<br>
            ${!isEstimation ? `Assurance décennale : <b>${esc(profil.assureurDecennale) || '[Assureur à renseigner]'}</b>${profil.contratDecennale ? ', contrat n° ' + esc(profil.contratDecennale) : ''} — couverture ${esc(profil.zoneDecennale)}` : ''}
        </div>`;

    const lignesHTML = devis.lignes.map(l => `
        <tr>
            <td class="pp-l">
                <div class="pp-dg">${esc(l.designation)}</div>
                ${l.detail ? `<div class="pp-dt">${esc(l.detail)}</div>` : ''}
            </td>
            <td>${esc(String(l.qte))}</td>
            <td>${esc(l.unite)}</td>
            <td>${fmt(l.puHT)}</td>
            <td>${t.mentionFranchise ? '—' : tauxLigne(l) + ' %'}</td>
            <td>${fmt(totalLigne(l))}</td>
        </tr>`).join('');

    const mentionTVA = t.mentionFranchise
        ? 'TVA non applicable, art. 293 B du CGI.'
        : 'TVA au taux indiqué ci-dessus — attestation TVA à compléter par le client si travaux à taux réduit.';
    const mentionRetard = 'En cas de retard de paiement : pénalités au taux légal en vigueur + indemnité forfaitaire de recouvrement de 40 €.';
    const mentionMediateur = profil.mediateur ? `Le client peut recourir au médiateur de la consommation : <b>${esc(profil.mediateur)}</b>.` : '';

    const mentionsLegales = isEstimation ? `
        <div class="pp-mentions">
            <b>Estimation à titre indicatif — ne vaut pas devis.</b> Ce document ne constitue pas un engagement contractuel
            et ne comporte pas l'ensemble des mentions légales obligatoires. Un devis conforme sera établi avant le début
            des travaux, une fois l'entreprise déclarée.
        </div>` : isFacture ? `
        <div class="pp-mentions">
            <b>Conditions de règlement.</b> Facture payable à réception${profil.rib ? ' — RIB : ' + esc(profil.rib) : ''}. ${mentionTVA}
            ${mentionRetard} ${mentionMediateur}
            Assurance décennale et RC pro souscrites (voir en-tête). Travaux exécutés conformément au devis accepté.
        </div>` : `
        <div class="pp-mentions">
            <b>Conditions.</b> Devis gratuit, valable ${esc(profil.validite)}. Acompte de ${devis.acomptePct}% à la commande,
            solde à la fin des travaux. ${mentionTVA}
            ${mentionRetard} ${mentionMediateur}
            Assurance décennale et RC pro souscrites (voir en-tête).
            <br><br><b>À retourner signé</b> avec la mention « Bon pour accord », daté, avant tout début de travaux.
        </div>`;

    return `
    <style>
        #devis-print-sheet{font-family:-apple-system,system-ui,sans-serif;color:#1A1A1A;font-size:12.5px;padding:14mm;}
        #devis-print-sheet .pp-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid #1A1A1A;padding-bottom:18px}
        #devis-print-sheet .pp-co-nm{font-size:19px;font-weight:900}
        #devis-print-sheet .pp-ei{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;background:#1A1A1A;color:#fff;padding:2px 7px;border-radius:5px;margin-left:7px;vertical-align:middle}
        #devis-print-sheet .pp-co-li{font-size:11px;color:#4B515A;line-height:1.6;margin-top:8px}
        #devis-print-sheet .pp-title{text-align:right}
        #devis-print-sheet .pp-big{font-size:28px;font-weight:900;letter-spacing:.04em;color:#FF7A00}
        #devis-print-sheet .pp-mt{font-size:11px;color:#4B515A;line-height:1.7;margin-top:6px}
        #devis-print-sheet .pp-parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0 6px}
        #devis-print-sheet .pp-box{border:1px solid #E1E4E9;border-radius:10px;padding:12px 14px}
        #devis-print-sheet .pp-lab{font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#98A0AC;margin-bottom:6px}
        #devis-print-sheet .pp-nm{font-weight:800;font-size:13.5px}
        #devis-print-sheet table.pp-lines{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
        #devis-print-sheet table.pp-lines th{background:#1A1A1A;color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:9px 10px;text-align:right}
        #devis-print-sheet table.pp-lines th:first-child{text-align:left;border-radius:6px 0 0 0}
        #devis-print-sheet table.pp-lines th:last-child{border-radius:0 6px 0 0}
        #devis-print-sheet table.pp-lines td{padding:11px 10px;border-bottom:1px solid #EDEFF2;text-align:right;vertical-align:top}
        #devis-print-sheet table.pp-lines td.pp-l{text-align:left}
        #devis-print-sheet .pp-dg{font-weight:800}
        #devis-print-sheet .pp-dt{font-size:10.5px;color:#6B717A;line-height:1.45;margin-top:2px}
        #devis-print-sheet .pp-tot{display:flex;justify-content:flex-end;margin-top:16px}
        #devis-print-sheet .pp-tot .box{width:290px}
        #devis-print-sheet .pp-tot .r{display:flex;justify-content:space-between;padding:6px 2px;font-size:12.5px}
        #devis-print-sheet .pp-tot .r.grand{border-top:2px solid #1A1A1A;margin-top:6px;padding-top:10px}
        #devis-print-sheet .pp-tot .r.grand span{font-weight:900;text-transform:uppercase;font-size:13px}
        #devis-print-sheet .pp-tot .r.grand b{font-size:20px;font-weight:900;color:#C85E00}
        #devis-print-sheet .pp-tot .r.ac{background:#FFF3E8;border-radius:8px;padding:8px 10px;margin-top:8px}
        #devis-print-sheet .pp-mentions{margin-top:22px;border-top:1px solid #E1E4E9;padding-top:14px;font-size:9.8px;color:#5A616B;line-height:1.65}
        #devis-print-sheet .pp-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
        #devis-print-sheet .pp-sign .s{border:1px solid #E1E4E9;border-radius:10px;padding:12px 14px;min-height:80px}
        #devis-print-sheet .pp-sign .lab{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#98A0AC}
    </style>
    <div class="pp-head">
        <div>${enTeteEntreprise}</div>
        <div class="pp-title">
            <div class="pp-big">${isFacture ? 'FACTURE' : isEstimation ? 'ESTIMATION' : 'DEVIS'}</div>
            <div class="pp-mt">
                N° <b>${esc(devis.num)}</b><br>
                Date : <b>${fmtDate(devis.date)}</b><br>
                ${isFacture ? 'Échéance : <b>à réception</b>' : !isEstimation ? `Validité : <b>${esc(profil.validite)}</b>` : ''}
            </div>
        </div>
    </div>

    <div class="pp-parties">
        <div class="pp-box">
            <div class="pp-lab">Client</div>
            <div class="pp-nm">${esc(devis.client.nom) || '—'}</div>
            <div class="pp-mt" style="margin-top:2px">${esc(devis.client.adresse)}${devis.client.tel ? '<br>' + esc(devis.client.tel) : ''}</div>
        </div>
        <div class="pp-box">
            <div class="pp-lab">Chantier</div>
            <div class="pp-nm">${esc(devis.chantier.description) || '—'}</div>
            <div class="pp-mt" style="margin-top:2px">${esc(devis.chantier.adresse) || 'Adresse identique au client'}</div>
        </div>
    </div>

    <table class="pp-lines">
        <thead><tr><th>Désignation</th><th>Qté</th><th>Un.</th><th>PU HT</th><th>TVA</th><th>Total HT</th></tr></thead>
        <tbody>${lignesHTML}</tbody>
    </table>

    <div class="pp-tot">
        <div class="box">
            <div class="r"><span>Total HT</span><b>${fmt(t.totalHT)} €</b></div>
            ${t.mentionFranchise
                ? `<div class="r"><span style="font-size:10px">TVA non applicable, art. 293 B du CGI</span></div>`
                : t.parTaux.map(g => `<div class="r"><span>TVA ${g.taux}%</span><b>${fmt(g.montant)} €</b></div>`).join('')}
            <div class="r grand"><span>Total TTC</span><b>${fmt(t.totalTTC)} €</b></div>
            ${isFacture
                ? (devis.acomptePct > 0
                    ? `<div class="r"><span>Acompte déjà versé</span><b>− ${fmt(t.acompte)} €</b></div><div class="r ac"><span>Net à payer</span><b>${fmt(netAPayer)} €</b></div>`
                    : `<div class="r ac"><span>Net à payer</span><b>${fmt(t.totalTTC)} €</b></div>`)
                : !isEstimation
                    ? `<div class="r ac"><span>Acompte ${devis.acomptePct}% à la commande</span><b>${fmt(t.acompte)} €</b></div>`
                    : ''}
        </div>
    </div>

    ${mentionsLegales}

    ${!isEstimation && !isFacture ? `
    <div class="pp-sign">
        <div class="s"><div class="lab">L'entreprise</div></div>
        <div class="s"><div class="lab">Le client — Bon pour accord</div></div>
    </div>` : ''}
    `;
}
