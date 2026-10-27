// Formatage des nombres et petits utilitaires partagés (aucun DOM).

/** Nombre au format français : 1 234,5 */
export function fmt(n, dec = 0) {
    const x = Number(n) || 0;
    return x.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Comme fmt mais retire les décimales inutiles (2,50 → 2,5 ; 3,00 → 3). */
export function fmtSmart(n, maxDec = 2) {
    const x = Number(n) || 0;
    return x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: maxDec });
}

/** Montant en euros arrondi (sans centimes au-delà de 100 €). */
export function euros(n) {
    const x = Number(n) || 0;
    return x.toLocaleString('fr-FR', {
        style: 'currency', currency: 'EUR',
        minimumFractionDigits: 0, maximumFractionDigits: x < 100 ? 2 : 0
    });
}

/** Lit un nombre saisi (accepte la virgule). NaN si vide/invalide. */
export function num(v) {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
}

/** Échappement HTML. */
export function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const r2 = x => Math.round(x * 100) / 100;
