# Séries INSEE — rapport de récupération

Généré par `scripts/fetch/insee.mjs` le 2026-09-20.

Endpoints utilisés sans clé : BDM SDMX (`https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/<idbank>`) et Melodi (`https://api.insee.fr/melodi/data/<dataset>?…`).

| Graphe | Fichier | Séries | Période | Dernière obs. |
|---|---|---|---|---|
| productivite/chomage | `data/series/productivite/chomage.csv` | 15-24, 25-49, 50-plus, ensemble, femmes, hommes | 1975-Q1 → 2026-Q2 | 2026-Q2 |
| productivite/halo-chomage | `data/series/productivite/halo-chomage.csv` | halo | 2003-Q1 → 2026-Q2 | 2026-Q2 |
| demographie/naissances-deces | `data/series/demographie/naissances-deces.csv` | deces, naissances, solde-naturel | 1946 → 2025 | 2025 |
| logement/prix-logements-anciens | `data/series/logement/prix-logements-anciens.csv` | appartements, FRA, idf, maisons, province | 1994-Q4 → 2026-Q2 | 2026-Q2 |
| logement/indice-loyers | `data/series/logement/indice-loyers.csv` | FRA, irl | 1986-Q4 → 2026-Q2 | 2026-Q2 |
| logement/construction | `data/series/logement/construction.csv` | autorises, commences | 2000-12 → 2026-07 | 2026-07 |
| cohesion-sociale/pouvoir-achat | `data/series/cohesion-sociale/pouvoir-achat.csv` | arbitrable, FRA | 1959 → 2025 | 2025 |
| cohesion-sociale/smic | `data/series/cohesion-sociale/smic.csv` | brut, net | 2005-07 → 2026-09 | 2026-09 |
| cohesion-sociale/pauvrete | `data/series/cohesion-sociale/pauvrete.csv` | taux-50, taux-60 | 1996 → 2024 | 2024 |
| cohesion-sociale/niveau-vie | `data/series/cohesion-sociale/niveau-vie.csv` | median | 1996 → 2024 | 2024 |
| entreprises/creations | `data/series/entreprises/creations.csv` | commerce, construction, enseignement-sante, ensemble, hebergement-restauration, hors-micro, industrie | 2000 → 2025 | 2025 |
| entreprises/defaillances | `data/series/entreprises/defaillances.csv` | ensemble | 1990 → 2025 | 2025 |
| productivite/confiance-menages | `data/series/productivite/confiance-menages.csv` | FRA | 1972-10 → 2026-08 | 2026-08 |
| cohesion-sociale/inflation | `data/series/cohesion-sociale/inflation.csv` | glissement | 1997-01 → 2026-08 | 2026-08 |
| demographie/immigres | `data/series/demographie/immigres.csv` | part-immigres | 1921 → 2025 | 2025 |

## productivite/chomage

- Fichier : `data/series/productivite/chomage.csv` (1236 lignes), unité « % de la population active », fréquence quarterly, dernière observation **2026-Q2**.
- Source : https://www.insee.fr/fr/statistiques/serie/001688527
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001688527+001688533+001688535+001688537+001688529+001688531
- Taux de chômage au sens du BIT (enquête Emploi), France hors Mayotte, données trimestrielles corrigées des variations saisonnières ; la série « 15-24 ans » correspond aux moins de 25 ans.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 001688527 | `ensemble` | Taux de chômage au sens du BIT - Ensemble - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |
| 001688533 | `femmes` | Taux de chômage au sens du BIT - Femmes - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |
| 001688535 | `hommes` | Taux de chômage au sens du BIT - Hommes - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |
| 001688537 | `15-24` | Taux de chômage au sens du BIT - Ensemble des moins de 25 ans - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |
| 001688529 | `25-49` | Taux de chômage au sens du BIT - Ensemble des 25 à 49 ans - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |
| 001688531 | `50-plus` | Taux de chômage au sens du BIT - Ensemble des 50 ans ou plus - France hors Mayotte - Données CVS | 1975-Q1 → 2026-Q2 |

## productivite/halo-chomage

- Fichier : `data/series/productivite/halo-chomage.csv` (94 lignes), unité « milliers de personnes », fréquence quarterly, dernière observation **2026-Q2**.
- Source : https://www.insee.fr/fr/statistiques/serie/011818564
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/011818564
- Personnes inactives souhaitant travailler mais non classées au chômage au sens du BIT (non disponibles ou sans recherche active), France entière, données CVS de l'enquête Emploi.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 011818564 | `halo` | Personnes dans le halo autour du chômage - Ensemble (en milliers) - France entière - Données CVS | 2003-Q1 → 2026-Q2 |

## demographie/naissances-deces

- Fichier : `data/series/demographie/naissances-deces.csv` (240 lignes), unité « milliers », fréquence annual, dernière observation **2025**.
- Source : https://www.insee.fr/fr/statistiques/serie/000067677
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/000067677+000067679
- Bilan démographique (état civil), champ France métropolitaine pour disposer d'une série homogène depuis 1946 ; la dernière année est provisoire et le solde naturel est calculé comme naissances moins décès.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 000067677 | `naissances` | Démographie - Naissances vivantes - France métropolitaine | 1901 → 2025 |
| 000067679 | `deces` | Démographie - Décès de tous âges - France métropolitaine | 1901 → 2025 |

## logement/prix-logements-anciens

- Fichier : `data/series/logement/prix-logements-anciens.csv` (615 lignes), unité « indice, base 100 en moyenne annuelle 2015 », fréquence quarterly, dernière observation **2026-Q2**.
- Source : https://www.insee.fr/fr/statistiques/serie/010567059
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/010567059+010567079+010567073+010567057+010567061
- Indices Notaires-Insee des prix des logements anciens, séries corrigées des variations saisonnières, France métropolitaine ; l'indice Province démarre fin 1994.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 010567059 | `FRA` | Indice des prix des logements anciens - France métropolitaine - Ensemble - Base 100 en moyenne annuelle 2015 - Série CVS | 1996-Q1 → 2026-Q2 |
| 010567079 | `idf` | Indice des prix des logements anciens - Île-de-France : Ensemble - Base 100 en moyenne annuelle 2015 - Série CVS | 1996-Q1 → 2026-Q2 |
| 010567073 | `province` | Indice des prix des logements anciens - Province - Ensemble - Base 100 en moyenne annuelle 2015 - Série CVS | 1994-Q4 → 2026-Q2 |
| 010567057 | `appartements` | Indice des prix des logements anciens - France métropolitaine - Appartements - Base 100 en moyenne annuelle 2015 - série CVS | 1996-Q1 → 2026-Q2 |
| 010567061 | `maisons` | Indice des prix des logements anciens - France métropolitaine - Maisons - Base 100 en moyenne annuelle 2015 - Série CVS | 1996-Q1 → 2026-Q2 |

## logement/indice-loyers

- Fichier : `data/series/logement/indice-loyers.csv` (254 lignes), unité « indice, base 100 en janvier 2019 », fréquence quarterly, dernière observation **2026-Q2**.
- Source : https://www.insee.fr/fr/statistiques/serie/010600365
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/010600365+001515333
- Indice des loyers d'habitation tous secteurs (libre et social), France métropolitaine, base 100 en janvier 2019 ; l'indice de référence des loyers (IRL, base 100 au T4 1998 à la source) est rebasé ici sur le T1 2019 pour être comparable.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 010600365 | `FRA` | Indice des loyers – Tous secteurs – France métropolitaine – Base 100 en janvier 2019 | 1986-Q4 → 2026-Q2 |
| 001515333 | `irl` | Indice de référence des loyers (IRL) | 2002-Q4 → 2026-Q2 |

## logement/construction

- Fichier : `data/series/logement/construction.csv` (616 lignes), unité « milliers de logements (cumul sur 12 mois) », fréquence monthly, dernière observation **2026-07**.
- Source : https://www.insee.fr/fr/statistiques/serie/001718158
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001718158+001718270
- Statistiques Sit@del2 du SDES diffusées par l'Insee, estimations en date réelle, cumul glissant sur douze mois, France hors Mayotte.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 001718158 | `autorises` | Nombre de logements autorisés - Cumul sur douze mois - Total - France hors Mayotte - Estimations en date réelle | 2000-12 → 2026-07 |
| 001718270 | `commences` | Nombre de logements commencés - Cumul sur douze mois - Total - France hors Mayotte - Estimations en date réelle | 2000-12 → 2026-07 |

## cohesion-sociale/pouvoir-achat

- Fichier : `data/series/cohesion-sociale/pouvoir-achat.csv` (134 lignes), unité « indice, base 100 en 2015 », fréquence annual, dernière observation **2025**.
- Source : https://www.insee.fr/fr/statistiques/8988934
- Requête : https://api.insee.fr/melodi/data/DD_CNA_AGREGATS?STO=_PAM_UC&STO=_PAA_UC&maxResult=5000
- Comptes nationaux annuels base 2020 (Melodi, jeu DD_CNA_AGREGATS) : l'Insee ne diffuse que les évolutions annuelles en %, cumulées ici en indice base 100 en 2015 ; le pouvoir d'achat arbitrable exclut les dépenses pré-engagées (loyers, assurances, abonnements…).

| Jeu / code Melodi | Code série | Titre vérifié | Période |
|---|---|---|---|
| DD_CNA_AGREGATS STO=_PAM_UC (S14, GY, PT) | `FRA` | Pouvoir d'achat du revenu disponible brut des ménages par unité de consommation, évolution annuelle en % | 1960 → 2025 |
| DD_CNA_AGREGATS STO=_PAA_UC (S14, GY, PT) | `arbitrable` | Pouvoir d'achat arbitrable par unité de consommation, évolution annuelle en % | 1960 → 2025 |

## cohesion-sociale/smic

- Fichier : `data/series/cohesion-sociale/smic.csv` (510 lignes), unité « euros par mois », fréquence monthly, dernière observation **2026-09**.
- Source : https://www.insee.fr/fr/statistiques/serie/000879877
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/000879877+000879878
- Montant mensuel du Smic pour 35 heures hebdomadaires (151,67 h par mois), France entière ; le net est calculé après CSG et CRDS ; la série mensuelle 35 h de la BDM débute en juillet 2005.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 000879877 | `brut` | Montant mensuel brut du Smic (Salaire minimum interprofessionnel de croissance) pour 35 heures de travail par semaine (151,67 heures par mois) | 2005-07 → 2026-09 |
| 000879878 | `net` | Montant mensuel net du Smic (Salaire minimum interprofessionnel de croissance) pour 35 heures de travail par semaine (151,67 heures par mois), après déduction de la CSG et CRDS | 2005-07 → 2026-09 |

## cohesion-sociale/pauvrete

- Fichier : `data/series/cohesion-sociale/pauvrete.csv` (58 lignes), unité « % de la population », fréquence annual, dernière observation **2024**.
- Source : https://www.insee.fr/fr/statistiques/9019316
- Requête : https://api.insee.fr/melodi/data/DS_ERFS_RETROPOLE?ERFS_MEASURE=PR_MD60&ERFS_MEASURE=PR_MD50&maxResult=5000
- Enquête Revenus fiscaux et sociaux (ERFS), France métropolitaine, personnes vivant dans un ménage ordinaire, séries rétropolées pour tenir compte des ruptures méthodologiques ; la dernière année est provisoire.

| Jeu / code Melodi | Code série | Titre vérifié | Période |
|---|---|---|---|
| DS_ERFS_RETROPOLE ERFS_MEASURE=PR_MD60 | `taux-60` | Taux de pauvreté monétaire au seuil de 60 % du niveau de vie médian (ensemble, données rétropolées) | 1996 → 2024 |
| DS_ERFS_RETROPOLE ERFS_MEASURE=PR_MD50 | `taux-50` | Taux de pauvreté monétaire au seuil de 50 % du niveau de vie médian (ensemble, données rétropolées) | 1996 → 2024 |

## cohesion-sociale/niveau-vie

- Fichier : `data/series/cohesion-sociale/niveau-vie.csv` (29 lignes), unité « euros constants 2024 par an », fréquence annual, dernière observation **2024**.
- Source : https://www.insee.fr/fr/statistiques/9019316
- Requête : https://api.insee.fr/melodi/data/DS_ERFS_RETROPOLE?ERFS_MEASURE=MED_SL&maxResult=5000
- Niveau de vie médian des personnes (revenu disponible par unité de consommation), ERFS, France métropolitaine, exprimé en euros constants de 2024, séries rétropolées.

| Jeu / code Melodi | Code série | Titre vérifié | Période |
|---|---|---|---|
| DS_ERFS_RETROPOLE ERFS_MEASURE=MED_SL | `median` | Niveau de vie médian annuel, en euros constants 2024 (ensemble, données rétropolées) | 1996 → 2024 |

## entreprises/creations

- Fichier : `data/series/entreprises/creations.csv` (182 lignes), unité « milliers », fréquence annual, dernière observation **2025**.
- Source : https://www.insee.fr/fr/statistiques/serie/010755537
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/010755537+011811818+010755565+010755434+010755432+010755559+010755541
- Répertoire Sirene, méthode 2022, France entière : totaux annuels calculés en sommant les douze mois de données brutes ; « entreprises classiques » désigne les sociétés et entrepreneurs individuels hors micro-entrepreneurs.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 010755537 | `ensemble` | Nombre de créations d'entreprises - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |
| 011811818 | `hors-micro` | Nombre de créations d'entreprises – Entreprises classiques – Ensemble – France – Données mensuelles brutes | 2000-01 → 2026-08 |
| 010755565 | `industrie` | Nombre de créations d'entreprises - Industrie manufacturière, industries extractives et autres - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |
| 010755434 | `construction` | Nombre de créations d'entreprises - Construction - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |
| 010755432 | `commerce` | Nombre de créations d'entreprises - Commerce - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |
| 010755559 | `hebergement-restauration` | Nombre de créations d'entreprises - Hébergement et restauration - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |
| 010755541 | `enseignement-sante` | Nombre de créations d'entreprises - Administration publique, enseignement, santé humaine et action sociale - Ensemble - France - Données mensuelles brutes | 2000-01 → 2026-08 |

## entreprises/defaillances

- Fichier : `data/series/entreprises/defaillances.csv` (36 lignes), unité « milliers », fréquence annual, dernière observation **2025**.
- Source : https://www.insee.fr/fr/statistiques/serie/001656164
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001656164
- Ouvertures de procédures de redressement ou de liquidation judiciaire (Bodacc, via la Banque de France), datées du jugement, France entière : totaux annuels calculés en sommant les quatre trimestres bruts.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 001656164 | `ensemble` | Nombre de défaillances d'entreprises par date de jugement - Données brutes - France - Tous secteurs d'activité | 1990-Q1 → 2026-Q2 |

## productivite/confiance-menages

- Fichier : `data/series/productivite/confiance-menages.csv` (647 lignes), unité « indice, moyenne de longue période = 100 », fréquence monthly, dernière observation **2026-08**.
- Source : https://www.insee.fr/fr/statistiques/serie/001587668
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001587668
- Enquête mensuelle de conjoncture auprès des ménages (Camme), France métropolitaine, indicateur synthétique résumant les soldes d'opinion, données CVS, normalisé à 100 en moyenne de longue période.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 001587668 | `FRA` | Enquête mensuelle de conjoncture auprès des ménages - Indicateur synthétique de confiance des ménages (premier facteur des soldes d'opinion de l'enquête) - Données CVS | 1972-10 → 2026-08 |

## cohesion-sociale/inflation

- Fichier : `data/series/cohesion-sociale/inflation.csv` (356 lignes), unité « % de variation sur un an », fréquence monthly, dernière observation **2026-08**.
- Source : https://www.insee.fr/fr/statistiques/serie/011814632
- Requête : https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/011814632
- Indice des prix à la consommation, base 2025, champ France (métropole et DOM hors Mayotte), ensemble des ménages, ensemble des postes de la nomenclature Coicop (« 00 - Ensemble », donc TABAC COMPRIS et hors loyers imputés) : variation de l'indice par rapport au même mois de l'année précédente, en données brutes. L'IPC diffère légèrement de l'indice des prix à la consommation harmonisé (IPCH) utilisé pour les comparaisons européennes et par la BCE, dont le champ et les pondérations ne sont pas identiques.

| Idbank | Code série | Titre vérifié | Période |
|---|---|---|---|
| 011814632 | `glissement` | Indice des prix à la consommation - Base 2025 - Glissement annuel - Ensemble des ménages - France - Nomenclature Coicop : 00 - Ensemble | 1997-01 → 2026-08 |

## demographie/immigres

- Fichier : `data/series/demographie/immigres.csv` (32 lignes), unité « % de la population », fréquence annual, dernière observation **2025**.
- Source : https://www.insee.fr/fr/statistiques/2381757
- Requête : https://www.insee.fr/fr/statistiques/fichier/2381757/demo-etran-part-pop-etran-immig.xlsx
- Un immigré est une personne née étrangère à l'étranger et résidant en France ; certains ont depuis acquis la nationalité française, et les personnes nées françaises à l'étranger n'en font pas partie. Recensements de la population puis estimations annuelles : les points sont espacés jusqu'en 1999 (années de recensement), annuels ensuite à partir de 2006. Champ : France métropolitaine de 1921 à 1982 ; France hors Mayotte de 1990 à 2013 et y compris Mayotte à partir de 2014. L'amélioration du protocole de collecte du recensement rend les années 2024 et 2025 non directement comparables aux précédentes, et les deux dernières sont provisoires.

| Fichier Insee | Code série | Titre vérifié | Période |
|---|---|---|---|
| insee.fr/fr/statistiques/2381757 — Figure 1, colonne « Part (en %) » | `part-immigres` | Population immigrée en France — part des immigrés rapportée à la population totale | 1921 → 2025 |

## Échecs

Aucun.
