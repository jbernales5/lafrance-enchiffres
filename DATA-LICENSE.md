# Licence des données

Le code de ce dépôt est sous licence MIT (voir `LICENSE`). **Les données ne le sont pas.** Chaque série vient d'un producteur qui fixe ses propres conditions de réutilisation, et le dépôt les redistribue : les fichiers `data/series/**.csv` sont versionnés et téléchargeables depuis le site. Ce document dit, pour chaque producteur, sous quel régime cette redistribution est faite.

La version lisible par un programme est `data/licenses.json`. Chaque `data/series/**.meta.json` y renvoie par `source.license`, et par `source.upstreamLicense` quand le diffuseur republie la donnée d'un tiers. Le script `npm run validate` refuse une série dont la licence n'est pas déclarée dans le catalogue.

## Comment citer une série

Le champ `source.citation` de chaque `.meta.json` porte la citation exigée par le producteur quand il en publie une. À défaut, la forme minimale est :

> `<producteur>`, `<jeu de données>`, consulté le `<fetchedAt>`, via https://lafrance.enchiffres.fr

Les fichiers CSV téléchargés depuis le site portent ces mentions en tête.

## Producteurs et régimes

### Licence Ouverte / Open Licence 2.0 (Etalab) — 23 séries

**Insee** (15), **SSMSI, ministère de l'Intérieur** (3), **DREES** (2), **CNAF** (1), **DEPP, ministère de l'Éducation nationale** (1), **ministère de l'Intérieur et CDSP / Sciences Po** (1).

Réutilisation libre, y compris commerciale, sous trois conditions : mentionner la source, mentionner la date de dernière mise à jour lorsqu'elle est connue, et ne pas altérer le sens de l'information ni induire en erreur sur son interprétation.

- Licence : https://www.etalab.gouv.fr/licence-ouverte-open-licence/
- Conditions Insee : https://www.insee.fr/fr/information/2381863
- Attribution : « Source : Insee », « Source : SSMSI », etc.

### Eurostat — 35 séries

Décision 2011/833/UE de la Commission sur la réutilisation des documents de la Commission. Reproduction et rediffusion autorisées, y compris à des fins commerciales, à condition de citer Eurostat comme source. Toute adaptation doit être signalée de façon visible. L'autorisation ne s'étend pas aux contenus de tiers identifiables comme tels.

- https://ec.europa.eu/eurostat/about-us/policies/copyright
- Attribution : « Source : Eurostat »

### OCDE — 5 séries

Depuis le 1er juillet 2024, la licence par défaut des publications et données de l'OCDE est CC BY 4.0. Une adaptation doit porter la mention « This is an adaptation of an original work by the OECD ».

- https://www.oecd.org/en/about/terms-conditions.html
- Attribution : « Source : OCDE »

### Fonds monétaire international — 2 séries

Le FMI distingue deux régimes. Son **contenu éditorial** ne peut pas être republié hors de ses propres sites. Ses **données statistiques**, en revanche, peuvent être téléchargées, extraites, copiées, dérivées, publiées et distribuées, à condition qu'elles apparaissent fidèlement et avec attribution au FMI comme source. Les deux séries du dépôt relèvent du second régime (base World Economic Outlook).

- https://www.imf.org/en/about/copyright-and-terms
- Attribution : « Source : Fonds monétaire international, World Economic Outlook »

### Our World in Data — 15 séries

OWID place son propre travail de traitement sous CC BY 4.0, et rappelle explicitement que les données de tiers qu'il republie restent soumises à la licence de leur producteur d'origine. **C'est donc toujours la licence amont qui commande**, et c'est elle que porte le champ `source.upstreamLicense`.

- https://ourworldindata.org/faqs

| Producteur amont | Séries | Régime |
| --- | ---: | --- |
| Global Carbon Budget | 3 | CC BY 4.0 |
| Stockholm International Peace Research Institute (SIPRI) | 2 | Conditions SIPRI — voir ci-dessous |
| Feenstra et al., Penn World Table | 1 | CC BY 4.0 |
| Ember | 1 | CC BY 4.0 |
| Nations unies, World Population Prospects | 1 | CC BY 3.0 IGO |
| OIT, estimations modélisées, via Banque mondiale | 1 | CC BY 4.0 (Banque mondiale) |
| Copernicus Climate Change Service | 1 | **à confirmer** |
| The Military Balance (IISS), via Banque mondiale | 1 | **à confirmer** |
| OCDE (2018), Database on Average Effective Retirement Age | 1 | **à confirmer** |
| UNESCO UIS, via Banque mondiale | 1 | **à confirmer** |
| Riley (2005) ; Zijdeman et al. (2015) ; HMD (2025) ; UN WPP (2024) | 1 | **à confirmer** |
| Eurostat, OCDE, FMI et Banque mondiale | 1 | **à confirmer** |

**SIPRI** : réutilisation non commerciale libre avec attribution. Une autorisation écrite est requise pour reproduire directement plus de 10 % d'un jeu de données, et pour tout usage commercial. Les deux séries du dépôt portent sur huit pays et une seule variable, très en deçà de ce seuil. Attribution exigée : « Information from the Stockholm International Peace Research Institute ». https://www.sipri.org/about/terms-and-conditions

**Banque mondiale** : CC BY 4.0 est la licence par défaut des jeux qu'elle produit elle-même ; les jeux provenant de tiers gardent les conditions de leur producteur, ce qui est précisément le cas de l'IISS et de l'UNESCO ci-dessus. https://datacatalog.worldbank.org/public-licenses

### Conseil d'orientation des retraites — 2 séries

Organisme public français. Ses rapports relèvent du régime de réutilisation des documents administratifs, mais le site du COR ne publie pas de licence explicite. **Statut : à confirmer auprès du COR.**

### World Inequality Database (WID.world) — 3 séries

Le site ne publie pas de conditions de réutilisation explicites. La citation académique complète est portée par le champ `source.citation` de chaque série. **Statut : à confirmer auprès du World Inequality Lab.**

## Ce qui reste à confirmer

Huit régimes ne sont pas établis. Tant qu'ils ne le sont pas, les séries concernées sont citées et attribuées, mais leur redistribution n'est couverte par aucune licence identifiée.

| À vérifier | Séries concernées |
| --- | --- |
| Conseil d'orientation des retraites | `demographie/depenses-retraites`, `demographie/ratio-cotisants` |
| World Inequality Database | `climat/empreinte-par-revenu`, `cohesion-sociale/partage-revenus`, `cohesion-sociale/partage-patrimoine` |
| Copernicus Climate Change Service | `climat/temperature-france` |
| The Military Balance (IISS) | `defense/effectifs-armees` |
| OCDE, jeu de 2018 antérieur au passage à CC BY | `demographie/age-effectif-retraite` |
| UNESCO UIS via Banque mondiale | `productivite/depenses-rd` |
| Série composite Riley / Zijdeman / HMD / UN WPP | `demographie/esperance-de-vie` |
| Série composite Eurostat / OCDE / FMI / Banque mondiale | `productivite/pib-par-habitant` |

Pour une série composite, la règle est la plus restrictive des licences en présence.

## Données non redistribuées

Deux fichiers sources sont trop volumineux pour le dépôt et ne sont pas redistribués : l'export complet de la World Inequality Database (68 Mo) et les exports en masse de l'OCDE. Leur adresse exacte et la façon de les obtenir figurent dans le champ `source.howToObtain` des séries concernées. Seul l'extrait des variables réellement utilisées est versionné, dans `data/sources-manuelles/`.

## Signaler un problème de licence

Si vous êtes producteur d'une des sources listées ici et que cette redistribution vous pose problème, ouvrez une issue sur https://github.com/jbernales5/lafrance-enchiffres/issues ou écrivez à l'adresse de contact des mentions légales. La série sera retirée sans discussion le temps de régler la question.

---

Dernière vérification des conditions citées : 20 septembre 2026.
