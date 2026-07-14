// === MOTEUR DE DEVIS ===
// Modèle de données, calcul des totaux (TVA multi-taux), numérotation et
// persistance localStorage (clé kalou_devis_v1). Logique métier pure —
// aucune manipulation DOM (voir ui/devis_view.js pour le rendu).

import { getProfil } from './tarifs.js';
import { TVA_OPTIONS } from '../data/prices.default.js';

const STORAGE_KEY = 'kalou_devis_v1';

function tauxDe(v) {
    const opt = TVA_OPTIONS.find(o => o.v === v);
    return opt ? opt.taux : 0;
}

// ─── Numérotation ────────────────────────────────────────────────────────────

/** Génère le prochain numéro "DEV-{année}-{compteur}" en cherchant le max existant. */
function prochainNumero() {
    const annee = new Date().getFullYear();
    const tous  = listDevis();
    const prefixe = `DEV-${annee}-`;
    const max = tous
        .map(d => d.num)
        .filter(n => n && n.startsWith(prefixe))
        .map(n => parseInt(n.slice(prefixe.length), 10))
        .filter(n => !isNaN(n))
        .reduce((a, b) => Math.max(a, b), 0);
    return `${prefixe}${String(max + 1).padStart(3, '0')}`;
}

// ─── Création & modèle ───────────────────────────────────────────────────────

/** @param {'devis'|'estimation'} type */
export function creerDevis(type = 'estimation') {
    const profil = getProfil();
    return {
        id:        Date.now(),
        num:       type === 'devis' ? prochainNumero() : `EST-${Date.now()}`,
        type,
        date:      new Date().toISOString().slice(0, 10),
        validite:  profil.validite,
        client:    { nom: '', adresse: '', tel: '', email: '' },
        chantier:  { adresse: '', description: '' },
        regimeTVA: profil.regimeTVA,
        lignes:    [],
        acomptePct: profil.acomptePct,
        statut:    'brouillon'
    };
}

let _ligneSeq = 0;
export function creerLigne({ designation, detail = '', qte = 1, unite = 'u', puHT = 0, tva = null }) {
    return { id: `l${Date.now()}-${_ligneSeq++}`, designation, detail, qte, unite, puHT, tva };
}

// ─── Calcul des totaux ────────────────────────────────────────────────────────

/**
 * @returns {{ totalHT:number, parTaux:Array<{taux:number, base:number, montant:number}>,
 *             totalTVA:number, totalTTC:number, acompte:number, solde:number, mentionFranchise:boolean }}
 */
export function calculerTotaux(devis) {
    const tauxRegime = tauxDe(devis.regimeTVA);
    const mentionFranchise = devis.regimeTVA === 'franchise';

    const groupes = new Map(); // taux -> base HT cumulée
    let totalHT = 0;

    devis.lignes.forEach(l => {
        const totalLigne = (l.qte || 0) * (l.puHT || 0);
        totalHT += totalLigne;
        const taux = mentionFranchise ? 0 : (l.tva !== null && l.tva !== undefined ? l.tva : tauxRegime);
        groupes.set(taux, (groupes.get(taux) || 0) + totalLigne);
    });

    const parTaux = Array.from(groupes.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([taux, base]) => ({ taux, base, montant: base * taux / 100 }));

    const totalTVA  = parTaux.reduce((s, g) => s + g.montant, 0);
    const totalTTC  = totalHT + totalTVA;
    const acompte   = totalTTC * (devis.acomptePct || 0) / 100;
    const solde     = totalTTC - acompte;

    return {
        totalHT:  Math.round(totalHT * 100) / 100,
        parTaux:  parTaux.map(g => ({ ...g, base: Math.round(g.base * 100) / 100, montant: Math.round(g.montant * 100) / 100 })),
        totalTVA: Math.round(totalTVA * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        acompte:  Math.round(acompte * 100) / 100,
        solde:    Math.round(solde * 100) / 100,
        mentionFranchise
    };
}

/** Total HT d'une seule ligne (pratique pour l'affichage tableau). */
export function totalLigne(ligne) {
    return Math.round((ligne.qte || 0) * (ligne.puHT || 0) * 100) / 100;
}

// ─── Persistance ─────────────────────────────────────────────────────────────

export function listDevis() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export function getDevisById(id) {
    return listDevis().find(d => d.id === id) || null;
}

export function sauvegarderDevis(devis) {
    const tous = listDevis();
    const idx  = tous.findIndex(d => d.id === devis.id);
    if (idx >= 0) tous[idx] = devis; else tous.unshift(devis);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tous));
    return devis;
}

export function supprimerDevis(id) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listDevis().filter(d => d.id !== id)));
}

/** Duplique un devis existant : nouvel id, nouveau numéro, statut remis à brouillon. */
export function dupliquerDevis(devis) {
    const copie = {
        ...JSON.parse(JSON.stringify(devis)),
        id:   Date.now(),
        num:  devis.type === 'devis' ? prochainNumero() : `EST-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        statut: 'brouillon'
    };
    sauvegarderDevis(copie);
    return copie;
}

/** Transforme une estimation en devis conforme (nouveau numéro DEV-...). */
export function transformerEnDevis(devis) {
    return changerType(devis, 'devis');
}

/** Change le type d'un document (devis <-> estimation) et régénère son numéro. */
export function changerType(devis, type) {
    devis.type = type;
    devis.num  = type === 'devis' ? prochainNumero() : `EST-${Date.now()}`;
    sauvegarderDevis(devis);
    return devis;
}

// ─── Import depuis un calcul de métré (gros_oeuvre / placo / sols) ───────────

/**
 * Convertit une liste de résultats de calcul ({l,v,u}) en lignes de devis en
 * associant chaque libellé à un prix du catalogue matériaux quand une
 * correspondance existe ; sinon la ligne est ajoutée à prix 0 (à compléter).
 */
export function lignesDepuisResultats(resultats, catalogue) {
    // Lignes de quantité intermédiaire (volume de béton, surface, terre à évacuer) :
    // ce ne sont pas des matériaux achetables et les chiffrer double-compterait le
    // béton avec ses composants (ciment + agrégats). On les importe à 0 € à compléter.
    const intermediaire = /^(volume|surface|terre)/i;

    return resultats.map(r => {
        const estIntermediaire = intermediaire.test(r.l.trim());
        const match = estIntermediaire
            ? null
            : catalogue.find(m => r.l.toLowerCase().includes(m.label.toLowerCase().split(' ')[0].toLowerCase()));
        return creerLigne({
            designation: r.l,
            detail:      '',
            qte:         parseFloat(String(r.v).replace(',', '.')) || 0,
            unite:       r.u,
            puHT:        match ? match.prix : 0
        });
    });
}
