// Aide « tour de la maison » : on saisit les murs extérieurs un par un (direction + longueur),
// l'appli dessine la forme et en déduit périmètre, surface au sol et nombre d'angles.

import { esc, fmtSmart } from '../core/format.js';
import { ouvrirFeuille, fermerFeuille, toast } from './dom.js';

const DIRS = { r: { x: 1, y: 0, f: '→' }, d: { x: 0, y: 1, f: '↓' }, l: { x: -1, y: 0, f: '←' }, u: { x: 0, y: -1, f: '↑' } };
const SUIVANTE = { r: 'd', d: 'l', l: 'u', u: 'r' };          // sens des aiguilles d'une montre
const horiz = d => d === 'r' || d === 'l';

const lire = v => {
    const x = Number(String(v ?? '').replace(',', '.').replace(/\s|m$/g, ''));
    return x > 0 ? x : 0;
};

/** Calcule la forme à partir des côtés. */
export function analyserContour(cotes) {
    let x = 0, y = 0;
    const pts = [[0, 0]];
    let P = 0;
    cotes.forEach(c => {
        const L = lire(c.l);
        x += DIRS[c.d].x * L; y += DIRS[c.d].y * L;
        pts.push([x, y]);
        P += L;
    });
    let A = 0;
    for (let i = 0; i < pts.length - 1; i++) A += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
    const ecart = Math.hypot(x, y);
    const n = cotes.length;
    let alterne = n >= 4;
    for (let i = 0; i < n; i++) if (horiz(cotes[i].d) === horiz(cotes[(i + 1) % n].d)) alterne = false;
    const complet = cotes.every(c => lire(c.l) > 0);
    // Détail de l'écart par direction : quels côtés vérifier
    const somme = d => cotes.reduce((t, c) => t + (c.d === d ? lire(c.l) : 0), 0);
    const nums = d => cotes.map((c, i) => (c.d === d ? i + 1 : 0)).filter(Boolean);
    const axes = [];
    const dx = somme('r') - somme('l'), dy = somme('d') - somme('u');
    if (Math.abs(dx) >= 0.01) axes.push({ axe: 'horizontal', plus: dx > 0 ? 'r' : 'l', moins: dx > 0 ? 'l' : 'r', ecart: Math.abs(dx), sPlus: Math.max(somme('r'), somme('l')), sMoins: Math.min(somme('r'), somme('l')) });
    if (Math.abs(dy) >= 0.01) axes.push({ axe: 'vertical', plus: dy > 0 ? 'd' : 'u', moins: dy > 0 ? 'u' : 'd', ecart: Math.abs(dy), sPlus: Math.max(somme('d'), somme('u')), sMoins: Math.min(somme('d'), somme('u')) });
    axes.forEach(a => { a.cotesPlus = nums(a.plus); a.cotesMoins = nums(a.moins); });
    return { pts, P, S: Math.abs(A) / 2, angles: n, ecart, ferme: ecart < 0.05, alterne, complet, axes };
}

function svgForme(pts, ferme) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    const k = Math.min(280 / w, 150 / h);
    const pt = p => `${(10 + (p[0] - minX) * k).toFixed(1)},${(10 + (p[1] - minY) * k).toFixed(1)}`;
    const poly = pts.map(pt).join(' ');
    return `<svg viewBox="0 0 ${Math.ceil(20 + w * k)} ${Math.ceil(20 + h * k)}" style="width:100%;max-height:190px;background:var(--field);border-radius:12px" role="img" aria-label="Forme de la maison">
        <polyline points="${poly}" fill="${ferme ? 'rgba(255,122,0,.15)' : 'none'}" stroke="${ferme ? '#15171A' : '#C62828'}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${pt(pts[0]).split(',')[0]}" cy="${pt(pts[0]).split(',')[1]}" r="5" fill="#FF7A00"/>
    </svg>`;
}

/**
 * Ouvre l'aide. `onValider({ P, S, angles, cotes })` reçoit le résultat.
 * @param {Array<{d:string,l:string}>} cotesInit
 */
export function ouvrirContour(cotesInit, onValider) {
    const cotes = (cotesInit && cotesInit.length ? cotesInit : [{ d: 'r', l: '' }, { d: 'd', l: '' }, { d: 'l', l: '' }, { d: 'u', l: '' }])
        .map(c => ({ d: DIRS[c.d] ? c.d : 'r', l: String(c.l ?? '') }));

    ouvrirFeuille(`
        <h2>Le tour de la maison</h2>
        <p style="color:var(--muted);font-size:15px;margin:4px 0 10px">Pars de l'angle en haut à gauche (point orange) et fais le tour dans le sens des aiguilles d'une montre. Pour chaque mur : sa direction et sa longueur, côtes extérieures.</p>
        <div id="ct-dessin"></div>
        <p id="ct-etat" style="font-weight:800;margin:10px 2px"></p>
        <div id="ct-lignes"></div>
        <button class="btn btn-ghost btn-block btn-sm" id="ct-ajout" style="margin-top:10px">＋ Ajouter un côté</button>
        <div class="row" style="margin-top:14px"><button class="btn btn-light" data-r="0">Annuler</button><button class="btn btn-primary" data-r="1">Utiliser</button></div>
    `, root => {
        const lignes = root.querySelector('#ct-lignes');
        const majApercu = () => {
            const a = analyserContour(cotes);
            root.querySelector('#ct-dessin').innerHTML = svgForme(a.pts, a.ferme && a.complet);
            const etat = root.querySelector('#ct-etat');
            if (!a.complet) etat.innerHTML = '<span style="color:var(--muted)">Remplis la longueur de chaque côté.</span>';
            else if (!a.alterne) etat.innerHTML = '<span style="color:var(--danger)">Deux côtés de suite vont dans le même axe : vérifie les flèches.</span>';
            else if (!a.ferme) {
                const f = d => DIRS[d].f;
                const liste = t => t.length ? `côté${t.length > 1 ? 's' : ''} ${t.join(', ')}` : 'aucun côté';
                etat.innerHTML = `<span style="color:var(--danger)">Le tour ne se referme pas :</span>` + a.axes.filter(x => x.ecart >= 0.02).map(x =>
                    `<span style="display:block;font-weight:600;color:var(--ink);margin-top:6px">Murs ${f(x.plus)} ${fmtSmart(x.sPlus, 2)} m contre ${f(x.moins)} ${fmtSmart(x.sMoins, 2)} m : il manque <b>${fmtSmart(x.ecart, 2)} m</b> sur un mur ${f(x.moins)} (${liste(x.cotesMoins)}), ou il y a ${fmtSmart(x.ecart, 2)} m de trop sur un mur ${f(x.plus)} (${liste(x.cotesPlus)}).</span>`).join('');
            }
            else etat.innerHTML = `✔ Périmètre ${fmtSmart(a.P, 2)} m · Surface ${fmtSmart(a.S, 1)} m² · ${a.angles} angles`;
            // Surligne les côtés à vérifier
            const suspects = new Set(a.complet && a.alterne && !a.ferme ? a.axes.filter(x => x.ecart >= 0.02).flatMap(x => [...x.cotesPlus, ...x.cotesMoins]) : []);
            lignes.querySelectorAll('[data-i]').forEach(r => {
                const inp = r.querySelector('[data-len]');
                if (inp) { inp.style.borderColor = suspects.has(+r.dataset.i + 1) ? '#D97706' : ''; inp.style.background = suspects.has(+r.dataset.i + 1) ? '#FEF3C7' : ''; }
            });
            return a;
        };
        const dessiner = () => {
            lignes.innerHTML = cotes.map((c, i) => `
                <div style="display:flex;gap:6px;align-items:center;margin-top:8px" data-i="${i}">
                    <b style="width:16px;color:var(--muted);flex:none">${i + 1}</b>
                    <div class="seg" style="flex:none;gap:4px;flex-wrap:nowrap">${Object.entries(DIRS).map(([k, x]) =>
                        `<button type="button" data-dir="${k}" class="fleche${c.d === k ? ' on' : ''}" aria-label="direction">${x.f}</button>`).join('')}</div>
                    <div class="inp" style="flex:1;min-width:0"><input data-len inputmode="decimal" value="${esc(c.l)}" placeholder="m" style="height:46px;font-size:18px;padding:0 8px;min-width:64px"></div>
                    <button type="button" data-suppr aria-label="Retirer" style="flex:none;width:28px;height:46px;color:var(--danger);font-weight:900">✕</button>
                </div>`).join('');
            majApercu();
        };
        lignes.addEventListener('click', e => {
            const row = e.target.closest('[data-i]');
            if (!row) return;
            const i = +row.dataset.i;
            const b = e.target.closest('[data-dir]');
            if (b) { cotes[i].d = b.dataset.dir; dessiner(); return; }
            if (e.target.closest('[data-suppr]') && cotes.length > 1) { cotes.splice(i, 1); dessiner(); }
        });
        lignes.addEventListener('input', e => {
            const row = e.target.closest('[data-i]');
            if (row && e.target.matches('[data-len]')) { cotes[+row.dataset.i].l = e.target.value; majApercu(); }
        });
        lignes.addEventListener('keydown', e => {
            if (e.key !== 'Enter' || !e.target.matches('[data-len]')) return;
            e.preventDefault();
            const ins = [...lignes.querySelectorAll('[data-len]')];
            const i = ins.indexOf(e.target);
            if (i < ins.length - 1) ins[i + 1].focus(); else e.target.blur();
        });
        root.querySelector('#ct-ajout').addEventListener('click', () => {
            const der = cotes[cotes.length - 1];
            cotes.push({ d: der ? SUIVANTE[der.d] : 'r', l: '' });
            dessiner();
            const ins = lignes.querySelectorAll('[data-len]');
            ins[ins.length - 1].focus();
        });
        root.querySelector('[data-r="0"]').addEventListener('click', () => fermerFeuille());
        root.querySelector('[data-r="1"]').addEventListener('click', () => {
            const a = majApercu();
            if (!a.complet || !a.alterne || !a.ferme) { toast('Le tour n\'est pas encore juste : regarde le message en rouge', true); return; }
            fermerFeuille();
            onValider({ P: Math.round(a.P * 100) / 100, S: Math.round(a.S * 10) / 10, angles: a.angles, cotes });
        });
        dessiner();
    });
}
