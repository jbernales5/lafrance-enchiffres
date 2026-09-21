/**
 * Un seul endroit où les nombres prennent leur forme française. Avant, quatre `Intl.NumberFormat`
 * cohabitaient avec des précisions différentes : le même chiffre-clé s'affichait avec une décimale
 * sur l'accueil et deux ailleurs.
 */
const formatters = new Map<number, Intl.NumberFormat>()

function formatter(maximumFractionDigits: number): Intl.NumberFormat {
  let f = formatters.get(maximumFractionDigits)
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", { maximumFractionDigits })
    formatters.set(maximumFractionDigits, f)
  }
  return f
}

/** Une valeur de série, telle qu'elle apparaît dans une infobulle ou un tableau. */
export function formatValue(value: number): string {
  return formatter(2).format(value)
}

/** Le chiffre mis en avant en tête de thème : une décimale suffit et évite la fausse précision. */
export function formatFigure(value: number): string {
  return formatter(1).format(value)
}

/** Des milliards d'euros : la décimale n'apporte rien à cette échelle. */
export function formatBillions(value: number): string {
  return formatter(0).format(value)
}
