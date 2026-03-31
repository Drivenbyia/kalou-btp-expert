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

    const surf      = l * h;
    const surfPlates = type === 'cloison' ? surf * 2 : surf;
    const nbPlaques = Math.ceil((surfPlates * 1.1) / 3);
    const nbRails   = Math.ceil((l * 2) / 3);
    const nbMontants = (Math.ceil(l / 0.6) + 1) * (modeM === 'double' ? 2 : 1) * Math.ceil(h / sizeM);

    const results = [
        { l: 'Plaques BA13',         v: nbPlaques,                           u: 'unités',   h: true },
        { l: 'Rails (3m)',           v: nbRails,                             u: 'unités'  },
        { l: `Montants (${sizeM}m)`, v: nbMontants,                          u: 'unités'  },
        { l: 'Vis (boîte 500)',      v: Math.ceil(surfPlates * 12 / 500),    u: 'boîtes'  },  // DTU 25.41 : 12 vis/m²
        { l: 'Bandes (150m)',        v: Math.ceil(surfPlates * 1.5 / 150),   u: 'rouleaux'},
        { l: 'Enduit à joint',       v: Math.ceil(surfPlates * 0.6),         u: 'kg'      },  // 0.6 kg/m² (standard)
    ];

    renderResults('second-results', results, 'Chantier Placo', 'Second Œuvre');
}
