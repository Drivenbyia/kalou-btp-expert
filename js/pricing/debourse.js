// === CALCUL DU TAUX HORAIRE (déboursé horaire) ===
// Méthode : (revenu net voulu + cotisations + frais généraux) ÷ heures
// réellement facturables, puis ajout d'une marge de sécurité.
// Voir .vibe_brain/4_plan_chiffrage_devis.md §2 pour le détail pédagogique.

/**
 * @param {object} p
 * @param {number} p.revenuMensuel      — net souhaité par mois (€)
 * @param {number} p.fraisAnnuels       — frais généraux annuels (véhicule, assurances, outillage…)
 * @param {number} p.heuresFacturables  — heures réellement facturables par an (souvent 1100-1300)
 * @param {number} p.cotisationsPct     — cotisations sociales en % du CA encaissé (micro ≈ 21.2)
 * @param {number} p.margePct          — marge de sécurité en % appliquée au coût de revient
 */
export function calculerDebourse(p) {
    const revenuAnnuel = p.revenuMensuel * 12;

    // Les cotisations s'appliquent sur le CA encaissé, donc sur le coût de revient
    // lui-même (montant "brut" à générer pour dégager le revenu net voulu).
    // CA nécessaire = (revenu + frais) / (1 - cotisationsPct/100)
    const base = revenuAnnuel + p.fraisAnnuels;
    const caNecessaire = base / (1 - p.cotisationsPct / 100);
    const cotisations = caNecessaire - base;

    const coutRevientHoraire = caNecessaire / p.heuresFacturables;
    const prixVenteHoraire   = coutRevientHoraire * (1 + p.margePct / 100);

    return {
        revenuAnnuel,
        cotisations:        Math.round(cotisations),
        caNecessaire:       Math.round(caNecessaire),
        coutRevientHoraire: Math.round(coutRevientHoraire * 100) / 100,
        prixVenteHoraire:   Math.round(prixVenteHoraire * 100) / 100
    };
}
