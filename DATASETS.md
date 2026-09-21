# Provenance des données

Une ligne par série affichée. Colonne « Mode » : **auto** = régénérée par `npm run refresh` (script indiqué) ; **manuel** = fichier versionné dans `data/sources-manuelles/` et relu par un script de `scripts/manual/`.

La licence de chaque producteur est dans [DATA-LICENSE.md](DATA-LICENSE.md), et le format des fichiers dans [data/README.md](data/README.md). Le détail par fichier — dimensions exactes, années couvertes, remarques — est dans les rapports générés à chaque récupération : `data/series/OWID-REPORT.md`, `EUROSTAT-REPORT.md`, `INSEE-REPORT.md`, `IMF-REPORT.md`, `FRANCE-REPORT.md`, `OECD-REPORT.md`.

## Automatisées

| Série (`data/series/…`) | Source primaire | Jeu / identifiant | Mode |
|---|---|---|---|
| finances-publiques/dette-europe | Eurostat | gov_10dd_edpt1 (GD, S13, % PIB) | auto · eurostat.mjs |
| finances-publiques/deficit | Eurostat | gov_10dd_edpt1 (B9) | auto · eurostat.mjs |
| finances-publiques/depenses-recettes | Eurostat | gov_10a_main (TE, TR) | auto · eurostat.mjs |
| finances-publiques/charge-interets-pib, -mdeur | Eurostat | gov_10a_main (D41PAY) | auto · eurostat.mjs |
| finances-publiques/charge-interets-habitant | Eurostat | gov_10a_main (D41PAY, MIO_EUR) ÷ demo_gind (population moyenne) | auto · eurostat.mjs |
| finances-publiques/dette-monde | Fonds monétaire international | DataMapper GGXWDG_NGDP — définition FMI, pas Maastricht ; projections exclues | auto · imf.mjs |
| finances-publiques/charge-interets-monde | Fonds monétaire international | DataMapper `ie` — définition différente du D41 SEC 2010 | auto · imf.mjs |
| productivite/chomage-europe | Eurostat | une_rt_a (Y15-74, PC_ACT) — même définition BIT que l'Insee | auto · eurostat.mjs |
| productivite/chomage-monde | Our World in Data (OIT via Banque mondiale) | unemployment-rate — estimations modélisées, pas des enquêtes nationales | auto · owid.mjs |
| securite/delinquance | SSMSI (ministère de l'Intérieur), via data.gouv | base régionale agrégée France, taux pour 1 000 hab. — faits enregistrés | auto · france.mjs |
| cohesion-sociale/minima-sociaux | DREES | jeu 336, tableau 2 (xlsx) — allocataires RSA, AAH, ASS, ASPA | auto · france.mjs |
| cohesion-sociale/redistribution | DREES | jeu 4230, tableaux 2a/2b — pauvreté avant et après redistribution | auto · france.mjs |
| cohesion-sociale/allocataires-cnaf | CNAF | data.caf.fr, jeu s_ben_nat — foyers allocataires en décembre | auto · france.mjs |
| cohesion-sociale/inflation | Insee | BDM idbank 011814632 (IPC base 2025, glissement annuel, tabac compris) | auto · insee.mjs |
| demographie/immigres | Insee | figure « Population immigrée et étrangère » (xlsx) — recensements puis estimations | auto · insee.mjs |
| finances-publiques/abstention | Ministère de l'Intérieur et CDSP / Sciences Po, via data.gouv | résultats bureau par bureau, abstention recalculée | auto · france.mjs |
| finances-publiques/sankey-2024 | Insee (comptes nationaux) via Eurostat | gov_10a_exp (COFOG niveau 1 GF01-GF10 et niveau 2, 69 sous-fonctions) + gov_10a_main (TR, TE, B9, D2REC, D5REC, D61REC, D91REC) | auto · eurostat.mjs |
| productivite/taux-emploi | Eurostat | lfsi_emp_a (15-64, 55-64) | auto · eurostat.mjs |
| productivite/industrie-manufacturiere | Eurostat | nama_10_a10 (C, B1G, PC_TOT) | auto · eurostat.mjs |
| productivite/pib-par-habitant | Our World in Data (Banque mondiale) | gdp-per-capita-worldbank | auto · owid.mjs |
| productivite/productivite-horaire | Our World in Data (Penn World Table) | labor-productivity-per-hour-pennworldtable | auto · owid.mjs |
| productivite/depenses-rd | Our World in Data (UNESCO via Banque mondiale) | research-spending-gdp | auto · owid.mjs |
| climat/co2-par-habitant, co2-total, co2-territorial-vs-empreinte | Our World in Data (Global Carbon Budget) | co-emissions-per-capita, annual-co2-emissions-per-country, prod-cons-co2-per-capita | auto · owid.mjs |
| climat/intensite-carbone-electricite | Our World in Data (Ember) | carbon-intensity-electricity | auto · owid.mjs |
| climat/temperature-france | Our World in Data (Copernicus) | average-monthly-surface-temperature, moyenne annuelle calculée | auto · owid.mjs |
| demographie/fecondite | Our World in Data (ONU WPP 2024) | children-per-woman-un | auto · owid.mjs |
| demographie/esperance-de-vie | Our World in Data | life-expectancy | auto · owid.mjs |
| demographie/esperance-vie-65 | Eurostat | demo_mlexpec (Y65, M/F) | auto · eurostat.mjs |
| demographie/ratio-dependance | Eurostat | demo_pjanind (OLDDEP1) | auto · eurostat.mjs |
| demographie/age-effectif-retraite | Our World in Data (OCDE 2018) | average-effective-retirement-men / -women | auto · owid.mjs |
| defense/depenses-militaires-pib, -usd | Our World in Data (SIPRI) | military-expenditure-share-gdp, military-spending-sipri | auto · owid.mjs |
| defense/effectifs-armees | Our World in Data (IISS via Banque mondiale) | armed-forces-personnel | auto · owid.mjs |
| defense/dependance-energetique | Eurostat | nrg_ind_id (TOTAL) | auto · eurostat.mjs |
| defense/depenses-cofog | Eurostat | gov_10a_exp (COFOG GF02 « Défense », S13, % PIB) — périmètre comptable, pas celui de l'OTAN | auto · eurostat.mjs |
| climat/emissions-secteurs | Eurostat (inventaire CCNUCC compilé par l'AEE) | env_air_gge (GHG, Mt, CRF1A1/1A2/1A3/1A4/2/3/4/5) | auto · eurostat.mjs |
| securite/prisons, prisons-densite | Eurostat | crim_pris_cap (personnes détenues et capacité officielle) ; densité calculée | auto · eurostat.mjs |
| logement/taux-effort | Eurostat (EU-SILC) | ilc_mded01 (part des dépenses de logement dans le revenu disponible, total et selon le seuil de pauvreté) | auto · eurostat.mjs |
| logement/surcharge-statut | Eurostat (EU-SILC) | ilc_lvho07c (taux de surcharge par statut d'occupation) — autre définition | auto · eurostat.mjs |
| logement/prix-revenu | OCDE | DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES, mesure HPI_YDH (price to income), indice 2015 = 100 | auto · oecd.mjs |
| education/salaires-enseignants | OCDE (Regards sur l'éducation) | DSD_EAG_SAL_TREND@DF_TCH_STA, EXP15, indice prix constants 2015 = 100 | auto · oecd.mjs |
| education/depense-education | OCDE (Regards sur l'éducation) | DSD_EAG_UOE_FIN@DF_UOE_INDIC_FIN_PERSTUD, USD PPA par élève, prix constants, depuis 2005 (l'API refuse les plages plus larges) | auto · oecd.mjs |
| education/neet, sorties-precoces | Eurostat | edat_lfse_20, edat_lfse_14 | auto · eurostat.mjs |
| securite/delinquance-europe | Eurostat | crim_off_cat (P_HTHAB, 7 catégories ICCS) — faits enregistrés, pas faits commis | auto · eurostat.mjs |
| securite/infractions-mensuelles | SSMSI (ministère de l'Intérieur), via data.gouv | base des séries chronologiques, 15 indicateurs France, mensuel CVS-CJO 2016 → aujourd'hui (mêmes séries que les « Interstats Conjoncture ») | auto · france.mjs |
| securite/auteurs-victimes | SSMSI (ministère de l'Intérieur), via data.gouv | bases nationales des victimes et des mis en cause, lignes « Ensemble » par sexe, 15 infractions | auto · france.mjs |
| education/depense-education-pib | Eurostat | gov_10a_exp (COFOG GF09 « Enseignement », S13, % PIB) | auto · eurostat.mjs |
| securite/homicides-couple | Eurostat | crim_hom_vrel (IPTN, FAM × sexe) | auto · eurostat.mjs |
| securite/morts-routes | Eurostat | tran_sf_roadus (P_MHAB) — source ONISR pour la France | auto · eurostat.mjs |
| cohesion-sociale/protection-sociale | Eurostat | spr_exp_func (ESSPROS, PC_GDP, 9 risques) | auto · eurostat.mjs |
| cohesion-sociale/inflation-europe | Eurostat | prc_hicp_aind (RCH_A_AVG, CP00) | auto · eurostat.mjs |
| demographie/mortalite-infantile | Eurostat | demo_minfind (INFMORRT) | auto · eurostat.mjs |
| demographie/suicide | Eurostat | hlth_cd_asdr2 (CIM-10 X60-X84_Y870, taux standardisé) | auto · eurostat.mjs |
| demographie/esperance-vie-bonne-sante | Eurostat | hlth_hlye (HLY_Y0, HLY_Y65 × sexe) | auto · eurostat.mjs |
| demographie/asile, asile-habitant | Eurostat | migr_asyappctza (primo-demandeurs) ÷ demo_gind | auto · eurostat.mjs |
| cohesion-sociale/gini | Eurostat | ilc_di12 (GINI_HND, servi depuis 2014 seulement) | auto · eurostat.mjs |
| cohesion-sociale/ecart-salarial-fh | Eurostat | earn_gr_gpgr2 (B-S_X_O) | auto · eurostat.mjs |
| cohesion-sociale/taux-emploi-femmes-hommes | Eurostat | lfsi_emp_a (20-64, F/M) | auto · eurostat.mjs |
| productivite/chomage | Insee | BDM 001688527/33/35/37/29/31 (BIT, CVS, France hors Mayotte) | auto · insee.mjs |
| productivite/halo-chomage | Insee | BDM 011818564 | auto · insee.mjs |
| demographie/naissances-deces | Insee | BDM 000067677, 000067679 (France métropolitaine) ; solde calculé | auto · insee.mjs |
| logement/prix-logements-anciens | Insee | BDM 010567059/79/73/57/61 (Notaires-Insee, base 2015, CVS) | auto · insee.mjs |
| logement/indice-loyers | Insee | BDM 010600365 ; IRL 001515333 rebasé T1 2019 = 100 | auto · insee.mjs |
| logement/construction | SDES via Insee | BDM 001718158, 001718270 (Sit, cumul 12 mois, date réelle) | auto · insee.mjs |
| cohesion-sociale/pouvoir-achat | Insee | Melodi DD_CNA_AGREGATS, S14, _PAM_UC / _PAA_UC (taux composés en indice) | auto · insee.mjs |
| cohesion-sociale/smic | Insee | BDM 000879877, 000879878 (35 h, depuis juillet 2005) | auto · insee.mjs |
| cohesion-sociale/pauvrete, niveau-vie | Insee | Melodi DS_ERFS_RETROPOLE (PR_MD60, PR_MD50, MED_SL) | auto · insee.mjs |
| entreprises/creations, defaillances | Insee | BDM créations méthode 2022 (sommes annuelles), défaillances 001656164 | auto · insee.mjs |

## Déposées à la main (fichier versionné, script de reconstruction)

Ces séries viennent d'un fichier que la source ne publie pas derrière une API. Le fichier est conservé dans `data/sources-manuelles/` et un script de `scripts/manual/` le relit : aucun nombre n'est saisi à la main, et la série se reconstruit à l'identique.

| Série (`data/series/…`) | Source primaire | Fichier et extraction | Script |
|---|---|---|---|
| demographie/depenses-retraites | Conseil d'orientation des retraites, rapport annuel de juin 2026 | `data/sources-manuelles/cor-rapport-2026-donnees-partie-2.xlsx`, onglet **Fig 2.2** — dépenses du système de retraite en % du PIB, ligne « Obs » (2002-2025) et ligne « Sc. Ref » (2025-2070) | `scripts/manual/cor.mjs` |
| demographie/ratio-cotisants | Conseil d'orientation des retraites, rapport annuel de juin 2026 | `data/sources-manuelles/cor-rapport-2026-donnees-partie-2.xlsx`, onglet **Fig 2.3**, ligne 2.2b — rapport cotisants / retraités, « Obs » (2002-2024) et « Sc. Ref » (2024-2070) | `scripts/manual/cor.mjs` |
| cohesion-sociale/partage-revenus | World Inequality Database, export pays France | variables **sptincj992** (avant impôts) et **sdiincj992** (après impôts), percentiles p0p50, p50p90, p90p100, p99p100, depuis 1980 | `scripts/manual/wid.mjs` |
| cohesion-sociale/partage-patrimoine | World Inequality Database, export pays France | variable **shwealj992**, mêmes percentiles, depuis 1980 | `scripts/manual/wid.mjs` |
| climat/empreinte-par-revenu | World Inequality Database, export pays France | variable **lpfghgi999** (empreinte carbone moyenne par habitant du groupe, tCO₂e), mêmes percentiles, 1990-2019 | `scripts/manual/wid.mjs` |
| education/pisa | OCDE, tableau de bord PISA | exports CSV de `data/sources-manuelles/pisa-ocde/` : « Mean performance in mathematics / reading / science » par pays, et « Trends… » pour la moyenne OCDE, 2006-2025 | `scripts/manual/pisa.mjs` |
| education/pisa-origine-sociale | OCDE, tableau de bord PISA | exports « Mean performance in science in France, by national quarter of socio-economic status » et « Socio-economic gaps in science performance in France », 2015-2025 | `scripts/manual/pisa.mjs` |
| education/pisa-niveaux | DEPP, Note d'Information n° 26.40 | `data/sources-manuelles/depp-ni-2026-40-pisa.xlsx`, onglets **Figure 8 web** (écrit, depuis 2000) et **Figure 13 web** (mathématiques, depuis 2003), France et moyenne OCDE-24 | `scripts/manual/pisa.mjs` |

L'export WID complet (`WID_data_FR.csv`, 68 Mo) est trop lourd pour le dépôt et n'est pas redistribué ; il se télécharge sur <https://wid.world/data/> (bouton « Download data », pays France). Seul l'extrait des variables utilisées est versionné, dans `data/sources-manuelles/wid-france-extrait.csv` : le build n'a pas besoin de l'export complet. Pour régénérer l'extrait, pointer `WID_FULL_EXPORT` sur le fichier brut avant `npm run manual wid`.

`npm run refresh` ne couvre que les sources qui ont une API. Les scripts de `scripts/manual/` se relancent avec `npm run manual`, quand une nouvelle édition du document source paraît.

## Ce que ces graphes ne couvrent pas

Trois séries publiées ont une limite de périmètre ou de profondeur. Elle est documentée ici et, quand elle change la lecture, rappelée au lecteur sur le graphe lui-même.

| Graphe | La limite | Autre source sur le sujet |
|---|---|---|
| cohesion-sociale/partage-patrimoine | L'export WID porte sur la France seule : la comparaison européenne demanderait le même export pour chaque pays. | <https://wid.world/data/> |
| education/depense-education | L'API de l'OCDE plafonne les plages très larges : la série commence en 2005, alors que la dépense intérieure d'éducation française remonte plus haut. | DEPP, Repères et références statistiques : <https://www.education.gouv.fr/depp/reperes-et-references-statistiques-2026-505320> |
| defense/depenses-militaires-pib, -usd | Reposent sur le SIPRI via Our World in Data, parce qu'aucune source officielle ne publie de chiffres comparables pour la Chine et la Russie. | OTAN, « Defence Investment of NATO Countries » : <https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2026-en.pdf> (membres de l'OTAN uniquement) |
