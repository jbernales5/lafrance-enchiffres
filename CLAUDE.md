# Carte du code et pièges connus

Les règles de contribution sont dans **`AGENTS.md`** : c'est le document normatif, celui-ci ne le répète pas. Le contrat des fichiers de données est dans `data/README.md`.

## Où est quoi

Next 16 App Router, React 19, Tailwind 4, shadcn `base-luma` sur Base UI, Recharts. Tous les chemins partent de la racine du dépôt.

- `app/` — les pages : accueil, `[slug]` par thème, méthode, contribuer, à propos, mentions légales, et `series/` pour le téléchargement d'une série en CSV.
- `components/charts/` — `chart-block.tsx` (l'enveloppe : perspectives, variantes, avertissements, source, plein écran), `time-chart.tsx` (le tracé), `sankey-block.tsx` et `budget-sankey.tsx` (le diagramme budgétaire).
- `components/site/` — en-tête, recherche, dialogues (sources, approche, participation), pied de page.
- `lib/` — `catalog.ts` lit les données au build et met le catalogue en cache ; `mandates.ts` les repères ; `series-colors.ts` les couleurs ; `search.ts` et `search-match.ts` la recherche ; `sources.ts` l'index des sources ; `periods.ts` et `scale.ts` les axes.
- `data/` — `categories/*.json` (structure des pages), `series/**.csv` + `.meta.json` (valeurs et provenance), `series/*-REPORT.md` (rapports de récupération), `licenses.json` (catalogue des licences), `sources-manuelles/` (fichiers que relisent les scripts manuels).
- `scripts/lib/` — socle partagé : écriture atomique, reprise réseau, normalisation de la source.
- `scripts/fetch/*.mjs` — récupération depuis une API ; `npm run refresh` les enchaîne.
- `scripts/manual/*.mjs` — reconstruction depuis un fichier de `data/sources-manuelles/` ; `npm run manual` les enchaîne.
- `scripts/validate.mjs` — le contrat de données, exécuté avant chaque build.

## Points d'attention

- **Un seul composant de graphe**, utilisé aussi en mode `compact` sur l'accueil pour le graphe « héros » de chaque thème, déclaré par `hero`. Le diagramme budgétaire est l'exception : il a son propre rendu, déclaré dans le catalogue par `"type": "sankey"`.
- **Les couleurs suivent l'entité, pas le rang** (`lib/series-colors.ts`) : la France garde toujours la même, une projection garde celle de l'observé et passe en pointillé.
- **Les données sont lues au build, jamais à l'affichage.** `loadCategories()` est mis en cache par requête : ne pas contourner ce cache en relisant les fichiers ailleurs.
- **Recharts est chargé à la demande** et les graphes se montent à l'approche du viewport (`components/lazy-mount.tsx`).
- Mesurer la performance sur `next build && next start`, pas en développement.

## Pièges connus

- L'API SDMX de l'OCDE applique un quota par adresse IP : enchaîner les requêtes déclenche des 429, et des 500 sur des clés qui répondent bien isolément. Ne pas rejouer `oecd.mjs` en boucle.
- ESLint 10 plante dans le plugin React du preset. Ce n'est pas le code du projet : **`npm run validate`, le typecheck et le build font foi.**
- Lancer `next build` pendant qu'un `next dev` tourne corrompt son `.next` : arrêter le serveur, ou accepter de le redémarrer.
- `import()` sur un fichier de `scripts/fetch/` ou `scripts/manual/` **l'exécute** : ce sont des scripts, pas des modules. Pour en vérifier la syntaxe, utiliser `node --check`.

## Commandes

```bash
npm install
npm run dev · npm run validate · npm run typecheck · npm run build · npm run refresh · npm run manual
```
