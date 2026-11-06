// Liste de courses en PDF : document A4 propre, rangé par catégorie, lignes
// numérotées, colonnes « Prix unit. » et « Total » vides pour qu'un ami ou le
// négociant puisse faire son devis. Aucune dépendance, aucun DOM.

import { Pdf, A4, couper, largeur } from '../core/pdf.js';
import { MATERIAUX, affichage, libelle } from '../calc/materiaux.js';
import { fmt } from '../core/format.js';
import { parCategorie } from './resultats.js';

const C = {
    encre: '#15171A', gris: '#5F6670', trait: '#C9CFD6', fondInfo: '#F6F7F9',
    marque: '#FF7A00', marqueFonce: '#B45309', marqueDoux: '#FFF2E5', entete: '#2B2F36', blanc: '#FFFFFF'
};
const M = 36;                          // marge
const LARG = A4.w - 2 * M;
const BAS = A4.h - 48;                 // limite basse du contenu (pied de page en dessous)
// Colonnes du tableau : [clé, titre, largeur]
const COLS = [['n', 'N°', 24], ['d', 'Désignation', 0], ['q', 'Quantité', 58], ['u', 'Unité', 52], ['p', 'Prix unit. HT', 62], ['t', 'Total HT', 66]];
COLS[1][2] = LARG - COLS.reduce((s, c) => s + c[2], 0);
const X = {};
COLS.reduce((x, [k, , w]) => { X[k] = { x, w }; return x + w; }, M);

/** Une ligne de la liste → { nom, detail, qte, unite }. */
export function ligneDoc(li, ctx = {}) {
    if (li.k && MATERIAUX[li.k]) {
        const a = affichage(li.k, li.q, ctx);
        return { nom: li.l || libelle(li.k, ctx), detail: [li.d, a.d].filter(Boolean).join(' · '), qte: a.v, unite: a.u };
    }
    return { nom: li.l, detail: li.d || '', qte: fmt(li.q, Number.isInteger(li.q) ? 0 : 2), unite: li.u || '' };
}

/** Nom de fichier sans caractères interdits. */
const jour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function nomFichierPdf(nom, date = new Date()) {
    const propre = String(nom || 'Chantier').replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Chantier';
    return `Liste materiaux - ${propre} - ${jour(date)}.pdf`;
}

/**
 * Construit le PDF.
 *  nom : nom du chantier ; lignes : lignes consolidées ; ouvrages : [{ titre, resume[] }]
 *  partiel / total : liste « ce qui reste » sur un total d'articles
 *  auteur, tel, notes : facultatifs ; id : identifiant du chantier (pour la référence)
 * Renvoie { octets, nomFichier, pages, ref }.
 */
export function pdfListe({ nom, lignes, ouvrages = [], ctx = {}, auteur = '', tel = '', notes = '', partiel = false, total, id = '', date = new Date() }) {
    const j = jour(date);
    const ref = `KB-${j.replace(/-/g, '').slice(2)}-${String(id || 'X').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || 'X'}`;
    const doc = new Pdf({ titre: `Liste de matériaux — ${nom}`, auteur: auteur || 'Kalou BTP' });
    const dateTxt = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    let y;

    // ── En-tête ──
    doc.rect(0, 0, A4.w, 6, { fond: C.marque });
    doc.texte(M, 44, 'LISTE DE MATÉRIAUX', { taille: 20, gras: true });
    doc.texte(M, 60, 'Commande / demande de prix', { taille: 10.5, couleur: C.gris });
    doc.texte(A4.w - M, 34, `Date : ${dateTxt}`, { taille: 9.5, align: 'right' });
    doc.texte(A4.w - M, 48, `Réf. : ${ref}`, { taille: 9.5, gras: true, align: 'right' });

    // ── Cadre d'informations ──
    const nbTxt = n => `${n} article${n > 1 ? 's' : ''}`;
    const infos = [['Chantier', nom, true]];
    if (auteur || tel) infos.push(['Établie par', [auteur, tel].filter(Boolean).join(' · '), false]);
    infos.push(['Contenu', partiel ? `Articles restant à acheter : ${nbTxt(lignes.length)} (sur ${total ?? lignes.length})` : `Liste complète : ${nbTxt(lignes.length)}`, false]);
    if (ouvrages.length) {
        const txt = ouvrages.map(o => `${o.titre}${o.resume && o.resume.length ? ` (${o.resume.slice(0, 2).map(k => `${k.l} ${k.v}`).join(', ')})` : ''}`).join(' ; ');
        infos.push(['Pour', txt, false, 4]);
    }
    if (notes && notes.trim()) infos.push(['Notes', notes.trim(), false, 6]);
    const xVal = M + 84, wVal = LARG - 84 - 10;
    const blocs = infos.map(([l, v, gros, max]) => {
        const t = gros ? 12 : 10;
        let ls = couper(v, t, wVal, gros);
        if (max && ls.length > max) { ls = ls.slice(0, max); ls[max - 1] = ls[max - 1].replace(/.{0,3}$/, '…'); }
        return { l, ls, t, gros, h: ls.length * (t + 3) + 4 };
    });
    const hInfo = blocs.reduce((s, b) => s + b.h, 0) + 12;
    y = 74;
    doc.rect(M, y, LARG, hInfo, { fond: C.fondInfo, trait: C.trait });
    let yi = y + 8;
    blocs.forEach(b => {
        doc.texte(M + 10, yi + b.t - 1, `${b.l} :`, { taille: 9, gras: true, couleur: C.gris });
        b.ls.forEach((ln, i) => doc.texte(xVal, yi + b.t - 1 + i * (b.t + 3), ln, { taille: b.t, gras: b.gros }));
        yi += b.h;
    });
    y += hInfo + 14;

    // ── Tableau ──
    const verticales = (y0, h) => {
        COLS.forEach(([k]) => doc.trait(X[k].x, y0, X[k].x, y0 + h, { couleur: C.trait }));
        doc.trait(M + LARG, y0, M + LARG, y0 + h, { couleur: C.trait });
    };
    const enteteTableau = () => {
        doc.rect(M, y, LARG, 20, { fond: C.entete });
        COLS.forEach(([k, t]) => {
            const c = X[k];
            if (k === 'q' || k === 'p' || k === 't') doc.texte(c.x + c.w - 5, y + 13.5, t, { taille: 8.5, gras: true, couleur: C.blanc, align: 'right' });
            else if (k === 'n') doc.texte(c.x + c.w / 2, y + 13.5, t, { taille: 8.5, gras: true, couleur: C.blanc, align: 'center' });
            else doc.texte(c.x + 6, y + 13.5, t, { taille: 8.5, gras: true, couleur: C.blanc });
        });
        y += 20;
    };
    const nouvellePage = () => { doc.ajouterPage(); y = 36; enteteTableau(); };
    const ligneCategorie = (titre) => {
        doc.rect(M, y, LARG, 19, { fond: C.marqueDoux });
        doc.trait(M, y + 19, M + LARG, y + 19, { couleur: C.trait });
        doc.trait(M, y, M, y + 19, { couleur: C.trait }); doc.trait(M + LARG, y, M + LARG, y + 19, { couleur: C.trait });
        doc.texte(M + 8, y + 13, titre.toUpperCase(), { taille: 9.5, gras: true, couleur: C.marqueFonce });
        y += 19;
    };

    const groupes = parCategorie(lignes).map(g => ({
        l: g.l,
        lignes: g.lignes.map(li => {
            const d = ligneDoc(li, ctx);
            const ln = couper(d.nom, 10, X.d.w - 12, true);
            const ld = d.detail ? couper(d.detail, 8.5, X.d.w - 12) : [];
            let tu = 9.5;
            while (tu > 6.5 && largeur(d.unite, tu) > X.u.w - 8) tu -= 0.5;
            return { ...d, ln, ld, tu, h: Math.max(21, 8 + ln.length * 12 + ld.length * 10) };
        })
    }));

    enteteTableau();
    let num = 0;
    groupes.forEach(g => {
        if (y + 19 + g.lignes[0].h > BAS) nouvellePage();
        ligneCategorie(g.l);
        g.lignes.forEach(r => {
            if (y + r.h > BAS) { nouvellePage(); ligneCategorie(`${g.l} (suite)`); }
            num++;
            const base = y + 14;
            doc.texte(X.n.x + X.n.w / 2, base, String(num), { taille: 9, gras: true, couleur: C.gris, align: 'center' });
            r.ln.forEach((t, i) => doc.texte(X.d.x + 6, base + i * 12, t, { taille: 10, gras: true }));
            r.ld.forEach((t, i) => doc.texte(X.d.x + 6, base + r.ln.length * 12 - 2 + i * 10, t, { taille: 8.5, couleur: C.gris }));
            doc.texte(X.q.x + X.q.w - 5, base, r.qte, { taille: 11, gras: true, align: 'right' });
            doc.texte(X.u.x + 5, base, r.unite, { taille: r.tu });
            verticales(y, r.h);
            doc.trait(M, y + r.h, M + LARG, y + r.h, { couleur: C.trait });
            y += r.h;
        });
    });

    // ── Totaux à remplir + remarques ──
    if (y + 16 + 66 + 60 > BAS) { doc.ajouterPage(); y = 36; } else y += 16;
    const yT = y;
    [['Total HT', false], ['TVA', false], ['Total TTC', true]].forEach(([l, g], i) => {
        const yy = yT + i * 22;
        doc.texte(X.t.x - 8, yy + 14.5, l, { taille: 10, gras: g, align: 'right' });
        doc.rect(X.t.x, yy, X.t.w, 22, { fond: g ? C.marqueDoux : null, trait: '#8A929C', ep: g ? 1 : 0.6 });
    });
    const wRem = X.p.x - 24 - M;
    doc.rect(M, yT, wRem, 66, { trait: '#8A929C' });
    doc.texte(M + 8, yT + 13, 'Remarques du fournisseur (délai, livraison, équivalences) :', { taille: 8.5, gras: true, couleur: C.gris });
    y = yT + 66 + 16;
    const avert = 'Quantités calculées avec Kalou BTP, pertes comprises, arrondies au conditionnement (sac, rouleau, paquet…). '
        + 'Un produit équivalent convient si la référence n\'est pas en stock. Prix à compléter par le fournisseur.';
    couper(avert, 8.5, LARG).forEach((t, i) => doc.texte(M, y + i * 11, t, { taille: 8.5, couleur: C.gris }));

    // ── Pied de page (numéros) ──
    const nb = doc.pages.length;
    doc.pages.forEach((_, i) => {
        doc.page = i;
        doc.trait(M, A4.h - 34, A4.w - M, A4.h - 34, { couleur: C.trait });
        const gauche = couper(`Kalou BTP · ${nom} · Réf. ${ref}`, 8, LARG - 70)[0];
        doc.texte(M, A4.h - 22, gauche, { taille: 8, couleur: C.gris });
        doc.texte(A4.w - M, A4.h - 22, `Page ${i + 1} / ${nb}`, { taille: 8, gras: true, couleur: C.gris, align: 'right' });
    });

    return { octets: doc.octets(), nomFichier: nomFichierPdf(nom, date), pages: nb, ref };
}
