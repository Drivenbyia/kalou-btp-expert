// Calculateurs « Électricité & ventilation » : quantités pour les courses (NF C 15-100).
// Ce n'est pas une étude électrique : le raccordement au tableau et la mise en service
// se font hors tension, et une installation neuve ou rénovée en totalité passe au Consuel.
// Relu par un électricien (relecture à rôle, v5.1).

import { L, fusion } from '../base.js';
import { fmtSmart } from '../../core/format.js';
import { n, c, oui, fm } from './commun.js';

// NF C 15-100 : 8 prises maxi conseillé par circuit 2,5 mm² / 20 A (12 toléré),
// 8 points lumineux maxi par circuit 1,5 mm² / 16 A, un circuit dédié par gros appareil,
// chauffage : 3 500 W maxi par circuit 1,5 mm² / 16 A.
const PRISES_PAR_CIRCUIT = 8;
const POINTS_PAR_CIRCUIT = 8;
const W_PAR_CIRCUIT_CHAUFFAGE = 3500;
const ENTRE_POINTS = 3;               // m de gaine entre deux points d'un même circuit (montée, descente, liaison)

export const ELEC = [
    {
        id: 'electricite', cat: 'elec', ic: '💡', nom: 'Électricité (prises, lumières, tableau)',
        desc: 'Gaines préfilées, boîtes, appareillage, disjoncteurs : par point',
        champs: [
            n('prises', 'Prises 16 A', 'u', 8, { demi: true, zero: true, max: 200, aide: 'Repères : 5 dans le séjour, 3 par chambre, 6 dans la cuisine (dont 4 sur le plan de travail).' }),
            n('points', 'Points lumineux', 'u', 4, { demi: true, zero: true, max: 100, aide: 'Plafonniers, appliques. 1 au minimum par pièce.' }),
            n('inter', 'Interrupteurs', 'u', 4, { demi: true, zero: true, max: 100 }),
            n('spe', 'Circuits dédiés 20 A', 'u', 0, { demi: true, zero: true, max: 20, aide: 'Un par appareil : four, lave-linge, lave-vaisselle, sèche-linge, congélateur.' }),
            oui('plaque', 'Plaque de cuisson (circuit 32 A, 6 mm²)', false),
            oui('cumulus', 'Chauffe-eau électrique (heures creuses)', false),
            n('radiateurs', 'Radiateurs électriques', 'u', 0, { demi: true, zero: true, max: 30 }),
            n('watts', 'Puissance totale des radiateurs', 'W', 0, { demi: true, zero: true, max: 40000, si: v => v.radiateurs > 0 }),
            n('sdb', 'Salles de bain', 'u', 0, { zero: true, max: 5, aide: 'Pour la liaison équipotentielle (terre des éléments métalliques).' }),
            c('pose', 'Pose', [{ v: 'placo', l: 'Encastré placo' }, { v: 'maconnerie', l: 'Encastré maçonnerie' }, { v: 'apparent', l: 'Apparent (moulure)' }], 'placo',
                { aide: 'Encastré placo : gaines dans le doublage ou la cloison. Maçonnerie : saignées rebouchées au plâtre. Apparent : câble sous moulure.' }),
            n('dist', 'Distance moyenne tableau → pièce', 'm', 8, { max: 60, aide: 'Longueur de gaine du tableau jusqu\'au premier point du circuit, en suivant les murs et le plafond.' }),
            oui('tableau', 'Tableau neuf (disjoncteurs, différentiels)', false),
            oui('terre', 'Prise de terre à faire (maison)', false, { si: v => v.tableau, aide: 'Piquet de terre, câble jusqu\'au tableau et barrette de mesure.' })
        ],
        mots: 'électricité electricite prise interrupteur lumière éclairage point lumineux gaine icta fil câble boîte dcl tableau disjoncteur différentiel terre radiateur chauffe-eau cumulus nf c 15-100 consuel',
        verifier: v => {
            if (!(v.prises > 0) && !(v.points > 0) && !(v.spe > 0) && !v.plaque && !v.cumulus && !(v.radiateurs > 0)) return { prises: 'Mets au moins une prise, un point lumineux ou un circuit' };
            if (v.radiateurs > 0 && !(v.watts > 0)) return { watts: 'Additionne la puissance des radiateurs (ex : 4 × 1 000 W = 4 000)' };
            return {};
        },
        titre: v => `Électricité : ${fm(v.prises)} prise${v.prises > 1 ? 's' : ''}, ${fm(v.points)} point${v.points > 1 ? 's' : ''} lumineux`,
        calcul(v) {
            const app = v.pose === 'apparent';
            const cPrises = Math.ceil(v.prises / PRISES_PAR_CIRCUIT - 1e-9);
            const cEcl = Math.ceil(v.points / POINTS_PAR_CIRCUIT - 1e-9);
            const cChauf = v.radiateurs > 0 ? Math.max(1, Math.ceil(v.watts / W_PAR_CIRCUIT_CHAUFFAGE - 1e-9)) : 0;
            const mlEcl = (cEcl * v.dist + (v.points + v.inter) * ENTRE_POINTS) * 1.15;
            const mlChauf = (cChauf * v.dist + v.radiateurs * ENTRE_POINTS) * 1.15;
            const mlPrises = (cPrises * v.dist + v.prises * ENTRE_POINTS) * 1.15;
            const mlSpe = (v.spe + (v.cumulus ? 1 : 0)) * (v.dist + ENTRE_POINTS) * 1.15;
            const mlPlaque = v.plaque ? (v.dist + ENTRE_POINTS) * 1.15 : 0;
            const ml15 = mlEcl + mlChauf, ml25 = mlPrises + mlSpe;
            const mlTotal = ml15 + ml25 + mlPlaque;
            const lignes = [];
            if (app) {
                if (ml15) lignes.push(L('cable_15', ml15, { d: v.radiateurs ? 'radiateurs : câble avec fil pilote' : undefined }));
                if (ml25) lignes.push(L('cable_25', ml25));
                if (mlPlaque) lignes.push(L('cable_6', mlPlaque));
                const mlMoulure = mlTotal * 0.8;
                lignes.push(L('moulure', mlMoulure), L('fixation', Math.ceil(mlMoulure / 2) * 3, { d: 'vis + chevilles, 3 par barre' }));
            } else {
                if (ml15) lignes.push(L('icta_15', ml15, { d: v.radiateurs ? 'radiateurs : prévoir le fil pilote' : undefined }));
                if (ml25) lignes.push(L('icta_25', ml25));
                if (mlPlaque) lignes.push(L('icta_6', mlPlaque));
            }
            // Va-et-vient et retours : la gaine préfilée 3G1,5 ne suffit pas
            if (v.inter > 0) lignes.push(L('fil15', v.inter * 6, { d: 'navettes et retours, ≈ 2 × 3 m par interrupteur' }));
            // Boîtes
            const sorties = (v.plaque ? 1 : 0) + (v.cumulus ? 1 : 0) + v.radiateurs;
            const nbBoites = v.prises + v.inter + v.spe + sorties;
            if (v.pose === 'placo') lignes.push(L('boite_placo', nbBoites));
            if (v.pose === 'maconnerie') lignes.push(L('boite_sceller', nbBoites), L('platre', mlTotal * 0.5 * 1 + nbBoites * 0.3, { d: 'saignées et scellement des boîtes' }));
            if (app) lignes.push(L('boitier_saillie', v.prises + v.inter + v.spe));
            if (!app && v.points > 0) lignes.push(L('boite_dcl', v.points));
            const nbDeriv = cEcl > 0 ? (app ? v.points : cEcl) : 0;
            if (nbDeriv) lignes.push(L('boite_derivation', nbDeriv));
            lignes.push(L('wago', v.points * 3 + nbDeriv * 5 + (v.prises + v.spe) * 1));
            // Appareillage
            if (v.prises + v.spe > 0) lignes.push(L('prise', v.prises + v.spe));
            if (v.inter > 0) lignes.push(L('inter', v.inter));
            if (v.points > 0) lignes.push(L('douille', v.points));
            if (v.plaque) lignes.push(L('sortie_cable', 1, { ref: '32 A' }));
            if (v.cumulus) lignes.push(L('sortie_cable', 1, { ref: '20 A' }));
            if (v.radiateurs) lignes.push(L('sortie_cable', v.radiateurs, { ref: 'radiateur (avec fil pilote)' }));
            // Liaison équipotentielle des salles de bain
            if (v.sdb > 0) lignes.push(L('fil_vj4', v.sdb * 10), L('collier_terre', v.sdb * 4));
            // Tableau
            const circuits = cEcl + cPrises + v.spe + (v.plaque ? 1 : 0) + (v.cumulus ? 1 : 0) + cChauf;
            let nDiff = 0, nA = 0, rangees = 0;
            if (v.tableau) {
                // Logement de plus de 35 m² : 2 interrupteurs différentiels 40 A mini, 8 circuits maxi chacun
                nDiff = Math.max(2, Math.ceil(circuits / 8 - 1e-9));
                nA = (v.plaque || v.spe > 0) ? 1 : 0;              // type A : plaque, lave-linge
                if (cEcl + cChauf) lignes.push(L('disj16', cEcl + cChauf));
                if (cPrises + v.spe + (v.cumulus ? 1 : 0)) lignes.push(L('disj20', cPrises + v.spe + (v.cumulus ? 1 : 0)));
                if (v.plaque) lignes.push(L('disj32', 1));
                if (v.cumulus) lignes.push(L('contacteur', 1), L('disj2', 1, { d: 'commande du contacteur' }));
                if (nA) lignes.push(L('diff_a', nA));
                if (nDiff - nA > 0) lignes.push(L('diff_ac', nDiff - nA));
                const modules = circuits + (v.cumulus ? 2 : 0) + 2 * nDiff;
                rangees = Math.max(1, Math.ceil(modules * 1.2 / 13 - 1e-9));      // 20 % de réserve obligatoire
                lignes.push(L('tableau', 1, { ref: `${rangees} rangée${rangees > 1 ? 's' : ''}` }), L('peigne', rangees), L('bornier_terre', 1));
                if (v.terre) lignes.push(L('piquet_terre', 1), L('cable_terre', v.dist + 3), L('barrette_terre', 1));
            }
            const infos = [
                `${cPrises} circuit${cPrises > 1 ? 's' : ''} de prises (2,5 mm², 20 A, 8 prises maxi conseillé), ${cEcl} circuit${cEcl > 1 ? 's' : ''} d'éclairage (1,5 mm², 16 A, 8 points maxi)${v.spe ? `, ${v.spe} circuit${v.spe > 1 ? 's' : ''} dédié${v.spe > 1 ? 's' : ''} 20 A` : ''}${v.plaque ? ', plaque de cuisson en 6 mm² / 32 A' : ''}${v.cumulus ? ', chauffe-eau en 2,5 mm² / 20 A sur contacteur' : ''}${cChauf ? `, ${cChauf} circuit${cChauf > 1 ? 's' : ''} de chauffage (3 500 W maxi en 1,5 mm² / 16 A)` : ''}. Gaines : ${fm(mlTotal)} m, 15 % de marge comprise.`,
                v.tableau ? `Tableau : ${circuits} circuits, ${nDiff} interrupteurs différentiels 30 mA 40 A (8 circuits maxi chacun${nA ? ', type A pour la plaque et le lave-linge' : ''}), ${rangees} rangée${rangees > 1 ? 's' : ''} avec 20 % de réserve (obligatoire). Petit logement de moins de 35 m² : 1 différentiel 25 A peut suffire. Parafoudre selon la zone et la ligne (aérienne : souvent obligatoire).` : 'Tableau existant : vérifier qu\'il reste des places et qu\'il est protégé par un différentiel 30 mA.',
                'Toujours couper au disjoncteur général et vérifier l\'absence de tension (VAT) avant de toucher un fil. Raccorder au tableau en dernier.',
                'Cuisine : les prises du plan de travail (6 maxi) sur un circuit réservé à la cuisine, jamais au-dessus de l\'évier ni des feux.',
                'Salle de bain : volume 1 (au-dessus de la baignoire ou de la douche, jusqu\'à 2,25 m) : seulement chauffe-eau et très basse tension. Volume 2 (60 cm autour) : appareils de classe II et prise rasoir. Douche à l\'italienne sans paroi : volume 1 sur 1,20 m autour de la pomme. Liaison équipotentielle des éléments métalliques.',
                'Hauteurs : axe des prises 16 et 20 A à 5 cm du sol mini, sorties 32 A à 12 cm mini. Boîtes placo dans les cloisons, pas de gaine noyée dans l\'isolant sans protection.',
                'Bâti ancien : pas de terre ou terre douteuse, le différentiel 30 mA ne la remplace pas. Le Consuel mesure la terre (100 Ω maxi).',
                'Rénovation complète ou installation neuve : attestation de conformité Consuel avant la mise en service. En cas de doute, faire valider par un électricien. Outil : scie cloche Ø68 pour les boîtes placo.'
            ];
            return {
                resume: [{ l: 'Circuits', v: `${circuits} circuit${circuits > 1 ? 's' : ''}` }, { l: 'Gaines', v: `${fmtSmart(mlTotal, 0)} m` }],
                lignes: fusion(lignes), infos, recette: null,
                mesure: { q: v.prises + v.points + v.inter, u: 'point', h: (v.prises + v.points + v.inter + sorties) * 0.6 + (v.tableau ? 6 : 0) }
            };
        }
    },
    {
        id: 'vmc', cat: 'elec', ic: '🌀', nom: 'VMC (ventilation)',
        desc: 'Caisson, bouches, gaines, entrées d\'air',
        champs: [
            n('sdb', 'Salles de bain / douche', 'u', 1, { demi: true, zero: true, max: 6 }),
            n('wc', 'WC', 'u', 1, { demi: true, zero: true, max: 6 }),
            oui('cuisine', 'Cuisine', true),
            n('seches', 'Pièces sèches (séjour, chambres)', 'u', 3, { zero: true, max: 15, aide: 'Une entrée d\'air par pièce sèche (dans la fenêtre ou le mur).' }),
            c('type', 'VMC', [{ v: 'auto', l: 'Autoréglable' }, { v: 'hygro', l: 'Hygroréglable (type B)' }], 'hygro', { aide: 'Hygroréglable : débit selon l\'humidité, moins de chauffage perdu.' }),
            n('dist', 'Distance moyenne caisson → bouche', 'm', 4, { demi: true, max: 20, aide: 'Le caisson va dans les combles, au plus près des bouches.' }),
            n('distTab', 'Distance tableau → caisson', 'm', 10, { demi: true, max: 60 }),
            oui('sortie', 'Sortie de toiture', true)
        ],
        mots: 'vmc ventilation simple flux hygroréglable autoréglable bouche extraction gaine entrée d\'air caisson humidité condensation',
        verifier: v => (!(v.sdb > 0) && !(v.wc > 0) && !v.cuisine ? { sdb: 'Il faut au moins une pièce humide' } : {}),
        titre: v => `VMC ${v.type === 'hygro' ? 'hygroréglable' : 'autoréglable'} : ${v.sdb + v.wc + (v.cuisine ? 1 : 0)} bouches`,
        calcul(v) {
            const hygro = v.type === 'hygro';
            const petites = v.sdb + v.wc;
            const bouches = petites + (v.cuisine ? 1 : 0);
            const lignes = [
                L('vmc_caisson', 1, { ref: `${hygro ? 'hygroréglable B' : 'autoréglable'}, ${bouches} piquage${bouches > 1 ? 's' : ''}` }),
                L('vmc_suspension', 1)
            ];
            if (v.cuisine) lignes.push(L('vmc_bouche', 1, { ref: hygro ? 'cuisine, à cordon (grande vitesse)' : 'cuisine' }));
            if (v.sdb > 0) lignes.push(L('vmc_bouche', v.sdb, { ref: hygro ? 'salle de bain, hygroréglable' : 'salle de bain' }));
            if (v.wc > 0) lignes.push(L('vmc_bouche', v.wc, { ref: hygro ? 'WC, détection de présence' : 'WC' }));
            lignes.push(L('vmc_manchon', bouches));
            if (petites) lignes.push(L('vmc_gaine80', petites * v.dist * 1.10));
            lignes.push(L('vmc_gaine125', ((v.cuisine ? v.dist : 0) + (v.sortie ? 2 : 0)) * 1.10, { d: v.sortie ? 'cuisine + rejet vers la sortie de toit' : 'cuisine' }));
            lignes.push(L('collier_vmc', 2 * bouches + 2), L('adhesif_alu', 1));
            if (v.sortie) lignes.push(L('vmc_sortie', 1));
            if (v.seches > 0) lignes.push(L('entree_air', v.seches, { ref: hygro ? 'hygroréglables' : 'autoréglables' }));
            lignes.push(L('cable_15', v.distTab + 3, { d: 'alimentation du caisson' }), L('disj2', 1, { d: 'circuit dédié de la VMC' }));
            return {
                resume: [{ l: 'Bouches', v: `${bouches}` }, { l: 'Entrées d\'air', v: `${v.seches}` }],
                lignes: fusion(lignes), recette: null,
                infos: [
                    'Principe : l\'air entre par les pièces sèches (entrées d\'air) et sort par les pièces humides (bouches). Portes intérieures détalonnées de 1 cm (2 cm pour la cuisine).',
                    `Caisson adapté au nombre de pièces du logement et de piquages : 1 en Ø125 pour la cuisine, les autres en Ø80 (${bouches} au total).`,
                    'Gaines tendues, sans écrasement ni point bas, posées sur l\'isolant des combles (jamais enfouies dessous). Le moins de coudes possible.',
                    'Rejet en toiture ou en façade, jamais dans les combles. Caisson suspendu ou posé sur plots anti-vibration.',
                    'Alimentation : circuit dédié protégé par un disjoncteur 2 A (compté ici). Ne jamais raccorder la hotte au réseau de VMC.',
                    'Chaudière gaz, poêle ou insert non étanche : une VMC peut faire refouler le monoxyde de carbone. Faire valider par un professionnel.',
                    'Bâti ancien très humide : une VMC aide, mais il faut d\'abord traiter les remontées d\'humidité et les enduits ciment.'
                ],
                mesure: { q: bouches, u: 'bouche', h: 6 + bouches * 1.5 + v.seches * 0.5 }
            };
        }
    }
];
