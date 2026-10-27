// === ESTIMATION « FAÇON ENTREPRISE » (option désactivée par défaut) ===
// Donne un ordre de grandeur : ce que coûteraient les matériaux, et ce qu'une
// entreprise facturerait pour le même travail (matériaux + marge + main d'œuvre + TVA).
// Aucun devis, aucune facture : juste un repère.

import { MATERIAUX, quantiteAchat } from './materiaux.js';

/**
 * @param {Array<{k,q}>} lignes
 * @param {number} heures  heures de travail estimées
 * @param {object} r       réglages { taux, margeMat, tva }
 * @param {object} prix    prix par matériau (unité d'achat)
 * @param {object} ctx     contexte de calcul (sac de ciment)
 * @param {number} [tva]   taux de TVA forcé (maison neuve : 20 %)
 */
export function estimerCout(lignes, heures, r, prix, ctx = {}, tva = null) {
    let mat = 0;
    (lignes || []).forEach(li => {
        if (!li || !li.k || !MATERIAUX[li.k]) return;
        const pu = prix[li.k] ?? MATERIAUX[li.k].prix ?? 0;
        mat += quantiteAchat(li.k, li.q, ctx) * pu;
    });
    const h = Math.max(0, heures || 0);
    const mo = h * (r.taux || 0);
    const matFacture = mat * (1 + (r.margeMat || 0) / 100);
    const ht = matFacture + mo;
    const t = tva ?? r.tva ?? 10;
    return {
        mat: Math.round(mat),
        heures: Math.round(h),
        jours: Math.round(h / 8 * 2) / 2,
        mo: Math.round(mo),
        ht: Math.round(ht),
        tva: t,
        ttc: Math.round(ht * (1 + t / 100))
    };
}
