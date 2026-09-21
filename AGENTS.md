# La France en chiffres — contrat de contribution

Ce document est la référence unique pour qui modifie ce dépôt, humain ou agent. Les autres fichiers en dépendent et n'en répètent pas le contenu :

| Fichier | Ce qu'il contient |
| --- | --- |
| `data/README.md` | le format exact des fichiers de `data/` |
| `DATA-LICENSE.md` | sous quelle licence chaque source est redistribuée |
| `DATASETS.md` | la provenance série par série, et ce qui manque |
| `GOVERNANCE.md` | qui décide quoi, et selon quel critère |
| `docs/CORRECTIONS.md` | comment une erreur est signalée et corrigée |
| `CLAUDE.md` | la carte du code et les pièges d'outillage |

Le site publie des statistiques officielles. Sa valeur tient à une propriété : **tout chiffre affiché est vérifiable chez son producteur, en un clic, par n'importe qui.** Une contribution qui casse cette propriété est refusée, même si elle compile.

## Les règles

1. **Ne fabriquez jamais un nombre.** Pas d'estimation, pas d'interpolation, pas de valeur tirée d'un article, d'un rapport secondaire ou de votre mémoire. Si la donnée n'est pas accessible, le graphe n'est pas déclaré : un graphe déclaré est un graphe dont la donnée est dans le dépôt, et `npm run validate` refuse le contraire.
2. **Écrivez un script, pas un CSV.** Une série s'ajoute avec un script dans `scripts/fetch/` quand la source a une API ou un fichier direct, dans `scripts/manual/` quand elle ne publie qu'un classeur — versionné dans `data/sources-manuelles/`. Le script écrit le `.csv` et le `.meta.json`. Un CSV livré seul est irrecevable.
3. **Donnez la requête exacte** dans `source.downloadUrls` : l'adresse qu'un lecteur peut rejouer telle quelle. Une série calculée comme un ratio en donne plusieurs, numérateur et dénominateur. Quand la source ne publie pas d'adresse directe, l'explication va dans `source.howToObtain` — jamais dans le champ d'URL.
4. **Déclarez la licence.** `source.license` renvoie à une entrée de `data/licenses.json`, décrite dans `DATA-LICENSE.md`. Quand un diffuseur republie la donnée d'un tiers, c'est la licence amont qui commande, et elle va dans `source.upstreamLicense`. Un producteur inconnu du catalogue fait échouer l'écriture de la série.
5. **Un producteur par courbe.** Deux définitions concurrentes se déclarent en `variants`, chacune avec sa source et son `warning`. Ne raccordez jamais deux séries de producteurs différents.
6. **Aucune valeur mesurée dans un texte.** Les champs `lead`, `note`, `cautions`, `subtitle` et `warning` décrivent ce que mesure un graphe — sa définition, son champ, ses limites — et ne rapportent jamais un résultat. Une valeur recopiée devient fausse à la première révision de la source, sans que rien ne le signale. Les chiffres qui définissent l'indicateur (une tranche d'âge, une base d'indice, un seuil conventionnel) restent autorisés.
7. **Ne concluez pas à la place du lecteur** et n'attribuez pas une évolution à une décision. Les repères situent, ils n'expliquent pas.
8. **Pas de nouvelle dépendance d'interface ou de graphes.** Un seul composant de graphe, un seul design system. Une exception se justifie par écrit dans la pull request.
9. **Vérifiez avant de proposer.** `npm run validate && npm run typecheck && npm run build` doivent passer. Pour tout changement visuel, joignez une capture en thème clair et en thème sombre, et vérifiez le rendu sur une largeur de téléphone.
10. **Ne committez pas sans qu'on vous le demande.**

## Ce que la vérification automatique refuse

`npm run validate` s'exécute avant chaque build et à chaque pull request. Il échoue sur :

- un CSV dont l'en-tête n'est pas `period,series,value`, dont une ligne n'a pas trois colonnes, dont une période est hors format, dont une valeur n'est pas un nombre, ou qui contient un doublon ;
- un `.meta.json` sans producteur connu, sans licence déclarée, sans requête, ou dont les libellés de séries ne couvrent pas exactement les codes présents dans le CSV ;
- une fréquence déclarée qui ne correspond pas aux périodes du fichier ;
- un `downloadUrls` qui contient autre chose qu'une adresse ;
- un graphe ou une **variante** dont le fichier de série est déclaré mais absent — une variante qui disparaît en silence ramènerait un graphe à une seule définition ;
- une valeur mesurée dans un texte de catégorie ;
- un CSV présent dans `data/series/` que plus aucune catégorie ne référence.

## Ce qui fait refuser une contribution

- Un chiffre sans source primaire, ou tiré d'une source secondaire : presse, think tank, agrégateur non officiel. Lorsqu'une série passe par un relais comme Our World in Data, le producteur d'origine est nommé dans `source.upstream`.
- Un texte qui conclut (« bilan désastreux », « succès ») ou qui impute une évolution à une décision.
- Une couleur, une icône ou une formulation qui marque un camp.
- Une donnée recopiée à la main depuis un PDF, sans script de reconstruction.
- Une série dont la licence n'autorise pas la redistribution.

## Ajouter une série

```bash
# 1. Trouver la donnée chez le producteur et noter la requête exacte.
# 2. Vérifier sa licence et l'ajouter à data/licenses.json + DATA-LICENSE.md si elle y manque.
# 3. Écrire la récupération :
#      scripts/fetch/<producteur>.mjs    si la source a une API
#      scripts/manual/<producteur>.mjs   si elle ne publie qu'un fichier
# 4. Produire les fichiers :
npm run refresh <producteur>       # ou : npm run manual <producteur>
# 5. Déclarer le graphe dans data/categories/<thème>.json
# 6. Vérifier :
npm run validate && npm run typecheck && npm run build
# 7. Ajouter une ligne dans DATASETS.md
```

Les scripts existants sont les meilleurs modèles : `scripts/fetch/eurostat.mjs` pour une API, `scripts/manual/cor.mjs` pour un classeur. Le socle partagé est dans `scripts/lib/` : il gère l'écriture atomique, la reprise réseau, la normalisation de la source et le refus d'écrire une série qui aurait perdu l'essentiel de ses lignes.

## Ajouter un thème

Un fichier dans `data/categories/`, avec un `order` libre et un `slug` unique. La page, la navigation, la recherche, l'index des sources et les routes de téléchargement en découlent : rien d'autre n'est à déclarer.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
