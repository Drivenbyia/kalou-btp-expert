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

/**
 * Agrégats béton : Gravier 0/15 + Sable 0/4 en Tonnes si vol > 1 m³,
 * sinon mélange Big Bag (ratio 1.3 pour foisonnement).
 * Densité : 1 m³ ≈ 1.5 T pour gravier et sable.
 * Dosage standard : 0.9 T gravier + 0.6 T sable par m³ de béton.
 */
function pushAgregatsBeton(results, vol) {
    if (vol > 1) {
        const gravT  = vol * 0.9;
        const sableT = vol * 0.6;
        results.push({ l: 'Gravier 0/15',      v: gravT.toFixed(2),  u: `T ~ ${Math.round(gravT  * 1000)} kg` });
        results.push({ l: 'Sable 0/4 (béton)', v: sableT.toFixed(2), u: `T ~ ${Math.round(sableT * 1000)} kg` });
    } else {
        const nb     = Math.ceil(vol * 1.3);
        const poids  = nb * 1500;                              // 1 big bag ≈ 1 m³ ≈ 1.5 T
        results.push({ l: 'Mélange béton (big bag ~1 m³)', v: nb, u: `big bags ~ ${poids} kg` });
    }
}

/**
 * Sable mortier / chape / enduit : en Tonnes si volSableM3 > 1 m³, sinon Big Bags.
 * Densité : 1 m³ sable foisonné ≈ 1.5 T.
 * @param {number} volSableM3 — volume de sable pur en m³
 * @param {string} grade      — granulométrie ('0/2' fin, '0/4' standard)
 * @param {string} usage      — étiquette d'usage (ex: 'mortier', 'chape', 'enduit')
 */
function pushSable(results, volSableM3, grade = '0/4', usage = 'mortier') {
    const poidsKg = Math.round(volSableM3 * 1500);
    const label   = `Sable ${grade} (${usage})`;

    if (volSableM3 > 1) {
        const tonnes = volSableM3 * 1.5;
        results.push({ l: label, v: tonnes.toFixed(2),         u: `T ~ ${poidsKg} kg` });
    } else {
        results.push({ l: label, v: Math.ceil(volSableM3),     u: `big bag ~ ${poidsKg} kg` });
    }
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
        results.push({ l: 'Volume Béton (+ 5%)',              v: vol.toFixed(2),               u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',              v: Math.ceil(vol * d / 35),      u: 'sacs' });
        pushAgregatsBeton(results, vol);
        results.push({ l: 'Treillis soudé (3.6×2.4 m)',       v: Math.ceil(surf * 1.1 / 8),   u: 'panneaux' });
        results.push({ l: 'Polyane (bâche)',                  v: Math.ceil(surf * 1.10),       u: 'm²' });
    }

    // ── Fondations ────────────────────────────────────────────────────────────
    else if (activeGros === 'fondation') {
        const l = get('l'), w = get('w'), p = get('p'), d = get('d');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const volNet = l * w * p;
        const vol    = volNet * 1.05;            // +5% pertes
        const terre  = volNet * 1.3;             // foisonnement terre excavée (sur volume réel)

        // Chaînage : 4 fils HA (2 sup + 2 inf) sur toute la longueur
        const armaturesML = l * 4;
        // Épingles : 1 cadre tous les 25 cm, périmètre = 2×(w+p) + retour 10 cm
        const epinglesML  = Math.round(l / 0.25) * (2 * (w + p) + 0.10);

        results.push({ l: 'Volume Béton (+ 5%)',              v: vol.toFixed(2),               u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',              v: Math.ceil(vol * d / 35),      u: 'sacs' });
        pushAgregatsBeton(results, vol);
        results.push({ l: 'Armatures filantes (4 fils HA)',   v: armaturesML.toFixed(1),       u: 'ml' });
        results.push({ l: 'Épingles de chaînage',             v: epinglesML.toFixed(1),        u: 'ml' });
        results.push({ l: 'Terre à évacuer',                  v: terre.toFixed(2),             u: 'm³' });
    }

    // ── Mur Parpaings ─────────────────────────────────────────────────────────
    else if (activeGros === 'mur') {
        const l = get('l'), h = get('h'), o = get('o', true), c = get('c', true);
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surfBrute  = l * h;
        const surfNette  = Math.max(0, surfBrute - o);
        // Agglos d'angle : nb_angles × rangs (1 rang = 20 cm) + 5% casse
        const nbAngle    = Math.ceil(c * (h / 0.20) * 1.05);
        // Agglos standards : surface nette × 10/m² + 5% casse, moins les angles
        const nbStd      = Math.max(0, Math.ceil(surfNette * 10 * 1.05) - nbAngle);
        const volMortier = surfNette * 0.020;                    // 20 L/m² = 0.020 m³/m²
        const cimMort    = Math.ceil(volMortier * 350 / 35);

        results.push({ l: 'Agglos 20×20×50',               v: nbStd,                    u: 'unités',  h: true });
        results.push({ l: 'Agglos d\'angle',                v: nbAngle,                  u: 'unités' });
        results.push({ l: 'Surface nette',                  v: surfNette.toFixed(2),     u: 'm²' });
        results.push({ l: 'Mortier (20 L/m²)',              v: volMortier.toFixed(3),    u: 'm³' });
        results.push({ l: 'Ciment mortier (sacs 35 kg)',    v: cimMort,                  u: 'sacs' });
        pushSable(results, volMortier, '0/4', 'mortier hourdage');
    }

    // ── Enduit Façade ─────────────────────────────────────────────────────────
    else if (activeGros === 'enduit') {
        const l = get('l'), h = get('h'), e = get('e') / 100;
        const type = document.getElementById('g-t').value;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surf = l * h;
        results.push({ l: 'Surface totale', v: surf.toFixed(2), u: 'm²', h: true });

        if (type === 'trad') {
            const vol = surf * e * 1.05;        // +5% pertes
            results.push({ l: 'Ciment (sacs 35 kg)',           v: Math.ceil(vol * 350 / 35), u: 'sacs' });
            pushSable(results, vol, '0/2', 'enduit fin');
        } else {
            // ~18 kg/m²/cm d'épaisseur (sac 25 kg)
            results.push({ l: "Enduit prêt-à-l'emploi (sacs 25 kg)", v: Math.ceil(surf * (e * 100) * 18 / 25), u: 'sacs' });
        }
    }

    // ── Chape Sol ─────────────────────────────────────────────────────────────
    else if (activeGros === 'chape') {
        const l = get('l'), w = get('w'), e = get('e') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const vol = l * w * e * 1.05;          // +5% pertes
        results.push({ l: 'Volume Mortier (+ 5%)',        v: vol.toFixed(2),             u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',          v: Math.ceil(vol * 350 / 35),  u: 'sacs' });
        pushSable(results, vol, '0/4', 'chape');
    }

    // ── Escalier Béton ────────────────────────────────────────────────────────
    else if (activeGros === 'escalier') {
        const n = get('n'), h = get('h') / 100, g = get('g') / 100, w = get('w') / 100, e = get('e') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const volMarches    = n * ((g * h) / 2) * w;
        const longPaillasse = Math.sqrt(Math.pow(n * g, 2) + Math.pow(n * h, 2));
        const volPaillasse  = longPaillasse * w * e;
        const volT          = (volMarches + volPaillasse) * 1.05;   // +5% pertes

        // Épingles : espacées tous les 20 cm le long de la paillasse
        const epinglesML = Math.round(longPaillasse / 0.20) * (w + 2 * e + 0.10);

        results.push({ l: 'Volume Béton Total (+ 5%)',       v: volT.toFixed(2),             u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',             v: Math.ceil(volT * 350 / 35),  u: 'sacs' });
        pushAgregatsBeton(results, volT);
        results.push({ l: 'Épingles de chaînage',            v: epinglesML.toFixed(1),        u: 'ml' });
    }

    // ── Poteaux ───────────────────────────────────────────────────────────────
    else if (activeGros === 'poteau') {
        const sl = get('l') / 100, sw = get('w') / 100, h = get('h'), n = get('n');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const vol = sl * sw * h * n * 1.05;     // +5% pertes

        // Épingles : espacées tous les 20 cm en hauteur, périmètre section = 2×(sl+sw)
        const epinglesML = n * Math.round(h / 0.20) * (2 * (sl + sw) + 0.10);

        results.push({ l: 'Volume Béton (+ 5%)',             v: vol.toFixed(2),             u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',             v: Math.ceil(vol * 350 / 35),  u: 'sacs' });
        pushAgregatsBeton(results, vol);
        results.push({ l: 'Épingles de chaînage',            v: epinglesML.toFixed(1),       u: 'ml' });
    }

    // ── Terrasse / Dallage béton ──────────────────────────────────────────────
    else if (activeGros === 'terrasse') {
        const l = get('l'), w = get('w'), e = get('e') / 100, he = get('he', true) / 100, d = get('d');
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surf = l * w;
        const vol  = surf * e * 1.05;            // +5% pertes

        results.push({ l: 'Volume Béton (+ 5%)',              v: vol.toFixed(2),               u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',              v: Math.ceil(vol * d / 35),      u: 'sacs' });
        pushAgregatsBeton(results, vol);
        results.push({ l: 'Treillis soudé (3.6×2.4 m)',       v: Math.ceil(surf * 1.1 / 8),    u: 'panneaux' });
        if (he > 0) {
            const volHer = surf * he;
            results.push({ l: 'Tout-venant 0/31.5 (hérisson)', v: (volHer * 1.8).toFixed(2),   u: `T ~ ${Math.round(volHer * 1800)} kg` });
        }
        results.push({ l: 'Polyane (film)',                   v: Math.ceil(surf * 1.10),       u: 'm²' });
        results.push({ l: 'Terre à évacuer',                  v: (surf * (e + he) * 1.3).toFixed(2), u: 'm³' });
    }

    // ── Mur en pierre (moellons hourdés à la chaux) ───────────────────────────
    else if (activeGros === 'pierre') {
        const l = get('l'), h = get('h'), ep = get('ep') / 100, o = get('o', true);
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surfNette  = Math.max(0, l * h - o);
        const volMur     = surfNette * ep;
        const pierreT    = volMur * 0.75 * 2.4;                  // ~75% du volume, calcaire ~2.4 T/m³
        const volMortier = volMur * 0.30;                        // ~30% du volume en joints/hourdage
        const chauxSacs  = Math.ceil(volMortier * 350 / 35);

        results.push({ l: 'Surface parement',                 v: surfNette.toFixed(2),         u: 'm²',      h: true });
        results.push({ l: 'Volume de mur',                    v: volMur.toFixed(2),            u: 'm³' });
        results.push({ l: 'Pierre / moellon',                 v: pierreT.toFixed(2),           u: `T ~ ${Math.round(pierreT * 1000)} kg` });
        results.push({ l: 'Chaux NHL (sacs 35 kg)',           v: chauxSacs,                    u: 'sacs' });
        pushSable(results, volMortier, '0/4', 'mortier chaux');
    }

    // ── Enduit / Rejointoiement à la chaux ────────────────────────────────────
    else if (activeGros === 'chaux') {
        const l = get('l'), h = get('h'), o = get('o', true), e = get('e') / 100;
        const type = document.getElementById('g-t').value;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const surf = Math.max(0, l * h - o);
        results.push({ l: 'Surface', v: surf.toFixed(2), u: 'm²', h: true });

        // Enduit : volume = surface × épaisseur (+10% pertes).
        // Rejointoiement : ~15 L/m² de mortier de joint.
        const vol       = type === 'enduit' ? surf * e * 1.10 : surf * 0.015;
        const chauxSacs = Math.ceil(vol * 350 / 35);

        results.push({ l: 'Chaux NHL (sacs 35 kg)', v: chauxSacs, u: 'sacs' });
        pushSable(results, vol, '0/2', type === 'enduit' ? 'enduit chaux' : 'joint chaux');
    }

    // ── Création d'ouverture (mur porteur) ────────────────────────────────────
    else if (activeGros === 'ouverture') {
        const larg = get('larg'), haut = get('haut'), ep = get('ep') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const linteau  = larg + 0.40;                            // + 20 cm d'appui de chaque côté
        const etais    = Math.ceil(larg / 0.5 + 1) * 2;          // étaiement des deux côtés
        const volDemol = larg * haut * ep;

        results.push({ l: 'Linteau / IPN',        v: linteau.toFixed(2),        u: 'ml',      h: true });
        results.push({ l: 'Étais (étaiement)',    v: etais,                     u: 'u' });
        results.push({ l: 'Volume à démolir',     v: volDemol.toFixed(2),       u: 'm³' });
        results.push({ l: 'Gravats à évacuer',    v: (volDemol * 1.5).toFixed(2), u: 'm³' });
    }

    // ── Piscine maçonnée — structure gros œuvre ───────────────────────────────
    else if (activeGros === 'piscine') {
        const L = get('l'), w = get('w'), p = get('p'), ep = get('ep') / 100;
        if (!ok()) return showToast('Remplis tous les champs requis', true);

        const volRadier = L * w * ep * 1.05;
        const volMurs   = 2 * (L + w) * p * ep * 1.05;
        const volBeton  = volRadier + volMurs;
        const surfRadier = L * w;
        const terre     = (L + 1) * (w + 1) * (p + 0.3) * 1.3;   // sur-largeur de fouille + foisonnement

        results.push({ l: 'Volume Béton total (+ 5%)',        v: volBeton.toFixed(2),          u: 'm³',      h: true });
        results.push({ l: 'Ciment (sacs 35 kg)',              v: Math.ceil(volBeton * 350 / 35), u: 'sacs' });
        pushAgregatsBeton(results, volBeton);
        results.push({ l: 'Treillis soudé (radier)',          v: Math.ceil(surfRadier * 1.1 / 8), u: 'panneaux' });
        results.push({ l: 'Terrassement (déblai)',            v: terre.toFixed(2),             u: 'm³' });
    }

    renderResults('gros-results', results, nom, `Maçonnerie (${GROS_CONFIG[activeGros].name})`);
}
