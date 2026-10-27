// Écran « Réglages » : sacs de ciment, option estimation entreprise, prix, sauvegarde.

import { esc, fmt, num } from '../core/format.js';
import { getReglages, setReglages, getPrix, setPrix, resetPrix, prixModifies, exporterDonnees, importerDonnees, listeChantiers, noterSauvegarde, derniereSauvegarde } from '../core/store.js';
import { MATERIAUX, CATEGORIES, PRIX_DEFAUT, libelle, unitePrix } from '../calc/materiaux.js';
import { toast, confirmer } from '../ui/dom.js';
import { entete, aller, APP_VERSION } from '../app.js';

export function vueReglages(root) {
    entete({ titre: 'Réglages' });
    const r = getReglages();
    const ctx = { sacCiment: r.sacCiment };

    const seg = (id, options, val) => `<div class="seg">${options.map(o =>
        `<button type="button" class="${String(val) === String(o.v) ? 'on' : ''}" data-set="${id}" data-v="${o.v}">${esc(o.l)}</button>`).join('')}</div>`;

    const prix = getPrix();
    const modifs = new Set(prixModifies());

    root.innerHTML = `
        <p class="section-title">Mes achats</p>
        <div class="card">
            <span class="lab" style="font-weight:700;display:block;margin-bottom:8px">Je prends le ciment en sacs de</span>
            ${seg('sacCiment', [{ v: 35, l: '35 kg' }, { v: 25, l: '25 kg' }], r.sacCiment)}
            <p class="hint" style="margin-top:8px;font-size:13.5px">Tous les calculs comptent les sacs avec ce poids.</p>
        </div>

        <p class="section-title">Estimation de coût</p>
        <div class="card">
            <button type="button" class="switch${r.estimation ? ' on' : ''}" data-toggle="estimation" role="switch" aria-checked="${r.estimation}">
                <span>Afficher une estimation « façon entreprise »</span><i></i>
            </button>
            <p class="hint" style="font-size:13.5px;margin-top:4px">Montre, sous chaque calcul et chaque chantier, le coût des matériaux et ce qu'une entreprise facturerait (main d'œuvre + marge + TVA). Juste un repère, aucun devis.</p>
            ${r.estimation ? `
            <div style="margin-top:10px">
                <div class="set-row"><div class="tx"><b>Taux horaire d'un maçon</b><small>€ HT de l'heure</small></div><input inputmode="decimal" data-num="taux" value="${esc(String(r.taux).replace('.', ','))}"></div>
                <div class="set-row"><div class="tx"><b>Marge sur les matériaux</b><small>% ajouté par l'entreprise</small></div><input inputmode="decimal" data-num="margeMat" value="${esc(String(r.margeMat).replace('.', ','))}"></div>
                <div class="set-row" style="display:block"><div class="tx" style="margin-bottom:8px"><b>TVA</b><small>Rénovation 10 %, neuf 20 % (la maison neuve est toujours à 20 %)</small></div>
                    ${seg('tva', [{ v: 10, l: '10 % rénovation' }, { v: 20, l: '20 % neuf' }], r.tva)}</div>
            </div>
            <details class="more" style="margin-top:6px">
                <summary>Prix des matériaux (${Object.keys(MATERIAUX).length})</summary>
                <p class="hint" style="font-size:13.5px;margin:4px 0 8px">Prix TTC indicatifs (négoce Dordogne). Mets ceux de ton fournisseur : la case devient orange.</p>
                ${CATEGORIES.map(cat => `
                    <details class="more"><summary>${esc(cat.l)}</summary>
                    ${Object.entries(MATERIAUX).filter(([, m]) => m.cat === cat.id).map(([k]) => `
                        <div class="set-row"><div class="tx"><b>${esc(libelle(k, ctx))}</b><small>€ par ${esc(unitePrix(k, ctx))}${modifs.has(k) ? ` · défaut ${fmt(PRIX_DEFAUT[k], 2)} €` : ''}</small></div>
                        <input inputmode="decimal" data-prix="${k}" class="${modifs.has(k) ? 'mod' : ''}" value="${esc(String(prix[k]).replace('.', ','))}"></div>`).join('')}
                    </details>`).join('')}
                <button class="btn btn-light btn-block btn-sm" id="reset-prix" style="margin-top:12px">Remettre tous les prix par défaut</button>
            </details>` : ''}
        </div>

        <p class="section-title">Sauvegarde</p>
        <div class="card">
            <p class="hint" style="font-size:14px;margin-bottom:8px"><b>Dernière sauvegarde : ${derniereSauvegarde() ? new Date(derniereSauvegarde()).toLocaleDateString('fr-FR') : 'jamais'}</b></p>
            <p class="hint" style="font-size:14px;margin-bottom:12px">Les chantiers restent dans ce téléphone. Fais une copie de temps en temps (ou pour passer sur un autre appareil) : l'import ajoute sans rien effacer.</p>
            <div class="row">
                <button class="btn btn-dark btn-sm" id="exporter">⤓ Sauvegarder</button>
                <button class="btn btn-light btn-sm" id="importer">⤒ Restaurer</button>
            </div>
            <input type="file" id="fichier" accept="application/json,.json" class="hidden">
        </div>

        <p class="section-title">Comment sont faits les calculs</p>
        <div class="card">
            <ul class="infos" style="margin:0">
                <li>Béton : par m³, le dosage en ciment (350 kg = 10 sacs de 35 kg, béton toupie C25/30), ≈ 400 L de sable 0/4 (0,65 T) et ≈ 800 L de gravillon 4/20 (1,15 T), ≈ 175 L d'eau. Remplissage de blocs et chaînages : gravillon 4/10.</li>
                <li>Mortier : par m³, le dosage en liant et ≈ 1 m³ de sable (1,5 T). Hourdage parpaing 20 : ≈ 20 L de mortier par m².</li>
                <li>Agglos : 10 au m² (+5 % de casse). Brique rectifiée de 20 : 6,4 au m². Monomur 30 : 16,2 au m². Treillis 2,40×3,60 : 6,9 m² utiles (2 mailles de recouvrement).</li>
                <li>Pertes comprises : béton +5 %, mortiers et enduits +10 %, plaques et carrelage +10 % (diagonale +15 %), tuiles +5 %.</li>
                <li>Enduit monocouche : ≈ 17 kg par m² et par cm. Enduits en 3 couches à dosages dégressifs : chaux 450 / 325 / 275 kg, traditionnel 500 / 400 / 300 kg. Mortier de pierre et joints à la chaux : 300 à 325 kg, jamais plus dur que la pierre.</li>
                <li>Placo (DTU 25.41) : plaque toute hauteur jusqu'à 3 m. Cloison 72/48 : 2,60 m maxi (2,95 m en montants doublés), 98/48 : 3 m (3,40 m doublés). Plafond isolé : fourrures tous les 50 cm. Doublage collé : MAP ≈ 4 kg/m².</li>
                <li>Isolation : R = épaisseur ÷ λ. Soufflé R 8 en laine de verre ≈ 385 mm (tassement compris). Carrelage : joint calculé selon le format et la largeur du joint.</li>
                <li>Hérisson : 1,8 T par m³ compacté. Terre foisonnée : ×1,25 (argile ×1,35, roche ×1,5).</li>
                <li>Ce sont des ordres de grandeur pour commander : vérifier sur les notices des fabricants et faire valider les éléments de structure (IPN, charpente, planchers).</li>
            </ul>
        </div>
        <p style="text-align:center;color:var(--soft);font-size:13px;margin-top:18px">Kalou BTP · version ${APP_VERSION} · ${listeChantiers().length} chantier(s) enregistré(s)</p>`;

    // Choix (sac ciment, TVA)
    root.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
        setReglages({ [b.dataset.set]: Number(b.dataset.v) });
        toast('Réglage enregistré');
        aller('#/reglages', { remplacer: true });
    }));
    // Interrupteur estimation
    root.querySelector('[data-toggle="estimation"]').addEventListener('click', () => {
        const on = !getReglages().estimation;
        setReglages({ estimation: on });
        toast(on ? 'Estimation de coût activée' : 'Estimation de coût masquée');
        aller('#/reglages', { remplacer: true });
    });
    // Taux, marge
    root.querySelectorAll('[data-num]').forEach(inp => inp.addEventListener('change', () => {
        const x = num(inp.value);
        if (isNaN(x) || x < 0) { toast('Valeur incorrecte', true); return; }
        setReglages({ [inp.dataset.num]: x });
        toast('Enregistré');
    }));
    // Prix
    root.querySelectorAll('[data-prix]').forEach(inp => inp.addEventListener('change', () => {
        const k = inp.dataset.prix;
        const x = num(inp.value);
        if (inp.value.trim() === '') { setPrix(k, null); inp.value = String(PRIX_DEFAUT[k]).replace('.', ','); inp.classList.remove('mod'); return; }
        if (isNaN(x) || x < 0) { toast('Prix incorrect', true); return; }
        setPrix(k, x);
        inp.classList.toggle('mod', x !== PRIX_DEFAUT[k]);
        toast('Prix enregistré');
    }));
    const rp = root.querySelector('#reset-prix');
    if (rp) rp.addEventListener('click', async () => {
        if (!await confirmer('Remettre les prix par défaut ?', 'Tes prix personnalisés seront effacés.', 'Remettre', true)) return;
        resetPrix();
        toast('Prix par défaut remis');
        aller('#/reglages', { remplacer: true });
    });

    // Sauvegarde
    root.querySelector('#exporter').addEventListener('click', async () => {
        const data = JSON.stringify(exporterDonnees(), null, 1);
        const nom = `kalou-btp-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
        const fichier = new File([data], nom, { type: 'application/json' });
        noterSauvegarde();
        if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            try { await navigator.share({ files: [fichier], title: 'Sauvegarde Kalou BTP' }); return; }
            catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(fichier);
        a.download = nom;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Fichier de sauvegarde téléchargé');
    });
    const fichier = root.querySelector('#fichier');
    root.querySelector('#importer').addEventListener('click', () => fichier.click());
    fichier.addEventListener('change', async () => {
        const f = fichier.files && fichier.files[0];
        if (!f) return;
        try {
            const obj = JSON.parse(await f.text());
            const nb = importerDonnees(obj);
            toast(`Restauré : ${nb} chantier(s)`);
            aller('#/chantiers');
        } catch (e) {
            toast('Ce fichier n\'est pas une sauvegarde Kalou BTP', true);
        }
        fichier.value = '';
    });
}
