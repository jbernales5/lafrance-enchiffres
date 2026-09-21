import "server-only"

import { cache } from "react"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { markerSets, type MarkerSets } from "@/lib/mandates"
import type { Frequency } from "@/lib/periods"

const DATA_DIR = join(process.cwd(), "data")

export type ChartType = "line" | "area" | "bar" | "sankey"

/**
 * A view key. "france", "europe" and "monde" have default labels; any other key
 * (a crime category, a social-protection risk…) needs its own `perspectiveLabels` entry.
 */
export type Perspective = string

export interface ChartSpec {
  /** Stable id, used in permalinks: /finances-publiques#dette */
  id: string
  title: string
  /** One line under the title when the title alone is ambiguous (units are in the footer). */
  subtitle?: string
  /** "finances-publiques/dette-europe" → data/series/finances-publiques/dette-europe.csv */
  file: string
  type?: ChartType
  /** Series codes shown for each perspective. Absent → all series, no toggle. */
  perspectives?: Partial<Record<Perspective, string[]>>
  /** Custom labels for the perspective toggle when the split is not geographic (e.g. "Par sexe"). */
  perspectiveLabels?: Partial<Record<Perspective, string>>
  /** Label of the chart's own file in the toggle, when it has variants but no perspective. */
  baseLabel?: string
  /** Horizontal reference lines (thresholds). */
  thresholds?: { value: number; label: string }[]
  /** Force the y axis to include zero. */
  zeroBased?: boolean
  /** Join the dots across gaps: for series observed only at irregular dates (elections, censuses). */
  connectNulls?: boolean
  /** Short plain-language note shown under the chart (why this indicator, what to watch). */
  note?: string
  /** Shown as a banner above the chart: a break in the series, a definition that shifts. */
  warning?: string
  /**
   * Alternative datasets from another producer, offered next to the perspectives.
   * They keep their own source, unit and download: the site never mixes two producers in one curve.
   */
  variants?: ChartVariant[]
  /**
   * Sankey only: the projected year shown next to the measured one. The file is often absent —
   * a forecast is a government scenario, and the chart says so rather than inventing it.
   */
  forecast?: {
    year: string
    file: string
    sources: { name: string; url: string; what: string }[]
  }
}

export interface ChartVariant {
  /** Stable id, also accepted in the ?vue= parameter. */
  id: string
  label: string
  /** Replaces the chart subtitle while the variant is active: the definition is not the same. */
  subtitle?: string
  /** "finances-publiques/dette-monde" → data/series/finances-publiques/dette-monde.csv */
  file: string
  /** Series to draw; defaults to every series in the file. */
  series?: string[]
  /** Shown as a banner while the variant is active: says the source and the definition change. */
  warning?: string
  note?: string
  thresholds?: { value: number; label: string }[]
}

export interface CategorySpec {
  slug: string
  order: number
  title: string
  /** Short label for navigation. */
  short: string
  /** Three factual lines. */
  lead: string
  /**
   * Chart whose latest France value becomes the category key figure.
   * `unit` is a short unit shown next to the figure (defaults to the series unit).
   */
  keyFigure?: { chart: string; label: string; series?: string; unit?: string }
  cautions: string[]
  /** Chart shown on the home page for this category, and the perspective it opens on. */
  hero?: { chart: string; perspective?: Perspective }
  charts: ChartSpec[]
}

/** One entry of `data/licenses.json`. */
export interface License {
  name: string
  url: string | null
  status: "ouverte" | "attribution" | "restreinte" | "a-confirmer"
  summary: string
  attribution?: string
  verifiedAt: string | null
  verifiedFrom?: string
}

export interface SeriesSource {
  /** Who publishes the file we download. */
  publisher: string
  /** Who produced the data, when the publisher republishes it. */
  upstream?: string
  /** Platform the file transits through (data.gouv.fr…), when it is neither of the two. */
  distributor?: string
  /** Edition of a report, when the figures come from one (COR, DEPP…). */
  edition?: string
  url: string
  /** Exact, replayable queries. Several when the series combines datasets (a ratio, a panel). */
  downloadUrls: string[]
  /** How to get the file by hand, when the producer publishes no direct URL. */
  howToObtain?: string
  dataset?: string
  idbanks?: string[]
  codes?: string[]
  citation?: string
  /** Date the producer last updated the data, when it says so. */
  lastUpdated?: string
  /** Title of the original chart at the publisher. */
  title?: string
  /** Key in data/licenses.json. */
  license: string
  /** Licence of the upstream producer, which is the one that governs redistribution. */
  upstreamLicense?: string
}

export interface SeriesMeta {
  source: SeriesSource
  unit: string
  frequency: Frequency
  lastObservation: string
  seriesLabels: Record<string, string>
  fetchedAt: string
  script: string
  notes?: string
}

export interface SeriesRow {
  period: string
  series: string
  value: number
}

export interface LoadedDataset {
  status: "ready" | "pending"
  meta: SeriesMeta | null
  rows: SeriesRow[]
  /** Series codes present in the data, in order of first appearance. */
  seriesCodes: string[]
  /** Mandate and world-event markers positioned on this dataset's own periods. */
  markers: MarkerSets
  /** Periods missing inside the observed range, so the chart can say so instead of drawing through. */
  gaps: string[]
}

export interface LoadedVariant extends ChartVariant, LoadedDataset {}

export interface LoadedChart extends ChartSpec, LoadedDataset {
  loadedVariants: LoadedVariant[]
  /** Sankey only: the forecast dataset when its file is in the repo. */
  loadedForecast?: LoadedDataset
}

export interface LoadedCategory extends Omit<CategorySpec, "charts"> {
  charts: LoadedChart[]
  keyFigureValue?: {
    value: number
    period: string
    unit: string
    label: string
  }
  readyCount: number
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

const CSV_HEADER = "period,series,value"

/**
 * Reads one series file. Anything that does not match the contract throws: a silent skip would
 * turn a corrupt file into a chart that simply says "data to be integrated", which is the one
 * thing this project cannot afford. `npm run validate` catches these before the build.
 */
function readSeriesCsv(path: string): SeriesRow[] {
  const text = readFileSync(path, "utf8")
  const lines = text.split(/\r?\n/).filter(Boolean)
  const header = lines[0]
  if (header !== CSV_HEADER) {
    throw new Error(
      `${path} : en-tête « ${header} », attendu « ${CSV_HEADER} »`
    )
  }
  const rows: SeriesRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",")
    if (cells.length !== 3)
      throw new Error(
        `${path} ligne ${i + 1} : ${cells.length} colonnes au lieu de 3`
      )
    const [period, series, value] = cells
    const v = Number(value)
    if (!period || !series || value === "" || !Number.isFinite(v)) {
      throw new Error(
        `${path} ligne ${i + 1} : « ${lines[i]} » ne respecte pas le contrat`
      )
    }
    rows.push({ period, series, value: v })
  }
  return rows
}

const EMPTY_MARKERS: MarkerSets = { mandats: [], evenements: [] }

/**
 * Années sans observation à l'intérieur de la plage d'une série, calculées **série par série** :
 * un trou dans la courbe française reste un trou même si un autre pays publie cette année-là.
 *
 * Les séries à pas irrégulier — élections, recensements, cycles PISA — ont par construction plus
 * d'années absentes que présentes : elles n'ont pas de trou à signaler, et sont laissées de côté.
 */
function findGaps(rows: SeriesRow[], frequency: Frequency): string[] {
  if (frequency !== "annual" || rows.length < 4) return []
  const byCode = new Map<string, number[]>()
  for (const r of rows) {
    const year = Number(r.period.slice(0, 4))
    const list = byCode.get(r.series)
    if (list) list.push(year)
    else byCode.set(r.series, [year])
  }
  const missing = new Set<number>()
  for (const years of byCode.values()) {
    const sorted = [...new Set(years)].sort((a, b) => a - b)
    if (sorted.length < 4) continue
    const holes: number[] = []
    for (let y = sorted[0]; y <= sorted[sorted.length - 1]; y++)
      if (!sorted.includes(y)) holes.push(y)
    if (holes.length > sorted.length) continue
    for (const h of holes) missing.add(h)
  }
  return [...missing].sort((a, b) => a - b).map(String)
}

/**
 * Reads one `data/series/<file>.{csv,meta.json}` pair. A declared file must exist:
 * `npm run validate` refuses the contrary before the build, so the fallback below is a
 * safety net for development, not a state the site can publish.
 */
function readDataset(file: string): LoadedDataset {
  const csv = join(DATA_DIR, "series", `${file}.csv`)
  const metaPath = join(DATA_DIR, "series", `${file}.meta.json`)
  if (!existsSync(csv) || !existsSync(metaPath)) {
    return {
      status: "pending",
      meta: existsSync(metaPath) ? readJson<SeriesMeta>(metaPath) : null,
      rows: [],
      seriesCodes: [],
      markers: EMPTY_MARKERS,
      gaps: [],
    }
  }
  const rows = readSeriesCsv(csv)
  const meta = readJson<SeriesMeta>(metaPath)
  const seriesCodes: string[] = []
  for (const r of rows)
    if (!seriesCodes.includes(r.series)) seriesCodes.push(r.series)
  const periods = [...new Set(rows.map((r) => r.period))]
  const markers = rows.length
    ? markerSets(periods, meta.frequency)
    : EMPTY_MARKERS
  return {
    status: rows.length ? "ready" : "pending",
    meta,
    rows,
    seriesCodes,
    markers,
    gaps: rows.length ? findGaps(rows, meta.frequency) : [],
  }
}

export function loadChart(spec: ChartSpec): LoadedChart {
  const base = readDataset(spec.file)
  const loadedVariants = (spec.variants ?? [])
    .map((v) => ({ ...v, ...readDataset(v.file) }))
    .filter((v) => v.status === "ready")
  const forecast = spec.forecast ? readDataset(spec.forecast.file) : undefined
  return {
    ...spec,
    ...base,
    loadedVariants,
    ...(forecast?.status === "ready" ? { loadedForecast: forecast } : {}),
  }
}

/**
 * The whole catalogue, read once per request. Without the cache, every page rebuilds it several
 * times over (the page itself, its metadata, the header's search and sources indexes).
 */
export const loadCategories = cache(
  function loadCategories(): LoadedCategory[] {
    const dir = join(DATA_DIR, "categories")
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"))
    return files
      .map((f) => readJson<CategorySpec>(join(dir, f)))
      .sort((a, b) => a.order - b.order)
      .map((cat) => {
        const charts = cat.charts.map(loadChart)
        const kf = cat.keyFigure
        let keyFigureValue: LoadedCategory["keyFigureValue"]
        if (kf) {
          const chart = charts.find((c) => c.id === kf.chart)
          const code =
            kf.series ??
            (chart?.seriesCodes.includes("FRA") ? "FRA" : chart?.seriesCodes[0])
          const last = chart?.rows
            .filter((r) => r.series === code)
            .sort((a, b) => a.period.localeCompare(b.period))
            .at(-1)
          if (chart?.meta && last) {
            keyFigureValue = {
              value: last.value,
              period: last.period,
              unit: kf.unit ?? chart.meta.unit,
              label: kf.label,
            }
          }
        }
        return {
          ...cat,
          charts,
          keyFigureValue,
          readyCount: charts.filter((c) => c.status === "ready").length,
        }
      })
  }
)

export const licenses = cache(function licenses(): Record<string, License> {
  return readJson<{ licenses: Record<string, License> }>(
    join(DATA_DIR, "licenses.json")
  ).licenses
})

/** Licence governing redistribution: the upstream one when the publisher republishes. */
export function effectiveLicense(source: SeriesSource): {
  id: string
  license: License | undefined
} {
  const id = source.upstreamLicense ?? source.license
  return { id, license: licenses()[id] }
}

export function loadCategory(slug: string): LoadedCategory | undefined {
  return loadCategories().find((c) => c.slug === slug)
}

export function categorySlugs(): string[] {
  return loadCategories().map((c) => c.slug)
}

/** A chart by its category slug and id, for the pages that show one outside its own theme. */
export function findChart(
  categorySlug: string,
  chartId: string
): { category: LoadedCategory; chart: LoadedChart } | undefined {
  const category = loadCategory(categorySlug)
  const chart = category?.charts.find((c) => c.id === chartId)
  return category && chart ? { category, chart } : undefined
}
