/**
 * Color follows the entity, never its rank: France is always the same blue, every country
 * keeps its hue whatever the perspective. Non-country series take the validated slots in order.
 *
 * Neuf teintes, plus de pays que cela : quelques-unes sont partagées (KOR avec ESP, RUS avec GBR,
 * POL avec USA). Deux pays qui partagent une couleur ne doivent jamais figurer dans la même
 * perspective ; `npm run validate` le vérifie sur toutes les perspectives déclarées.
 */
export const COUNTRY_COLORS: Record<string, string> = {
  FRA: "var(--series-2)", // bleu
  DEU: "var(--series-3)", // ambre
  ITA: "var(--series-5)", // vert
  ESP: "var(--series-4)", // violet
  GBR: "var(--series-1)", // rose
  USA: "var(--series-6)", // sarcelle
  CHN: "var(--series-7)", // orange
  IND: "var(--series-8)", // brun
  RUS: "var(--series-1)",
  POL: "var(--series-6)",
  KOR: "var(--series-4)",
  JPN: "var(--series-9)", // gris ardoise
  EU27: "var(--series-ref)", // gris foncé, pointillé
  WLD: "var(--series-ref)",
  OCDE: "var(--series-ref)",
}

/**
 * Suffix marking the projected continuation of another series (COR, Insee, Ageing Report).
 * It keeps the hue of the observed series and is drawn dashed: same entity, weaker status.
 */
export const PROJECTION_SUFFIX = "-projection"

export function isProjection(code: string): boolean {
  return code.endsWith(PROJECTION_SUFFIX)
}

/** "FRA-projection" → "FRA". Any other code is returned unchanged. */
export function observedOf(code: string): string {
  return isProjection(code) ? code.slice(0, -PROJECTION_SUFFIX.length) : code
}

/** Series drawn dashed: aggregates used as a reference, not an actor. */
export const DASHED_SERIES = new Set(["EU27", "WLD", "OCDE"])

/** Huit emplacements pour les séries sans pays : le bleu (2) reste à la France. */
const SLOTS = [1, 3, 5, 4, 6, 7, 8, 9].map((n) => `var(--series-${n})`)

/** Country code prefix of a series code such as "DEU-femmes" → "DEU". */
export function countryOf(code: string): string | null {
  const head = observedOf(code).split("-")[0]
  return head in COUNTRY_COLORS ? head : null
}

/** True when every visible series belongs to the same country (or to none). */
export function singleCountry(series: string[]): boolean {
  const countries = new Set(series.map(countryOf).filter(Boolean))
  return countries.size <= 1
}

/** True when the only thing separating the visible series is observed vs projected. */
export function onlyProjectionSplit(series: string[]): boolean {
  return new Set(series.map(observedOf)).size <= 1
}

/**
 * Color follows the entity when several entities are compared. When all the visible series are
 * the same country, the country is not what tells them apart — the category is — so they take
 * the neutral slot order instead of nine shades of the same blue.
 */
export function colorFor(
  code: string,
  index: number,
  series?: string[]
): string {
  // A projection is the same entity as its observed series: same hue, dashed stroke.
  if (isProjection(code) && series) {
    const observed = observedOf(code)
    const at = series.indexOf(observed)
    if (at >= 0) return colorFor(observed, at, series)
  }
  const country = countryOf(code)
  if (!country) return SLOTS[index % SLOTS.length]
  // All series from the same country: the country is not what tells them apart, so use the slots —
  // unless the only split is observed vs projected, which must keep one hue.
  if (series && singleCountry(series) && !onlyProjectionSplit(series))
    return SLOTS[index % SLOTS.length]
  return COUNTRY_COLORS[country]
}

export function isDashed(code: string): boolean {
  const country = countryOf(code)
  return country ? DASHED_SERIES.has(country) : false
}
