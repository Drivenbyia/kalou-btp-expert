// Petit générateur de PDF (aucune dépendance, aucun DOM) : pages A4, texte en
// Helvetica / Helvetica-Bold (polices de base de tout lecteur PDF), traits et
// rectangles. Les accents passent par l'encodage WinAnsi ; les signes absents
// (≈, ≤, emojis…) sont remplacés par du texte simple.

export const A4 = { w: 595.28, h: 841.89 };

// Largeurs Helvetica (1/1000 de la taille), caractères 32 à 126.
const L_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const L_GRAS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const L_SPECIAL = { 0xA0: 278, 0xB2: 333, 0xB3: 333, 0xB0: 400, 0x80: 556, 0x95: 350, 0x96: 556, 0x97: 1000,
    0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0xAB: 556, 0xBB: 556, 0x9C: 944, 0x8C: 1000, 0xD7: 584,
    0x85: 1000, 0xBD: 834, 0xB7: 278, 0xE6: 889, 0xC6: 1000, 0xDF: 611 };

// Unicode → octet WinAnsi (hors ASCII et Latin-1 qui sont identiques).
const WINANSI = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, 'Œ': 0x8C, '‘': 0x91, '’': 0x92, '“': 0x93,
    '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99, 'œ': 0x9C, 'Ÿ': 0x9F };
const REMPLACE = { '≈': 'env.', '≃': 'env.', '≤': '<=', '≥': '>=', '→': '->', '←': '<-', '✔': 'x',
    '✓': 'x', '✕': 'x', ' ': ' ', ' ': ' ', ' ': ' ', '‑': '-', '−': '-', '⌀': 'Ø' };

/** Texte → octets WinAnsi (tableau de nombres). */
export function encoder(s) {
    const out = [];
    for (const ch of String(s ?? '')) {
        const r = REMPLACE[ch];
        if (r !== undefined && r !== ch) { out.push(...encoder(r)); continue; }
        const c = ch.codePointAt(0);
        if (c === 9) out.push(32);
        else if (c >= 32 && c < 127) out.push(c);
        else if (c >= 0xA0 && c <= 0xFF) out.push(c);
        else if (WINANSI[ch]) out.push(WINANSI[ch]);
        else {
            const base = ch.normalize('NFD')[0];                 // lettre accentuée rare → lettre simple
            const b = base && base.codePointAt(0);
            if (b >= 32 && b < 127) out.push(b);                  // sinon (emoji…) : ignoré
        }
    }
    return out;
}

function largeurOctet(o, gras) {
    if (o >= 32 && o < 127) return (gras ? L_GRAS : L_REG)[o - 32];
    if (L_SPECIAL[o]) return L_SPECIAL[o] * (gras ? 1.05 : 1);
    if (o >= 0xC0) {                                              // lettres accentuées : largeur de la lettre de base
        const base = String.fromCharCode(o).normalize('NFD')[0].charCodeAt(0);
        if (base >= 32 && base < 127) return (gras ? L_GRAS : L_REG)[base - 32];
    }
    return 556;
}

/** Largeur d'un texte en points. */
export function largeur(s, taille, gras = false) {
    return encoder(s).reduce((t, o) => t + largeurOctet(o, gras), 0) * taille / 1000;
}

/** Coupe un texte en lignes qui tiennent dans `max` points. */
export function couper(s, taille, max, gras = false) {
    const lignes = [];
    String(s ?? '').split('\n').forEach(par => {
        let cur = '';
        par.split(/ +/).forEach(mot => {
            const essai = cur ? `${cur} ${mot}` : mot;
            if (largeur(essai, taille, gras) <= max || !cur) {
                cur = essai;
                // mot trop long seul : on le coupe
                while (largeur(cur, taille, gras) > max && cur.length > 1) {
                    let n = cur.length - 1;
                    while (n > 1 && largeur(cur.slice(0, n), taille, gras) > max) n--;
                    lignes.push(cur.slice(0, n));
                    cur = cur.slice(n);
                }
            } else { lignes.push(cur); cur = mot; }
        });
        lignes.push(cur);
    });
    return lignes;
}

const n2 = x => (Math.round(x * 100) / 100).toString();
const hex = octets => octets.map(o => o.toString(16).padStart(2, '0')).join('').toUpperCase();
const couleur = c => {                                            // '#RRGGBB' → 'r g b'
    const v = parseInt(String(c || '#000000').slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(x => n2(x / 255)).join(' ');
};

export class Pdf {
    constructor({ titre = '', auteur = '' } = {}) {
        this.titre = titre; this.auteur = auteur;
        this.pages = [];
        this.ajouterPage();
    }
    ajouterPage() { this.pages.push([]); this.page = this.pages.length - 1; return this.page; }
    get ops() { return this.pages[this.page]; }

    /** Texte ; y = ligne de base, mesurée depuis le HAUT de la page. */
    texte(x, y, s, { taille = 10, gras = false, couleur: c = '#15171A', align = 'left' } = {}) {
        const oct = encoder(s);
        if (!oct.length) return;
        let xx = x;
        if (align !== 'left') {
            const w = largeur(s, taille, gras);
            xx = align === 'right' ? x - w : x - w / 2;
        }
        this.ops.push(`BT /${gras ? 'F2' : 'F1'} ${n2(taille)} Tf ${couleur(c)} rg ${n2(xx)} ${n2(A4.h - y)} Td <${hex(oct)}> Tj ET`);
    }
    rect(x, y, w, h, { fond = null, trait = null, ep = 0.6 } = {}) {
        const r = `${n2(x)} ${n2(A4.h - y - h)} ${n2(w)} ${n2(h)} re`;
        if (fond && trait) this.ops.push(`${couleur(fond)} rg ${couleur(trait)} RG ${n2(ep)} w ${r} B`);
        else if (fond) this.ops.push(`${couleur(fond)} rg ${r} f`);
        else this.ops.push(`${couleur(trait || '#000000')} RG ${n2(ep)} w ${r} S`);
    }
    trait(x1, y1, x2, y2, { couleur: c = '#000000', ep = 0.6 } = {}) {
        this.ops.push(`${couleur(c)} RG ${n2(ep)} w ${n2(x1)} ${n2(A4.h - y1)} m ${n2(x2)} ${n2(A4.h - y2)} l S`);
    }

    /** Le fichier PDF complet (Uint8Array). */
    octets() {
        const objets = [];                                        // objets[i] = contenu de l'objet i+1
        const ajout = s => { objets.push(s); return objets.length; };
        const utf16 = s => 'FEFF' + Array.from(String(s)).map(ch => {
            const c = ch.codePointAt(0);
            if (c > 0xFFFF) return '';
            return c.toString(16).padStart(4, '0');
        }).join('').toUpperCase();

        const catalogue = ajout(null);
        const racinePages = ajout(null);
        const f1 = ajout('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = ajout('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const info = ajout(`<< /Title <${utf16(this.titre)}> /Author <${utf16(this.auteur)}> /Creator (Kalou BTP) /Producer (Kalou BTP) >>`);
        const kids = this.pages.map(ops => {
            const flux = ops.join('\n');
            const contenu = ajout(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
            return ajout(`<< /Type /Page /Parent ${racinePages} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contenu} 0 R >>`);
        });
        objets[catalogue - 1] = `<< /Type /Catalog /Pages ${racinePages} 0 R >>`;
        objets[racinePages - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

        // Tout est en ASCII (textes en hexadécimal) : 1 caractère = 1 octet.
        let sortie = '%PDF-1.4\n';
        const positions = objets.map((o, i) => {
            const pos = sortie.length;
            sortie += `${i + 1} 0 obj\n${o}\nendobj\n`;
            return pos;
        });
        const xref = sortie.length;
        sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
        sortie += positions.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
        sortie += `trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        const b = new Uint8Array(sortie.length);
        for (let i = 0; i < sortie.length; i++) b[i] = sortie.charCodeAt(i);
        return b;
    }
}
