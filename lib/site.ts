export const SITE_URL = "https://lafrance.enchiffres.fr"
export const SITE_NAME = "La France en chiffres"
export const SITE_DESCRIPTION =
  "Construisons ensemble un tableau de bord de données neutres et vérifiables"
export const GITHUB_URL = "https://github.com/jbernales5/lafrance-enchiffres"

/**
 * Lien vers un fichier du dépôt. Les chemins sont ceux de la racine du projet : un seul endroit
 * à changer si l'arborescence du dépôt bouge.
 */
export function repoFile(path: string): string {
  return `${GITHUB_URL}/blob/main/${path}`
}

const FRENCH_NUMBERS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
]

/** "neuf" plutôt que "9" dans une phrase ; repasse au chiffre au-delà de douze. */
export function spellOut(n: number): string {
  return FRENCH_NUMBERS[n] ?? String(n)
}
