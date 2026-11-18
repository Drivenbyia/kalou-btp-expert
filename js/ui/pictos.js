// Pictos des tuiles : un dessin au trait par ouvrage (même famille que les icônes du menu).
// Remplacent les emojis, dont le rendu change selon le téléphone. viewBox 24 × 24, trait 2.

const P = {
    fondation: 'M3 20h18M6 20v-4h12v4M10 16V5h4v11',
    dalle: 'M3 13l9-4 9 4-9 4zM3 13v3l9 4 9-4v-3',
    beton: 'M5 9l8-4 5 8-8 4zM9 16l-2 5M15 14l2 7M4 21h16',
    poteau: 'M9 4h6v16H9zM6 20h12M6 4h12',
    chainage: 'M9 9H6a3 3 0 000 6h3a3 3 0 000-6zM18 9h-3a3 3 0 000 6h3a3 3 0 000-6zM9 12h6',
    plancher: 'M3 9h18M3 15h18M6 9v6M12 9v6M18 9v6',
    escalier: 'M3 21h4v-4h4v-4h4V9h4V5h2',
    mur: 'M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19',
    pierre: 'M4 8l5-3 4 2-1 5-6 1zM14 9l5-1 2 5-4 3-4-2zM4 16h6l2 4H5z',
    muret: 'M2 10h20M3 10v9h18v-9M3 14.5h18M8 10v4.5M14 10v4.5M11 14.5V19M17 14.5V19',
    ouverture: 'M3 3h18v18H3zM9 21V9h6v12',
    linteau: 'M3 6h18v4H3zM6 10v11M18 10v11',
    soutenement: 'M6 3v15h13M6 18v3h15M8 7c4 1 7 4 7 9',
    enduit: 'M3 15h13v4H3zM10 15V9h6V5',
    chaux: 'M5 9h14l-1.5 11h-11zM5 9c0-2.5 3-4.5 7-4.5S19 6.5 19 9',
    rejoint: 'M3 4h8v6H3zM13 4h8v6h-8zM3 14h6v6H3zM11 14h10v6H11z',
    toiture: 'M2 12l10-8 10 8M5 10v10h14V10',
    echafaudage: 'M5 3v18M19 3v18M5 9h14M5 15h14M5 9l14 6',
    conduit: 'M8 21V9h8v12M6 9h12M10 6c0-1.5 1-2.5 2-2.5s2 1 2 2.5',
    piece: 'M5 12V9a2 2 0 012-2h10a2 2 0 012 2v3M3 12h18v5H3zM5 17v2M19 17v2',
    chape: 'M3 15h18v4H3zM5 11h14M8 11V8M16 11V8',
    ragreage: 'M3 19h18M12 4c3 4 4.5 6.5 4.5 8.5a4.5 4.5 0 01-9 0C7.5 10.5 9 8 12 4z',
    placo: 'M4 4h7v16H4zM13 4h7v16h-7z',
    isolation: 'M2 12l10-8 10 8M5 15c2-2 3 2 5 0s3 2 5 0 3 2 4 0M5 19h14',
    carrelage: 'M4 4h16v16H4zM4 12h16M12 4v16',
    parquet: 'M3 6h18v12H3zM3 10h18M3 14h18M9 6v4M15 10v4M7 14v4',
    peinture: 'M4 4h13v5H4zM17 6.5h3V12h-8v3M11 15h2v6h-2z',
    isoler: 'M10 4.5a2 2 0 014 0V14a4 4 0 11-4 0zM12 10v7',
    douche: 'M4 4h5a7 7 0 017 7M11 11h9M13 14v1M16.5 14v2M20 14v1M14.5 18v1M18 18v1',
    plomberie: 'M4 8h9a4 4 0 014 4v1h3M8 8V5h4M18.5 16v1.5M18.5 20v1',
    electricite: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0012 3z',
    vmc: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12c0-4 1.5-6 4-6M12 12c4 0 6 1.5 6 4M12 12c0 4-1.5 6-4 6M12 12c-4 0-6-1.5-6-4',
    terrassement: 'M3 20h18M15 4l-6 9M9 13l-4 3 4 2 2-3z',
    plots: 'M3 8h18v3H3zM6 11v8M12 11v8M18 11v8M4 19h4M10 19h4M16 19h4',
    piscine: 'M3 18c2-2 4 2 6 0s4 2 6 0 4 2 6 0M8 15V5M14 15V5M8 8h6M8 12h6',
    drainage: 'M3 9h18v6H3zM7 12h.01M11 12h.01M15 12h.01M19 12h.01M3 19h18',
    fosse: 'M4 9h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2zM9 9V5h6v4M2 13h2M20 13h2',
    sousoeuvre: 'M7 3h10v9H7zM5 12h14v5H5zM3 21h18',
    demolition: 'M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8',
    solchaux: 'M3 9h18M3 14h18v6H3zM6 17h.01M10 17h.01M14 17h.01M18 17h.01M8 6l2-2M14 6l2-2',
    enduitchanvre: 'M4 4h6v16H4zM10 8c3 0 5 2 5 4s2 4 5 4M10 12c2 0 3 1 4 2',
    fissure: 'M4 3h16v18H4zM12 3l-2 5 3 3-2 4 2 6M8 9h3M13 14h3',
    injection: 'M3 18h18M5 18V6h14v12M8 14v-3M12 14v-3M16 14v-3',
    tranchee: 'M3 7h5l2 10h4l2-10h5M10 14h4',
    pavage: 'M3 5h8v6H3zM13 5h8v6h-8zM3 13h5v6H3zM10 13h11v6H10z',
    portes: 'M5 21V3h12v18M3 21h18M14 12h.01',
    osb: 'M3 7h18v10H3zM7 10l2 2M12 9l3 1M8 14l3-1M15 13l2 2',
    lambris: 'M4 3v18M8 3v18M12 3v18M16 3v18M20 3v18',
    maison: 'M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6'
};

/** SVG du picto d'un ouvrage, ou '' s'il n'en a pas (on garde alors l'emoji). */
export function picto(id) {
    const d = P[id];
    if (!d) return '';
    return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
