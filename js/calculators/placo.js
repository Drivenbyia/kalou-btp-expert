import { showToast } from '../ui/toast.js';
import { renderResults } from '../ui/render.js';

export function calculatePlaco() {
    const lEl = document.getElementById('p-long');
    const hEl = document.getElementById('p-haut');

    // Validation inline
    let valid = true;
    [lEl, hEl].forEach(el => {
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

    const l      = parseFloat(lEl.value.replace(',', '.'));
    const h      = parseFloat(hEl.value.replace(',', '.'));
    const type   = document.getElementById('p-type').value;
    const sizeM  = parseFloat(document.getElementById('p-taille').value);
    const modeM  = document.getElementById('p-montage').value;

    const surf       = l * h;
    const surfPlates = type === 'cloison' ? surf * 2 : surf;
    const nbPlaques  = Math.ceil((surfPlates * 1.1) / 3);

    const results = [
        { l: 'Plaques BA13', v: nbPlaques, u: 'unités', h: true },
    ];

    if (type === 'plafond') {
        // Plafond : fourrures F530 entraxe 60 cm + suspentes tous les 1.2 m
        // (les "l" et "h" sont ici longueur × largeur du plafond)
        const nbFourrures  = Math.ceil(h / 0.6) + 1;        // fourrures sur la largeur
        const longFourruresML = nbFourrures * l;
        const nbFourrures3m = Math.ceil(longFourruresML / 3);
        const nbSuspentes  = nbFourrures * (Math.ceil(l / 1.2) + 1);

        results.push({ l: 'Fourrures F530 (3m)', v: nbFourrures3m, u: 'unités' });
        results.push({ l: 'Suspentes',           v: nbSuspentes,   u: 'unités' });
    } else {
        // Cloison / doublage : rails U haut+bas + montants tous les 60 cm
        const nbRails    = Math.ceil((l * 2) / 3);
        const nbMontants = (Math.ceil(l / 0.6) + 1) * (modeM === 'double' ? 2 : 1) * Math.ceil(h / sizeM);
        results.push({ l: 'Rails (3m)',           v: nbRails,    u: 'unités' });
        results.push({ l: `Montants (${sizeM}m)`, v: nbMontants, u: 'unités' });
    }

    results.push({ l: 'Vis (boîte 500)', v: Math.ceil(surfPlates * 12 / 500),  u: 'boîtes'  });  // DTU 25.41 : 12 vis/m²
    results.push({ l: 'Bandes (150m)',   v: Math.ceil(surfPlates * 1.5 / 150), u: 'rouleaux'});
    results.push({ l: 'Enduit à joint',  v: Math.ceil(surfPlates * 0.6),       u: 'kg'      });

    renderResults('second-results', results, 'Chantier Placo', 'Second Œuvre');
}
