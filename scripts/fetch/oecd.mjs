// OCDE -> data/series/*. API SDMX publique de l'OCDE (https://sdmx.oecd.org/public/rest/data/…),
// réponse SDMX-JSON 2.0. Reproductible : `node scripts/fetch/oecd.mjs` depuis webapp-v2.
// Chaque nombre vient de l'API ; rien n'est saisi à la main.
//
// L'API applique un quota par adresse IP, sur le nombre de requêtes et sur la largeur des plages
// demandées. Passé le quota elle répond 429 avec un message en texte brut, et parfois 500 sur des
// clés qui répondent très bien isolément. D'où l'espacement des appels et les tentatives répétées
// ci-dessous — et le fait qu'on ne rejoue pas ce script en boucle.
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { COUNTRY_LABELS, SERIES_DIR, fetchJson, round as sharedRound, today, writeSeries } from "../lib/series.mjs"

const API = "https://sdmx.oecd.org/public/rest/data/"
const SCRIPT = "scripts/fetch/oecd.mjs"
const PANEL = ["FRA", "DEU", "ITA", "ESP", "GBR", "USA"]

const report = []

function sdmxUrl(dataflow, key, params = {}) {
  const q = new URLSearchParams({ format: "jsondata", dimensionAtObservation: "AllDimensions", ...params })
  return `${API}${dataflow}/${key}?${q}`
}

/** SDMX-JSON (AllDimensions) -> [{ <DIM_ID>: code, value }]. */
function sdmxRows(payload) {
  const structure = payload.data.structures?.[0] ?? payload.data.structure
  const dims = structure.dimensions.observation
  const out = []
  for (const [key, obs] of Object.entries(payload.data.dataSets[0].observations)) {
    const idx = key.split(":").map(Number)
    const row = { value: obs[0] }
    dims.forEach((d, i) => {
      row[d.id] = d.values[idx[i]].id
    })
    if (row.value !== null && row.value !== undefined) out.push(row)
  }
  return out
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * L'API SDMX de l'OCDE limite le débit : enchaîner les requêtes déclenche des 500 sur des clés
 * qui répondent très bien isolément. On espace donc les appels et on retente longuement.
 */
let lastCall = 0
async function fetchSdmx(dataflow, key, params, attempts = 6) {
  const url = sdmxUrl(dataflow, key, params)
  console.log(`  GET ${url}`)
  for (let i = 1; ; i++) {
    const since = Date.now() - lastCall
    if (since < 10000) await wait(10000 - since)
    lastCall = Date.now()
    try {
      return { url, rows: sdmxRows(await fetchJson(url)) }
    } catch (e) {
      if (i >= attempts) throw e
      console.log(`  … tentative ${i} échouée (${e.message.slice(0, 60)}), nouvelle tentative`)
      await wait(20000 * i)
    }
  }
}

const label = (iso) => COUNTRY_LABELS[iso] ?? iso
/** Eurostat et l'OCDE publient des valeurs longues : une décimale par défaut, comme avant. */
const round = (x, d = 1) => sharedRound(x, d)

function meta({ dataset, url, viewUrl, unit, seriesLabels, notes, lastObservation }) {
  const m = {
    source: { name: "OCDE", dataset, url: viewUrl ?? "https://data-explorer.oecd.org/", downloadUrl: url },
    unit,
    frequency: "annual",
    seriesLabels,
    script: SCRIPT,
    notes,
  }
  if (lastObservation) m.lastObservation = lastObservation
  return m
}

function record(chart, file, res, rows, dims) {
  const periods = rows.map((r) => String(r.period)).sort()
  report.push({ chart, file, series: res.series, first: periods[0], last: periods.at(-1), lastObservation: res.lastObservation, dims })
  console.log(`  -> ${file}: ${res.rows} rows, ${res.series.length} series, ${periods[0]}-${periods.at(-1)}`)
}

async function run(chart, fn) {
  console.log(`\n## ${chart}`)
  try {
    await fn()
  } catch (e) {
    console.error(`  !! ${chart} FAILED: ${e.message}`)
    report.push({ chart, failure: e.message })
  }
}

// ---------------------------------------------------------------- charts

// Prix des logements rapportés au revenu des ménages (indice, base 2015 = 100).
await run("logement/prix-revenu", async () => {
  const dataflow = "OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0"
  const dims = { measure: "HPI_YDH", unit: "IX", from: "1995" }
  // La clé ne filtre que le pays et la fréquence : l'API refuse certaines combinaisons
  // partielles, l'indicateur et l'unité sont donc filtrés ici.
  const { url, rows } = await fetchSdmx(dataflow, `${PANEL.join("+")}.A......`, { startPeriod: dims.from })
  const out = rows
    .filter((r) => r.MEASURE === dims.measure && r.UNIT_MEASURE === dims.unit)
    .map((r) => ({ period: r.TIME_PERIOD, series: r.REF_AREA, value: round(r.value, 1) }))
  const res = writeSeries("logement", "prix-revenu", out, meta({
    dataset: "DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES — price to income ratio (HPI_YDH)",
    url,
    viewUrl: "https://data-explorer.oecd.org/vis?tm=Analytical%20house%20prices%20indicators&pg=0&snb=10&vw=ov&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_AN_HOUSE_PRICES%40DF_HOUSE_PRICES&df[ag]=OECD.ECO.MPD&df[vs]=1.0",
    unit: "indice, base 2015 = 100",
    seriesLabels: Object.fromEntries([...new Set(out.map((r) => r.series))].map((s) => [s, label(s)])),
    notes: "Rapport entre le prix nominal des logements et le revenu disponible nominal par habitant, ramené en indice de base 100 en 2015. C'est une mesure d'accessibilité relative : elle dit comment le prix a évolué par rapport au revenu, pas combien coûte un logement.",
  }))
  record("logement/prix-revenu", "logement/prix-revenu.csv", res, out, dims)
})

// Salaire statutaire des enseignants après quinze ans de carrière : indice en prix constants,
// base 100 en 2015. L'OCDE publie l'évolution, pas le niveau, sur toute la période.
await run("education/salaires-enseignants", async () => {
  const dataflow = "OECD.EDU.IMEP,DSD_EAG_SAL_TREND@DF_TCH_STA,2.1"
  const GEOS = { FRA: "FRA", DEU: "DEU", ITA: "ITA", ESP: "ESP", USA: "USA", OECD_REP: "OCDE" }
  const LEVELS = { ISCED11_1: "-primaire", ISCED11_24: "-college" }
  const dims = { unit: "IX", experience: "EXP15", levels: Object.keys(LEVELS), from: "2000" }
  const { url, rows } = await fetchSdmx(dataflow, "all", { startPeriod: dims.from })
  const out = rows
    .filter((r) => GEOS[r.REF_AREA] && r.UNIT_MEASURE === dims.unit && r.PERS_EXP_LEV === dims.experience && LEVELS[r.EDUCATION_LEV])
    .map((r) => ({ period: r.TIME_PERIOD, series: GEOS[r.REF_AREA] + LEVELS[r.EDUCATION_LEV], value: round(r.value, 1) }))
  const present = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("education", "salaires-enseignants", out, meta({
    dataset: "DSD_EAG_SAL_TREND@DF_TCH_STA — trends in teachers' statutory salaries since 2000",
    url,
    viewUrl: "https://data-explorer.oecd.org/vis?tm=%22teacher%20salary%22&pg=0&snb=1&vw=ov&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_EAG_SAL_TREND%40DF_ALL&df[ag]=OECD.EDU.IMEP&df[vs]=2.1",
    unit: "indice en prix constants, base 100 en 2015",
    seriesLabels: Object.fromEntries(
      present.map((code) => {
        const [iso, lvl] = [code.split("-")[0], code.endsWith("-primaire") ? " — primaire" : " — collège"]
        return [code, label(iso) + lvl]
      }),
    ),
    notes: "Salaire statutaire d'un enseignant à temps plein du secteur public après quinze ans d'expérience, avec la qualification la plus courante à ce stade. L'indice est en prix constants, base 100 en 2015 : il mesure le pouvoir d'achat du salaire, pas son montant. Les données de la dernière année sont provisoires.",
  }))
  record("education/salaires-enseignants", "education/salaires-enseignants.csv", res, out, dims)
})

// Dépense par élève et par niveau, en dollars PPA à prix constants : la comparaison qui montre
// l'écart français entre le primaire et le lycée.
await run("education/depense-education", async () => {
  const dataflow = "OECD.EDU.IMEP,DSD_EAG_UOE_FIN@DF_UOE_INDIC_FIN_PERSTUD,3.2"
  const LEVELS = { ISCED11_1: "-primaire", ISCED11_24: "-college", ISCED11_34: "-lycee", ISCED11_5T8: "-superieur" }
  const LEVEL_LABELS = { "-primaire": "primaire", "-college": "collège", "-lycee": "lycée général", "-superieur": "supérieur" }
  // PRICE_BASE est laissé vide dans la clé : l'API renvoie une erreur 500 quand on le filtre,
  // le tri entre prix courants et prix constants se fait donc ici.
  // L'API plafonne « les téléchargements de données ou les plages très larges » : la même requête
  // depuis 2000 est refusée (429), depuis 2005 elle passe. La source elle-même commence en 2000.
  const dims = { measure: "FIN_PERSTUD", priceBase: "Q (prix constants)", unit: "USD_PPP_ST", levels: Object.keys(LEVELS), from: "2005" }
  const key = `${PANEL.join("+")}.FIN_PERSTUD.${Object.keys(LEVELS).join("+")}._T.INST_EDU.DIR_EXP..USD_PPP_ST.SOURCE`
  const { url, rows } = await fetchSdmx(dataflow, key, { startPeriod: dims.from })
  const out = rows
    .filter((r) => LEVELS[r.EDUCATION_LEV] && r.PRICE_BASE === "Q")
    .map((r) => ({ period: r.TIME_PERIOD, series: r.REF_AREA + LEVELS[r.EDUCATION_LEV], value: Math.round(r.value) }))
  const present = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("education", "depense-education", out, meta({
    dataset: "DSD_EAG_UOE_FIN@DF_UOE_INDIC_FIN_PERSTUD — expenditure on educational institutions per full-time equivalent student",
    url,
    viewUrl: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[ag]=OECD.EDU.IMEP&df[id]=DSD_EAG_UOE_FIN%40DF_UOE_INDIC_FIN_PERSTUD",
    unit: "dollars PPA par élève, prix constants",
    seriesLabels: Object.fromEntries(
      present.map((code) => {
        const iso = code.split("-")[0]
        return [code, `${label(iso)} — ${LEVEL_LABELS["-" + code.split("-")[1]]}`]
      }),
    ),
    notes: "Dépense annuelle des établissements d'enseignement par élève en équivalent temps plein, toutes sources de financement, convertie en dollars à parité de pouvoir d'achat et exprimée en prix constants. Elle comprend la recherche pour le supérieur, ce qui explique une partie de l'écart avec les autres niveaux.",
  }))
  record("education/depense-education", "education/depense-education.csv", res, out, dims)
})

// ---------------------------------------------------------------- report

const lines = [`# OCDE – rapport de récupération (${today()})`, "", `Script : \`${SCRIPT}\` — API : ${API}<dataflow>/<clé>?format=jsondata`, ""]
for (const r of report) {
  lines.push(`## ${r.chart}`)
  if (r.failure) {
    lines.push(`- **ÉCHEC** : ${r.failure}`, "")
    continue
  }
  lines.push(`- fichier : \`data/series/${r.file}\``)
  lines.push(`- séries : ${r.series.join(", ")}`)
  lines.push(`- années : ${r.first} → ${r.last} ; lastObservation (France) : **${r.lastObservation}**`)
  lines.push(`- dimensions : \`${JSON.stringify(r.dims)}\``)
  lines.push("")
}
const failures = report.filter((r) => r.failure)
lines.push("---", `${report.length - failures.length} fichiers écrits, ${failures.length} échec(s).`, "")
// Un rapport qui n'a rien écrit ne doit pas remplacer celui qui décrit les données du dépôt.
if (report.length > failures.length) {
  writeFileSync(resolve(SERIES_DIR, "OECD-REPORT.md"), lines.join("\n"))
  console.log(`\nRapport : data/series/OECD-REPORT.md (${failures.length} échec(s))`)
} else {
  console.error(`\nAucune série écrite : data/series/OECD-REPORT.md est laissé en l'état.`)
}
if (failures.length) process.exitCode = 1
