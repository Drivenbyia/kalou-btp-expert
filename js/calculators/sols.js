import { showToast } from '../ui/toast.js';
import { renderResults } from '../ui/render.js';

export function calculateSols() {
    const surfEl = document.getElementById('s-surf');
    const lEl    = document.getElementById('s-l');
    const wEl    = document.getElementById('s-w');

    // Validation inline
    let valid = true;
    [surfEl, lEl, wEl].forEach(el => {
        const wrap = el.closest('.field-wrapper');
        const val  = parseFloat(el.value.replace(',', '.'));
        if (isNaN(val) || val <= 0) {
            valid = false;
            if (wrap) wrap.classList.add('field-error');
        } else {
            if (wrap) wrap.classList.remove('field-error');
        }
    });
    if (!valid) return showToast('Remplis tous les champs requis', true);

    const surf = parseFloat(surfEl.value.replace(',', '.'));
    const l    = parseFloat(lEl.value);
    const w    = parseFloat(wEl.value);
    const type = document.getElementById('s-type').value;
    const pose = document.getElementById('s-pose').value;

    const marge  = pose === 'diagonale' ? 1.15 : 1.10;
    const surfU  = (l * w) / 10000;                        // cm² → m²
    const nb     = Math.ceil((surf * marge) / surfU);

    const results = [{ l: type === 'carrelage' ? 'Carreaux' : 'Lames', v: nb, u: 'unités', h: true }];

    if (type === 'carrelage') {
        // DTU 52.2 : consommation colle selon format
        const maxDim = Math.max(l, w);
        let colleFactor;
        if      (maxDim <= 30) colleFactor = 3.5;   // petit format
        else if (maxDim <= 60) colleFactor = 5.0;   // moyen format
        else                   colleFactor = 6.5;   // grand format (double encollage)

        results.push({ l: 'Colle (sac 25kg)', v: Math.ceil(surf * colleFactor / 25), u: 'sacs' });
        results.push({ l: 'Joint (sac 5kg)',  v: Math.ceil(surf * 0.5 / 5),           u: 'sacs' });
    } else {
        results.push({ l: 'Sous-couche', v: Math.ceil(surf * 1.05), u: 'm²' });
    }

    renderResults('second-results', results, 'Chantier Sols', 'Second Œuvre');
}
