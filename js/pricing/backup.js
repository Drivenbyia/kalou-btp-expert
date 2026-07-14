// === SAUVEGARDE / RESTAURATION (export & import JSON) ===
// Pont téléphone ↔ PC + sauvegarde de secours. Le localStorage n'étant pas
// synchronisé entre appareils ni garanti dans le temps, l'utilisateur exporte
// un fichier .json qu'il peut ré-importer ailleurs. Logique pure (localStorage
// uniquement) — le déclenchement du téléchargement/partage est dans l'UI.

const KEYS_LISTE = ['kalou_devis_v1', 'kalou_btp_v3'];    // tableaux d'objets avec .id
const KEYS_OBJET = ['kalou_profil_v1', 'kalou_prix_v1'];  // objets singletons

/** Construit l'objet de sauvegarde complet à partir du localStorage. */
export function construireSauvegarde() {
    const stores = {};
    [...KEYS_LISTE, ...KEYS_OBJET].forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw != null) {
            try { stores[k] = JSON.parse(raw); } catch { /* clé corrompue : ignorée */ }
        }
    });
    return { app: 'kalou-btp', version: 1, date: new Date().toISOString(), stores };
}

/** Vérifie qu'un objet importé est bien une sauvegarde Kalou BTP. */
export function estSauvegardeValide(obj) {
    return !!obj && obj.app === 'kalou-btp' && !!obj.stores && typeof obj.stores === 'object';
}

/** Résumé lisible pour la confirmation avant import. */
export function resumeSauvegarde(obj) {
    const s = (obj && obj.stores) || {};
    return {
        devis:     Array.isArray(s['kalou_devis_v1']) ? s['kalou_devis_v1'].length : 0,
        chantiers: Array.isArray(s['kalou_btp_v3'])   ? s['kalou_btp_v3'].length   : 0,
        profil:    !!s['kalou_profil_v1'],
        prix:      !!s['kalou_prix_v1']
    };
}

/**
 * Fusionne une sauvegarde dans le localStorage — rien n'est supprimé :
 * - listes (devis, chantiers) : union par `id`, l'entrée importée gagne en cas de conflit ;
 * - objets (profil, tarifs) : champs importés prioritaires, champs existants conservés.
 */
export function fusionnerSauvegarde(obj) {
    const s = obj.stores;

    KEYS_LISTE.forEach(k => {
        if (!Array.isArray(s[k])) return;
        const actuel = JSON.parse(localStorage.getItem(k) || '[]');
        const parId  = new Map(actuel.map(x => [x.id, x]));
        s[k].forEach(x => parId.set(x.id, x));
        const fusion = Array.from(parId.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
        localStorage.setItem(k, JSON.stringify(fusion));
    });

    KEYS_OBJET.forEach(k => {
        if (s[k] == null || typeof s[k] !== 'object') return;
        const actuel = JSON.parse(localStorage.getItem(k) || '{}');
        localStorage.setItem(k, JSON.stringify({ ...actuel, ...s[k] }));
    });
}
