import "server-only"

import {
  loadCategories,
  type LoadedCategory,
  type SeriesSource,
} from "@/lib/catalog"

export interface SourceChartRef {
  title: string
  href: string
  category: string
  lastObservation: string
  dataset?: string
  /** Every replayable query of the series, not just the first one. */
  downloadUrls: string[]
  howToObtain?: string
}

export interface UsedSource {
  publisher: string
  /** Distinct upstream producers when the publisher republishes their data. */
  upstream: string[]
  url: string
  datasets: string[]
  /** Licence keys in play for this publisher, upstream ones included. */
  licenses: string[]
  charts: SourceChartRef[]
}

export interface SourcesIndex {
  used: UsedSource[]
  chartCount: number
}

/** Canonical landing page for the publishers whose series point at a query rather than a home page. */
const PUBLISHER_URL: Record<string, string> = {
  Eurostat: "https://ec.europa.eu/eurostat/data/database",
  Insee: "https://www.insee.fr/fr/statistiques",
  "Our World in Data": "https://ourworldindata.org/",
}

/** Everything the site relies on, computed from the catalogue so it can never drift from the charts. */
export function collectSources(
  categories: LoadedCategory[] = loadCategories()
): SourcesIndex {
  const used = new Map<string, UsedSource>()
  let chartCount = 0

  /** Groups a chart (or one of its variants) under its publisher. */
  function addUsed(source: SeriesSource, ref: SourceChartRef) {
    const entry = used.get(source.publisher) ?? {
      publisher: source.publisher,
      upstream: [],
      url: source.url,
      datasets: [],
      licenses: [],
      charts: [],
    }
    if (source.upstream && !entry.upstream.includes(source.upstream))
      entry.upstream.push(source.upstream)
    for (const id of [source.license, source.upstreamLicense])
      if (id && !entry.licenses.includes(id)) entry.licenses.push(id)
    const ds =
      source.dataset ??
      (source.idbanks ? `idbanks ${source.idbanks.join(", ")}` : undefined)
    if (ds)
      for (const d of ds.split(", "))
        if (!entry.datasets.includes(d)) entry.datasets.push(d)
    entry.charts.push(ref)
    used.set(source.publisher, entry)
  }

  for (const cat of categories) {
    for (const chart of cat.charts) {
      chartCount++
      const href = `/${cat.slug}#${chart.id}`
      // Each alternative dataset has its own producer: it must appear in the list too.
      for (const v of chart.loadedVariants) {
        if (!v.meta) continue
        addUsed(v.meta.source, {
          title: `${chart.title} — ${v.label}`,
          href,
          category: cat.short,
          lastObservation: v.meta.lastObservation,
          dataset: v.meta.source.dataset,
          downloadUrls: v.meta.source.downloadUrls,
          howToObtain: v.meta.source.howToObtain,
        })
      }
      if (chart.status === "ready" && chart.meta) {
        addUsed(chart.meta.source, {
          title: chart.title,
          href,
          category: cat.short,
          lastObservation: chart.meta.lastObservation,
          dataset: chart.meta.source.dataset,
          downloadUrls: chart.meta.source.downloadUrls,
          howToObtain: chart.meta.source.howToObtain,
        })
      }
    }
  }

  for (const u of used.values())
    if (PUBLISHER_URL[u.publisher]) u.url = PUBLISHER_URL[u.publisher]

  return {
    used: [...used.values()].sort((a, b) => b.charts.length - a.charts.length),
    chartCount,
  }
}
