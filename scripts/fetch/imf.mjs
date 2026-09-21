// FMI (DataMapper) -> data/series/*. Reproductible : `node scripts/fetch/imf.mjs` depuis webapp-v2.
// Sert uniquement les comparaisons hors Union européenne : Eurostat ne diffuse pas les pays tiers.
// Les définitions du FMI ne sont PAS celles de Maastricht ni du SEC 2010 ; chaque graphe le dit.
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { COUNTRY_LABELS, SERIES_DIR, fetchJson, today, writeSeries } from "../lib/series.mjs"

const API = "https://www.imf.org/external/datamapper/api/v1"
const SCRIPT = "scripts/fetch/imf.mjs"
const PANEL = ["FRA", "USA", "JPN", "GBR", "CHN"]

/**
 * Le DataMapper ne distingue pas les valeurs constatées des projections : la base WEO prolonge
 * les séries de plusieurs années. La frontière est donc posée à la main, sur la dernière année
 * constatée dans tout le panel pour l'édition courante du World Economic Outlook.
 *
 * Elle est écrite en dur, et pas calculée sur l'année courante : une frontière qui bouge au
 * 1er janvier ferait apparaître une année de données sans qu'aucune donnée n'ait changé.
 * À relever d'un cran à chaque nouvelle édition du WEO, dans un commit qui le dit.
 */
const LAST_ACTUAL = 2024

const CHARTS = [
  {
    category: "finances-publiques",
    chart: "dette-monde",
    indicator: "GGXWDG_NGDP",
    start: 1990,
    unit: "% du PIB",
    notes:
      "Dette brute des administrations publiques rapportée au PIB, base World Economic Outlook du FMI. " +
      "Cette définition n'est pas celle du traité de Maastricht utilisée par Eurostat : les deux séries sont proches pour la France mais ne se superposent pas. " +
      `Les projections du FMI au-delà de ${LAST_ACTUAL} ne sont pas affichées.`,
  },
  {
    category: "finances-publiques",
    chart: "charge-interets-monde",
    indicator: "ie",
    start: 1990,
    unit: "% du PIB",
    notes:
      "Intérêts payés sur la dette publique rapportés au PIB, base de finances publiques historiques du FMI. " +
      "La définition diffère du poste D41 du SEC 2010 utilisé par Eurostat ; les niveaux ne sont pas directement comparables à la vue européenne.",
  },
]

const failures = []
const report = [`# FMI – rapport de récupération (${today()})`, "", `Script : \`${SCRIPT}\` — API : ${API}/<indicateur>/<ISO3>…`, ""]

for (const c of CHARTS) {
  const url = `${API}/${c.indicator}/${PANEL.join("/")}`
  console.log(`\n## ${c.category}/${c.chart}\n  GET ${url}`)
  try {
    const payload = await fetchJson(url)
    const values = payload?.values?.[c.indicator]
    if (!values) throw new Error("réponse sans valeurs")
    const out = []
    for (const code of PANEL) {
      const byYear = values[code]
      if (!byYear) {
        console.log(`  ! ${code} absent`)
        continue
      }
      for (const [year, value] of Object.entries(byYear)) {
        const y = Number(year)
        if (value == null || y < c.start || y > LAST_ACTUAL) continue
        out.push({ period: year, series: code, value: Math.round(value * 100) / 100 })
      }
    }
    if (!out.length) throw new Error("aucune valeur dans la fenêtre retenue")
    const reached = out.some((r) => Number(r.period) === LAST_ACTUAL)
    if (!reached) {
      throw new Error(
        `aucune valeur en ${LAST_ACTUAL} : la frontière observé/projection de ce script est périmée ` +
          "ou l'édition du WEO a changé de périmètre.",
      )
    }
    const series = [...new Set(out.map((r) => r.series))]
    const res = writeSeries(c.category, c.chart, out, {
      source: {
        name: "Fonds monétaire international",
        dataset: c.indicator,
        url: `https://www.imf.org/external/datamapper/${c.indicator}`,
        downloadUrl: url,
      },
      unit: c.unit,
      frequency: "annual",
      seriesLabels: Object.fromEntries(series.map((s) => [s, COUNTRY_LABELS[s] ?? s])),
      script: SCRIPT,
      notes: c.notes,
    })
    console.log(`  -> ${c.category}/${c.chart}.csv: ${res.rows} lignes, ${res.series.length} séries, dernière obs. ${res.lastObservation}`)
    const years = out.map((r) => r.period).sort()
    report.push(
      `## ${c.category}/${c.chart}`,
      `- fichier : \`data/series/${c.category}/${c.chart}.csv\``,
      `- indicateur : \`${c.indicator}\``,
      `- séries : ${res.series.join(", ")}`,
      `- années : ${years[0]} → ${years.at(-1)} (projections FMI au-delà de ${LAST_ACTUAL} exclues)`,
      `- requête : ${url}`,
      "",
    )
  } catch (e) {
    console.log(`  ÉCHEC : ${e.message}`)
    failures.push(c.chart)
    report.push(`## ${c.category}/${c.chart}`, `- ÉCHEC : ${e.message}`, "")
  }
}

report.push("---", `${CHARTS.length - failures.length} fichiers écrits, ${failures.length} échec(s).`, "")
writeFileSync(resolve(SERIES_DIR, "IMF-REPORT.md"), report.join("\n"))
console.log(`\nReport: data/series/IMF-REPORT.md (${failures.length} échec(s))`)
process.exit(failures.length ? 1 : 0)
