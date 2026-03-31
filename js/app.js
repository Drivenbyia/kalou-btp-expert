import { handleGrosCalculate }           from './calculators/gros_oeuvre.js';
import { calculatePlaco }                from './calculators/placo.js';
import { calculateSols }                 from './calculators/sols.js';
import { switchTab, setSecondType, setGrosType, renderGrosSubNav } from './ui/navigation.js';
import { shareResults }                  from './ui/render.js';
import { showToast }                     from './ui/toast.js';
import { saveHistory, deleteHistory, clearHistory, renderHistory, shareConsolidated } from './storage.js';
import { initPWA }                       from './pwa.js';

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
