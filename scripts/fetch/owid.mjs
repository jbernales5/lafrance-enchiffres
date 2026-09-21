// Our World in Data -> data/series/<category>/<chart>.{csv,meta.json}
// Usage: node scripts/fetch/owid.mjs   (from webapp-v2). Node >= 20, no dependencies. Idempotent.
//
// Every value comes from the OWID grapher CSV export; nothing is typed by hand.
// `tab=line&time=earliest..latest` forces the full time range: without it, charts whose default
// tab is a map only export the currently displayed year for every country.
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { COUNTRY_LABELS, OWID_CODE, SERIES_DIR, fetchText, parseCsv, round, today, writeSeries } from "../lib/series.mjs"

const GRAPHER = "https://ourworldindata.org/grapher"
const SCRIPT = "scripts/fetch/owid.mjs"
const PANEL_G7 = ["FRA", "DEU", "ITA", "ESP", "GBR", "USA"]
const PANEL_CO2 = [...PANEL_G7, "CHN", "IND", "OWID_WRL"]
const PANEL_ELEC = ["FRA", "DEU", "ITA", "ESP", "GBR", "POL", "USA", "CHN", "IND", "JPN"]
const PANEL_DEF = ["FRA", "DEU", "GBR", "ITA", "POL", "USA", "RUS", "CHN"]

/**
 * One entry per chart. `slugs` are tried in order (first that downloads wins).
 * `scale` divides raw values, `decimals` rounds after scaling (both optional; default = raw value).
 * `columns` maps CSV value columns to series codes (default: one value column -> country code).
 * `sex` builds one series per country and per slug (`<ISO3>-hommes` / `<ISO3>-femmes`).
 * `annualMean` computes the yearly mean from monthly rows (only complete years).
 */
const CHARTS = [
  {
    category: "climat", chart: "co2-par-habitant", slugs: ["co-emissions-per-capita"],
    countries: PANEL_CO2, start: 1990, unit: "t CO₂ par habitant",
    notes: "Émissions territoriales de CO₂ issues des énergies fossiles et de l'industrie (hors changement d'affectation des sols), rapportées à la population.",
  },
  {
    category: "climat", chart: "co2-territorial-vs-empreinte", slugs: ["prod-cons-co2-per-capita"],
    countries: ["FRA"], start: 1990, unit: "t CO₂ par habitant",
    columns: { emissions_total_per_capita: "territorial", consumption_emissions_per_capita: "empreinte" },
    seriesLabels: { territorial: "Territorial (production)", empreinte: "Empreinte (consommation)" },
    franceOnly: true,
    notes: "Compare les émissions produites sur le territoire français aux émissions liées à la consommation des Français (importations incluses, exportations déduites), par habitant.",
  },
  {
    category: "climat", chart: "co2-total", slugs: ["annual-co2-emissions-per-country"],
    countries: PANEL_CO2, start: 1990, unit: "Mt CO₂", scale: 1e6, decimals: 2,
    notes: "Émissions annuelles territoriales de CO₂ issues des énergies fossiles et de l'industrie, en millions de tonnes.",
  },
  {
    category: "climat", chart: "intensite-carbone-electricite", slugs: ["carbon-intensity-electricity"],
    countries: PANEL_ELEC, start: 2000, unit: "g CO₂ par kWh",
    notes: "Grammes de CO₂ émis pour produire un kilowattheure d'électricité, sur l'ensemble du cycle de vie des installations (source Ember).",
  },
  {
    category: "productivite", chart: "pib-par-habitant", slugs: ["gdp-per-capita-worldbank"],
    countries: [...PANEL_G7, "CHN", "JPN", "IND"], start: 1990, unit: "$ internationaux, PPA, prix constants",
    notes: "PIB par habitant corrigé de l'inflation et des différences de coût de la vie entre pays (parité de pouvoir d'achat), d'après la Banque mondiale.",
  },
  {
    category: "productivite", chart: "productivite-horaire", slugs: ["labor-productivity-per-hour-pennworldtable"],
    countries: [...PANEL_G7, "CHN", "JPN", "KOR"], start: 1990, unit: "$ par heure travaillée, PPA",
    notes: "PIB divisé par le nombre total d'heures travaillées dans l'économie, en dollars internationaux à prix constants (Penn World Table).",
  },
  {
    category: "productivite", chart: "chomage-monde", slugs: ["unemployment-rate"],
    countries: ["FRA", "USA", "JPN", "GBR", "CHN"], start: 1991, unit: "% de la population active",
    notes: "Estimations modélisées de l'Organisation internationale du travail, diffusées par la Banque mondiale : ce ne sont pas les enquêtes emploi nationales, et les niveaux ne sont pas directement comparables à la série trimestrielle de l'Insee.",
  },
  {
    category: "productivite", chart: "depenses-rd", slugs: ["research-spending-gdp"],
    countries: [...PANEL_G7, "KOR", "CHN"], start: 1996, unit: "% du PIB",
    notes: "Dépenses intérieures brutes de recherche et développement (publiques et privées) rapportées au PIB.",
  },
  {
    category: "demographie", chart: "fecondite", slugs: ["children-per-woman-un"],
    countries: [...PANEL_G7, "KOR", "OWID_WRL"], start: 1960, unit: "enfants par femme",
    notes: "Indice conjoncturel de fécondité : nombre moyen d'enfants qu'aurait une femme au cours de sa vie aux taux de fécondité par âge de l'année (estimations ONU).",
  },
  {
    category: "demographie", chart: "esperance-de-vie", slugs: ["life-expectancy"],
    countries: [...PANEL_G7, "CHN", "JPN", "IND"], start: 1950, unit: "années",
    notes: "Espérance de vie à la naissance : nombre moyen d'années qu'un nouveau-né vivrait si les conditions de mortalité de l'année restaient inchangées.",
  },
  {
    category: "demographie", chart: "age-effectif-retraite",
    slugs: [], sex: { hommes: ["average-effective-age-of-retirement-men", "average-effective-retirement-men"], femmes: ["average-effective-age-of-retirement-women", "average-effective-retirement-women"] },
    countries: PANEL_G7, start: 2000, unit: "années",
    notes: "Âge moyen effectif de sortie du marché du travail, estimé par l'OCDE à partir des variations des taux d'activité par âge sur cinq ans, hommes et femmes séparément.",
  },
  {
    category: "defense", chart: "depenses-militaires-pib", slugs: ["military-expenditure-share-gdp"],
    countries: PANEL_DEF, start: 1960, unit: "% du PIB",
    notes: "Dépenses militaires totales rapportées au produit intérieur brut, d'après le SIPRI.",
  },
  {
    category: "defense", chart: "depenses-militaires-usd", slugs: ["military-spending-sipri", "military-expenditure-total", "military-expenditure"],
    countries: PANEL_DEF, start: 1990, unit: "milliards de $ constants", scale: 1e9, decimals: 1,
    notes: "Dépenses militaires totales en dollars constants (corrigés de l'inflation, sans correction du coût de la vie), d'après le SIPRI.",
  },
  {
    category: "defense", chart: "effectifs-armees", slugs: ["armed-forces-personnel", "armed-forces-personnel-total"],
    countries: ["FRA", "DEU", "GBR", "ITA", "POL"], start: 1990, unit: "milliers de personnes", scale: 1e3, decimals: 1,
    notes: "Personnels d'active des forces armées, forces paramilitaires incluses, d'après The Military Balance (IISS) via la Banque mondiale.",
  },
  {
    category: "climat", chart: "temperature-france", slugs: ["average-monthly-surface-temperature"],
    countries: ["FRA"], start: 1950, unit: "°C, moyenne annuelle", annualMean: true, decimals: 2, franceOnly: true,
    notes: "Température de l'air à deux mètres du sol, moyenne annuelle des douze moyennes mensuelles calculées par Copernicus (ERA5) pour la France ; seules les années complètes sont retenues.",
  },
]

const SKIP_COLS = new Set(["entity", "code", "year", "month", "owid_region"])
const toCode = (c) => OWID_CODE[c] ?? c

function csvUrl(slug, countries) {
  return `${GRAPHER}/${slug}.csv?v=1&csvType=filtered&useColumnShortNames=true&tab=line&time=earliest..latest&country=${countries.join("~")}`
}
function metaUrl(slug) {
  return `${GRAPHER}/${slug}.metadata.json?v=1&csvType=filtered&useColumnShortNames=true`
}

/** Downloads the first slug that works. Returns { slug, url, rows, meta, valueCols } or throws. */
async function download(slugs, countries) {
  const errors = []
  for (const slug of slugs) {
    const url = csvUrl(slug, countries)
    try {
      const text = await fetchText(url)
      if (!text.startsWith("entity,")) throw new Error(`unexpected payload for ${url}: ${text.slice(0, 80)}`)
      const rows = parseCsv(text)
      const header = Object.keys(rows[0] ?? {})
      const valueCols = header.filter((h) => !SKIP_COLS.has(h) && !h.endsWith("__original_year"))
      if (!valueCols.length) throw new Error(`no value column in ${header.join(",")}`)
      let meta = null
      try { meta = JSON.parse(await fetchText(metaUrl(slug))) } catch (e) { console.warn(`  metadata unavailable for ${slug}: ${e.message}`) }
      return { slug, url, rows, meta, valueCols }
    } catch (e) {
      errors.push(`${slug}: ${e.message}`)
    }
  }
  throw new Error(errors.join(" | "))
}

/** Long-format rows for one download. seriesOf(code, column) -> series code. */
function toRows(dl, cfg, seriesOf) {
  const wanted = new Set(cfg.countries)
  const out = []
  for (const r of dl.rows) {
    if (!wanted.has(r.code)) continue
    const period = r.year ?? r.month
    if (Number(String(period).slice(0, 4)) < cfg.start) continue
    for (const col of dl.valueCols) {
      if (cfg.columns && !cfg.columns[col]) continue
      if (r[col] === "" || r[col] === undefined) continue
      const v = Number(r[col])
      if (Number.isNaN(v)) continue
      out.push({ period, series: seriesOf(toCode(r.code), col), value: round(v / (cfg.scale ?? 1), cfg.decimals) })
    }
  }
  return out
}

/** Monthly rows (period YYYY-MM) -> annual mean, complete years only. */
function annualMean(rows, decimals) {
  const byYear = new Map()
  for (const r of rows) {
    const y = r.period.slice(0, 4)
    if (!byYear.has(y)) byYear.set(y, new Map())
    byYear.get(y).set(r.period, r.value)
  }
  const out = []
  for (const [y, months] of byYear) {
    if (months.size !== 12) continue
    const mean = [...months.values()].reduce((a, b) => a + b, 0) / 12
    out.push({ period: y, series: rows[0].series, value: round(mean, decimals) })
  }
  return out
}

function sourceMeta(dl, slug) {
  const m = dl.meta
  const col = m?.columns?.[dl.valueCols[0]]
  const origin = (m?.chart?.citation || col?.citationShort?.replace(/ – (with |processed by).*$/, "") || "Our World in Data")
    .replace(/^Contains modified (.+?) information/, "$1")
  const src = {
    name: `Our World in Data, d'après ${origin}`,
    dataset: slug,
    url: `${GRAPHER}/${slug}`,
    downloadUrl: dl.url,
  }
  if (col?.citationLong || col?.citationShort) src.citation = col.citationLong ?? col.citationShort
  if (col?.lastUpdated) src.lastUpdated = col.lastUpdated
  if (m?.chart?.title) src.title = m.chart.title
  return src
}

function lastFrance(rows, cfg) {
  const fr = rows.filter((r) => cfg.franceOnly || r.series === "FRA" || r.series.startsWith("FRA-")).map((r) => r.period).sort()
  return fr[fr.length - 1]
}

async function run(cfg) {
  const id = `${cfg.category}/${cfg.chart}`
  console.log(`\n${id}`)
  let rows = []
  let seriesLabels = { ...(cfg.seriesLabels ?? {}) }
  let source
  const notes = []

  if (cfg.sex) {
    const parts = []
    for (const [suffix, slugs] of Object.entries(cfg.sex)) {
      const dl = await download(slugs, cfg.countries)
      if (dl.slug !== slugs[0]) notes.push(`${suffix}: slug ${slugs[0]} -> ${dl.slug}`)
      console.log(`  ${dl.slug}: ${dl.rows.length} raw rows, column ${dl.valueCols[0]}`)
      rows.push(...toRows(dl, cfg, (code) => `${code}-${suffix}`))
      for (const c of cfg.countries) seriesLabels[`${toCode(c)}-${suffix}`] = `${COUNTRY_LABELS[toCode(c)] ?? toCode(c)} – ${suffix}`
      parts.push(dl)
    }
    source = sourceMeta(parts[0], parts[0].slug)
    source.url = parts.map((p) => `${GRAPHER}/${p.slug}`).join(" ; ")
    source.downloadUrl = parts.map((p) => p.url).join(" ; ")
    source.dataset = parts.map((p) => p.slug).join(" ; ")
  } else {
    const dl = await download(cfg.slugs, cfg.countries)
    if (dl.slug !== cfg.slugs[0]) notes.push(`slug ${cfg.slugs[0]} -> ${dl.slug}`)
    console.log(`  ${dl.slug}: ${dl.rows.length} raw rows, columns ${dl.valueCols.join(", ")}`)
    rows = toRows(dl, cfg, (code, col) => (cfg.columns ? cfg.columns[col] : code))
    if (cfg.annualMean) rows = annualMean(rows, cfg.decimals)
    if (!cfg.columns) for (const c of cfg.countries) seriesLabels[toCode(c)] = COUNTRY_LABELS[toCode(c)] ?? toCode(c)
    source = sourceMeta(dl, dl.slug)
  }

  if (!rows.length) throw new Error("no rows after filtering")
  const present = new Set(rows.map((r) => r.series))
  seriesLabels = Object.fromEntries(Object.entries(seriesLabels).filter(([k]) => present.has(k)))

  const res = writeSeries(cfg.category, cfg.chart, rows, {
    source, unit: cfg.unit, frequency: "annual", lastObservation: lastFrance(rows, cfg), seriesLabels, script: SCRIPT, notes: cfg.notes,
  })
  const periods = rows.map((r) => r.period).sort()
  console.log(`  -> ${res.rows} rows, ${res.series.length} series, ${periods[0]}..${periods[periods.length - 1]}, lastObservation ${res.lastObservation}`)
  return { id, file: `data/series/${cfg.category}/${cfg.chart}.csv`, series: res.series, first: periods[0], last: periods[periods.length - 1], lastObservation: res.lastObservation, notes, source: source.dataset }
}

const results = []
for (const cfg of CHARTS) {
  try {
    results.push(await run(cfg))
  } catch (e) {
    console.error(`  FAILED ${cfg.category}/${cfg.chart}: ${e.message}`)
    results.push({ id: `${cfg.category}/${cfg.chart}`, error: e.message })
  }
}

const lines = [
  "# OWID fetch report", "", `Généré par \`${SCRIPT}\` le ${today()}.`, "",
  "| Graphe | Fichier | Séries | Années | Dernière obs. (France) | Slug OWID / remarques |", "|---|---|---|---|---|---|",
]
for (const r of results) {
  if (r.error) { lines.push(`| ${r.id} | — | — | — | — | ÉCHEC : ${r.error.replace(/\|/g, "/")} |`); continue }
  lines.push(`| ${r.id} | \`${r.file}\` | ${r.series.join(", ")} | ${r.first}–${r.last} | ${r.lastObservation} | ${r.source}${r.notes.length ? " — " + r.notes.join(" ; ") : ""} |`)
}
const failed = results.filter((r) => r.error)
lines.push("", `${results.length - failed.length}/${results.length} graphes écrits${failed.length ? `, ${failed.length} en échec` : ""}.`, "")
writeFileSync(resolve(SERIES_DIR, "OWID-REPORT.md"), lines.join("\n"))
console.log(`\n${lines.join("\n")}`)
if (failed.length) process.exitCode = 1
