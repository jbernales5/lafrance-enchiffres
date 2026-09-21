import { periodForYear, type Frequency } from "@/lib/periods"

/**
 * Starts of presidential terms shown as vertical markers on every time chart.
 * Dates are the inaugurations; the marker sits on the period containing the date.
 * The list starts in 1995, which is where the deepest series of the site begin to be comparable.
 */
export const MANDATES = [
  { start: "1995-05-17", label: "Chirac" },
  { start: "2002-05-16", label: "Chirac II" },
  { start: "2007-05-16", label: "Sarkozy" },
  { start: "2012-05-15", label: "Hollande" },
  { start: "2017-05-14", label: "Macron" },
  { start: "2022-05-14", label: "Macron II" },
] as const

/**
 * Macro shocks that hit every European economy at once, as periods (start → end).
 * Bounds are conventional and documented on the Méthode page, with the dating authority named:
 * two of them are dated on American references, which is stated rather than hidden.
 */
export const WORLD_EVENTS = [
  {
    start: "1992-10-01",
    end: "1993-12-31",
    label: "Récession 1993",
    why: "Crise du système monétaire européen ; le PIB français recule en 1993.",
  },
  {
    start: "2000-03-01",
    end: "2002-10-31",
    label: "Bulle internet",
    why: "Du pic du Nasdaq (mars 2000) à son point bas (octobre 2002) : bornes américaines, faute de datation européenne équivalente.",
  },
  {
    start: "2008-09-15",
    end: "2009-06-30",
    label: "Crise financière",
    why: "De la faillite de Lehman Brothers à la fin de la récession datée par le NBER (juin 2009). Le CEPR date la fin de la récession de la zone euro au deuxième trimestre 2009.",
  },
  {
    start: "2010-05-01",
    end: "2012-09-30",
    label: "Crise de l'euro",
    why: "Du premier plan d'aide à la Grèce au « whatever it takes » et au programme OMT de la BCE.",
  },
  {
    start: "2020-03-17",
    end: "2021-06-30",
    label: "Covid-19",
    why: "Du premier confinement à la levée des principales restrictions sanitaires.",
  },
  {
    start: "2022-02-24",
    end: "2023-12-31",
    label: "Choc énergétique",
    why: "De l'invasion de l'Ukraine au reflux de l'inflation dans la zone euro.",
  },
] as const

export type MarkerSet = "mandats" | "evenements"

export interface MandateMarker {
  period: string
  /** Last period of the zone, for events drawn as shaded areas. */
  endPeriod?: string
  label: string
  kind: MarkerSet
}

function toPeriod(date: string, frequency: Frequency): string {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  if (frequency === "quarterly") return `${year}-Q${Math.ceil(month / 3)}`
  if (frequency === "monthly")
    return `${year}-${String(month).padStart(2, "0")}`
  return periodForYear(year, frequency)
}

/** Nearest chart period at or after `period`, or undefined when out of range. */
function snap(
  period: string,
  sorted: string[],
  from: "start" | "end"
): string | undefined {
  if (from === "start") return sorted.find((p) => p >= period)
  const before = sorted.filter((p) => p <= period)
  return before.at(-1)
}

/**
 * Markers positioned on the x-axis periods of a chart. A term whose exact period is missing —
 * a series observed every three or four years, like PISA — is snapped to the next period on the
 * axis rather than dropped: a marker that disappears in silence reads as a term that never happened.
 * Terms outside the chart range are left out.
 */
export function mandateMarkers(
  periods: string[],
  frequency: Frequency
): MandateMarker[] {
  const sorted = [...periods].sort()
  if (!sorted.length) return []
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const out: MandateMarker[] = []
  const used = new Set<string>()
  for (const m of MANDATES) {
    const wanted = toPeriod(m.start, frequency)
    if (wanted < first || wanted > last) continue
    const period = snap(wanted, sorted, "start")
    // Deux investitures qui tomberaient sur la même période tracée feraient deux traits confondus.
    if (!period || used.has(period)) continue
    used.add(period)
    out.push({ period, label: m.label, kind: "mandats" })
  }
  return out
}

/** Event zones clipped to the chart range; an event entirely outside the range is dropped. */
export function eventMarkers(
  periods: string[],
  frequency: Frequency
): MandateMarker[] {
  const sorted = [...periods].sort()
  if (!sorted.length) return []
  const out: MandateMarker[] = []
  for (const e of WORLD_EVENTS) {
    const start = toPeriod(e.start, frequency)
    const end = toPeriod(e.end, frequency)
    if (end < sorted[0] || start > sorted[sorted.length - 1]) continue
    const p = snap(start, sorted, "start")
    const q = snap(end, sorted, "end")
    if (!p || !q || q < p) continue
    out.push({ period: p, endPeriod: q, label: e.label, kind: "evenements" })
  }
  return out
}

export type MarkerSets = Record<MarkerSet, MandateMarker[]>

/** Both marker sets for a chart, computed once on the server. */
export function markerSets(
  periods: string[],
  frequency: Frequency
): MarkerSets {
  return {
    mandats: mandateMarkers(periods, frequency),
    evenements: eventMarkers(periods, frequency),
  }
}
