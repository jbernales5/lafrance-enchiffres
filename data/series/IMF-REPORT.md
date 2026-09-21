# FMI – rapport de récupération (2026-09-20)

Script : `scripts/fetch/imf.mjs` — API : https://www.imf.org/external/datamapper/api/v1/<indicateur>/<ISO3>…

## finances-publiques/dette-monde
- fichier : `data/series/finances-publiques/dette-monde.csv`
- indicateur : `GGXWDG_NGDP`
- séries : CHN, FRA, GBR, JPN, USA
- années : 1990 → 2024 (projections FMI au-delà de 2024 exclues)
- requête : https://www.imf.org/external/datamapper/api/v1/GGXWDG_NGDP/FRA/USA/JPN/GBR/CHN

## finances-publiques/charge-interets-monde
- fichier : `data/series/finances-publiques/charge-interets-monde.csv`
- indicateur : `ie`
- séries : CHN, FRA, GBR, JPN, USA
- années : 1990 → 2024 (projections FMI au-delà de 2024 exclues)
- requête : https://www.imf.org/external/datamapper/api/v1/ie/FRA/USA/JPN/GBR/CHN

---
2 fichiers écrits, 0 échec(s).
