# Corriger une erreur

Voici la procédure à suivre pour apporter une correction à une erreur.

## Signaler

Ouvrez une issue avec le modèle « Erreur de donnée ». Il demande trois choses : le graphe, ce qui est affiché, et ce que dit la source.

Si vous ne pouvez pas ouvrir d'issue, l'adresse de contact est dans les mentions légales du site.

## Ce qui est traité comme une erreur

- Une valeur qui ne correspond pas à ce que publie la source.
- Une unité, un champ géographique ou une période mal décrits.
- Une source mal citée, un lien mort, une licence mal attribuée.
- Un texte qui tire une conclusion ou attribue une évolution à une décision.
- Une page inutilisable au clavier ou avec un lecteur d'écran.

Un désaccord sur le **choix** d'un indicateur n'est pas une erreur : il relève du modèle « Désaccord de méthode » et de `GOVERNANCE.md`.

## Ce qui se passe ensuite

1. La valeur est vérifiée à la source. Si l'erreur est confirmée, l'issue est étiquetée `erreur`.
2. La correction passe par le script qui produit la série, jamais par une retouche du CSV. Si la source elle-même s'est trompée et l'a corrigée depuis, un simple rafraîchissement suffit.
3. Le commit porte le préfixe `fix(data):` et cite l'issue, pour que l'historique se lise.
4. L'issue est fermée avec le commit en référence. Elle reste consultable.

Une erreur qui fausse la lecture d'un graphe est traitée en priorité sur tout le reste. Si la vérification prend du temps, le graphe peut être retiré en attendant plutôt que laissé en ligne.

## Révisions des sources

Une valeur qui change parce que le producteur a révisé sa série n'est pas une erreur du site. Les comptes nationaux sont semi-définitifs pendant environ trois ans, les projections changent à chaque édition, et certaines séries sont rebasées. Le champ `fetchedAt` de chaque série dit quand elle a été récupérée, et `source.lastUpdated` quand le producteur l'a mise à jour, lorsqu'il le publie.

Un rafraîchissement qui ne change aucune valeur ne change pas non plus `fetchedAt` : un diff sur une série veut donc dire que la donnée a bougé.

## Historique

Tout est dans l'historique Git : chaque série est un fichier texte, et son diff se lit ligne à ligne. Un commit `fix(data):` cite l'issue qui l'a déclenché.
