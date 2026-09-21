# Séries françaises (data.gouv, DREES, CNAF, ministère de l'Intérieur) — rapport de récupération

Généré par `scripts/fetch/france.mjs` le 2026-09-20.

Endpoints utilisés sans clé : data.gouv.fr (`https://www.data.gouv.fr/api/1/datasets/<slug>/`), DREES (`https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/<dataset>/attachments/<id>`), CNAF (`https://data.caf.fr/api/explore/v2.1/catalog/datasets/<dataset>/records`).

Les classeurs `.xlsx` sont lus par `scripts/lib/xlsx.mjs` (lecteur ZIP + SpreadsheetML minimal, sans dépendance).

| Graphe | Fichier | Séries | Période | Dernière obs. |
|---|---|---|---|---|
| securite/delinquance | `data/series/securite/delinquance.csv` | cambriolages, coups-blessures, coups-blessures-intrafamiliaux, degradations, escroqueries, homicides, stupefiants-trafic, stupefiants-usage, violences-sexuelles, vols-sans-violence, vols-vehicules, vols-violents | 2016 → 2025 | 2025 |
| cohesion-sociale/minima-sociaux | `data/series/cohesion-sociale/minima-sociaux.csv` | aah, aspa, ass, rsa | 1999 → 2024 | 2024 |
| cohesion-sociale/redistribution | `data/series/cohesion-sociale/redistribution.csv` | apres, avant | 2012 → 2023 | 2023 |
| cohesion-sociale/allocataires-cnaf | `data/series/cohesion-sociale/allocataires-cnaf.csv` | apl, prime-activite, rsa | 2016 → 2025 | 2025 |
| finances-publiques/abstention | `data/series/finances-publiques/abstention.csv` | legislative, presidentielle | 1958 → 2024 | 2024 |
| securite/infractions-mensuelles | `data/series/securite/infractions-mensuelles.csv` | cambriolages, degradations, escroqueries, homicides, stupefiants-trafic, stupefiants-usage, violences-hors-famille, violences-intrafamiliales, violences-sexuelles, vols-accessoires, vols-avec-arme, vols-dans-vehicules, vols-sans-violence, vols-vehicules, vols-violents | 2016-01 → 2026-08 | 2026-08 |
| securite/auteurs-victimes | `data/series/securite/auteurs-victimes.csv` | cambriolages-mis-en-cause-femmes, cambriolages-mis-en-cause-hommes, cambriolages-victimes-femmes, cambriolages-victimes-hommes, degradations-mis-en-cause-femmes, degradations-mis-en-cause-hommes, degradations-victimes-femmes, degradations-victimes-hommes, escroqueries-mis-en-cause-femmes, escroqueries-mis-en-cause-hommes, escroqueries-victimes-femmes, escroqueries-victimes-hommes, homicides-mis-en-cause-femmes, homicides-mis-en-cause-hommes, homicides-victimes-femmes, homicides-victimes-hommes, tentatives-homicide-mis-en-cause-femmes, tentatives-homicide-mis-en-cause-hommes, tentatives-homicide-victimes-femmes, tentatives-homicide-victimes-hommes, violences-hors-famille-mis-en-cause-femmes, violences-hors-famille-mis-en-cause-hommes, violences-hors-famille-victimes-femmes, violences-hors-famille-victimes-hommes, violences-intrafamiliales-mis-en-cause-femmes, violences-intrafamiliales-mis-en-cause-hommes, violences-intrafamiliales-victimes-femmes, violences-intrafamiliales-victimes-hommes, violences-sexuelles-mis-en-cause-femmes, violences-sexuelles-mis-en-cause-hommes, violences-sexuelles-victimes-femmes, violences-sexuelles-victimes-hommes, viols-mis-en-cause-femmes, viols-mis-en-cause-hommes, viols-victimes-femmes, viols-victimes-hommes, vols-accessoires-mis-en-cause-femmes, vols-accessoires-mis-en-cause-hommes, vols-accessoires-victimes-femmes, vols-accessoires-victimes-hommes, vols-avec-arme-mis-en-cause-femmes, vols-avec-arme-mis-en-cause-hommes, vols-avec-arme-victimes-femmes, vols-avec-arme-victimes-hommes, vols-dans-vehicules-mis-en-cause-femmes, vols-dans-vehicules-mis-en-cause-hommes, vols-dans-vehicules-victimes-femmes, vols-dans-vehicules-victimes-hommes, vols-sans-violence-mis-en-cause-femmes, vols-sans-violence-mis-en-cause-hommes, vols-sans-violence-victimes-femmes, vols-sans-violence-victimes-hommes, vols-vehicules-mis-en-cause-femmes, vols-vehicules-mis-en-cause-hommes, vols-vehicules-victimes-femmes, vols-vehicules-victimes-hommes, vols-violents-mis-en-cause-femmes, vols-violents-mis-en-cause-hommes, vols-violents-victimes-femmes, vols-violents-victimes-hommes | 2016 → 2025 | 2025 |

## Choix de méthode

- **Délinquance** : la base nationale n'existe pas, seules les bases communale, départementale et régionale sont diffusées. On agrège la base régionale (la plus petite qui porte à la fois les faits et la population Insee) : faits France = somme des régions, taux = faits / population × 1 000. Les données ne commencent qu'en 2016, l'antériorité n'étant pas diffusée dans ce jeu.
- **Minima sociaux** : la DREES ne diffuse pas ce jeu par API (`has_records: false`), seulement en pièce jointe `.xlsx` ; l'unité est « milliers d'allocataires » et non de bénéficiaires, car le tableau compte des allocataires (hors conjoints et enfants à charge).
- **Pauvreté avant / après redistribution** : le classeur ne contient pas d'indice de Gini, mais des rapports D9/D1 et S80/S20 ; les séries `gini-avant` / `gini-apres` n'ont donc pas été produites.
- **Abstention** : avant 2017, aucun fichier « France entière » du ministère de l'Intérieur n'est lisible par machine (les résultats de 1958 à 2012 ne sont publiés qu'en `.xls` ancien format) ; les valeurs sont donc agrégées depuis les fichiers par circonscription du CDSP (Sciences Po) diffusés sur data.gouv, et peuvent différer de quelques dixièmes des chiffres France entière du ministère. Pour la présidentielle 2017, le seul fichier exploitable est celui par bureau de vote (34 Mo), agrégé ici.

## securite/delinquance

- Fichier : `data/series/securite/delinquance.csv` (120 lignes), unité « faits enregistrés pour 1 000 habitants », fréquence annual, dernière observation **2025**.
- Source : SSMSI (ministère de l'Intérieur) — https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales
- Requête : https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260709-120055/donnee-reg-data.gouv-2025-geographie2026-produit-le2026-06-25.csv
- Ces chiffres sont des FAITS ENREGISTRÉS par la police et la gendarmerie nationales : ils dépendent de la propension des victimes à porter plainte et des pratiques d'enregistrement des services, et ne mesurent donc pas les faits réellement commis. La hausse des violences sexuelles enregistrées reflète ainsi largement la hausse des plaintes, pas seulement celle des faits. Taux calculés en agrégeant les bases régionales du SSMSI (France entière, DOM compris) et en rapportant les faits à la population Insee ; l'unité de compte varie selon l'indicateur (victime, infraction, véhicule, mis en cause) et les niveaux ne sont pas comparables d'un indicateur à l'autre.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| indicateur = « Homicides » | `homicides` | Homicides — unité de compte : Victime | 2016 → 2025 |
| indicateur = « Violences physiques hors cadre familial » | `coups-blessures` | Violences physiques hors cadre familial — unité de compte : Victime | 2016 → 2025 |
| indicateur = « Violences physiques intrafamiliales » | `coups-blessures-intrafamiliaux` | Violences physiques intrafamiliales — unité de compte : Victime | 2016 → 2025 |
| indicateur = « Violences sexuelles » | `violences-sexuelles` | Violences sexuelles — unité de compte : Victime | 2016 → 2025 |
| indicateur = « Vols violents sans arme » | `vols-violents` | Vols violents sans arme — unité de compte : Infraction | 2016 → 2025 |
| indicateur = « Vols sans violence contre des personnes » | `vols-sans-violence` | Vols sans violence contre des personnes — unité de compte : Victime entendue | 2016 → 2025 |
| indicateur = « Cambriolages de logement » | `cambriolages` | Cambriolages de logement — unité de compte : Infraction | 2016 → 2025 |
| indicateur = « Vols de véhicule » | `vols-vehicules` | Vols de véhicule — unité de compte : Véhicule | 2016 → 2025 |
| indicateur = « Destructions et dégradations volontaires » | `degradations` | Destructions et dégradations volontaires — unité de compte : Infraction | 2016 → 2025 |
| indicateur = « Usage de stupéfiants » | `stupefiants-usage` | Usage de stupéfiants — unité de compte : Mis en cause | 2016 → 2025 |
| indicateur = « Trafic de stupéfiants » | `stupefiants-trafic` | Trafic de stupéfiants — unité de compte : Mis en cause | 2016 → 2025 |
| indicateur = « Escroqueries et fraudes aux moyens de paiement » | `escroqueries` | Escroqueries et fraudes aux moyens de paiement — unité de compte : Victime | 2016 → 2025 |

## cohesion-sociale/minima-sociaux

- Fichier : `data/series/cohesion-sociale/minima-sociaux.csv` (94 lignes), unité « milliers d'allocataires », fréquence annual, dernière observation **2024**.
- Source : DREES — https://data.drees.solidarites-sante.gouv.fr/explore/dataset/336_minima-sociaux-rsa-et-prime-d-activite/information/
- Requête : https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/336_minima-sociaux-rsa-et-prime-d-activite/attachments/minima_sociaux_donnees_nationales_par_dispositif_xlsx
- Nombre d'allocataires au 31 décembre, France entière (sources CNAF, MSA, France Travail, CNAV, FSV, caisses des DOM, compilées par la DREES). Il s'agit d'allocataires, pas de personnes couvertes : conjoints et enfants à charge ne sont pas comptés. Plusieurs ruptures : le RSA socle remplace le RMI et l'API en 2009 (2011 dans les DOM), la CNAF a changé de système statistique en 2016, et le minimum vieillesse est compté en date d'entrée en jouissance depuis 2021 ; quand deux valeurs coexistent pour une même année, la plus récente méthode est retenue.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| 336_minima-sociaux-rsa-et-prime-d-activite — Tableau 2 | `rsa` | Revenu de solidarité active (RSA) / RSA socle (1) | 2009 → 2024 |
| 336_minima-sociaux-rsa-et-prime-d-activite — Tableau 2 | `aah` | Allocation aux adultes handicapés (AAH) | 1999 → 2024 |
| 336_minima-sociaux-rsa-et-prime-d-activite — Tableau 2 | `ass` | Allocation de solidarité spécifique (ASS) | 1999 → 2024 |
| 336_minima-sociaux-rsa-et-prime-d-activite — Tableau 2 | `aspa` | Allocation supplémentaire vieillesse (ASV) et allocation de solidarité aux personnes âgées (ASPA) (3) | 1999 → 2024 |

## cohesion-sociale/redistribution

- Fichier : `data/series/cohesion-sociale/redistribution.csv` (22 lignes), unité « % de la population », fréquence annual, dernière observation **2023**.
- Source : DREES — https://data.drees.solidarites-sante.gouv.fr/explore/dataset/4230_indicateurs-de-pauvrete-avant-et-apres-redistribution-de-niveau-de-vie-et-d/information/
- Requête : https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/4230_indicateurs-de-pauvrete-avant-et-apres-redistribution-de-niveau-de-vie-et-d/attachments/pauvrete_redistribution_decomposition_revenu_2012_2023_vf_xlsx
- Part de la population vivant sous le seuil de 60 % du niveau de vie médian, mesurée avant puis après redistribution : l'écart entre les deux courbes est précisément ce que corrigent les impôts directs et les prestations sociales (prestations familiales, aides au logement, minima sociaux, prime d'activité, moins l'impôt sur le revenu, la CSG-CRDS et la taxe d'habitation). Enquête Revenus fiscaux et sociaux (Insee-DGFiP-CNAF-CNAV-CCMSA), traitements DREES, France métropolitaine ; 2020 est absente (enquête fragilisée) et la refonte de l'ERFS en 2021 crée une rupture avec les années antérieures.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| 4230_indicateurs-de-pauvrete-avant-et-apres-redistribution-de-niveau-de-vie-et-d — Tableau 2a | `avant` | Tableau 2a - Indicateurs de pauvreté et d'inégalités avant redistribution, depuis 2012 — ligne « Taux de pauvreté (en %) », seuil à 60 % | 2012 → 2023 |
| 4230_indicateurs-de-pauvrete-avant-et-apres-redistribution-de-niveau-de-vie-et-d — Tableau 2b | `apres` | Tableau 2b - Indicateurs de pauvreté et d'inégalités après redistribution, depuis 2012 — ligne « Taux de pauvreté (en %) », seuil à 60 % | 2012 → 2023 |

## cohesion-sociale/allocataires-cnaf

- Fichier : `data/series/cohesion-sociale/allocataires-cnaf.csv` (30 lignes), unité « milliers d'allocataires », fréquence annual, dernière observation **2025**.
- Source : CNAF — https://data.caf.fr/explore/dataset/s_ben_nat/information/
- Requête : https://data.caf.fr/api/explore/v2.1/catalog/datasets/s_ben_nat/records?select=dtreffre,indfoy_rsa,indfoy_ppa,indfoy_ndural&order_by=dtreffre%20asc&limit=100&offset=0
- Foyers allocataires des caisses d'allocations familiales en décembre de chaque année, France entière ; les allocataires du régime agricole (MSA) ne sont pas comptés. « Aides au logement » agrège l'APL, l'ALF et l'ALS. Un foyer peut percevoir plusieurs prestations : les trois séries ne s'additionnent pas. La série mensuelle CNAF ne commence qu'en juin 2016.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| s_ben_nat.indfoy_rsa (décembre) | `rsa` | Nombre foyers RSA | 2016 → 2025 |
| s_ben_nat.indfoy_ppa (décembre) | `prime-activite` | Nombre foyers PPA | 2016 → 2025 |
| s_ben_nat.indfoy_ndural (décembre) | `apl` | Nombre foyers NDURAL | 2016 → 2025 |

## finances-publiques/abstention

- Fichier : `data/series/finances-publiques/abstention.csv` (28 lignes), unité « % des inscrits », fréquence annual, dernière observation **2024**.
- Source : Ministère de l'Intérieur et CDSP / Sciences Po — https://www.data.gouv.fr/datasets/elections-presidentielles-1965-2012-1
- Requête : https://www.data.gouv.fr/datasets/elections-presidentielles-1965-2012-1
- Requête : https://www.data.gouv.fr/datasets/elections-legislatives-1958-2012
- Requête : https://www.data.gouv.fr/datasets/election-presidentielle-des-23-avril-et-7-mai-2017-resultats-definitifs-du-1er-tour-par-bureaux-de-vote
- Requête : https://www.data.gouv.fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour
- Requête : https://www.data.gouv.fr/datasets/elections-legislatives-des-12-et-19-juin-2022-resultats-definitifs-du-premier-tour
- Requête : https://www.data.gouv.fr/datasets/elections-legislatives-des-11-et-18-juin-2017-resultats-du-1er-tour
- Requête : https://www.data.gouv.fr/datasets/elections-legislatives-des-30-juin-et-7-juillet-2024-resultats-definitifs-du-1er-tour
- Abstention au premier tour, calculée comme 1 − votants / inscrits. Jusqu'en 2012, les valeurs sont agrégées à partir des fichiers de résultats par circonscription publiés par le Centre de données socio-politiques (Sciences Po) sur data.gouv.fr ; à partir de 2017, elles proviennent des fichiers de résultats définitifs du ministère de l'Intérieur (France entière, outre-mer et Français de l'étranger compris pour les législatives). Le champ n'est donc pas strictement identique sur toute la période et les valeurs antérieures à 2017 peuvent différer de quelques dixièmes des chiffres France entière du ministère. Les législatives de 1986 se sont tenues à la proportionnelle à un seul tour.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1958 | 1958 → 22.82 % — 466 circonscriptions, 27244992 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1962 | 1962 → 31.31 % — 466 circonscriptions, 27540358 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1967 | 1967 → 18.88 % — 474 circonscriptions, 28242549 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1968 | 1968 → 20.04 % — 474 circonscriptions, 28178087 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1973 | 1973 → 18.69 % — 474 circonscriptions, 29883738 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1978 | 1978 → 17.08 % — 475 circonscriptions, 34457706 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1981 | 1981 → 29.14 % — 474 circonscriptions, 35530010 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1986 | 1986 → 21.51 % — 555 circonscriptions, 36593008 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1988 | 1988 → 34.28 % — 576 circonscriptions, 38019877 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1993 | 1993 → 31.09 % — 576 circonscriptions, 38895650 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 1997 | 1997 → 32 % — 577 circonscriptions, 39200286 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 2002 | 2002 → 35.59 % — 577 circonscriptions, 40969371 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 2007 | 2007 → 39.57 % — 577 circonscriptions, 43888754 inscrits |
| CDSP cdsp_legiYYYYt1_circ.csv | `legislative` | Abstention au 1er tour, 2012 | 2012 → 42.78 % — 577 circonscriptions, 46082104 inscrits |
| Ministère de l'Intérieur, Leg_2017_Resultats_T1_c.xlsx (feuille « FE - Metro - OM - T1 ») | `legislative` | Abstention au 1er tour, 2017 | 2017 → 51.3 % — 47570988 inscrits |
| Ministère de l'Intérieur, resultats-par-niveau-fe-t1-france-entiere.txt | `legislative` | Abstention au 1er tour, 2022 | 2022 → 52.49 % — 48953748 inscrits |
| Ministère de l'Intérieur, resultats-definitifs-france-entiere.xlsx | `legislative` | Abstention au 1er tour, 2024 | 2024 → 33.29 % — 49332709 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1965 | 1965 → 14.98 % — 465 circonscriptions, 28230628 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1969 | 1969 → 21.77 % — 470 circonscriptions, 28752312 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1974 | 1974 → 15.1 % — 473 circonscriptions, 29783980 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1981 | 1981 → 18.52 % — 474 circonscriptions, 35564809 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1988 | 1988 → 17.98 % — 555 circonscriptions, 37041981 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 1995 | 1995 → 20.52 % — 555 circonscriptions, 38557120 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 2002 | 2002 → 28.07 % — 575 circonscriptions, 40808156 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 2007 | 2007 → 16.23 % — 576 circonscriptions, 44472834 inscrits |
| CDSP cdsp_presiYYYYt1_circ.csv | `presidentielle` | Abstention au 1er tour, 2012 | 2012 → 20.52 % — 577 circonscriptions, 46028542 inscrits |
| Ministère de l'Intérieur, PR17_BVot_T1_FE.txt | `presidentielle` | Abstention au 1er tour, 2017 | 2017 → 22.23 % — 69242 bureaux, 47582183 inscrits |
| Ministère de l'Intérieur, resultats-par-niveau-fe-t1-france-entiere.txt | `presidentielle` | Abstention au 1er tour, 2022 | 2022 → 26.31 % — 48747876 inscrits |

## securite/infractions-mensuelles

- Fichier : `data/series/securite/infractions-mensuelles.csv` (1920 lignes), unité « faits enregistrés par mois », fréquence monthly, dernière observation **2026-08**.
- Source : SSMSI (ministère de l'Intérieur) — https://www.data.gouv.fr/datasets/service-statistique-ministeriel-de-la-securite-interieure-base-des-series-chronologiques
- Requête : https://static.data.gouv.fr/resources/service-statistique-ministeriel-de-la-securite-interieure-base-des-series-chronologiques/20260915-152254/serieschrono-datagouv.csv
- Faits enregistrés par la police et la gendarmerie chaque mois, France entière, corrigés des variations saisonnières et des jours ouvrables (sauf les homicides, publiés bruts). Ce sont des faits enregistrés, pas des faits commis : une variation peut venir d'un changement de comportement de plainte ou d'activité des services autant que de la délinquance elle-même. L'unité de compte diffère selon l'indicateur (infraction, victime, véhicule, mis en cause) et figure dans la légende.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| Homicides et tentatives d'homicide / Homicides | `homicides` | Homicides — unité de compte : Victimes | 2016-01 → 2026-08 |
| Violences physiques / Ensemble | `violences-intrafamiliales` | Violences physiques intrafamiliales — unité de compte : Victimes | 2016-01 → 2026-08 |
| Violences physiques / Ensemble | `violences-hors-famille` | Violences physiques hors du cadre familial — unité de compte : Victimes | 2016-01 → 2026-08 |
| Violences sexuelles / Ensemble | `violences-sexuelles` | Violences sexuelles — unité de compte : Victimes | 2016-01 → 2026-08 |
| Vols et tentatives de vols avec violence / Vols avec armes | `vols-avec-arme` | Vols avec arme — unité de compte : Infractions | 2016-01 → 2026-08 |
| Vols et tentatives de vols avec violence / Vols violents sans arme | `vols-violents` | Vols violents sans arme — unité de compte : Infractions | 2016-01 → 2026-08 |
| Vols et tentatives de vols sans violence / Non Renseigné | `vols-sans-violence` | Vols sans violence — unité de compte : Victimes | 2016-01 → 2026-08 |
| Cambriolages et tentatives / Logements (résidences principales et secondaires) | `cambriolages` | Cambriolages de logement — unité de compte : Infractions | 2016-01 → 2026-08 |
| Vols et tentatives de vols liés aux véhicules / Vols de véhicule | `vols-vehicules` | Vols de véhicule — unité de compte : Véhicules | 2016-01 → 2026-08 |
| Vols et tentatives de vols liés aux véhicules / Vols dans les véhicules | `vols-dans-vehicules` | Vols dans les véhicules — unité de compte : Véhicules | 2016-01 → 2026-08 |
| Vols et tentatives de vols liés aux véhicules / Vols d'accessoires sur véhicules | `vols-accessoires` | Vols d'accessoires sur véhicules — unité de compte : Véhicules | 2016-01 → 2026-08 |
| Destructions et dégradations volontaires / Non Renseigné | `degradations` | Destructions et dégradations volontaires — unité de compte : Infractions | 2016-01 → 2026-08 |
| Infractions à la législation sur les stupéfiants / Usage de stupéfiants | `stupefiants-usage` | Usage de stupéfiants — unité de compte : Mis en cause | 2016-01 → 2026-08 |
| Infractions à la législation sur les stupéfiants / Trafic de stupéfiants | `stupefiants-trafic` | Trafic de stupéfiants — unité de compte : Mis en cause | 2016-01 → 2026-08 |
| Escroqueries et les fraudes aux moyens de paiements / Ensemble des lieux | `escroqueries` | Escroqueries et fraudes aux moyens de paiement — unité de compte : Victimes | 2016-01 → 2026-08 |

## securite/auteurs-victimes

- Fichier : `data/series/securite/auteurs-victimes.csv` (600 lignes), unité « personnes enregistrées », fréquence annual, dernière observation **2025**.
- Source : SSMSI (ministère de l'Intérieur) — https://www.data.gouv.fr/datasets/principales-caracteristiques-des-victimes-enregistrees-et-des-mis-en-cause-pour-des-infractions-elucidees-par-la-police-et-la-gendarmerie-nationales
- Requête : https://static.data.gouv.fr/resources/principales-caracteristiques-des-victimes-enregistrees-et-des-mis-en-cause-pour-des-infractions-elucidees-par-la-police-et-la-gendarmerie-nationales/20260129-160110/donnee-nat-caract-victimes-data.gouv-2025-produit-le-29012026.xlsx
- Requête : https://static.data.gouv.fr/resources/principales-caracteristiques-des-victimes-enregistrees-et-des-mis-en-cause-pour-des-infractions-elucidees-par-la-police-et-la-gendarmerie-nationales/20260129-160126/donnee-nat-caract-mec-data.gouv-2025-produit-le-29012026.xlsx
- Victimes enregistrées et personnes mises en cause pour des infractions élucidées, par sexe. Les deux bases ne découpent pas l'âge de la même façon — dix-sept tranches côté victimes, six côté mis en cause — donc seul le sexe permet de les lire ensemble. « Mis en cause » ne veut pas dire condamné : c'est une personne contre laquelle les services réunissent des indices, avant toute décision de justice.

| Repère dans la source | Code série | Libellé vérifié | Période |
|---|---|---|---|
| Violences physiques dans le cadre intra-familial / sexe = F | `violences-intrafamiliales-victimes-femmes` | Victimes enregistrées, femmes | 2016 → 2025 |
| Violences physiques dans le cadre intra-familial / sexe = H | `violences-intrafamiliales-victimes-hommes` | Victimes enregistrées, hommes | 2016 → 2025 |
| Violences physiques dans le cadre intra-familial / sexe = F | `violences-intrafamiliales-mis-en-cause-femmes` | Mis en cause, femmes | 2016 → 2025 |
| Violences physiques dans le cadre intra-familial / sexe = H | `violences-intrafamiliales-mis-en-cause-hommes` | Mis en cause, hommes | 2016 → 2025 |

## Échecs

Aucun.
