# Contribuer

Une règle commande toutes les autres : **chaque chiffre affiché vient d'une source primaire, est dans un fichier du dépôt, et peut être retéléchargé par n'importe qui.**

Les règles complètes sont dans [`AGENTS.md`](AGENTS.md), qui vaut pour les humains comme pour les agents. Ce fichier dit par où commencer. Les échanges sont régis par le [code de conduite](CODE_OF_CONDUCT.md).

## Par où commencer

| Vous voulez… | Allez à |
| --- | --- |
| signaler une valeur fausse | une issue « Erreur de donnée » — voir [`docs/CORRECTIONS.md`](docs/CORRECTIONS.md) |
| contester un choix d'indicateur | une issue « Désaccord de méthode » — voir [`GOVERNANCE.md`](GOVERNANCE.md) |
| proposer une donnée qui manque | une issue « Donnée manquante », ou directement une pull request |
| ajouter ou mettre à jour une série | la section ci-dessous |
| changer l'affichage | la section « Modifier le site » |

## Ajouter ou mettre à jour une donnée

Branche : `data/<nom-du-jeu>`.

1. **Trouver la source primaire** et noter la requête exacte — l'adresse qui rend le fichier, pas la page d'accueil du producteur.
2. **Vérifier la licence.** Si le producteur n'est pas déjà dans `data/licenses.json`, ajoutez-y son régime de réutilisation et décrivez-le dans `DATA-LICENSE.md`. Sans cela, la série ne peut pas être écrite.
3. **Écrire la récupération.** Si la source a une API ou un fichier direct : `scripts/fetch/<source>.mjs` (modèles : `eurostat.mjs`, `insee.mjs`, `owid.mjs`). Sinon, déposez le fichier dans `data/sources-manuelles/` et écrivez un script dans `scripts/manual/` qui le relit (modèles : `cor.mjs`, `wid.mjs`). On ne saisit jamais un nombre à la main.
4. **Produire les fichiers** avec `npm run refresh <source>` ou `npm run manual <source>`. Le format du CSV et le schéma des métadonnées sont décrits dans [`data/README.md`](data/README.md).
5. **Déclarer le graphe** dans `data/categories/<slug>.json`.
6. **Ajouter une ligne** dans [`DATASETS.md`](DATASETS.md).
7. **Vérifier** : `npm run validate && npm run typecheck && npm run build`.

La relecture porte sur la source, la licence et le format. Pas sur l'opinion.

## Modifier le site

Branche : `feat/<nom>` ou `fix/<nom>`.

```bash
npm install
npm run dev          # http://localhost:3000
npm run validate     # le contrat de données
npm run typecheck
npm run build        # ce que Vercel exécutera
npm run format       # Prettier, exigé par la CI
```

Ce qui ne se négocie pas sans raison écrite dans la pull request :

- Un seul composant de graphe (`components/charts/chart-block.tsx`). Le diagramme budgétaire est la seule exception, déclarée dans le catalogue par `"type": "sankey"`.
- Les repères de mandat viennent d'un seul tableau (`lib/mandates.ts`), en pointillés, sans couleur politique.
- La France garde toujours la même couleur, chaque pays aussi (`lib/series-colors.ts`). L'ordre des teintes a été validé pour les daltonismes : ne pas le changer sans le revalider.
- Aucun texte sous douze pixels. Thème clair et sombre par les jetons du design system. Pas de zoom ni de glisser sur les graphes.
- La performance se mesure sur `npm run build && npm start`, jamais en mode développement.

## Ce qui n'est pas encore testé

Il n'y a pas de tests automatisés. `npm run validate` couvre le contrat de données — c'est le risque principal, celui d'une donnée fausse ou silencieusement perdue — mais rien ne couvre la non-régression du code. Les zones sensibles, si vous y touchez, méritent une vérification manuelle attentive :

- `lib/catalog.ts` : lecture des fichiers, calcul du statut d'un graphe, résolution du chiffre-clé affiché en tête de thème.
- `lib/search-match.ts` : normalisation des accents et des indices Unicode, score et tri.
- `lib/mandates.ts` : calage des repères sur les périodes d'un graphe, découpage des zones d'événement.
- `lib/series-colors.ts` : l'invariant « deux pays partageant une couleur ne coexistent jamais dans une perspective » n'est vérifié par rien.
- `lib/scale.ts` : choix du pas et génération des graduations.
- `components/charts/budget-sankey.tsx` : arithmétique d'indices des nœuds et des liens, où une erreur relierait silencieusement les mauvais postes budgétaires.

Une pull request qui ajoute des tests sur l'un de ces points est la bienvenue.

## Conventions

- Commits à l'impératif, courts. Une pull request, un sujet.
- `fix(data):` pour une correction de valeur affichée, avec l'issue en référence : l'historique doit se lire.
- Les fichiers générés ne sont pas commités (`.next`, `node_modules`). Les CSV et les `.meta.json`, eux, le sont : ce sont les données du site.
- Une capture avant/après pour tout changement visuel, en thème clair et en thème sombre.
