// Calculateurs « Intérieur (second œuvre) ».

import { L, fusion, lignesMortier, recetteMortier, calcPlaco, PERTE_BETON, LIMITES_CLOISON, DOUBLAGE_COLLE, SOUFFLAGE, calcSoufflage, calcRampants, lignesPareVapeur } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, fm, verifOuv } from './commun.js';
export const INTERIEUR = [
    // ════════════════ INTÉRIEUR ════════════════
    {
        id: 'chape', cat: 'interieur', ic: '📏', nom: 'Chape ciment',
        desc: 'Adhérente ou flottante sur isolant',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            c('pose', 'Chape', [{ v: 'adh', l: 'Adhérente' }, { v: 'flot', l: 'Flottante (sur isolant)' }], 'adh'),
            n('ep', 'Épaisseur', 'cm', 5, { max: 15, bas: 3, aide: 'Adhérente : 3 à 5 cm. Flottante : 5 cm mini (6 cm sur plancher chauffant).' }),
            n('epIso', 'Épaisseur d\'isolant', 'mm', 60, { si: v => v.pose === 'flot', max: 200, aide: 'PSE ou PU certifié pour chape (SC1 a2 Ch).' }),
            c('arme', 'Armature', [{ v: 'treillis', l: 'Treillis de chape' }, { v: 'fibres', l: 'Fibres' }], 'treillis', { si: v => v.pose === 'flot' }),
            c('dosage', 'Dosage', [{ v: '300', l: '300 kg' }, { v: '350', l: '350 kg' }], '350'),
            oui('bande', 'Bande périphérique')
        ],
        mots: 'chape mortier sol isolant flottante adhérente règle plancher chauffant',
        verifier: v => (v.pose === 'flot' && v.ep < 5 ? { ep: 'Chape flottante : 5 cm minimum (DTU 26.2)' } : {}),
        titre: v => `Chape ${v.pose === 'flot' ? 'flottante ' : ''}${fm(v.L)}×${fm(v.l)} m, ép. ${fm(v.ep)} cm`,
        calcul(v, ctx) {
            const S = v.L * v.l;
            const vol = S * v.ep / 100 * PERTE_BETON;
            const lignes = [...lignesMortier(vol, { dosage: +v.dosage, sableM3: 1.15 })];
            if (v.bande) lignes.push(L('bande_peri', 2 * (v.L + v.l) * 1.05));
            if (v.pose === 'flot') {
                lignes.push(L('isolant_chape', S * 1.05, { d: `${fmtSmart(v.epIso, 0)} mm` }), L('polyane', S * 1.15));
                if (v.arme === 'fibres') lignes.push(L('fibres_pp', vol * 0.6));
                else lignes.push(L('treillis_chape', S * 1.10, { d: 'posé à mi-épaisseur' }));
            }
            const infos = [
                `Chape dosée ${v.dosage} kg de ciment par m³, ≈ 1,15 m³ de sable par m³ (tirée à la règle). Pertes 5 % comprises.`,
                'Joints de fractionnement : tous les 40 m² et 8 m maxi. Bande périphérique sur toute la hauteur (chape + isolant).',
                'Pas sous 5 °C. Protéger du soleil et des courants d\'air 48 h. Séchage : carrelage collé après 15 jours mini, parquet collé ≈ 1 semaine par cm.'
            ];
            if (v.pose === 'flot') infos.splice(1, 0, 'Chape flottante : armée (treillis de chape à mi-épaisseur, ou fibres 0,6 kg/m³), sur film, désolidarisée des murs.');
            if (v.ep < 3) infos.push('Moins de 3 cm : préférer un ragréage.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Volume', v: `${fm(vol)} m³` }],
                lignes: fusion(lignes), infos, recette: recetteMortier(+v.dosage, ctx.sacCiment || 35),
                mesure: { q: S, u: 'm²', h: S * (v.pose === 'flot' ? 0.5 : 0.35) }
            };
        }
    },
    {
        id: 'ragreage', cat: 'interieur', ic: '💧', nom: 'Ragréage',
        desc: 'Mise à niveau avant revêtement',
        champs: [
            n('L', 'Longueur', 'm', 5, { demi: true }),
            n('l', 'Largeur', 'm', 4, { demi: true }),
            n('ep', 'Épaisseur moyenne', 'mm', 5, { max: 30, bas: 3 }),
            oui('primaire', 'Primaire d\'accrochage')
        ],
        mots: 'ragréage autolissant niveau sol primaire',
        titre: v => `Ragréage ${fm(v.L * v.l)} m², ${fm(v.ep)} mm`,
        calcul(v) {
            const S = v.L * v.l;
            const lignes = [L('ragreage', S * v.ep * 1.6 * PERTE_BETON)];
            if (v.primaire) lignes.push(L('primaire', S * 0.15));
            const infos = ['≈ 1,6 kg par m² et par mm d\'épaisseur. Primaire ≈ 0,15 kg/m², obligatoire selon la notice. 3 mm minimum.',
                'Circulable après ≈ 3 h, carrelage après 24 h, parquet ou sol souple après 48 à 72 h.'];
            if (v.ep > 10) infos.unshift('Plus de 10 mm : ragréage épais ou fibré (voir la notice). Au-delà de 30 mm, faire une chape.');
            infos.push('Sur plancher bois ou ancien carrelage : ragréage fibré, 5 mm minimum.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, infos, recette: null, mesure: { q: S, u: 'm²', h: S * 0.15 }
            };
        }
    },
    {
        id: 'placo', cat: 'interieur', ic: '📐', nom: 'Plaques de plâtre (placo)',
        desc: 'Doublage collé ou sur appuis, cloison, plafond',
        champs: [
            c('type', 'Ouvrage', [
                { v: 'colle', l: 'Doublage collé' }, { v: 'appuis', l: 'Doublage sur appuis' },
                { v: 'cloison', l: 'Cloison' }, { v: 'plafond', l: 'Plafond' }
            ], 'colle'),
            n('a', 'Longueur', 'm', 4, { demi: true }),
            n('b', 'Hauteur', 'm', 2.5, { demi: true, max: 5, labelSi: v => v.type === 'plafond' ? 'Largeur' : 'Hauteur' }),
            c('complexe', 'Complexe collé (PSE graphite)', Object.entries(DOUBLAGE_COLLE).map(([k, x]) => ({ v: k, l: `${x.l} · R ${String(x.R).replace('.', ',')}` })), '120', { si: v => v.type === 'colle', aide: 'Neuf / aides : viser R ≥ 3,7 (13+120 ou plus).' }),
            c('laine', 'Laine', [{ v: '100', l: '100 mm' }, { v: '120', l: '120 mm' }, { v: '140', l: '140 mm' }, { v: '160', l: '160 mm' }], '120', { si: v => v.type === 'appuis', aide: 'λ 0,032 : 120 mm ≈ R 3,75.' }),
            c('cloison', 'Cloison', [{ v: '72', l: '72/48' }, { v: '98', l: '98/48 (2 plaques/face)' }, { v: '70', l: 'Ossature M70' }], '72', { si: v => v.type === 'cloison', aide: '72/48 : 2,60 m maxi (2,95 m en montants doublés).' }),
            n('portes', 'Portes', 'u', 0, { zero: true, max: 20, si: v => v.type === 'cloison' }),
            n('ouv', 'Fenêtres / ouvertures à déduire', 'm²', 0, { zero: true, si: v => v.type !== 'plafond' }),
            c('plaque', 'Plaques', [{ v: 'std', l: 'Standard' }, { v: 'h1', l: 'Hydro H1 (salle de bain)' }, { v: 'phon', l: 'Phonique' }], 'std', { si: v => v.type !== 'colle' }),
            n('angles', 'Angles sortants (bande armée)', 'm', 0, { zero: true, max: 200, aide: 'Longueur totale des angles saillants et tableaux.' }),
            oui('isolant', 'Avec isolant (et pare-vapeur)', true, { si: v => v.type !== 'colle' })
        ],
        mots: 'placo plaque de plâtre ba13 doublage collé placomur doublissimo cloison plafond rail montant fourrure suspente optima map h1 hydrofuge',
        verifier: v => {
            if (v.type === 'cloison') {
                const lim = LIMITES_CLOISON[v.cloison] || LIMITES_CLOISON['72'];
                if (v.b > lim.double + 1e-9) return { b: v.cloison === '70' ? `Plus de ${fmtSmart(lim.double, 2)} m : voir le PV du fabricant` : `Trop haut en ${v.cloison}/48 (${fmtSmart(lim.double, 2)} m maxi) : passe en 98/48 ou M70` };
            }
            if (v.type === 'colle' && v.b > 3) return { b: 'Doublage collé : 3 m maxi d\'un seul tenant' };
            return v.type !== 'plafond' ? verifOuv('a', 'b')(v) : {};
        },
        titre: v => `${{ colle: 'Doublage collé', appuis: 'Doublage sur appuis', cloison: 'Cloison', plafond: 'Plafond' }[v.type] || 'Placo'} ${fm(v.a)}×${fm(v.b)} m`,
        calcul(v) {
            const r = calcPlaco(v.type, v.a, v.b, {
                cloison: v.cloison, plaque: v.plaque, isolant: v.isolant, ouv: v.type === 'plafond' ? 0 : v.ouv,
                portes: v.portes, laine: +v.laine, complexe: v.complexe, angles: v.angles
            });
            const infos = [...r.infos,
                'Poser hors d\'eau et hors d\'air. Plaques stockées à plat au sec, surélevées de 1 cm en pied, joints décalés de 40 cm mini.',
                'Enduit à joint en 3 passes (24 h entre passes). Salle de bain, cuisine : plaques H1.',
                'Couper le courant avant de percer. Masque FFP2 pour le ponçage et la laine.'];
            return {
                resume: [{ l: 'Surface', v: `${fm(r.S)} m²` }, ...(v.type !== 'plafond' ? [{ l: 'Plaques', v: `1,20 × ${fmtSmart(r.Lp, 2)} m` }] : [])],
                lignes: fusion(r.lignes), infos, recette: null,
                mesure: { q: r.S, u: 'm²', h: r.S * ({ colle: 0.45, appuis: 0.7, cloison: 0.9, plafond: 0.8 }[v.type] || 0.7) }
            };
        }
    },
    {
        id: 'isolation', cat: 'interieur', ic: '🧶', nom: 'Isolation des combles',
        desc: 'Laine soufflée, rouleaux, ou rampants aménagés',
        champs: [
            c('type', 'Combles', [{ v: 'souffle', l: 'Perdus : soufflé' }, { v: 'rouleau', l: 'Perdus : rouleaux' }, { v: 'rampants', l: 'Aménagés (rampants)' }], 'souffle'),
            n('L', 'Longueur', 'm', 10, { demi: true }),
            n('l', 'Largeur', 'm', 8, { demi: true, aide: 'Rampants : longueur × longueur de rampant (les 2 pans).' }),
            c('mat', 'Matériau', Object.entries(SOUFFLAGE).map(([k, x]) => ({ v: k, l: x.l })), 'verre', { si: v => v.type === 'souffle' }),
            c('R', 'Résistance visée', [{ v: '7', l: 'R 7' }, { v: '8', l: 'R 8' }, { v: '10', l: 'R 10' }], '8', { si: v => v.type === 'souffle', aide: 'Neuf (RE2020) et aides : R 8 à 10.' }),
            c('ep', 'Épaisseur', [{ v: '200', l: '200 mm' }, { v: '300', l: '300 mm' }, { v: '400', l: '400 mm' }], '300', { si: v => v.type === 'rouleau' }),
            c('lambda', 'Lambda (λ) de la laine', [{ v: '0.032', l: '0,032' }, { v: '0.035', l: '0,035' }, { v: '0.040', l: '0,040' }], '0.040', { si: v => v.type === 'rouleau', aide: 'Écrit sur le paquet. Plus il est petit, plus ça isole.' }),
            c('plaque', 'Plaques', [{ v: 'std', l: 'Standard' }, { v: 'h1', l: 'Hydro H1' }], 'std', { si: v => v.type === 'rampants' }),
            oui('pv', 'Pare-vapeur', true, { si: v => v.type !== 'rampants' })
        ],
        mots: 'isolation laine combles grenier soufflé soufflage ouate rampants pare-vapeur',
        titre: v => `Isolation ${v.type === 'rampants' ? 'sous rampants' : 'combles'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            let lignes, infos, R, h;
            if (v.type === 'souffle') {
                const r = calcSoufflage(S, v.mat, +v.R, { pareVapeur: v.pv });
                lignes = r.lignes; R = +v.R; h = S * 0.12;
                infos = [`${SOUFFLAGE[v.mat].l} : ${fmtSmart(r.eSouffle * 1000, 0)} mm à souffler (tassement compris) pour R ${v.R}. Valeurs de la notice à vérifier sur le sac.`,
                    'Piges graduées (1 pour 50 m²), rehausse de trappe, fiche de soufflage affichée près de la trappe.',
                    'Écart au feu du conduit de fumée, capots sur les spots, gaines de VMC posées sur l\'isolant.'];
            } else if (v.type === 'rouleau') {
                R = (+v.ep) / 1000 / (+v.lambda);
                lignes = [L('laine_combles', S * 1.05, { d: `${v.ep} mm, λ ${String(v.lambda).replace('.', ',')} → R ${fmtSmart(R, 1)}` })];
                if (v.pv) lignes.push(...lignesPareVapeur(S, 2 * (v.L + v.l)));
                h = S * 0.15;
                infos = [`R = épaisseur ÷ λ = ${fmtSmart(R, 1)}. En 2 couches croisées si possible. +5 % de coupes.`];
            } else {
                const r = calcRampants(S, { plaque: v.plaque });
                lignes = r.lignes; R = r.R; h = S * 1.1;
                infos = [`Laine en 2 couches (100 mm entre chevrons + 140 mm croisée), λ 0,032 : R ≈ ${fmtSmart(r.R, 1)}. Lame d'air de 2 cm sous l'écran s'il n'est pas HPV.`,
                    'Fourrures F530 perpendiculaires aux chevrons tous les 50 cm, suspentes de rampant ≈ 1,8 par m².'];
            }
            infos.push('Pare-vapeur toujours côté chaud, continu, scotché et mastiqué aux bords et aux traversées.',
                'Masque FFP2, lunettes, gants. En combles : planches de circulation, jamais marcher sur le plafond.');
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'Résistance', v: `R ${fmtSmart(R, 1)}` }],
                lignes: fusion(lignes), infos, recette: null,
                mesure: { q: S, u: 'm²', h }
            };
        }
    },
    {
        id: 'carrelage', cat: 'interieur', ic: '🔳', nom: 'Carrelage / faïence',
        desc: 'Carreaux, colle, joints, croisillons, douche',
        champs: [
            c('support', 'Où', [{ v: 'sol', l: 'Sol' }, { v: 'mur', l: 'Mur (faïence)' }, { v: 'ext', l: 'Sol extérieur' }], 'sol'),
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3, { demi: true, labelSi: v => v.support === 'mur' ? 'Hauteur' : 'Largeur', aide: '' }),
            c('format', 'Format des carreaux', [{ v: 'petit', l: 'Jusqu\'à 30 cm' }, { v: 'moyen', l: '30 à 45 cm' }, { v: 'grand', l: '45 à 60 cm' }, { v: 'tgf', l: 'Plus de 60 cm' }], 'moyen'),
            c('joint', 'Largeur de joint', [{ v: '2', l: '2 mm' }, { v: '3', l: '3 mm' }, { v: '5', l: '5 mm' }], '3', { aide: '2 mm mini en rectifié, 3 mm en non rectifié.' }),
            c('pose', 'Pose', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            n('sDouche', 'Surface de douche à protéger (SPEC)', 'm²', 0, { zero: true, max: 50, aide: 'Murs de douche sur 2 m de haut + sol. 0 si pas de douche.' }),
            n('portes', 'Portes', 'u', 1, { zero: true, max: 10, si: v => v.support !== 'mur', aide: 'Pour retirer les plinthes au droit des portes.' }),
            oui('plinthes', 'Plinthes', true, { si: v => v.support !== 'mur' }),
            oui('primaire', 'Primaire (ragréage, anhydrite, ancien carrelage)', false),
            oui('natte', 'Natte de désolidarisation (support fissuré, plancher bois)', false, { si: v => v.support === 'sol' })
        ],
        mots: 'carrelage faïence carreau colle joint plinthe double encollage croisillon spec douche',
        titre: v => `${v.support === 'mur' ? 'Faïence' : 'Carrelage'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const marge = v.pose === 'diag' ? 1.15 : 1.10;
            const mur = v.support === 'mur', ext = v.support === 'ext';
            const dim = { petit: 0.2, moyen: 0.4, grand: 0.6, tgf: 0.9 }[v.format];          // côté représentatif (m)
            const epC = { petit: 8, moyen: 9, grand: 10, tgf: 10 }[v.format];                 // épaisseur du carreau (mm)
            const double = v.format === 'grand' || v.format === 'tgf' || (ext && v.format !== 'petit') || (mur && v.format !== 'petit' && v.format !== 'moyen');
            const colle = mur ? (double ? 6 : 3.5) : ({ petit: 3.5, moyen: 5, grand: 7, tgf: 8 }[v.format]);
            const A = dim * 1000;
            const jointKg = (2 * A) / (A * A) * epC * (+v.joint) * 1.6 * 1.10;
            const lignes = [
                L('carrelage', S * marge),
                L('colle_carrelage', S * (ext && !double ? 6 : colle)),
                L('joint_carrelage', S * jointKg),
                L('croisillon', Math.ceil(S * 1.1 / (dim * dim)))
            ];
            if (dim >= 0.45) lignes.push(L('cale_nivel', Math.ceil(S * 4.4 / (dim * dim))));
            if (v.sDouche > 0) lignes.push(L('spec', v.sDouche * 1.5), L('primaire', v.sDouche * 0.10), L('bande_spec', v.sDouche * 0.8), L('silicone', 2));
            if (v.primaire) lignes.push(L('primaire', S * 0.15));
            if (v.natte && v.support === 'sol') lignes.push(L('natte_desol', S * 1.05));
            if (!mur && v.plinthes) lignes.push(L('plinthe', Math.max(0, 2 * (v.L + v.l) - 0.9 * v.portes) * 1.10));
            if (!mur) lignes.push(L('acrylique', Math.ceil(2 * (v.L + v.l) / 10 - 1e-9), { d: 'joint périphérique' }));
            const infos = [
                `Coupes : +${Math.round((marge - 1) * 100)} %. Colle C2 ≈ ${fmtSmart(ext && !double ? 6 : colle, 1)} kg/m²${double ? ' (double encollage)' : ''}, joint ≈ ${fmtSmart(jointKg, 2)} kg/m² (joint de ${v.joint} mm).`,
                'Dos du carreau couvert à 80 % mini (soulever un carreau pour vérifier). Jointoyer après 24 h. Joint périphérique de 5 mm au mastic.',
                `Fractionnement : ${ext ? 'tous les 16-20 m² et 4-5 m en extérieur' : 'tous les 40 m² et 8 m'} (ou suivre ceux du support).`,
                'Support : dalle d\'1 mois, chape de 15 jours mini. Plancher chauffant mis en chauffe puis arrêté 48 h avant.'
            ];
            if (v.format === 'tgf') infos.splice(1, 0, 'Plus de 60 × 60 : hors DTU courant, colle C2 S1 et notice du fabricant.');
            if (v.sDouche > 0) infos.push(`SPEC sur ${fm(v.sDouche)} m² : 2 couches croisées (≈ 1,5 kg/m²) sur primaire, bandes dans les angles, manchettes aux tuyaux. Faïence de douche sur 2 m de haut mini.`);
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }, { l: 'À commander', v: `${fm(S * marge)} m²` }],
                lignes: fusion(lignes), recette: null, infos,
                mesure: { q: S, u: 'm²', h: S * (mur ? 1 : 0.8) * (v.pose === 'diag' ? 1.25 : 1) + v.sDouche * 0.4 }
            };
        }
    },
    {
        id: 'parquet', cat: 'interieur', ic: '🪵', nom: 'Parquet',
        desc: 'Flottant ou collé : lames, sous-couche, plinthes',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            c('mode', 'Pose', [{ v: 'flottant', l: 'Flottante' }, { v: 'colle', l: 'Collée' }], 'flottant'),
            c('pose', 'Sens', [{ v: 'droite', l: 'Droite' }, { v: 'diag', l: 'Diagonale' }], 'droite'),
            oui('mineral', 'Sur dalle ou chape (film 200 µm)', true, { si: v => v.mode === 'flottant', aide: 'Inutile si la sous-couche a un pare-vapeur intégré.' }),
            n('portes', 'Portes', 'u', 1, { zero: true, max: 10 }),
            oui('plinthes', 'Plinthes')
        ],
        mots: 'parquet stratifié contrecollé lame sous-couche plinthe colle',
        titre: v => `Parquet ${v.mode === 'colle' ? 'collé' : 'flottant'} ${fm(v.L * v.l)} m²`,
        calcul(v) {
            const S = v.L * v.l;
            const lignes = [L('parquet', S * (v.pose === 'diag' ? 1.12 : 1.07))];
            if (v.mode === 'flottant') {
                lignes.push(L('sous_couche', S * 1.05));
                if (v.mineral) lignes.push(L('polyane200', S * 1.15));
            } else lignes.push(L('colle_parquet', S * 1.1 * 1.05), L('primaire', S * 0.15, { d: 'selon le support' }));
            if (v.plinthes) lignes.push(L('plinthe', Math.max(0, 2 * (v.L + v.l) - 0.9 * v.portes) * 1.10));
            if (v.portes > 0) lignes.push(L('barre_seuil', v.portes));
            return {
                resume: [{ l: 'Surface', v: `${fm(S)} m²` }],
                lignes, recette: null,
                infos: [
                    'Coupes : +7 % en pose droite, +12 % en diagonale. Arrondir au paquet entier.',
                    v.mode === 'colle' ? 'Colle MS polymère ≈ 1,1 kg/m² (spatule B11). Chape sèche : ≈ 1 semaine par cm, 3 % d\'humidité maxi.' : 'Film 200 µm remonté de 20 cm sur support minéral. Jeu de 8 à 10 mm en périphérie.',
                    'Acclimater les paquets 48 h dans la pièce. Fractionner au-delà de 8 m de large ou 10 m de long, et à chaque porte.'
                ],
                mesure: { q: S, u: 'm²', h: S * (v.mode === 'colle' ? 0.5 : 0.35) }
            };
        }
    },
    {
        id: 'peinture', cat: 'interieur', ic: '🖼️', nom: 'Peinture d\'une pièce',
        desc: 'Murs et plafond, impression, finition',
        champs: [
            n('L', 'Longueur', 'm', 4, { demi: true }),
            n('l', 'Largeur', 'm', 3.5, { demi: true }),
            n('h', 'Hauteur sous plafond', 'm', 2.5, { max: 8 }),
            oui('murs', 'Murs'),
            oui('plafond', 'Plafond'),
            n('ouv', 'Portes et fenêtres', 'm²', 4, { zero: true, si: v => v.murs }),
            c('couches', 'Couches de finition', [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }], '2'),
            oui('impression', 'Impression (plaques ou enduit neufs)'),
            c('lissage', 'Préparation', [{ v: '0', l: 'Aucune' }, { v: 'B', l: 'Rebouchage' }, { v: 'A', l: 'Lissage complet' }], '0')
        ],
        mots: 'peinture impression sous-couche mur plafond pot enduit lissage',
        verifier: v => (!v.murs && !v.plafond ? { L: 'Choisis murs et/ou plafond' } : {}),
        titre: v => `Peinture pièce ${fm(v.L)}×${fm(v.l)} m`,
        calcul(v) {
            const Sm = v.murs ? Math.max(0, 2 * (v.L + v.l) * v.h - (v.ouv || 0)) : 0;
            const Sp = v.plafond ? v.L * v.l : 0;
            const S = Sm + Sp;
            const k = +v.couches;
            const lignes = [];
            if (v.impression) lignes.push(L('impression', S / 8 * 1.05));
            if (Sm) lignes.push(L('peinture', Sm * k / 10 * 1.05, { d: `${k} couche(s)` }));
            if (Sp) lignes.push(L('peinture_plafond', Sp * k / 10 * 1.05, { d: `${k} couche(s)` }));
            if (v.lissage !== '0') lignes.push(L('enduit_lissage', S * (v.lissage === 'A' ? 1.0 : 0.2)));
            lignes.push(L('ruban', 2 * 2 * (v.L + v.l)), L('bache', v.L * v.l * 1.1));
            return {
                resume: [{ l: 'Murs', v: `${fm(Sm)} m²` }, { l: 'Plafond', v: `${fm(Sp)} m²` }],
                lignes, recette: null,
                infos: [
                    'Impression ≈ 8 m²/L, finition ≈ 10 m²/L par couche (voir le pot). Lissage complet : 2 passes de ≈ 0,5 kg/m².',
                    'Pas sous 5 °C ni au-dessus de 80 % d\'humidité. Plâtre sec (moins de 5 %). Impression puis 12 à 24 h avant la finition, ≈ 6 h entre couches.'
                ],
                mesure: { q: S, u: 'm²', h: S * (0.12 * (k + (v.impression ? 1 : 0)) + (v.lissage === 'A' ? 0.4 : v.lissage === 'B' ? 0.1 : 0)) }
            };
        }
    }
];
