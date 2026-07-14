# Plan Chiffrage & Devis — Kalou BTP Expert

> **But** : faire passer l'app de *métreur de matériaux* (liste de courses) à *outil de
> chiffrage + devis* complet, personnalisable en 2 clics, utilisable par un maçon de 56 ans
> qui s'installe en entreprise individuelle en Dordogne.
>
> **Décisions cadrées avec le porteur (2026-07-14)** :
> - Régime fiscal **non encore arrêté** → TVA construite comme un **interrupteur** (franchise / 10 % / 20 %).
> - Chantiers à chiffrer en priorité : **ouvertures & piscines**, **terrasses & dallages**, **murs pierre & chaux**.
> - Taux horaire **à calculer** (méthode du déboursé, ci-dessous).
> - Ordre de construction : **1) moteur de prix + module Devis**, puis 2) ouvrages métier, puis 3) sauvegarde.
>
> ⚠️ **Tous les prix et taux de ce document sont des repères marché Dordogne 2026, indicatifs,
> destinés à devenir des valeurs par défaut _éditables_ dans l'app.** Les seuils/taux fiscaux
> et sociaux changent chaque année : à confirmer avec l'URSSAF et le comptable.

---

## 1. La TVA expliquée simplement (et pourquoi c'est un interrupteur dans l'app)

Il « ne sait pas pour la TVA » : c'est normal, il y a **deux mondes** selon le régime.

### A. Auto-entrepreneur / micro-entreprise → *franchise en base de TVA* (le cas le plus courant au démarrage)
- Il **ne facture PAS de TVA**. Mention **obligatoire** sur chaque devis et facture :
  **« TVA non applicable, art. 293 B du CGI »**.
- Il **ne récupère PAS** la TVA sur ses achats → il paie ses matériaux **TTC** et les refacture sur
  cette base TTC. Conséquence app : les prix matériaux sont stockés/chiffrés **en TTC**.
- Seuils de franchise (à re-vérifier chaque année) : prestations de services **37 500 €**
  (tolérance 41 250 €). ⚠️ Le seuil unique à **25 000 €** voté fin 2024 a été **suspendu/reporté**
  après la fronde des artisans — statut à confirmer avec l'URSSAF avant de s'y fier.
- **Cotisations sociales micro ≈ 21,2 %** du **chiffre d'affaires encaissé** (pas du bénéfice !)
  + ~0,3 % CFP + petite taxe chambre des métiers. Taux susceptible d'évoluer.
  - **Piège majeur du achat-revente de matériaux** : il cotise sur TOUT ce qu'il encaisse,
    matériaux compris. S'il achète 1 000 € de parpaings et les refacture 1 000 €, il paie
    ~212 € de cotisations dessus → **il perd de l'argent**. ➜ Il DOIT prendre une marge sur les
    matériaux (voir §4), ou les faire acheter par le client.
- Impôt sur le revenu : abattement forfaitaire **50 %** (micro-BIC prestations de services).

### B. Entreprise individuelle au réel → il facture la TVA
- Taux de TVA dans le bâtiment :
  - **20 %** — construction **neuve**, terrasse/piscine sur terrain nu (ouvrage neuf), extension
    importante, locaux professionnels.
  - **10 %** (taux intermédiaire) — travaux d'**amélioration / transformation / entretien** sur un
    **logement d'habitation achevé depuis plus de 2 ans** (le gros de la rénovation). Nécessite une
    **attestation TVA** signée par le client (mention normale ou simplifiée).
  - **5,5 %** — travaux d'**amélioration énergétique** (isolation). Peu concerné en maçonnerie pure.
  - Un même chantier peut mélanger plusieurs taux (ex. dalle neuve à 20 % + reprise de mur à 10 %).
- Il **récupère** la TVA sur ses achats (matériaux stockés **en HT**), déduit ses charges réelles.
  Comptabilité complète, bilan → comptable quasi obligatoire.

### Conséquence pour l'app
Un réglage global **« Régime TVA »** à 3 positions : **Franchise (0 %, mention 293 B)** /
**Rénovation (10 %)** / **Neuf (20 %)**, **+ possibilité de forcer le taux par ligne** de devis.
Chaque prix matériau porte une étiquette **HT** ou **TTC** selon le régime, pour ne jamais se tromper.

---

## 2. « Combien prendre ? » — calculer son taux horaire (déboursé horaire)

C'est LA question. On ne devine pas un taux, on le calcule pour **ne pas travailler à perte**.

### Méthode (celle des vrais artisans)
**Taux horaire de vente = (Rémunération voulue + Cotisations + Frais généraux) ÷ Heures réellement facturables, + marge.**

1. **Rémunération nette voulue** — ex. 2 000 €/mois = **24 000 €/an**.
2. **Cotisations** — micro ≈ 21,2 % du CA ; au réel ≈ 45 % du net. (enveloppe à estimer)
3. **Frais généraux annuels** (à ne JAMAIS oublier) :
   - Utilitaire (assurance, carburant, entretien, amortissement) : **4 000 – 6 000 €**
   - **Assurance décennale + RC pro** : **1 500 – 3 000 €**
   - Outillage / amortissement matériel : **1 000 – 2 000 €**
   - Téléphone, logiciel, compta, banque pro : **1 000 – 2 000 €**
   - EPI, petit équipement, formation, déchetterie : **500 – 1 500 €**
   - **Total frais généraux : ~8 000 à 15 000 €/an** pour un maçon seul.
4. **Heures réellement facturables** — LE piège. Un artisan seul ne facture PAS 35 h × 52.
   Après congés, fériés, intempéries, devis, déplacements, administratif, SAV → il facture en réalité
   **~1 100 à 1 300 h/an** (on retient souvent **1 200 h**).

**Exemple chiffré (micro)** :
`24 000 (net) + ~9 000 (cotisations) + 10 000 (frais généraux) = 43 000 € ÷ 1 200 h ≈ 36 €/h` de **coût de revient**.
On ajoute **10–20 % de marge** → **prix de vente ≈ 40–45 €/h HT**.

**Repères marché Dordogne (rural)** : **40 – 50 €/h HT** pour un maçon seul ;
travail technique **pierre / chaux / restauration** tire vers **50 – 60 €/h**.

### Dans l'app
Écran **« Mon taux »** : il saisit revenu voulu, frais annuels, heures facturables → l'app calcule
son déboursé et propose un prix de vente horaire. Modifiable. Ce taux alimente automatiquement la
main d'œuvre de chaque devis.

---

## 3. Prix moyens des matériaux — catalogue de départ (Dordogne 2026, indicatif, éditable)

Ces valeurs deviennent les **prix par défaut** du catalogue, modifiables en 2 clics.
Fourchettes TTC négociant rural (Point.P / Gedimat / Tout Faire type).

| Matériau | Unité | Prix repère | Note |
|---|---|---|---|
| Ciment CEM II 35 kg | sac | 7 – 9 € | |
| Chaux hydraulique **NHL 3.5** 35 kg | sac | 14 – 20 € | montage/enduit pierre |
| Chaux aérienne CL90 25 kg | sac | 15 – 22 € | finition chaux |
| Parpaing creux 20×20×50 | u | 1,50 – 2,50 € | |
| Parpaing d'angle 20×20×50 | u | 2,00 – 3,00 € | |
| Sable 0/4 vrac (livré) | T | 30 – 55 € | + livraison |
| Gravier 0/15 vrac (livré) | T | 30 – 55 € | + livraison |
| Big bag sable/gravier (~1 m³) | u | 45 – 75 € | petites quantités |
| **Béton prêt à l'emploi** (toupie, livré) | m³ | 130 – 180 € | + pompe si besoin ; rural = majoration possible |
| Treillis soudé ST25C 3,6×2,4 m | panneau | 15 – 25 € | |
| Fer HA Ø10 barre 6 m | u | 8 – 14 € | |
| Linteau béton préfa | ml | 15 – 40 € | selon portée |
| **Poutre acier IPN/HEA** (ouverture) | ml | 40 – 90 € | selon section |
| Tout-venant 0/31.5 (hérisson) | T | 20 – 35 € | |
| Polyane / film | m² | 0,5 – 1 € | |
| Géotextile | m² | 0,8 – 1,5 € | |
| **Moellon / pierre de pays** | T | 100 – 350 € | très variable ; parfois fournie/récupérée par le client |
| Dalle terrasse (béton / pierre reconstituée) | m² | 20 – 60 € | |
| Plot réglable terrasse | u | 1,5 – 4 € | |
| Enduit monocouche prêt 25 kg | sac | 10 – 16 € | ~18 kg/m²/cm |
| Location bétonnière | jour | 30 – 50 € | |
| Location **mini-pelle** | jour | 150 – 250 € | terrassement piscine/fondation |
| Location étai | u/sem | 2 – 5 € | ouverture |
| Évacuation gravats (benne 8 m³) | u | 150 – 350 € | déchetterie pro |

> Note : l'app calcule DÉJÀ très bien les quantités (ciment, agrégats en tonnes, treillis, agglos,
> ferraillage en ml…). Il « suffit » de brancher chaque ligne quantitative sur un prix du catalogue
> pour obtenir un **coût matériaux automatique**.

---

## 4. Ouvrages métier manquants — bordereau indicatif (fourni-posé)

Chaque ouvrage devient : (a) un **calculateur de quantités** (comme l'existant) + (b) un **temps de
main d'œuvre** (ratio h/unité) + (c) un **prix de vente au format ligne de devis**, éditable.

> Ratio de marge conseillé : **matériaux ×1,10 à ×1,15** (couvre la manutention + les cotisations en
> micro) et **main d'œuvre au taux horaire de vente** (§2). Le prix « fourni-posé » ci-dessous est le
> repère marché pour se situer.

| Ouvrage | Unité | Temps MO indicatif | Prix fourni-posé marché | À délimiter / attention |
|---|---|---|---|---|
| **Terrasse béton** (décaissement + hérisson + treillis + dalle ~12 cm + finition) | m² | 0,8 – 1,5 h/m² | **50 – 90 €/m²** | désactivé/imprimé : 90 – 130 €/m² |
| **Terrasse sur plots + dalles** | m² | 0,4 – 0,8 h/m² | **40 – 80 €/m²** | hors dalles haut de gamme |
| **Dallage / allée béton** | m² | 0,7 – 1,2 h/m² | **45 – 80 €/m²** | |
| **Mur parpaing enduit** (mur + enduit 2 faces) | m² | 1 – 1,5 h/m² | **60 – 100 €/m²** | déjà métré ; ajouter enduit |
| **Mur en pierre — montage moellons** | m² parement | 2 – 4 h/m² | **120 – 300 €/m²** | pierre de taille/restauration = bien + ; pierre parfois fournie |
| **Rejointoiement à la chaux** | m² | 1 – 2 h/m² | **40 – 90 €/m²** | dégarnissage profond / 2 faces → + |
| **Enduit à la chaux** (gobetis + corps + finition, NHL) | m² | 1 – 2 h/m² | **45 – 90 €/m²** | 2 à 3 passes ; ne pas mélanger ciment sur pierre ancienne |
| **Création d'ouverture** mur porteur (étaiement, découpe, linteau/IPN, reprises) | forfait | ½ à 2 j | **800 – 2 500 €** | mur porteur : étude structure parfois nécessaire (à signaler au client) |
| **Piscine maçonnée — structure gros œuvre** (terrassement, radier BA, murs, arase, réservations) | forfait / sous-postes | plusieurs jours | **8 000 – 20 000 €** (GO seul, ~8×4) | **HORS** étanchéité/liner, local technique, filtration, margelles, plage — lots séparés à isoler |
| **Terrassement / fondation / démolition-évacuation** | support | variable | au réel | postes communs (mini-pelle, benne, MO) |

> Pour la **piscine** et l'**ouverture**, on chiffre **au réel par sous-postes** (terrassement,
> béton, ferraillage, MO, locations, évacuation) plutôt qu'au ratio : montants trop élevés pour un
> forfait au pif. L'app fournira un **modèle multi-lignes** pré-rempli à ajuster.

---

## 5. Architecture logicielle (respecte le zéro-build / vanilla JS / modules existant)

### Nouveaux fichiers (même style que `config.js` / `js/calculators/`)
```
js/
  config.js                 (existant — GROS_CONFIG)
  data/
    prices.default.js       ← catalogue matériaux + ouvrages (valeurs par défaut, §3/§4)
    ouvrages.js             ← définitions des nouveaux ouvrages (comme GROS_CONFIG)
  pricing/
    tarifs.js               ← merge défauts + overrides localStorage ; get/set prix
    deboursé.js             ← calcul taux horaire (déboursé → prix de vente, §2)
    devis.js               ← modèle de devis, totaux HT/TVA/TTC, numérotation
  ui/
    devis_view.js           ← écran devis (client, lignes, totaux, acompte)
    tarifs_view.js          ← écran Réglages : profil entreprise + édition prix + taux
    print_devis.js          ← vue imprimable → PDF via window.print()
  storage.js                (existant — étendre : profil, devis, clients, sauvegarde JSON)
```

### Clés localStorage
- `kalou_btp_v3` — historique matériaux (existant, inchangé)
- `kalou_prix_v1` — overrides de prix éditables
- `kalou_profil_v1` — entreprise : nom, mention **EI**, **SIRET**, code APE, adresse, tél, email,
  **assurance décennale** (assureur + coordonnées + zone), RIB, **régime TVA**, taux horaire
- `kalou_devis_v1` — devis enregistrés + compteur de numérotation
- `kalou_clients_v1` — carnet clients

### Modèle de données Devis
```js
{
  num: "DEV-2026-014",
  date: "2026-07-14", validite: 30,           // jours
  client:   { nom, adresse, tel, email },
  chantier: { adresse, description },
  lignes: [
    { design, detail, qte, unite, puHT, tva, remise }   // total calculé à la volée
  ],
  regimeTVA: "franchise|10|20|multi",
  totalHT, totalTVA, totalTTC,
  acompte:  { pct: 30, montant },
  statut:   "brouillon|envoyé|accepté|refusé"
}
```

### Ponts clés
- **Calculateurs → Devis** : bouton **« Chiffrer / Ajouter au devis »** sur la carte de résultats.
  Il relie chaque ligne matériau (`{l,v,u}`) à un prix du catalogue → coût matériaux, ajoute la MO
  (temps × taux), applique la marge → crée une **ligne de devis**. L'historique par chantier alimente
  directement un devis (la consolidation existe déjà dans `storage.js`).
- **PDF sans dépendance** : vue imprimable dédiée + CSS `@media print` + `window.print()`. Sur PWA
  mobile (iOS/Android) : **Imprimer → Enregistrer en PDF → partager** (SMS / mail / WhatsApp).
  Zéro librairie, fidèle à la philosophie du projet. (jsPDF seulement si un vrai fichier `.pdf`
  généré côté JS devient indispensable — casserait le zéro-dépendance.)

### Simplicité « 56 ans »
- Gros boutons (déjà le cas), **3 clics maxi** pour sortir un devis.
- **« Dupliquer un devis »** pour repartir d'un existant.
- **Templates d'ouvrages** : il choisit « Terrasse béton 30 m² », l'app pré-remplit lignes + prix,
  il ajuste.
- **Valeurs par défaut partout**, jamais d'écran vide ; **autosave brouillon** (aucune perte).

---

## 5 bis. Multi-appareils : téléphone (chantier) + PC (maison)

Usage réel : **saisie rapide sur téléphone sur le chantier**, puis **finalisation des calculs et
devis sur le PC à la maison**. Deux conséquences majeures :

### a) Mise en page responsive (indispensable)
Aujourd'hui l'UI est *mobile-first* (largeur `max-w-2xl`, nav en bas). Sur PC ça marche mais reste
une colonne étroite centrée. Le **module Devis** (le gros du travail sur PC) doit avoir une **mise en
page large façon bureau** : tableau de lignes multi-colonnes, totaux sur le côté, clavier/tab,
aperçu A4 avant impression. → CSS responsive : `sm/md` = téléphone (capture), `lg+` = PC (édition).

### b) ⚠️ Le `localStorage` n'est PAS synchronisé entre appareils
C'est le piège n°1 à connaître : le `localStorage` est **propre à chaque appareil ET chaque
navigateur**. Un chantier enregistré sur le **téléphone n'apparaîtra PAS sur le PC**, et inversement.
Sans solution, son flux « je mesure sur le tel, je fais le devis à la maison » **casse**.

Options, du plus simple au plus lourd (l'app reste offline / sans serveur par défaut) :
1. **Pont manuel (dispo presque tout de suite)** — sur le chantier, le bouton **« Partager »**
   existant envoie le récap (WhatsApp / SMS / mail) → il se l'envoie à lui-même et le rouvre sur le
   PC. Zéro dev.
2. **Export / Import JSON** — un fichier de sauvegarde (devis, clients, prix, profil) qu'on
   transfère tel/PC (mail, cloud drive, clé USB). ➜ **remonté de la Phase 3 à la Phase 1** car
   devenu essentiel au multi-appareils, plus seulement une sauvegarde.
3. **Vraie synchro automatique tel ↔ PC** — nécessite **un petit backend ou un service cloud**
   (Firebase, Supabase, ou un mini-serveur). ➜ **casse le "100 % local, zéro serveur"** actuel :
   décision à prendre à part, plus tard, seulement si le transfert manuel le gêne vraiment.

**Recommandation** : commencer par 1 + 2 (le PC reste la station principale du devis, le téléphone
sert à capturer). Garder la synchro cloud (3) en option ultérieure.

### Type de document : Estimation (pré-devis) vs Devis
L'app produit **deux types de documents** :
- **Estimation / pré-devis** — un chiffrage rapide, **non contractuel**, marqué explicitement
  *« Estimation — ne vaut pas devis »*. Sert à donner un prix vite fait avant l'accord. Tout artisan
  déclaré en fait. N'exige pas les mentions légales complètes.
- **Devis** — document **contractuel** avec toutes les mentions obligatoires (§6). Suppose une
  entreprise **déclarée** (micro-entreprise ou EI) : SIRET, mention EI, **assurance décennale**, TVA
  ou mention 293 B. C'est la cible de l'app.

Le profil entreprise se remplit **une seule fois** ; une estimation se transforme alors en devis
conforme d'un clic. **L'app est conçue pour une activité déclarée** — voir la note du §8.

---

## 6. Mentions légales du devis — générées automatiquement (obligatoire, sinon non conforme)

L'app doit imprimer d'office :
- **« DEVIS »** + numéro + date + **durée de validité** (ex. 3 mois).
- Identité pro : nom + prénom, **mention « EI » / « Entrepreneur Individuel »** (obligatoire depuis
  2022), adresse, **SIRET**, code APE, **n° TVA intracom** si assujetti.
- **Assurance décennale** : assureur + coordonnées + **couverture géographique** — **obligatoire sur
  devis ET factures de bâtiment** (loi 2016). ⚠️ À ne jamais oublier pour un maçon.
- Client : nom + adresse ; adresse du chantier si différente.
- **Décompte détaillé** : désignation, quantité, unité, prix unitaire HT, distinction
  main d'œuvre / matériaux.
- **TVA** : taux + montant par taux, total HT, total TTC — ou **« TVA non applicable, art. 293 B du
  CGI »** en franchise.
- **Total TTC** + conditions de paiement (acompte, échéances), **pénalités de retard** + indemnité
  forfaitaire **40 €**.
- **« Devis gratuit »** (ou coût du devis s'il est facturé).
- Particulier : **médiateur de la consommation** (nom + adresse) ; si signature à domicile /
  démarchage : information sur le **droit de rétractation 14 jours** (nuance selon contexte — à caler
  avec le comptable).
- Emplacement **date + signature + « Bon pour accord »** / « Devis reçu avant exécution des travaux ».

---

## 7. Plan de construction par phases

### Phase 0 — Fondations données (½ journée)
- `data/prices.default.js` (catalogue §3/§4) + `pricing/tarifs.js` (merge défaut/overrides).
- Écran **Réglages ▸ Profil entreprise** (SIRET, EI, décennale, régime TVA, RIB).
- Écran **Réglages ▸ Tarifs** (édition prix en 2 clics).
- Écran **Mon taux horaire** (`pricing/deboursé.js`).

### Phase 1 — Moteur de devis *(priorité choisie)*
- `pricing/devis.js` (modèle + totaux + TVA multi-taux + numérotation ; types **Estimation** / **Devis**).
- `ui/devis_view.js` (créer/éditer, lignes manuelles + depuis catalogue + depuis historique,
  remises, acompte, statuts, duplication). **Mise en page responsive PC** (§5 bis a).
- `ui/print_devis.js` + CSS print (PDF conforme, toutes les mentions §6).
- Sauvegarde devis (`kalou_devis_v1`).
- **Export / Import JSON** (remonté ici, §5 bis b) — pont téléphone ↔ PC + sauvegarde de secours.

### Phase 2 — Ouvrages métier
- `data/ouvrages.js` + calculateurs : terrasse béton, terrasse sur plots, dallage/allée,
  **mur pierre**, **rejointoiement chaux**, **enduit chaux**, **création d'ouverture** (linteau/IPN),
  **piscine maçonnée** (sous-postes), terrassement/évacuation.

### Phase 3 — Sécurité & confort *(crucial à 56 ans)*
- **Export / Import JSON** (sauvegarde de secours : devis, clients, prix, profil) + rappel périodique.
- (Option) migration `localStorage → IndexedDB` (déjà notée au dev journal) pour la robustesse.
- Carnet clients, passage **devis → facture**, suivi acompte / solde, relances.

---

## 8. Points à valider avant de coder
1. **Statut déclaré** : l'app cible une **activité déclarée** (micro-entreprise ou EI). La
   micro-entreprise est faite pour ça : inscription **gratuite**, en ligne, ~15 min (guichet unique
   INPI), **pas de cotisation tant qu'il ne facture pas** (~21,2 % uniquement sur ce qu'il encaisse),
   pas de comptable obligatoire au démarrage. Point décisif pour un maçon : **sans déclaration, pas
   d'assurance décennale** — or il fait de la structure (piscine, ouverture de mur porteur, murs). Un
   sinistre dans les 10 ans = tout à sa charge, patrimoine personnel exposé. C'est pour le protéger,
   lui, que l'app est pensée « déclaré ». Avant l'inscription : documents en mode **Estimation**
   (non contractuel).
2. **Régime TVA** : dès qu'il tranche (micro vs réel) → fige l'étiquette HT/TTC du catalogue et le
   mode TVA par défaut. En attendant : interrupteur 3 positions.
3. **Taux horaire** : faire l'exercice du §2 avec ses vrais chiffres (revenu voulu, frais, heures).
4. **Décennale** : récupérer les coordonnées exactes de l'assureur + zone (bloquant pour un devis
   conforme).
5. **Multi-appareils** : valider le pont téléphone → PC (partage + export/import JSON) avant
   d'envisager une synchro cloud (§5 bis).
6. **Piscine / ouverture** : valider le périmètre exact du lot maçonnerie (ce qui est inclus / exclu).
</content>
</invoke>
