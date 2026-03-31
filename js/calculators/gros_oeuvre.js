import { GROS_CONFIG } from '../config.js';
import { getActiveGros } from '../ui/navigation.js';
import { showToast } from '../ui/toast.js';
import { renderResults } from '../ui/render.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lit et valide un champ numérique. Marque le wrapper en erreur si invalide. */
function makeGet(isValidRef) {
    // Clear previous field errors
    document.querySelectorAll('#gros-fields .field-wrapper').forEach(w => w.classList.remove('field-error'));

    return function get(id, allowZero = false) {
        const el = document.getElementById('g-' + id);
        if (!el) return 0;

        const val = parseFloat(el.value.replace(',', '.'));
        const wrapper = el.closest('.field-wrapper');

        if (isNaN(val) || (!allowZero && val <= 0)) {
            isValidRef.v = false;
            if (wrapper) wrapper.classList.add('field-error');
            return 0;
        }
        return val;
    };
}

// ─── Calcul principal ─────────────────────────────────────────────────────────

export function handleGrosCalculate() {
    const activeGros = getActiveGros();
    const results    = [];
    const nom        = document.getElementById('g-chantier-nom').value.trim() || 'Chantier Gros Œuvre';

    const isValidRef = { v: true };
    const get        = makeGet(isValidRef);
    const ok         = () => isValidRef.v;

    // ── Dalle Béton ───────────────────────────────────────────────────────────
    if (activeGros === 'dalle') {
        const l = get('l'), w = get('w'), e = get('e') / 100, d = get('d');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surf   = l * w;
        const vol    = surf * e * 1.05;          // +5% pertes
        results.push({ l: 'Volume Béton (+ 5%)',       v: vol.toFixed(2),              u: 'm³',      h: true });
        results.push({ l: 'Ciment (35kg)',             v: Math.ceil(vol * d / 35),     u: 'sacs' });
        results.push({ l: 'Sable',                     v: (vol * 0.5).toFixed(2),      u: 'm³' });
        results.push({ l: 'Gravier',                   v: (vol * 0.8).toFixed(2),      u: 'm³' });
        results.push({ l: 'Treillis Soudé (2.4 m²)',  v: Math.ceil(surf * 1.1 / 2.4), u: 'panneaux' });
        results.push({ l: 'Polyane (bâche)',           v: Math.ceil(surf * 1.10),       u: 'm²' });
    }

    // ── Fondations ────────────────────────────────────────────────────────────
    else if (activeGros === 'fondation') {
        const l = get('l'), w = get('w'), p = get('p'), d = get('d'), a = get('a');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const vol       = l * w * p;
        const nbBarres  = Math.ceil(l / 5.5);   // acier semelle : 1 barre/file / 5.5m (recouvrement)
        const terre     = vol * 1.3;             // foisonnement terre excavée
        results.push({ l: 'Volume Béton',             v: vol.toFixed(2),             u: 'm³',        h: true });
        results.push({ l: 'Ciment (35kg)',            v: Math.ceil(vol * d / 35),    u: 'sacs' });
        results.push({ l: 'Sable',                    v: (vol * 0.5).toFixed(2),     u: 'm³' });
        results.push({ l: 'Gravier',                  v: (vol * 0.8).toFixed(2),     u: 'm³' });
        results.push({ l: 'Acier estimé',             v: Math.ceil(vol * a),         u: 'kg' });
        results.push({ l: 'Acier semelle (barres/file)', v: nbBarres,                u: 'barres' });
        results.push({ l: 'Terre à évacuer',          v: terre.toFixed(2),           u: 'm³' });
    }

    // ── Mur Parpaings ─────────────────────────────────────────────────────────
    else if (activeGros === 'mur') {
        const l = get('l'), h = get('h'), o = get('o', true);   // ouvertures = allowZero
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surfBrute  = l * h;
        const surfNette  = Math.max(0, surfBrute - o);
        const nbParp     = Math.ceil(surfNette * 10 * 1.05);     // 10/m² + 5% casse
        const volMortier = surfNette * 0.020;                    // 20 L/m² = 0.020 m³/m²
        const cimMort    = Math.ceil(volMortier * 350 / 35);
        const sableMort  = (volMortier * 3).toFixed(2);          // dosage 1:3

        results.push({ l: 'Parpaings 20×20×50',   v: nbParp,                  u: 'unités', h: true });
        results.push({ l: 'Surface nette',         v: surfNette.toFixed(2),    u: 'm²' });
        results.push({ l: 'Mortier (20 L/m²)',     v: volMortier.toFixed(3),   u: 'm³' });
        results.push({ l: 'Ciment Mortier (35kg)', v: cimMort,                 u: 'sacs' });
        results.push({ l: 'Sable Mortier (1:3)',   v: sableMort,               u: 'm³' });
    }

    // ── Enduit Façade ─────────────────────────────────────────────────────────
    else if (activeGros === 'enduit') {
        const l = get('l'), h = get('h'), e = get('e') / 100;
        const type = document.getElementById('g-t').value;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surf = l * h;
        results.push({ l: 'Surface totale', v: surf.toFixed(2), u: 'm²', h: true });

        if (type === 'trad') {
            const vol = surf * e;
            results.push({ l: 'Ciment (35kg)', v: Math.ceil(vol * 350 / 35), u: 'sacs' });
            results.push({ l: 'Sable',          v: (vol * 1.2).toFixed(2),    u: 'm³' });
        } else {
            // ~1.8 kg/m²/mm = 18 kg/m²/cm
            results.push({ l: "Enduit prêt-à-l'emploi (25kg)", v: Math.ceil(surf * (e * 100) * 18 / 25), u: 'sacs' });
        }
    }

    // ── Chape Sol ─────────────────────────────────────────────────────────────
    else if (activeGros === 'chape') {
        const l = get('l'), w = get('w'), e = get('e') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const vol = l * w * e;
        results.push({ l: 'Volume Mortier', v: vol.toFixed(2),            u: 'm³',  h: true });
        results.push({ l: 'Ciment (35kg)',  v: Math.ceil(vol * 350 / 35), u: 'sacs' });
        results.push({ l: 'Sable',          v: (vol * 1.5).toFixed(2),    u: 'm³' });
    }

    // ── Escalier Béton ────────────────────────────────────────────────────────
    else if (activeGros === 'escalier') {
        const n = get('n'), h = get('h') / 100, g = get('g') / 100, w = get('w') / 100, e = get('e') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const volMarches  = n * ((g * h) / 2) * w;
        const longPaillasse = Math.sqrt(Math.pow(n * g, 2) + Math.pow(n * h, 2));
        const volPaillasse  = longPaillasse * w * e;
        const volT          = volMarches + volPaillasse;

        results.push({ l: 'Volume Béton Total', v: volT.toFixed(2),            u: 'm³',  h: true });
        results.push({ l: 'Ciment (35kg)',       v: Math.ceil(volT * 350 / 35), u: 'sacs' });
        results.push({ l: 'Sable',               v: (volT * 0.5).toFixed(2),    u: 'm³' });
        results.push({ l: 'Gravier',             v: (volT * 0.8).toFixed(2),    u: 'm³' });
        results.push({ l: 'Acier estimé',        v: Math.ceil(volT * 110),       u: 'kg' });
    }

    // ── Poteaux ───────────────────────────────────────────────────────────────
    else if (activeGros === 'poteau') {
        const sl = get('l') / 100, sw = get('w') / 100, h = get('h'), n = get('n');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const vol = sl * sw * h * n;
        results.push({ l: 'Volume Béton',  v: vol.toFixed(2),            u: 'm³',  h: true });
        results.push({ l: 'Ciment (35kg)', v: Math.ceil(vol * 350 / 35), u: 'sacs' });
        results.push({ l: 'Sable',         v: (vol * 0.5).toFixed(2),    u: 'm³' });
        results.push({ l: 'Gravier',       v: (vol * 0.8).toFixed(2),    u: 'm³' });
        results.push({ l: 'Acier estimé',  v: Math.ceil(vol * 100),       u: 'kg' });
    }

    renderResults('gros-results', results, nom, `Maçonnerie (${GROS_CONFIG[activeGros].name})`);
}
