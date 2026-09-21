# Eurostat – rapport de récupération (2026-09-20)

Script : `scripts/fetch/eurostat.mjs` — API : https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<dataset>?format=JSON&lang=EN&…

## finances-publiques/dette-europe
- fichier : `data/series/finances-publiques/dette-europe.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"na_item":"GD","sector":"S13","unit":"PC_GDP","sinceTimePeriod":"1995"}`

## finances-publiques/deficit
- fichier : `data/series/finances-publiques/deficit.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"na_item":"B9","sector":"S13","unit":"PC_GDP","sinceTimePeriod":"1995"}`

## finances-publiques/depenses-recettes
- fichier : `data/series/finances-publiques/depenses-recettes.csv`
- séries : DEU-depenses, DEU-recettes, ESP-depenses, ESP-recettes, EU27-depenses, EU27-recettes, FRA-depenses, FRA-recettes, ITA-depenses, ITA-recettes
- années : 2000 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"sector":"S13","unit":"PC_GDP","na_item":["TE","TR"],"sinceTimePeriod":"2000"}`

## finances-publiques/charge-interets
- fichier : `data/series/finances-publiques/charge-interets-pib.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"sector":"S13","na_item":"D41PAY","unit":"PC_GDP","sinceTimePeriod":"1995"}`

## finances-publiques/charge-interets
- fichier : `data/series/finances-publiques/charge-interets-mdeur.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"sector":"S13","na_item":"D41PAY","unit":"MIO_EUR","sinceTimePeriod":"1995"}`

## finances-publiques/sankey
- fichier : `data/series/finances-publiques/sankey-2024.csv`
- séries : deficit, dep-GF01, dep-GF0101, dep-GF0102, dep-GF0103, dep-GF0104, dep-GF0105, dep-GF0106, dep-GF0107, dep-GF0108, dep-GF02, dep-GF0201, dep-GF0202, dep-GF0203, dep-GF0204, dep-GF0205, dep-GF03, dep-GF0301, dep-GF0302, dep-GF0303, dep-GF0304, dep-GF0305, dep-GF0306, dep-GF04, dep-GF0401, dep-GF0402, dep-GF0403, dep-GF0404, dep-GF0405, dep-GF0406, dep-GF0407, dep-GF0408, dep-GF0409, dep-GF05, dep-GF0501, dep-GF0502, dep-GF0503, dep-GF0504, dep-GF0505, dep-GF0506, dep-GF06, dep-GF0601, dep-GF0602, dep-GF0603, dep-GF0604, dep-GF0605, dep-GF0606, dep-GF07, dep-GF0701, dep-GF0702, dep-GF0703, dep-GF0704, dep-GF0705, dep-GF0706, dep-GF08, dep-GF0801, dep-GF0802, dep-GF0803, dep-GF0804, dep-GF0805, dep-GF0806, dep-GF09, dep-GF0901, dep-GF0902, dep-GF0903, dep-GF0904, dep-GF0905, dep-GF0906, dep-GF0907, dep-GF0908, dep-GF10, dep-GF1001, dep-GF1002, dep-GF1003, dep-GF1004, dep-GF1005, dep-GF1006, dep-GF1007, dep-GF1008, dep-GF1009, depenses-total, interets, rec-autres, rec-D2, rec-D5, rec-D61, rec-D91, rec2-D2-D211, rec2-D2-D29, rec2-D2-reste, rec2-D5-D51A, rec2-D5-D51B, rec2-D5-reste, rec2-D61-D611, rec2-D61-D613, rec2-D61-reste, recettes-total
- années : 2024 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"exp":{"geo":"FR","unit":"MIO_EUR","sector":"S13","na_item":"TE","cofog99":["GF01","GF02","GF03","GF04","GF05","GF06","GF07","GF08","GF09","GF10","GF0101","GF0102","GF0103","GF0104","GF0105","GF0106","GF0107","GF0108","GF0201","GF0202","GF0203","GF0204","GF0205","GF0301","GF0302","GF0303","GF0304","GF0305","GF0306","GF0401","GF0402","GF0403","GF0404","GF0405","GF0406","GF0407","GF0408","GF0409","GF0501","GF0502","GF0503","GF0504","GF0505","GF0506","GF0601","GF0602","GF0603","GF0604","GF0605","GF0606","GF0701","GF0702","GF0703","GF0704","GF0705","GF0706","GF0801","GF0802","GF0803","GF0804","GF0805","GF0806","GF0901","GF0902","GF0903","GF0904","GF0905","GF0906","GF0907","GF0908","GF1001","GF1002","GF1003","GF1004","GF1005","GF1006","GF1007","GF1008","GF1009"],"sinceTimePeriod":"2015"},"main":{"geo":"FR","unit":"MIO_EUR","sector":"S13","na_item":["TR","TE","B9","D41PAY","D2REC","D5REC","D61REC","D91REC","D211REC","D29REC","D51A_C1REC","D51B_C2REC","D611REC","D613REC"],"sinceTimePeriod":"2015"}}`
- année retenue : 2024

## productivite/taux-emploi
- fichier : `data/series/productivite/taux-emploi.csv`
- séries : DEU-15-64, DEU-55-64, ESP-15-64, ESP-55-64, EU27-15-64, EU27-55-64, FRA-15-64, FRA-55-64, ITA-15-64, ITA-55-64
- années : 2003 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"indic_em":"EMP_LFS","sex":"T","unit":"PC_POP","age":["Y15-64","Y55-64"],"sinceTimePeriod":"2000"}`

## productivite/industrie-manufacturiere
- fichier : `data/series/productivite/industrie-manufacturiere.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"nace_r2":"C","na_item":"B1G","unit":"PC_TOT","sinceTimePeriod":"1995"}`
- méthode : PC_TOT

## demographie/esperance-vie-65
- fichier : `data/series/demographie/esperance-vie-65.csv`
- séries : DEU-femmes, DEU-hommes, ESP-femmes, ESP-hommes, EU27-femmes, EU27-hommes, FRA-femmes, FRA-hommes, GBR-femmes, GBR-hommes, ITA-femmes, ITA-hommes
- années : 1990 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"age":"Y65","sex":["M","F"],"sinceTimePeriod":"1990"}`

## demographie/ratio-dependance
- fichier : `data/series/demographie/ratio-dependance.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1990 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"indic_de":"OLDDEP1","sinceTimePeriod":"1990"}`

## defense/dependance-energetique
- fichier : `data/series/defense/dependance-energetique.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1990 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"siec":"TOTAL","unit":"PC","sinceTimePeriod":"1990"}`

## cohesion-sociale/gini
- fichier : `data/series/cohesion-sociale/gini.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2014 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"age":"TOTAL","statinfo":"GINI_HND","sinceTimePeriod":"2005"}`

## cohesion-sociale/ecart-salarial-fh
- fichier : `data/series/cohesion-sociale/ecart-salarial-fh.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2007 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"nace_r2":"B-S_X_O","unit":"PC","sinceTimePeriod":"2007"}`

## cohesion-sociale/taux-emploi-femmes-hommes
- fichier : `data/series/cohesion-sociale/taux-emploi-femmes-hommes.csv`
- séries : DEU-femmes, DEU-hommes, ESP-femmes, ESP-hommes, EU27-femmes, EU27-hommes, FRA-femmes, FRA-hommes, ITA-femmes, ITA-hommes
- années : 2003 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"indic_em":"EMP_LFS","unit":"PC_POP","age":"Y20-64","sex":["F","M"],"sinceTimePeriod":"2000"}`

## education/neet
- fichier : `data/series/education/neet.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2000 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"age":"Y18-24","sex":"T","unit":"PC","training":"NO_FE_NO_NFE","wstatus":"NEMP","sinceTimePeriod":"2000"}`

## education/sorties-precoces
- fichier : `data/series/education/sorties-precoces.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2000 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"sex":"T","unit":"PC","wstatus":"POP","age":"Y18-24","sinceTimePeriod":"2000"}`

## productivite/chomage-europe
- fichier : `data/series/productivite/chomage-europe.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2003 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"age":"Y15-74","sex":"T","unit":"PC_ACT","sinceTimePeriod":"2000"}`

## finances-publiques/charge-interets-habitant
- fichier : `data/series/finances-publiques/charge-interets-habitant.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"sector":"S13","na_item":"D41PAY","unit":"MIO_EUR","sinceTimePeriod":"1995","population":{"indic_de":"AVG","sinceTimePeriod":"1995"}}`

## securite/delinquance-europe
- fichier : `data/series/securite/delinquance-europe.csv`
- séries : DEU-cambriolage, DEU-coups, DEU-homicide, DEU-sexuel, DEU-stupefiants, DEU-vol, DEU-vol-violent, ESP-cambriolage, ESP-coups, ESP-homicide, ESP-sexuel, ESP-stupefiants, ESP-vol, ESP-vol-violent, FRA-cambriolage, FRA-coups, FRA-homicide, FRA-sexuel, FRA-stupefiants, FRA-vol, FRA-vol-violent, ITA-coups, ITA-homicide, ITA-sexuel, ITA-stupefiants, ITA-vol, ITA-vol-violent
- années : 2010 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"unit":"P_HTHAB","iccs":["ICCS0101","ICCS020111","ICCS0301","ICCS0401","ICCS0501","ICCS0502","ICCS0601"],"sinceTimePeriod":"2010"}`

## securite/homicides-couple
- fichier : `data/series/securite/homicides-couple.csv`
- séries : DEU-famille-femmes, DEU-famille-hommes, DEU-partenaire-femmes, DEU-partenaire-hommes, ESP-famille-femmes, ESP-famille-hommes, ESP-partenaire-femmes, ESP-partenaire-hommes, FRA-famille-femmes, FRA-famille-hommes, FRA-partenaire-femmes, FRA-partenaire-hommes, ITA-famille-femmes, ITA-famille-hommes, ITA-partenaire-femmes, ITA-partenaire-hommes
- années : 2010 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"unit":"P_HTHAB","pers_cat":["IPTN","FAM"],"sex":["F","M"],"sinceTimePeriod":"2010"}`

## securite/morts-routes
- fichier : `data/series/securite/morts-routes.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1999 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"unit":"P_MHAB","sex":"T","age":"TOTAL","pers_cat":"TOTAL","sinceTimePeriod":"1995"}`

## cohesion-sociale/protection-sociale
- fichier : `data/series/cohesion-sociale/protection-sociale.csv`
- séries : DEU-chomage, DEU-exclusion, DEU-famille, DEU-invalidite, DEU-logement, DEU-sante, DEU-survivants, DEU-total, DEU-vieillesse, ESP-chomage, ESP-exclusion, ESP-famille, ESP-invalidite, ESP-logement, ESP-sante, ESP-survivants, ESP-total, ESP-vieillesse, EU27-chomage, EU27-exclusion, EU27-famille, EU27-invalidite, EU27-logement, EU27-sante, EU27-survivants, EU27-total, EU27-vieillesse, FRA-chomage, FRA-exclusion, FRA-famille, FRA-invalidite, FRA-logement, FRA-sante, FRA-survivants, FRA-total, FRA-vieillesse, ITA-chomage, ITA-exclusion, ITA-famille, ITA-invalidite, ITA-logement, ITA-sante, ITA-survivants, ITA-total, ITA-vieillesse
- années : 2000 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"unit":"PC_GDP","spdeps":"SPR","spfunc":["TOTAL","OLD","SICK","FAM","UNE","DIS","HOU","EXCL","SRV"],"sinceTimePeriod":"2000"}`

## demographie/mortalite-infantile
- fichier : `data/series/demographie/mortalite-infantile.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1990 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"indic_de":"INFMORRT","sinceTimePeriod":"1990"}`

## demographie/suicide
- fichier : `data/series/demographie/suicide.csv`
- séries : DEU, ESP, EU27, FRA, FRA-femmes, FRA-hommes, ITA
- années : 2011 → 2023 ; lastObservation (France) : **2023**
- dimensions : `{"icd10":"X60-X84_Y870","sex":["T","M","F"],"age":"TOTAL","unit":"RT","sinceTimePeriod":"2011"}`

## demographie/esperance-vie-bonne-sante
- fichier : `data/series/demographie/esperance-vie-bonne-sante.csv`
- séries : DEU-65-femmes, DEU-65-hommes, DEU-naissance-femmes, DEU-naissance-hommes, ESP-65-femmes, ESP-65-hommes, ESP-naissance-femmes, ESP-naissance-hommes, EU27-65-femmes, EU27-65-hommes, EU27-naissance-femmes, EU27-naissance-hommes, FRA-65-femmes, FRA-65-hommes, FRA-naissance-femmes, FRA-naissance-hommes, ITA-65-femmes, ITA-65-hommes, ITA-naissance-femmes, ITA-naissance-hommes
- années : 2004 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"unit":"YR","hlth_hle":["HLY_Y0","HLY_Y65"],"sex":["F","M"],"sinceTimePeriod":"2004"}`

## demographie/asile
- fichier : `data/series/demographie/asile.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2008 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"citizen":"TOTAL","applicant":"FRST","sex":"T","age":"TOTAL","unit":"PER","sinceTimePeriod":"2008"}`

## demographie/asile-habitant
- fichier : `data/series/demographie/asile-habitant.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 2008 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"citizen":"TOTAL","applicant":"FRST","sex":"T","age":"TOTAL","unit":"PER","sinceTimePeriod":"2008","population":{"indic_de":"AVG","sinceTimePeriod":"2008"}}`

## cohesion-sociale/inflation-europe
- fichier : `data/series/cohesion-sociale/inflation-europe.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1997 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"unit":"RCH_A_AVG","coicop":"CP00","sinceTimePeriod":"1997"}`

## climat/emissions-secteurs
- fichier : `data/series/climat/emissions-secteurs.csv`
- séries : agriculture, batiments, dechets, energie, industrie-combustion, procedes-industriels, transports, utcatf
- années : 1990 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"airpol":"GHG","unit":"MIO_T","src_crf":["CRF1A1","CRF1A2","CRF1A3","CRF1A4","CRF2","CRF3","CRF5","CRF4"],"sinceTimePeriod":"1990"}`

## defense/depenses-cofog
- fichier : `data/series/defense/depenses-cofog.csv`
- séries : DEU, ESP, EU27, FRA, ITA, POL
- années : 1995 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"cofog99":"GF02","na_item":"TE","sector":"S13","unit":"PC_GDP","sinceTimePeriod":"1995"}`

## logement/taux-effort
- fichier : `data/series/logement/taux-effort.csv`
- séries : DEU, ESP, EU27, FRA, FRA-autres, FRA-pauvres, ITA
- années : 2004 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"hhcomp":"TOTAL","rskpovth":"TOTAL","unit":"PC","sinceTimePeriod":"2003"}`

## logement/surcharge-statut
- fichier : `data/series/logement/surcharge-statut.csv`
- séries : ensemble, locataire-prive, locataire-social, proprietaire-emprunt, proprietaire-sans-emprunt
- années : 2005 → 2025 ; lastObservation (France) : **2025**
- dimensions : `{"tenure":["TOTAL","OWN_L","OWN_NL","RENT_MKT","RENT_FR"],"unit":"PC","sinceTimePeriod":"2003"}`

## securite/prisons
- fichier : `data/series/securite/prisons.csv`
- séries : DEU, ESP, FRA, ITA, POL
- années : 2008 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"indic_cr":["PRIS_ACT_CAP","PRIS_OFF_CAP"],"unit":["P_HTHAB","NR"],"sinceTimePeriod":"2008"}`

## securite/prisons-densite
- fichier : `data/series/securite/prisons-densite.csv`
- séries : DEU, ESP, FRA, ITA, POL
- années : 2008 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"indic_cr":["PRIS_ACT_CAP","PRIS_OFF_CAP"],"unit":["P_HTHAB","NR"],"sinceTimePeriod":"2008"}`

## education/depense-education-pib
- fichier : `data/series/education/depense-education-pib.csv`
- séries : DEU, ESP, EU27, FRA, ITA
- années : 1995 → 2024 ; lastObservation (France) : **2024**
- dimensions : `{"cofog99":"GF09","na_item":"TE","sector":"S13","unit":"PC_GDP","sinceTimePeriod":"1995"}`

---
35 fichiers écrits, 0 échec(s).
