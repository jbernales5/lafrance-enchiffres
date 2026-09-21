# Le contrat de données

Tout ce que le site affiche vient de ce dossier. Aucune requête réseau n'est faite côté visiteur : les fichiers sont lus au build. `npm run validate` vérifie tout ce qui suit et fait échouer le build en nommant le fichier fautif.

```
data/
  licenses.json                           catalogue des licences, par producteur
  categories/<slug>.json                  un thème : titre, chapô, chiffre-clé, graphes déclarés
  series/<thème>/<graphe>.csv             les valeurs, format long : period,series,value
  series/<thème>/<graphe>.meta.json       provenance, unité, libellés, licence
  series/<SOURCE>-REPORT.md               rapport de la dernière récupération, un par producteur
  sources-manuelles/                      fichiers que relisent les scripts de scripts/manual/
```

## Les valeurs (`.csv`)

En-tête exactement `period,series,value`, puis une ligne par observation.

| colonne | contenu |
| --- | --- |
| `period` | `2024` (annuel), `2024-Q1` (trimestriel), `2024-03` (mensuel). Triable par ordre lexical. |
| `series` | code court, stable, sans accent : un pays (`FRA`, `DEU`, `EU27`, `WLD`…), une déclinaison (`FRA-femmes`, `brut`, `net`), ou une projection (`FRA-projection`). |
| `value` | un nombre, point décimal. Pas de séparateur de milliers, pas de cellule vide : une observation manquante est une ligne absente. |

Un couple `period` + `series` n'apparaît qu'une fois. Le fichier se termine par un saut de ligne et ne commence pas par un BOM.

Codes pays canoniques : `FRA` France, `DEU` Allemagne, `ITA` Italie, `ESP` Espagne, `GBR` Royaume-Uni, `USA` États-Unis, `CHN` Chine, `IND` Inde, `JPN` Japon, `KOR` Corée du Sud, `POL` Pologne, `RUS` Russie, `EU27` Union européenne à vingt-sept, `WLD` Monde, `OCDE` moyenne OCDE. Les codes propres aux sources (Eurostat `FR`, `EU27_2020`, `UK` ; OWID `OWID_WRL`) sont convertis à la récupération, jamais dans l'application.

Le suffixe `-projection` marque le prolongement projeté d'une série observée : il garde la couleur de l'observé et se trace en pointillé. Une projection n'est jamais mêlée à l'observé dans la même série.

## La provenance (`.meta.json`)

```jsonc
{
  "source": {
    "publisher": "Eurostat",              // qui publie le fichier qu'on télécharge — doit figurer dans licenses.json
    "upstream": "Global Carbon Budget",   // facultatif : qui a produit la donnée, si le diffuseur la republie
    "distributor": "data.gouv.fr",        // facultatif : la plateforme par laquelle le fichier transite
    "edition": "Rapport annuel de juin 2026", // facultatif : l'édition, quand les chiffres viennent d'un rapport
    "url": "https://…/view/gov_10dd_edpt1",   // la page de la source, pour le lecteur
    "downloadUrls": ["https://…api…"],    // la ou les requêtes exactes, rejouables telles quelles
    "howToObtain": "…",                   // facultatif : comment obtenir le fichier quand il n'a pas d'adresse directe
    "dataset": "gov_10dd_edpt1",          // facultatif : identifiant du jeu chez le producteur
    "idbanks": ["001688527"],             // facultatif : séries Insee (BDM)
    "codes": ["PR_MD60"],                 // facultatif : codes d'un jeu Melodi
    "citation": "…",                      // facultatif : la citation exigée par le producteur
    "lastUpdated": "2025-11-13",          // facultatif : date de mise à jour chez le producteur, quand il la publie
    "title": "Annual CO₂ emissions",      // facultatif : titre du graphe d'origine chez le diffuseur
    "license": "eurostat",                // clé de data/licenses.json
    "upstreamLicense": "cc-by-4.0"        // obligatoire dès qu'il y a un `upstream` : c'est elle qui commande
  },
  "unit": "% du PIB",
  "frequency": "annual",                  // annual | quarterly | monthly, cohérent avec les périodes du CSV
  "lastObservation": "2025",              // dernière période observée pour la France
  "seriesLabels": { "FRA": "France" },    // exactement les codes présents dans le CSV, ni plus ni moins
  "fetchedAt": "2026-09-20",              // date de la récupération qui a changé le fichier
  "script": "scripts/fetch/eurostat.mjs", // ce qui régénère le fichier
  "notes": "précisions méthodologiques utiles au lecteur, une ou deux phrases"
}
```

`downloadUrls` ne contient que des adresses. Une explication — l'onglet d'un classeur, la pagination d'une API, la façon d'exporter depuis un tableau de bord — va dans `howToObtain`.

`fetchedAt` n'est réécrit que si les valeurs ont changé : un diff sur une série signifie donc que la donnée a bougé, pas seulement qu'on a relancé un script.

## Les thèmes (`categories/*.json`)

Un fichier par thème. `slug` et `order` sont uniques. `lead` et `cautions` décrivent ce que mesurent les graphes et ce qu'ils ne mesurent pas ; ils ne rapportent aucune valeur.

Chaque graphe déclare au minimum un `id` et un `file`. Le reste est facultatif : `perspectives` (quelles séries afficher par vue), `variants` (une définition concurrente, avec sa source et son `warning`), `thresholds`, `zeroBased`, `connectNulls`, `note`, `warning`.

Tout fichier déclaré doit exister : un graphe dont le CSV est absent fait échouer la validation. C'est vrai aussi d'une variante, qui disparaîtrait sinon de la liste des vues sans que personne le voie, ramenant le graphe à une seule définition.

## Les licences (`licenses.json`)

Trois tables : `licenses` (les régimes), `publishers` (qui diffuse sous quel régime) et `upstream` (les producteurs d'origine, quand un diffuseur republie). Chaque série y renvoie par `source.license` et `source.upstreamLicense`. Le détail lisible est dans `DATA-LICENSE.md`, à la racine du dépôt.

Un producteur absent de ce catalogue fait échouer l'écriture de la série : c'est voulu, une donnée redistribuée sans licence identifiée ne doit pas entrer dans le dépôt sans décision.

## Régénérer

```bash
npm run refresh              # tous les scripts de scripts/fetch/ (sources avec une API)
npm run refresh eurostat     # un seul producteur
npm run manual               # tous les scripts de scripts/manual/ (fichiers de sources-manuelles/)
npm run validate             # vérifie le contrat décrit ici
```

Les scripts ne tournent jamais tout seuls : ils sont lancés à la main quand une source publie une nouvelle édition, et les fichiers qu'ils réécrivent sont commités comme n'importe quel autre.

Quand la source ne publie ni API ni fichier stable, le fichier d'entrée est versionné dans `sources-manuelles/` et relu par un script : aucun nombre n'est jamais saisi à la main.
