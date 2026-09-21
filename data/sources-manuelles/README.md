# Sources déposées à la main

Certains producteurs ne publient ni API ni URL de fichier stable : un classeur joint à un rapport, des exports d'un tableau de bord interactif. Les fichiers dont les scripts de `scripts/manual/` ont besoin sont donc versionnés ici, et eux seuls.

Ces fichiers sont des **entrées**, pas des données du site. Les séries affichées restent dans `data/series/`, produites par les scripts à partir d'ici. Aucun chiffre n'est saisi à la main.

## Ce que contient ce dossier

| Fichier | Producteur | Ce qu'on y lit | Script |
| --- | --- | --- | --- |
| `cor-rapport-2026-donnees-partie-2.xlsx` | Conseil d'orientation des retraites | Onglets « Fig 2.2 » et « Fig 2.3 », lignes « Obs » et « Sc. Ref » | `scripts/manual/cor.mjs` |
| `depp-ni-2026-40-pisa.xlsx` | DEPP | Feuilles « Figure 8 web » et « Figure 13 web » | `scripts/manual/pisa.mjs` |
| `pisa-ocde/*.csv` | OCDE | 24 exports du tableau de bord PISA, un par domaine et par pays de comparaison | `scripts/manual/pisa.mjs` |
| `wid-france-extrait.csv` | World Inequality Database | Extrait des quatre variables utilisées, France | `scripts/manual/wid.mjs` |

Les noms de `pisa-ocde/` décrivent leur contenu (`moyenne-maths-deu.csv`), mais les scripts reconnaissent chaque fichier à son **titre interne**, pas à son nom : renommer un export ne casse rien, en déposer un que le script ne reconnaît pas le fait échouer.

## Ce qu'il n'y a pas ici

L'export complet de la World Inequality Database fait 68 Mo et n'est pas redistribué. Pour régénérer l'extrait à partir de lui :

```bash
WID_FULL_EXPORT=/chemin/vers/WID_data_FR.csv npm run manual wid
```

Sans cette variable, `scripts/manual/wid.mjs` lit l'extrait versionné et n'y touche pas.

## Ajouter un fichier

1. Le télécharger depuis la source primaire, sans le modifier.
2. Le déposer ici sous un nom qui dit ce qu'il contient.
3. Écrire le script qui le relit dans `scripts/manual/`, en vérifiant la structure attendue (libellé d'un onglet, en-tête d'une colonne) plutôt qu'en codant des positions en dur.
4. Renseigner `source.howToObtain` dans le `.meta.json` : l'adresse exacte, l'onglet, la ligne.
5. Vérifier que le producteur autorise la redistribution du fichier, et l'inscrire dans `DATA-LICENSE.md` et `data/licenses.json`. `npm run validate` refuse une série dont la licence n'est pas déclarée.
