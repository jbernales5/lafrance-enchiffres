# Gouvernance

## Qui décide

Le projet est maintenu par une seule personne, Jonathan Bernales. Il n'y a ni comité, ni vote, ni financement. C'est une limite réelle, et elle est écrite ici plutôt que sous-entendue : le choix des thèmes et des indicateurs est le fait d'une personne.

Ce que cette personne s'interdit est en revanche vérifiable par tout le monde, parce que c'est automatisé : aucune donnée saisie à la main, aucune valeur mesurée dans un texte, aucune série sans requête rejouable ni licence déclarée. `npm run validate` refuse le contraire, et la CI refuse la pull request.

## Comment une proposition est tranchée

Pour **ajouter une série**, une seule question : existe-t-il un producteur primaire qui publie cette donnée, sous une licence qui en autorise la redistribution ? Si oui, elle est recevable. Si non, le graphe reste « à intégrer » avec la page exacte où chercher.

Pour **remplacer une série par une autre**, la réponse par défaut est non : quand deux définitions se disputent la lecture, elles sont proposées côte à côte comme variantes, chacune avec sa source et son avertissement. Remplacer, c'est trancher à la place du lecteur.

Pour **retirer une série**, il faut une raison tenant à la donnée : le producteur l'a retirée, la licence ne permet pas la redistribution, ou la série n'est plus comparable à elle-même. Le désaccord avec ce qu'elle montre n'est pas une raison.

## Ce qui n'est pas négociable

- Une valeur affichée vient d'un fichier du dépôt, produit par un script, depuis une source primaire.
- Un texte décrit ce que mesure un graphe ; il n'en tire pas de conclusion et n'attribue pas une évolution à une décision.
- Deux producteurs ne sont jamais raccordés dans une même courbe.
- Une série redistribuée a une licence identifiée. À défaut, elle est marquée comme telle dans `DATA-LICENSE.md` en attendant d'être confirmée.

## Désaccords

Un désaccord de méthode s'ouvre en issue avec le modèle prévu. Il se tranche en public. Si le mainteneur refuse, il dit pourquoi dans l'issue, et l'issue reste ouverte à la lecture.

Un désaccord sur une valeur ne se tranche pas : il se vérifie à la source, et la correction suit la procédure de `docs/CORRECTIONS.md`.

## Si le projet change de mains

Le code est sous licence MIT et les données restent chez leurs producteurs : le site est reproductible par quiconque clone le dépôt. Si la maintenance s'arrête, ce document sera mis à jour pour le dire, plutôt que de laisser un site se périmer en silence.
