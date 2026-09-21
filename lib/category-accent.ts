/**
 * Une couleur par thème, prise dans les jetons de séries déjà validés pour les daltonismes.
 * Le même thème porte la même teinte sur la bande d'accueil et en fond de sa page : elle est
 * dérivée de `order`, pas de la position dans une liste, pour que les deux ne puissent pas diverger.
 */
const ACCENTS = [
  "--series-2", // bleu
  "--series-1", // rose
  "--series-5", // vert
  "--series-4", // violet
  "--series-8", // brun
  "--series-3", // ambre
  "--series-6", // sarcelle
  "--series-7", // orange
  "--series-9", // gris ardoise
] as const

export function accentFor(order: number): string {
  const index = (Math.max(1, Math.round(order)) - 1) % ACCENTS.length
  return ACCENTS[index]
}
