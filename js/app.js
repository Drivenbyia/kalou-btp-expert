import { handleGrosCalculate }           from './calculators/gros_oeuvre.js';
import { calculatePlaco }                from './calculators/placo.js';
import { calculateSols }                 from './calculators/sols.js';
import { switchTab, setSecondType, setGrosType, renderGrosSubNav } from './ui/navigation.js';
import { shareResults }                  from './ui/render.js';
import { showToast }                     from './ui/toast.js';
import { saveHistory, deleteHistory, clearHistory, renderHistory, shareConsolidated } from './storage.js';
import { initPWA }                       from './pwa.js';
import {
    renderDevisList, nouveauDevis, ouvrirDevis, fermerEditeurDevis, ajouterAuDevis,
    majChamp, majLigne, supprimerLigne, ajouterLigneManuelle, togglePicker,
    ajouterLigneOuvrage, importerCalcul, changerTypeDevis, dupliquerDevisUI,
    supprimerDevisUI, exporterPdf,
    ouvrirConfigOuvrage, majConfigDim, toggleConfigOpt, annulerConfig, validerConfig,
    toggleCourses, partagerCourses
}                                         from './ui/devis_view.js';
import { renderReglages, majProfilChamp, majDebourse, appliquerTauxDebourse, majPrix, resetPrixCatalogue, exporterSauvegarde, importerSauvegarde } from './ui/tarifs_view.js';

// Exposition globale (nécessaire pour les onclick dans le HTML)
window.handleGrosCalculate = handleGrosCalculate;
window.calculatePlaco      = calculatePlaco;
window.calculateSols       = calculateSols;
window.switchTab           = switchTab;
window.setSecondType       = setSecondType;
window.setGrosType         = setGrosType;
window.shareResults        = shareResults;
window.showToast           = showToast;
window.saveHistory         = saveHistory;
window.deleteHistory       = deleteHistory;
window.clearHistory        = clearHistory;
window.renderHistory       = renderHistory;
window.shareConsolidated   = shareConsolidated;

// Devis / Estimations
window.renderDevisList           = renderDevisList;
window.nouveauDevis              = nouveauDevis;
window.ouvrirDevis               = ouvrirDevis;
window.fermerEditeurDevis        = fermerEditeurDevis;
window.ajouterAuDevis            = ajouterAuDevis;
window.majChampDevis             = majChamp;
window.majLigneDevis             = majLigne;
window.supprimerLigneDevis       = supprimerLigne;
window.ajouterLigneManuelleDevis = ajouterLigneManuelle;
window.togglePickerDevis         = togglePicker;
window.ajouterLigneOuvrageDevis  = ajouterLigneOuvrage;
window.importerCalculDevis       = importerCalcul;
window.changerTypeDevisUI        = changerTypeDevis;
window.dupliquerDevisUI          = dupliquerDevisUI;
window.supprimerDevisUI          = supprimerDevisUI;
window.exporterPdfDevis          = exporterPdf;
window.ouvrirConfigOuvrageDevis  = ouvrirConfigOuvrage;
window.majConfigDimDevis         = majConfigDim;
window.toggleConfigOptDevis      = toggleConfigOpt;
window.annulerConfigDevis        = annulerConfig;
window.validerConfigDevis        = validerConfig;
window.toggleCoursesDevis        = toggleCourses;
window.partagerCoursesDevis      = partagerCourses;

// Réglages / Tarifs
window.renderReglages       = renderReglages;
window.majProfilChamp       = majProfilChamp;
window.majDebourse          = majDebourse;
window.appliquerTauxDebourse = appliquerTauxDebourse;
window.majPrix               = majPrix;
window.resetPrixCatalogue    = resetPrixCatalogue;
window.exporterSauvegarde    = exporterSauvegarde;
window.importerSauvegarde    = importerSauvegarde;

window.addEventListener('load', () => {
    initPWA();
    renderGrosSubNav();
    setGrosType('dalle');

    // Empêcher les valeurs négatives globalement
    document.addEventListener('input', (e) => {
        if (e.target.type === 'number') {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val < 0) e.target.value = '';
        }
    });
});
