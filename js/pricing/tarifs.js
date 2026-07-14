// === GESTION DES TARIFS ÉDITABLES ===
// Fusionne les catalogues par défaut (data/prices.default.js) avec les
// surcharges utilisateur stockées dans localStorage (clé kalou_prix_v1).
// Rien ne modifie les fichiers par défaut : on stocke uniquement les diffs.

import { MATERIAUX_DEFAUT, OUVRAGES_DEFAUT, PROFIL_DEFAUT } from '../data/prices.default.js';

const KEY_PRIX   = 'kalou_prix_v1';
const KEY_PROFIL = 'kalou_profil_v1';

function loadOverrides() {
    return JSON.parse(localStorage.getItem(KEY_PRIX) || '{}');
}

function saveOverrides(overrides) {
    localStorage.setItem(KEY_PRIX, JSON.stringify(overrides));
}

/** Retourne le catalogue matériaux fusionné (défaut + surcharges prix). */
export function getMateriaux() {
    const ov = loadOverrides().materiaux || {};
    return MATERIAUX_DEFAUT.map(m => ov[m.id] !== undefined ? { ...m, prix: ov[m.id] } : m);
}

/** Retourne le catalogue ouvrages fusionné (défaut + surcharges prix). */
export function getOuvrages() {
    const ov = loadOverrides().ouvrages || {};
    return OUVRAGES_DEFAUT.map(o => ov[o.id] !== undefined ? { ...o, prix: ov[o.id] } : o);
}

export function getMateriauById(id) {
    return getMateriaux().find(m => m.id === id);
}

export function getOuvrageById(id) {
    return getOuvrages().find(o => o.id === id);
}

/** Met à jour le prix d'un matériau ou d'un ouvrage (surcharge persistée). */
export function setPrix(type, id, prix) {
    const overrides = loadOverrides();
    if (!overrides[type]) overrides[type] = {};
    overrides[type][id] = prix;
    saveOverrides(overrides);
}

/** Réinitialise un prix (ou tout le catalogue) à sa valeur par défaut. */
export function resetPrix(type, id) {
    const overrides = loadOverrides();
    if (overrides[type]) {
        if (id) delete overrides[type][id];
        else delete overrides[type];
    }
    saveOverrides(overrides);
}

// ─── Profil entreprise ──────────────────────────────────────────────────────

export function getProfil() {
    const stored = JSON.parse(localStorage.getItem(KEY_PROFIL) || '{}');
    return { ...PROFIL_DEFAUT, ...stored, debourse: { ...PROFIL_DEFAUT.debourse, ...(stored.debourse || {}) } };
}

export function saveProfil(profil) {
    localStorage.setItem(KEY_PROFIL, JSON.stringify(profil));
}

export function updateProfil(partial) {
    const profil = { ...getProfil(), ...partial };
    saveProfil(profil);
    return profil;
}
