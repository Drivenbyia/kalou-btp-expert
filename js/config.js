// === CONFIGURATION DES CALCULATEURS GROS OEUVRE ===
// Chaque champ : id, label, unit, default, optional, type, opt
export const GROS_CONFIG = {
    dalle: {
        name: "Dalle Béton",
        fields: [
            { id: 'l', label: 'Longueur',   unit: 'm',     default: 5   },
            { id: 'w', label: 'Largeur',    unit: 'm',     default: 4   },
            { id: 'e', label: 'Épaisseur',  unit: 'cm',    default: 15  },
            { id: 'd', label: 'Dosage', type: 'select', opt: [
                { v: 300, t: '300 kg/m³' },
                { v: 350, t: '350 kg/m³ (Std)', s: true },
                { v: 400, t: '400 kg/m³' }
            ]}
        ]
    },
    fondation: {
        name: "Fondations",
        fields: [
            { id: 'l', label: 'Longueur',    unit: 'm', default: 10  },
            { id: 'w', label: 'Largeur',     unit: 'm', default: 0.5 },
            { id: 'p', label: 'Profondeur',  unit: 'm', default: 0.8 },
            { id: 'd', label: 'Dosage', type: 'select', opt: [
                { v: 300, t: '300 kg/m³' },
                { v: 350, t: '350 kg/m³ (Std)', s: true },
                { v: 400, t: '400 kg/m³' }
            ]},
            { id: 'a', label: 'Acier', type: 'select', opt: [
                { v: 40, t: '40 kg/m³ (Faible)' },
                { v: 60, t: '60 kg/m³ (Std)',    s: true },
                { v: 80, t: '80 kg/m³ (Fort)'   }
            ]}
        ]
    },
    mur: {
        name: "Mur Parpaings",
        fields: [
            { id: 'l', label: 'Longueur',           unit: 'm',  default: 5   },
            { id: 'h', label: 'Hauteur',            unit: 'm',  default: 2.7 },
            { id: 'o', label: 'Ouvertures (portes/fenêtres)', unit: 'm²', default: 0, optional: true },
            { id: 'c', label: 'Nb Angles / Coins',  unit: 'u',  default: 2, optional: true }
        ]
    },
    enduit: {
        name: "Enduit Façade",
        fields: [
            { id: 'l', label: 'Longueur',   unit: 'm',  default: 8   },
            { id: 'h', label: 'Hauteur',    unit: 'm',  default: 3   },
            { id: 'e', label: 'Épaisseur',  unit: 'cm', default: 1.5 },
            { id: 't', label: 'Type', type: 'select', opt: [
                { v: 'trad', t: 'Traditionnel',      s: true },
                { v: 'pret', t: "Prêt-à-l'emploi"          }
            ]}
        ]
    },
    chape: {
        name: "Chape Sol",
        fields: [
            { id: 'l', label: 'Longueur',  unit: 'm',  default: 5 },
            { id: 'w', label: 'Largeur',   unit: 'm',  default: 4 },
            { id: 'e', label: 'Épaisseur', unit: 'cm', default: 5 }
        ]
    },
    escalier: {
        name: "Escalier Béton",
        fields: [
            { id: 'n', label: 'Nb Marches',     unit: 'u',  default: 12 },
            { id: 'h', label: 'Haut. Marche',   unit: 'cm', default: 17 },
            { id: 'g', label: 'Giron',          unit: 'cm', default: 28 },
            { id: 'w', label: 'Largeur',        unit: 'cm', default: 100 },
            { id: 'e', label: 'Ép. Paillasse',  unit: 'cm', default: 15 }
        ]
    },
    poteau: {
        name: "Poteaux",
        fields: [
            { id: 'l', label: 'Section L', unit: 'cm', default: 25 },
            { id: 'w', label: 'Section l', unit: 'cm', default: 25 },
            { id: 'h', label: 'Hauteur',   unit: 'm',  default: 3  },
            { id: 'n', label: 'Nombre',    unit: 'u',  default: 4  }
        ]
    }
};
