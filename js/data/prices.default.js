// === CATALOGUE DE PRIX PAR DÉFAUT (Dordogne 2026, indicatif, éditable) ===
// Toutes ces valeurs deviennent les prix par défaut. L'utilisateur les modifie
// dans Réglages ▸ Tarifs ; ses modifications sont stockées dans localStorage
// (clé kalou_prix_v1) et fusionnées par-dessus ce catalogue par pricing/tarifs.js.
//
// ⚠️ Prix repères marché — à ajuster selon son négociant. En micro-entreprise
// (franchise de TVA), il ne récupère pas la TVA : ces prix sont considérés TTC.

export const MATERIAUX_DEFAUT = [
    // Liants
    { id: 'ciment35',   label: 'Ciment CEM II 35 kg',            unite: 'sac',      prix: 8.00,   cat: 'Liants' },
    { id: 'chaux_nhl',  label: 'Chaux hydraulique NHL 3.5 35 kg', unite: 'sac',     prix: 17.00,  cat: 'Liants' },
    { id: 'chaux_cl90', label: 'Chaux aérienne CL90 25 kg',      unite: 'sac',      prix: 18.00,  cat: 'Liants' },
    { id: 'enduit_mono',label: 'Enduit monocouche 25 kg',        unite: 'sac',      prix: 13.00,  cat: 'Liants' },
    // Blocs
    { id: 'parpaing',   label: 'Agglo 20×20×50',                 unite: 'u',        prix: 2.00,   cat: 'Blocs' },
    { id: 'parpaing_a', label: "Agglo d'angle 20×20×50",         unite: 'u',        prix: 2.50,   cat: 'Blocs' },
    { id: 'moellon',    label: 'Moellon / pierre du pays',       unite: 'T',        prix: 200.00, cat: 'Blocs' },
    // Agrégats & béton
    { id: 'sable',      label: 'Sable 0/4 vrac',                 unite: 'T',        prix: 45.00,  cat: 'Agrégats' },
    { id: 'gravier',    label: 'Gravier 0/15 vrac',              unite: 'T',        prix: 45.00,  cat: 'Agrégats' },
    { id: 'bigbag',     label: 'Big bag agrégat (~1 m³)',        unite: 'u',        prix: 60.00,  cat: 'Agrégats' },
    { id: 'toutvenant', label: 'Tout-venant 0/31.5 (hérisson)',  unite: 'T',        prix: 28.00,  cat: 'Agrégats' },
    { id: 'bpe',        label: 'Béton prêt à l\'emploi (toupie)', unite: 'm³',      prix: 160.00, cat: 'Agrégats' },
    // Ferraillage
    { id: 'treillis',   label: 'Treillis soudé ST25C 3,6×2,4 m', unite: 'panneau',  prix: 20.00,  cat: 'Ferraillage' },
    { id: 'ferha',      label: 'Fer HA Ø10 barre 6 m',           unite: 'u',        prix: 11.00,  cat: 'Ferraillage' },
    { id: 'linteau',    label: 'Linteau béton préfa',            unite: 'ml',       prix: 28.00,  cat: 'Ferraillage' },
    { id: 'ipn',        label: 'Poutre acier IPN/HEA',           unite: 'ml',       prix: 65.00,  cat: 'Ferraillage' },
    // Divers / finitions
    { id: 'polyane',    label: 'Polyane / film',                 unite: 'm²',       prix: 0.80,   cat: 'Divers' },
    { id: 'geotextile', label: 'Géotextile',                     unite: 'm²',       prix: 1.20,   cat: 'Divers' },
    { id: 'dalle_ter',  label: 'Dalle terrasse',                 unite: 'm²',       prix: 40.00,  cat: 'Divers' },
    { id: 'plot',       label: 'Plot réglable terrasse',         unite: 'u',        prix: 3.00,   cat: 'Divers' },
    // Locations & évacuation
    { id: 'loc_beton',  label: 'Location bétonnière',            unite: 'jour',     prix: 40.00,  cat: 'Locations' },
    { id: 'loc_pelle',  label: 'Location mini-pelle',            unite: 'jour',     prix: 200.00, cat: 'Locations' },
    { id: 'loc_etai',   label: 'Location étai',                  unite: 'u/sem',    prix: 4.00,   cat: 'Locations' },
    { id: 'benne',      label: 'Évacuation gravats (benne 8 m³)', unite: 'u',       prix: 250.00, cat: 'Locations' }
];

// === OUVRAGES (fourni-posé) — modèles de lignes de devis prêtes à chiffrer ===
// prix = prix de vente unitaire HT indicatif (marché Dordogne) ; tempsMO = heures
// de main d'œuvre par unité (informatif, aide au calcul). Tout est éditable.
export const OUVRAGES_DEFAUT = [
    {
        id: 'terrasse_beton', label: 'Terrasse béton', unite: 'm²', prix: 78, tempsMO: 1.1,
        cat: 'Terrasses & dallages',
        detail: 'Fourniture et pose comprenant décaissement du terrain, hérisson compacté, film polyane, treillis soudé, dalle béton de 12 cm et finition, y compris réglage des pentes d\'écoulement.',
        config: {
            mode: 'm2',
            dims: [{ id: 'L', label: 'Longueur', unit: 'm', default: 5 }, { id: 'l', label: 'Largeur', unit: 'm', default: 4 }],
            resume: d => `Terrasse béton de ${(d.L * d.l).toFixed(1)} m² (${d.L} × ${d.l} m)`,
            options: [
                { id: 'decaissement', label: 'Décaissement et préparation du fond de forme', defaut: true },
                { id: 'herisson',     label: 'Hérisson compacté + film polyane',            defaut: true },
                { id: 'treillis',     label: 'Treillis soudé de renfort',                    defaut: true },
                { id: 'pente',        label: 'Réglage des pentes d\'écoulement des eaux',    defaut: true },
                { id: 'lissee',       label: 'Finition lissée',                              defaut: true },
                { id: 'desactive',    label: 'Finition béton désactivé (gravillon apparent)', defaut: false },
                { id: 'joints',       label: 'Joints de dilatation',                         defaut: false }
            ]
        }
    },
    { id: 'terrasse_desac', label: 'Terrasse béton désactivé', unite: 'm²', prix: 105, tempsMO: 1.3, cat: 'Terrasses & dallages', detail: 'Fourniture et pose : décaissement, hérisson compacté, film polyane, treillis soudé, dalle béton 12 cm, finition désactivée (gravillon lavé apparent), réglage des pentes.' },
    { id: 'terrasse_plots', label: 'Terrasse sur plots + dalles', unite: 'm²', prix: 60, tempsMO: 0.6, cat: 'Terrasses & dallages', detail: 'Fourniture et pose de dalles sur plots réglables (dalles fournies), réglage de niveau et des pentes, découpes de rive.' },
    { id: 'dallage', label: 'Dallage / allée béton', unite: 'm²', prix: 62, tempsMO: 0.9, cat: 'Terrasses & dallages', detail: 'Fourniture et pose : décaissement, forme en tout-venant compacté, treillis soudé, dalle béton, finition balayée.' },
    { id: 'mur_parpaing', label: 'Mur parpaing enduit (2 faces)', unite: 'm²', prix: 80, tempsMO: 1.2, cat: 'Murs', detail: 'Fourniture et pose : montage d\'agglos hourdés au mortier, chaînages, enduit de finition sur les deux faces.' },
    {
        id: 'mur_pierre', label: 'Mur en pierre — parement moellons', unite: 'm²', prix: 185, tempsMO: 3.0,
        cat: 'Murs',
        detail: 'Montage de moellons en pierre du pays hourdés au mortier de chaux NHL, une face vue, arase comprise.',
        config: {
            mode: 'm2',
            dims: [{ id: 'L', label: 'Longueur', unit: 'm', default: 5 }, { id: 'h', label: 'Hauteur', unit: 'm', default: 1.5 }],
            resume: d => `Mur en pierre de ${(d.L * d.h).toFixed(1)} m² (${d.L} × ${d.h} m)`,
            options: [
                { id: 'moellon',  label: 'Montage de moellons en pierre du pays',   defaut: true },
                { id: 'chaux',    label: 'Hourdage au mortier de chaux NHL',        defaut: true },
                { id: 'facevue',  label: 'Une face vue (parement soigné)',          defaut: true },
                { id: 'arase',    label: 'Arase supérieure',                        defaut: true },
                { id: 'rejoint',  label: 'Rejointoiement de finition',              defaut: false },
                { id: 'deuxfaces', label: 'Deux faces vues',                        defaut: false },
                { id: 'drainage', label: 'Drainage arrière + barbacanes',          defaut: false }
            ]
        }
    },
    { id: 'rejoint', label: 'Rejointoiement à la chaux', unite: 'm²', prix: 65, tempsMO: 1.5, cat: 'Murs', detail: 'Dégarnissage des joints existants, dépoussiérage, rejointoiement au mortier de chaux, finition brossée.' },
    { id: 'enduit_chaux', label: 'Enduit à la chaux', unite: 'm²', prix: 68, tempsMO: 1.5, cat: 'Murs', detail: 'Enduit à la chaux NHL en trois passes (gobetis, corps d\'enduit, finition), sur mur pierre ou parpaing.' },
    {
        id: 'ouverture', label: "Création d'ouverture (mur porteur)", unite: 'forfait', prix: 1500, tempsMO: 12,
        cat: 'Ouvertures & piscines',
        detail: 'Création d\'une ouverture dans un mur porteur : étaiement, découpe, pose du linteau/IPN et reprises de maçonnerie.',
        config: {
            mode: 'forfait',
            dims: [{ id: 'larg', label: 'Largeur', unit: 'm', default: 1.2 }, { id: 'haut', label: 'Hauteur', unit: 'm', default: 2.15 }],
            resume: d => `Création d'une ouverture de ${d.larg} × ${d.haut} m dans mur porteur`,
            base: () => 900,
            options: [
                { id: 'etaiement', label: 'Étaiement provisoire de la structure',   defaut: true,  prix: 250 },
                { id: 'ipn',       label: 'Fourniture et pose d\'un IPN / HEA',      defaut: true,  prix: 450 },
                { id: 'linteau',   label: 'Linteau béton préfabriqué',              defaut: false, prix: 180 },
                { id: 'depose',    label: 'Dépose et évacuation des gravats',        defaut: true,  prix: 280 },
                { id: 'tableau',   label: 'Habillage / finition des tableaux',       defaut: false, prix: 350 },
                { id: 'etude',     label: 'Étude structure (bureau d\'études)',       defaut: false, prix: 600 }
            ]
        }
    },
    {
        id: 'piscine_go', label: 'Piscine maçonnée — structure', unite: 'forfait', prix: 14000, tempsMO: 120,
        cat: 'Ouvertures & piscines',
        detail: 'Structure gros œuvre d\'une piscine maçonnée. Hors étanchéité/liner, filtration, margelles et plage.',
        config: {
            mode: 'forfait',
            dims: [{ id: 'L', label: 'Longueur', unit: 'm', default: 8 }, { id: 'l', label: 'Largeur', unit: 'm', default: 4 }, { id: 'p', label: 'Profondeur', unit: 'm', default: 1.5 }],
            resume: d => `Piscine maçonnée ${d.L} × ${d.l} m, profondeur ${d.p} m (surface ${(d.L * d.l).toFixed(1)} m²)`,
            base: d => Math.round(d.L * d.l * 300),   // structure (radier + murs) ~300 €/m² de bassin
            options: [
                { id: 'terrassement', label: 'Terrassement à la mini-pelle',                          defaut: true,  prix: 2200 },
                { id: 'evac',         label: 'Évacuation des déblais',                                 defaut: true,  prix: 1200 },
                { id: 'ferraillage',  label: 'Radier et murs armés (ferraillage)',                    defaut: true,  prix: 1800 },
                { id: 'reservations', label: 'Réservations (skimmer, refoulements, bonde, projecteur)', defaut: true, prix: 900 },
                { id: 'arase',        label: 'Arase étanche et chaînage périphérique',                defaut: true,  prix: 700 },
                { id: 'enduit',       label: 'Enduit hydrofuge d\'imperméabilisation',                defaut: false, prix: 2500 },
                { id: 'margelles',    label: 'Pose de margelles (fournies par le client)',            defaut: false, prix: 1500 },
                { id: 'localtech',    label: 'Local technique (maçonnerie)',                          defaut: false, prix: 2000 }
            ],
            exclusions: 'Non compris : étanchéité / liner, filtration et équipements, plage / terrasse, raccordements électriques.'
        }
    },
    { id: 'evacuation', label: 'Évacuation des gravats', unite: 'forfait', prix: 290, tempsMO: 2, cat: 'Divers', detail: 'Location d\'une benne 8 m³, chargement et évacuation des gravats en déchetterie professionnelle.' },
    { id: 'terrassement', label: 'Terrassement mini-pelle', unite: 'jour', prix: 450, tempsMO: 8, cat: 'Divers', detail: 'Terrassement à la mini-pelle (location + conducteur), réglage et mise en forme, à la journée.' }
];

// === PROFIL ENTREPRISE PAR DÉFAUT ===
export const PROFIL_DEFAUT = {
    entreprise:         '',
    artisan:            '',
    formeJuridique:     'EI',              // affiché "EI" sur les documents
    adresse:            '',
    siret:              '',
    ape:                '4399C',           // Autres travaux de finition (maçonnerie ≈ 4399C/4291Z)
    tel:                '',
    email:              '',
    assureurDecennale:  '',
    contratDecennale:   '',
    zoneDecennale:      'Dordogne (24) et départements limitrophes',
    rib:                '',
    mediateur:          '',
    regimeTVA:          'franchise',       // 'franchise' | '10' | '20'
    tvaIntra:           '',
    acomptePct:         30,
    validite:           '3 mois',
    // Taux horaire de vente (€/h HT) utilisé pour la main d'œuvre
    tauxHoraire:        45,
    // Paramètres du calcul de déboursé (écran "Mon taux")
    debourse: {
        revenuMensuel:     2000,   // net souhaité / mois
        fraisAnnuels:      10000,  // frais généraux / an (véhicule, assurances, outillage…)
        heuresFacturables: 1200,   // heures réellement facturables / an
        cotisationsPct:    21.2,   // micro-entreprise prestations de services
        margePct:          15      // marge / bénéfice de sécurité
    }
};

// Taux de TVA disponibles
export const TVA_OPTIONS = [
    { v: 'franchise', label: 'Franchise · art. 293 B', taux: 0 },
    { v: '10',        label: 'Rénovation · 10 %',       taux: 10 },
    { v: '20',        label: 'Neuf · 20 %',             taux: 20 }
];
