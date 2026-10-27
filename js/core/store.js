// === STOCKAGE LOCAL (téléphone) ===
// Réglages, prix, chantiers et dernières saisies — tout reste sur l'appareil.
// Les anciennes données (historique + devis de la v3) sont converties une fois en
// chantiers, sans jamais être effacées.

import { PRIX_DEFAUT } from '../calc/materiaux.js';

const K = {
    reglages:  'kalou_reglages_v4',
    prix:      'kalou_prix_v4',
    chantiers: 'kalou_chantiers_v4',
    saisies:   'kalou_saisies_v4',
    migre:     'kalou_migre_v4'
};
const ANCIENS = { historique: 'kalou_btp_v3', devis: 'kalou_devis_v1' };

function lire(cle, defaut) {
    try {
        const raw = localStorage.getItem(cle);
        return raw == null ? defaut : JSON.parse(raw);
    } catch { return defaut; }
}
function ecrire(cle, val) {
    try { localStorage.setItem(cle, JSON.stringify(val)); return true; }
    catch { return false; }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ─── Réglages ────────────────────────────────────────────────────────────────

export const REGLAGES_DEFAUT = {
    sacCiment: 35,        // poids du sac de ciment acheté
    estimation: false,    // option « estimation façon entreprise »
    taux: 45,             // € HT de l'heure (artisan maçon, Dordogne)
    margeMat: 15,         // % ajouté sur les matériaux par une entreprise
    tva: 10               // % (rénovation 10, neuf 20 — la maison neuve force 20)
};

export function getReglages() {
    return { ...REGLAGES_DEFAUT, ...lire(K.reglages, {}) };
}
export function setReglages(partiel) {
    const r = { ...getReglages(), ...partiel };
    ecrire(K.reglages, r);
    return r;
}
export const ctxCalcul = () => ({ sacCiment: getReglages().sacCiment });

// ─── Prix (option estimation) ────────────────────────────────────────────────

export function getPrix() {
    return { ...PRIX_DEFAUT, ...lire(K.prix, {}) };
}
export function setPrix(k, val) {
    const ov = lire(K.prix, {});
    if (val === null || val === undefined || isNaN(val)) delete ov[k];
    else ov[k] = val;
    ecrire(K.prix, ov);
}
export function resetPrix() { ecrire(K.prix, {}); }
export const prixModifies = () => Object.keys(lire(K.prix, {}));

// ─── Dernières saisies par calculateur ───────────────────────────────────────

export function getSaisie(id) { return lire(K.saisies, {})[id] || null; }
export function setSaisie(id, valeurs) {
    const s = lire(K.saisies, {});
    s[id] = valeurs;
    ecrire(K.saisies, s);
}

// ─── Chantiers ───────────────────────────────────────────────────────────────
// chantier : { id, nom, notes, cree, maj, items: [item], achete: { cléMatériau: true } }
// item     : { id, ouvrage, titre, valeurs, lignes: [{k?, l?, q, u?}], date }
//            ouvrage = id du calculateur ('dalle', 'maison'…) ou null (ancienne donnée)

export function listeChantiers() {
    return lire(K.chantiers, []);
}
function sauverTous(liste) { return ecrire(K.chantiers, liste); }

export function getChantier(id) {
    return listeChantiers().find(c => c.id === id) || null;
}

export function creerChantier(nom) {
    const c = { id: uid(), nom: (nom || '').trim() || 'Nouveau chantier', notes: '', cree: Date.now(), maj: Date.now(), items: [], achete: {} };
    const liste = listeChantiers();
    liste.unshift(c);
    sauverTous(liste);
    return c;
}

export function majChantier(id, fn) {
    const liste = listeChantiers();
    const i = liste.findIndex(c => c.id === id);
    if (i < 0) return null;
    const c = liste[i];
    fn(c);
    c.maj = Date.now();
    liste.splice(i, 1);
    liste.unshift(c);                // le chantier modifié remonte en tête
    sauverTous(liste);
    return c;
}

export function supprimerChantier(id) {
    sauverTous(listeChantiers().filter(c => c.id !== id));
}

export function ajouterItem(chantierId, item) {
    const it = { id: uid(), date: Date.now(), ...item };
    majChantier(chantierId, c => { c.items.push(it); });
    return it;
}
export function remplacerItem(chantierId, itemId, item) {
    majChantier(chantierId, c => {
        const i = c.items.findIndex(x => x.id === itemId);
        if (i >= 0) c.items[i] = { ...c.items[i], ...item, date: Date.now() };
    });
}
/** Remet un ouvrage retiré à sa place (bouton « Annuler »). */
export function restaurerItem(chantierId, item, index) {
    majChantier(chantierId, c => { c.items.splice(Math.min(index, c.items.length), 0, item); });
}
/** Recrée un chantier supprimé (bouton « Annuler »). */
export function restaurerChantier(chantier) {
    const liste = listeChantiers().filter(c => c.id !== chantier.id);
    liste.unshift(chantier);
    sauverTous(liste);
}
export function supprimerItem(chantierId, itemId) {
    majChantier(chantierId, c => { c.items = c.items.filter(x => x.id !== itemId); });
}

// ─── Migration des anciennes données (v3 : historique + devis) ───────────────

const INTERMEDIAIRE = /^(volume|surface|terre|terrassement|mortier|gravats)/i;

function ligneAncienne(r) {
    const q = parseFloat(String(r.v).replace(',', '.'));
    if (!(q > 0) || !r.l || INTERMEDIAIRE.test(String(r.l).trim())) return null;
    return { l: String(r.l), q, u: String(r.u || '').split(' ~')[0].trim() };
}

/** Convertit l'historique et les devis v3 en chantiers (une seule fois). */
export function migrer() {
    if (localStorage.getItem(K.migre)) return 0;
    const nouveaux = [];

    // Historique : regroupé par nom de chantier
    const hist = lire(ANCIENS.historique, []);
    if (Array.isArray(hist) && hist.length) {
        const groupes = new Map();
        hist.forEach(h => {
            const nom = (h.name || 'Chantier').trim();
            if (!groupes.has(nom)) groupes.set(nom, []);
            groupes.get(nom).push(h);
        });
        groupes.forEach((entrees, nom) => {
            nouveaux.push({
                id: uid(), nom, notes: 'Récupéré de l\'ancien historique.', cree: entrees[entrees.length - 1].id || Date.now(), maj: entrees[0].id || Date.now(), achete: {},
                items: entrees.map(h => ({
                    id: uid(), ouvrage: null, date: h.id || Date.now(),
                    titre: (h.meta && h.meta.designation) || h.cat || 'Calcul',
                    lignes: (h.data || []).map(ligneAncienne).filter(Boolean)
                }))
            });
        });
    }

    // Devis / estimations / factures : un chantier par document, sans les prix
    const devis = lire(ANCIENS.devis, []);
    if (Array.isArray(devis)) {
        devis.forEach(d => {
            const nom = (d.client && d.client.nom) || (d.chantier && d.chantier.description) || d.num || 'Ancien devis';
            const notes = [d.num ? `Ancien document ${d.num}` : '', d.chantier && d.chantier.adresse ? `Adresse : ${d.chantier.adresse}` : '', d.client && d.client.tel ? `Tél : ${d.client.tel}` : '']
                .filter(Boolean).join('\n');
            nouveaux.push({
                id: uid(), nom: String(nom), notes, cree: d.id || Date.now(), maj: d.id || Date.now(), achete: {},
                items: (d.lignes || []).filter(l => l.designation).map(l => ({
                    id: uid(), ouvrage: null, date: d.id || Date.now(),
                    titre: l.designation,
                    sousTitre: l.qte ? `${l.qte} ${l.unite || ''}`.trim() : '',
                    lignes: (l.materiaux || []).map(ligneAncienne).filter(Boolean)
                }))
            });
        });
    }

    if (nouveaux.length) sauverTous([...listeChantiers(), ...nouveaux].sort((a, b) => (b.maj || 0) - (a.maj || 0)));
    localStorage.setItem(K.migre, '1');
    return nouveaux.length;
}

// ─── Sauvegarde / restauration (fichier .json) ───────────────────────────────

export function exporterDonnees() {
    const stores = {};
    [...Object.values(K), ...Object.values(ANCIENS)].forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw != null) { try { stores[k] = JSON.parse(raw); } catch { /* ignoré */ } }
    });
    return { app: 'kalou-btp', version: 4, date: new Date().toISOString(), stores };
}

/** Fusionne une sauvegarde (rien n'est supprimé). Renvoie le nombre de chantiers importés. */
export function importerDonnees(obj) {
    if (!obj || obj.app !== 'kalou-btp' || !obj.stores) throw new Error('Fichier non reconnu');
    const s = obj.stores;
    let nb = 0;
    if (Array.isArray(s[K.chantiers])) {
        const parId = new Map(listeChantiers().map(c => [c.id, c]));
        s[K.chantiers].forEach(c => { if (c && c.id) { parId.set(c.id, c); nb++; } });
        sauverTous(Array.from(parId.values()).sort((a, b) => (b.maj || 0) - (a.maj || 0)));
    }
    if (s[K.reglages]) ecrire(K.reglages, { ...getReglages(), ...s[K.reglages] });
    if (s[K.prix]) ecrire(K.prix, { ...lire(K.prix, {}), ...s[K.prix] });
    // Ancienne sauvegarde (v3) : on rejoue la conversion
    if (!s[K.chantiers] && (s[ANCIENS.historique] || s[ANCIENS.devis])) {
        const avant = listeChantiers().length;
        if (s[ANCIENS.historique]) ecrire(ANCIENS.historique, s[ANCIENS.historique]);
        if (s[ANCIENS.devis]) ecrire(ANCIENS.devis, s[ANCIENS.devis]);
        localStorage.removeItem(K.migre);
        migrer();
        nb = listeChantiers().length - avant;
    }
    return nb;
}
