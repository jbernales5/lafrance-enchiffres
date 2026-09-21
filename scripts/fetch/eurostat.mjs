// Eurostat -> data/series/*. Reproducible: `node scripts/fetch/eurostat.mjs` from webapp-v2.
// Uses the dissemination API (JSON-stat 2.0). Every number comes from the API; nothing is typed by hand.
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { COUNTRY_LABELS, EUROSTAT_GEO, SERIES_DIR, fetchJson, jsonStatToRows, round as sharedRound, today, writeSeries } from "../lib/series.mjs"

const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
const SCRIPT = "scripts/fetch/eurostat.mjs"
const PANEL = ["FR", "DE", "IT", "ES", "EU27_2020"]
const PANEL_UK = [...PANEL, "UK"]

const report = []

// ---------------------------------------------------------------- helpers

function eurostatUrl(dataset, params) {
  const q = []
  for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) q.push(`${k}=${encodeURIComponent(x)}`)
  return `${API}${dataset}?format=JSON&lang=EN&${q.join("&")}`
}

/** Fetch one dataset slice. Returns { url, rows } where rows = [{ geo, time, <dims>..., value }] (missing values are simply absent). */
async function fetchSlice(dataset, params) {
  const url = eurostatUrl(dataset, params)
  console.log(`  GET ${url}`)
  const ds = await fetchJson(url)
  if (ds.error) throw new Error(`${dataset}: ${JSON.stringify(ds.error).slice(0, 200)}`)
  return { url, rows: jsonStatToRows(ds), ds }
}

/** Same as fetchSlice, but if the request fails with UK in the panel, retry without UK (UK left many datasets after Brexit). */
let lastGeo = []
async function fetchPanel(dataset, geo, params) {
  try {
    lastGeo = geo
    return await fetchSlice(dataset, { geo, ...params })
  } catch (e) {
    if (geo.includes("UK")) {
      console.log(`  ! ${dataset} failed with UK (${e.message.slice(0, 80)}), retrying without UK`)
      lastGeo = geo.filter((g) => g !== "UK")
      return fetchSlice(dataset, { geo: geo.filter((g) => g !== "UK"), ...params })
    }
    throw e
  }
}

const iso = (geo) => EUROSTAT_GEO[geo] ?? geo
const label = (geo) => COUNTRY_LABELS[iso(geo)] ?? geo
/** Eurostat et l'OCDE publient des valeurs longues : une décimale par défaut, comme avant. */
const round = (x, d = 1) => sharedRound(x, d)

function browserUrl(dataset) {
  return `https://ec.europa.eu/eurostat/databrowser/view/${dataset}/default/table`
}

function meta({ dataset, url, unit, seriesLabels, notes, lastObservation, viewUrl, name }) {
  const m = { source: { name: name ?? "Eurostat", dataset, url: viewUrl ?? browserUrl(dataset), downloadUrl: url }, unit, frequency: "annual", seriesLabels, script: SCRIPT, notes }
  if (lastObservation) m.lastObservation = lastObservation
  return m
}

function summary(rows) {
  const periods = rows.map((r) => String(r.period)).sort()
  return { first: periods[0], last: periods[periods.length - 1] }
}

function record(chart, file, res, rows, dims, extra = {}) {
  const { first, last } = summary(rows)
  // Une couverture plus courte que demandée ou un pays absent du jeu ne sont pas des anomalies :
  // la période réellement couverte et la liste des séries écrites le disent déjà. On les affiche
  // pendant la récupération, sans les inscrire dans le rapport versionné.
  if (extra.geos !== null) {
    const missing = lastGeo.filter((g) => !res.series.some((s) => s === iso(g) || s.startsWith(iso(g) + "-")))
    if (missing.length) console.log(`  · sans valeur dans ce jeu : ${missing.join(", ")}`)
  }
  if (dims.sinceTimePeriod && first > dims.sinceTimePeriod) console.log(`  · la source commence en ${first}`)
  report.push({ chart, file, series: res.series, first, last, lastObservation: res.lastObservation, dims, ...extra })
  console.log(`  -> ${file}: ${res.rows} rows, ${res.series.length} series, ${first}-${last}, lastObservation ${res.lastObservation}`)
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

/** Build country series rows from API rows: series = ISO3 (+ optional suffix from row). */
function countryRows(rows, suffixOf = () => "") {
  return rows.map((r) => ({ period: r.time, series: iso(r.geo) + suffixOf(r), value: r.value }))
}

function panelLabels(geos, suffixes = [["", ""]]) {
  const out = {}
  for (const g of geos) for (const [code, text] of suffixes) out[iso(g) + code] = label(g) + text
  return out
}

/** Keep labels only for series actually present. */
function prune(labels, series) {
  return Object.fromEntries(Object.entries(labels).filter(([k]) => series.includes(k)))
}

// ---------------------------------------------------------------- charts

// 1. Dette publique (Maastricht)
await run("finances-publiques/dette-europe", async () => {
  const dims = { na_item: "GD", sector: "S13", unit: "PC_GDP", sinceTimePeriod: "1995" }
  const { url, rows } = await fetchPanel("gov_10dd_edpt1", PANEL_UK, dims)
  const out = countryRows(rows)
  const res = writeSeries("finances-publiques", "dette-europe", out, meta({
    dataset: "gov_10dd_edpt1", url, unit: "% du PIB",
    seriesLabels: prune(panelLabels(PANEL_UK), [...new Set(out.map((r) => r.series))]),
    notes: "Dette brute consolidée des administrations publiques au sens du traité de Maastricht (procédure de déficit excessif, SEC 2010), en pourcentage du PIB.",
  }))
  record("finances-publiques/dette-europe", "finances-publiques/dette-europe.csv", res, out, dims)
})

// 2. Déficit public
await run("finances-publiques/deficit", async () => {
  const dims = { na_item: "B9", sector: "S13", unit: "PC_GDP", sinceTimePeriod: "1995" }
  const { url, rows } = await fetchPanel("gov_10dd_edpt1", PANEL_UK, dims)
  const out = countryRows(rows)
  const res = writeSeries("finances-publiques", "deficit", out, meta({
    dataset: "gov_10dd_edpt1", url, unit: "% du PIB",
    seriesLabels: prune(panelLabels(PANEL_UK), [...new Set(out.map((r) => r.series))]),
    notes: "Capacité (+) ou besoin (−) de financement des administrations publiques (solde B9, SEC 2010, procédure de déficit excessif) : une valeur négative est un déficit.",
  }))
  record("finances-publiques/deficit", "finances-publiques/deficit.csv", res, out, dims)
})

// 3. Dépenses et recettes publiques
await run("finances-publiques/depenses-recettes", async () => {
  const dims = { sector: "S13", unit: "PC_GDP", na_item: ["TE", "TR"], sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("gov_10a_main", PANEL, dims)
  const suffix = (r) => (r.na_item === "TE" ? "-depenses" : "-recettes")
  const out = countryRows(rows, suffix)
  const res = writeSeries("finances-publiques", "depenses-recettes", out, meta({
    dataset: "gov_10a_main", url, unit: "% du PIB",
    seriesLabels: panelLabels(PANEL, [["-depenses", " – dépenses"], ["-recettes", " – recettes"]]),
    notes: "Dépenses totales (TE) et recettes totales (TR) des administrations publiques en comptabilité nationale (SEC 2010), en pourcentage du PIB.",
    lastObservation: null,
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("finances-publiques/depenses-recettes", "finances-publiques/depenses-recettes.csv", res, out, dims)
})

// 4. Charge d'intérêts (deux fichiers)
await run("finances-publiques/charge-interets", async () => {
  const dimsPib = { sector: "S13", na_item: "D41PAY", unit: "PC_GDP", sinceTimePeriod: "1995" }
  const a = await fetchPanel("gov_10a_main", PANEL, dimsPib)
  const outPib = countryRows(a.rows)
  const resPib = writeSeries("finances-publiques", "charge-interets-pib", outPib, meta({
    dataset: "gov_10a_main", url: a.url, unit: "% du PIB",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(outPib.map((r) => r.series))]),
    notes: "Intérêts versés par les administrations publiques sur leur dette (D41, SEC 2010), en pourcentage du PIB.",
  }))
  record("finances-publiques/charge-interets", "finances-publiques/charge-interets-pib.csv", resPib, outPib, dimsPib)

  const dimsEur = { sector: "S13", na_item: "D41PAY", unit: "MIO_EUR", sinceTimePeriod: "1995" }
  const b = await fetchPanel("gov_10a_main", PANEL, dimsEur)
  const outEur = b.rows.map((r) => ({ period: r.time, series: iso(r.geo), value: round(r.value / 1000, 1) }))
  const resEur = writeSeries("finances-publiques", "charge-interets-mdeur", outEur, meta({
    dataset: "gov_10a_main", url: b.url, unit: "milliards d'euros",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(outEur.map((r) => r.series))]),
    notes: "Intérêts versés par les administrations publiques sur leur dette (D41, SEC 2010), en milliards d'euros courants (conversion depuis les millions d'euros de la source). En euros, donc comparable seulement à l'intérieur de l'Union européenne.",
  }))
  record("finances-publiques/charge-interets", "finances-publiques/charge-interets-mdeur.csv", resEur, outEur, dimsEur)
})

// 5. Sankey des finances publiques françaises (dernière année complète)
const COFOG = {
  GF01: "Services publics généraux", GF02: "Défense", GF03: "Ordre et sécurité publics", GF04: "Affaires économiques",
  GF05: "Protection de l'environnement", GF06: "Logement et équipements collectifs", GF07: "Santé",
  GF08: "Loisirs, culture et culte", GF09: "Enseignement", GF10: "Protection sociale",
}
/** Sous-fonctions COFOG (niveau 2), libellés de la nomenclature française. */
const COFOG2 = {
  GF0101: "Organes exécutifs et législatifs, affaires financières, fiscales et étrangères", GF0102: "Aide économique extérieure", GF0103: "Services généraux",
  GF0104: "Recherche fondamentale", GF0105: "R&D services publics généraux", GF0106: "Services publics généraux n.c.a.",
  GF0107: "Opérations concernant la dette publique", GF0108: "Transferts entre administrations publiques",
  GF0201: "Défense militaire", GF0202: "Défense civile", GF0203: "Aide militaire extérieure", GF0204: "R&D défense", GF0205: "Défense n.c.a.",
  GF0301: "Services de police", GF0302: "Protection civile et incendie", GF0303: "Tribunaux", GF0304: "Administration pénitentiaire", GF0305: "R&D ordre et sécurité", GF0306: "Ordre et sécurité n.c.a.",
  GF0401: "Tutelle de l'économie, commerce, emploi", GF0402: "Agriculture, sylviculture, pêche", GF0403: "Combustibles et énergie", GF0404: "Industries extractives et manufacturières, construction",
  GF0405: "Transports", GF0406: "Communications", GF0407: "Autres branches d'activité", GF0408: "R&D affaires économiques", GF0409: "Affaires économiques n.c.a.",
  GF0501: "Gestion des déchets", GF0502: "Gestion des eaux usées", GF0503: "Lutte contre la pollution", GF0504: "Protection de la biodiversité et des paysages", GF0505: "R&D environnement", GF0506: "Environnement n.c.a.",
  GF0601: "Logement", GF0602: "Équipements collectifs", GF0603: "Alimentation en eau", GF0604: "Éclairage public", GF0605: "R&D logement", GF0606: "Logement et équipements n.c.a.",
  GF0701: "Produits, appareils et matériels médicaux", GF0702: "Services ambulatoires", GF0703: "Services hospitaliers", GF0704: "Services de santé publique", GF0705: "R&D santé", GF0706: "Santé n.c.a.",
  GF0801: "Services récréatifs et sportifs", GF0802: "Services culturels", GF0803: "Radiodiffusion, télévision, édition", GF0804: "Culte et autres services communautaires", GF0805: "R&D loisirs et culture", GF0806: "Loisirs et culture n.c.a.",
  GF0901: "Enseignement préélémentaire et primaire", GF0902: "Enseignement secondaire", GF0903: "Enseignement post-secondaire non supérieur", GF0904: "Enseignement supérieur",
  GF0905: "Enseignement non défini par niveau", GF0906: "Services annexes à l'enseignement", GF0907: "R&D enseignement", GF0908: "Enseignement n.c.a.",
  GF1001: "Maladie et invalidité", GF1002: "Vieillesse", GF1003: "Survivants", GF1004: "Famille et enfants", GF1005: "Chômage", GF1006: "Logement (aides)",
  GF1007: "Exclusion sociale n.c.a.", GF1008: "R&D protection sociale", GF1009: "Protection sociale n.c.a.",
}
const MAIN_ITEMS = { TR: "recettes-total", TE: "depenses-total", B9: "deficit", D41PAY: "interets", D2REC: "rec-D2", D5REC: "rec-D5", D61REC: "rec-D61", D91REC: "rec-D91" }

/** Sous-postes de recettes publiés par Eurostat : code source -> code de série `rec2-<parent>-<enfant>`. */
const REVENUE2 = {
  D211REC: ["rec2-D2-D211", "TVA"],
  D29REC: ["rec2-D2-D29", "Autres impôts sur la production"],
  D51A_C1REC: ["rec2-D5-D51A", "Impôt sur le revenu des ménages (dont CSG)"],
  D51B_C2REC: ["rec2-D5-D51B", "Impôt sur les sociétés"],
  D611REC: ["rec2-D61-D611", "Cotisations employeurs"],
  D613REC: ["rec2-D61-D613", "Cotisations des ménages"],
}
/** Résidus calculés pour que chaque décomposition somme au total de son poste. */
const REVENUE2_REST = {
  "rec2-D2-reste": { parent: "D2REC", minus: ["D211REC", "D29REC"], label: "Autres impôts sur les produits" },
  "rec2-D5-reste": { parent: "D5REC", minus: ["D51A_C1REC", "D51B_C2REC"], label: "Autres impôts courants (dont taxe foncière)" },
  "rec2-D61-reste": { parent: "D61REC", minus: ["D611REC", "D613REC"], label: "Autres cotisations (imputées, non salariés)" },
}
await run("finances-publiques/sankey", async () => {
  // GF0107 (opérations concernant la dette publique, essentiellement les intérêts) est une sous-fonction de GF01 : récupérée pour scinder le nœud.
  const dimsExp = { geo: "FR", unit: "MIO_EUR", sector: "S13", na_item: "TE", cofog99: [...Object.keys(COFOG), ...Object.keys(COFOG2)], sinceTimePeriod: "2015" }
  const dimsMain = { geo: "FR", unit: "MIO_EUR", sector: "S13", na_item: [...Object.keys(MAIN_ITEMS), ...Object.keys(REVENUE2)], sinceTimePeriod: "2015" }
  const exp = await fetchSlice("gov_10a_exp", dimsExp)
  const main = await fetchSlice("gov_10a_main", dimsMain)

  // Years where all 10 COFOG functions and the essential main items (TR, TE, B9, D41PAY, D2REC, D5REC, D61REC) are present.
  const yearsExp = {}
  for (const r of exp.rows) (yearsExp[r.time] ??= new Set()).add(r.cofog99)
  const yearsMain = {}
  for (const r of main.rows) (yearsMain[r.time] ??= new Set()).add(r.na_item)
  const essential = ["TR", "TE", "B9", "D41PAY", "D2REC", "D5REC", "D61REC"]
  const common = Object.keys(yearsExp)
    .filter((y) => Object.keys(COFOG).every((k) => yearsExp[y].has(k)) && yearsMain[y] && essential.every((i) => yearsMain[y].has(i)))
    .sort()
  if (!common.length) throw new Error("no year with complete COFOG + main aggregates for FR")
  const year = common.includes("2024") ? "2024" : common[common.length - 1]
  if (year !== "2024") console.log(`  ! 2024 not complete, using ${year}`)

  const out = []
  const labels = {}
  const mainVals = {}
  for (const r of main.rows) if (r.time === year) mainVals[r.na_item] = r.value
  for (const [item, code] of Object.entries(MAIN_ITEMS)) {
    if (mainVals[item] === undefined) { console.log(`  ! ${item} missing for ${year}`); continue }
    out.push({ period: year, series: code, value: round(mainVals[item] / 1000, 1) })
  }
  const taxes = ["D2REC", "D5REC", "D61REC", "D91REC"].reduce((s, i) => s + (mainVals[i] ?? 0), 0)
  out.push({ period: year, series: "rec-autres", value: round((mainVals.TR - taxes) / 1000, 1) })
  // Sous-postes de recettes, puis le résidu de chaque poste pour que la somme soit exacte.
  for (const [item, [code]] of Object.entries(REVENUE2)) {
    if (mainVals[item] === undefined) { console.log(`  ! ${item} manquant pour ${year}`); continue }
    out.push({ period: year, series: code, value: round(mainVals[item] / 1000, 1) })
  }
  for (const [code, r] of Object.entries(REVENUE2_REST)) {
    if (mainVals[r.parent] === undefined) continue
    const rest = mainVals[r.parent] - r.minus.reduce((s, i) => s + (mainVals[i] ?? 0), 0)
    if (rest > 0) out.push({ period: year, series: code, value: round(rest / 1000, 1) })
  }
  for (const r of exp.rows) if (r.time === year) out.push({ period: year, series: `dep-${r.cofog99}`, value: round(r.value / 1000, 1) })

  Object.assign(labels, {
    "recettes-total": "Recettes totales", "depenses-total": "Dépenses totales", deficit: "Solde public (déficit)", interets: "Charge d'intérêts",
    "rec-D2": "Impôts sur la production et les importations (dont TVA)", "rec-D5": "Impôts courants sur le revenu et le patrimoine",
    "rec-D61": "Cotisations sociales nettes", "rec-D91": "Impôts en capital", "rec-autres": "Autres recettes (production, revenus de la propriété, transferts)",
  })
  for (const [k, v] of Object.entries(COFOG)) labels[`dep-${k}`] = v
  for (const [k, v] of Object.entries(COFOG2)) labels[`dep-${k}`] = v
  for (const [, [code, label]] of Object.entries(REVENUE2)) labels[code] = label
  for (const [code, r] of Object.entries(REVENUE2_REST)) labels[code] = r.label

  const file = `sankey-${year}`
  const res = writeSeries("finances-publiques", file, out, meta({
    dataset: "gov_10a_main, gov_10a_exp", viewUrl: browserUrl("gov_10a_exp"), url: `${main.url} ; ${exp.url}`, unit: "milliards d'euros",
    name: "Insee, comptes nationaux (base 2020), via Eurostat",
    seriesLabels: labels, lastObservation: year,
    notes: `Recettes par nature (gov_10a_main) et dépenses par fonction COFOG de niveau 1 (gov_10a_exp) des administrations publiques françaises en ${year}, SEC 2010, en milliards d'euros courants ; les 69 sous-fonctions COFOG de niveau 2 (codes GFxxyy) décomposent chaque fonction de dépense, et les sous-postes de recettes (codes rec2-) décomposent chaque grande recette ; les chiffres sont ceux que l'Insee transmet à Eurostat au titre du SEC 2010 ; « autres recettes » = recettes totales − (D2 + D5 + D61 + D91).`,
  }))
  res.lastObservation = year
  record("finances-publiques/sankey", `finances-publiques/${file}.csv`, res, out, { exp: dimsExp, main: dimsMain }, { year, geos: null })
})

// 6. Taux d'emploi 15-64 et 55-64
await run("productivite/taux-emploi", async () => {
  const dims = { indic_em: "EMP_LFS", sex: "T", unit: "PC_POP", age: ["Y15-64", "Y55-64"], sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("lfsi_emp_a", PANEL, dims)
  const out = countryRows(rows, (r) => (r.age === "Y15-64" ? "-15-64" : "-55-64"))
  const res = writeSeries("productivite", "taux-emploi", out, meta({
    dataset: "lfsi_emp_a", url, unit: "% de la population de la tranche d'âge",
    seriesLabels: panelLabels(PANEL, [["-15-64", " – 15-64 ans"], ["-55-64", " – 55-64 ans"]]),
    notes: "Part des personnes en emploi dans la population de la tranche d'âge (enquête Forces de travail, concept de population résidente).",
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("productivite/taux-emploi", "productivite/taux-emploi.csv", res, out, dims)
})

// 7. Poids de l'industrie manufacturière dans la valeur ajoutée
await run("productivite/industrie-manufacturiere", async () => {
  const dims = { nace_r2: "C", na_item: "B1G", unit: "PC_TOT", sinceTimePeriod: "1995" }
  let url, rows, method = "PC_TOT"
  try {
    ;({ url, rows } = await fetchPanel("nama_10_a10", PANEL, dims))
    if (!rows.length) throw new Error("PC_TOT empty")
  } catch (e) {
    console.log(`  ! PC_TOT unavailable (${e.message.slice(0, 60)}), computing C / TOTAL from CP_MEUR`)
    method = "C/TOTAL CP_MEUR"
    const alt = await fetchPanel("nama_10_a10", PANEL, { nace_r2: ["C", "TOTAL"], na_item: "B1G", unit: "CP_MEUR", sinceTimePeriod: "1995" })
    url = alt.url
    const tot = {}
    for (const r of alt.rows) if (r.nace_r2 === "TOTAL") tot[`${r.geo}|${r.time}`] = r.value
    rows = alt.rows.filter((r) => r.nace_r2 === "C" && tot[`${r.geo}|${r.time}`]).map((r) => ({ ...r, value: round((100 * r.value) / tot[`${r.geo}|${r.time}`], 2) }))
  }
  const out = countryRows(rows)
  const res = writeSeries("productivite", "industrie-manufacturiere", out, meta({
    dataset: "nama_10_a10", url, unit: "% de la valeur ajoutée",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Part de l'industrie manufacturière (section C de la NACE rév. 2) dans la valeur ajoutée brute totale de l'économie, aux prix courants (SEC 2010).",
  }))
  record("productivite/industrie-manufacturiere", "productivite/industrie-manufacturiere.csv", res, out, dims, { method })
})

// 8. Espérance de vie à 65 ans
await run("demographie/esperance-vie-65", async () => {
  const dims = { age: "Y65", sex: ["M", "F"], sinceTimePeriod: "1990" }
  const { url, rows } = await fetchPanel("demo_mlexpec", PANEL_UK, dims)
  const out = countryRows(rows, (r) => (r.sex === "M" ? "-hommes" : "-femmes"))
  const res = writeSeries("demographie", "esperance-vie-65", out, meta({
    dataset: "demo_mlexpec", url, unit: "années",
    seriesLabels: prune(panelLabels(PANEL_UK, [["-hommes", " – hommes"], ["-femmes", " – femmes"]]), [...new Set(out.map((r) => r.series))]),
    notes: "Nombre moyen d'années restant à vivre à 65 ans, hommes et femmes, selon les conditions de mortalité de l'année (tables de mortalité Eurostat).",
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("demographie/esperance-vie-65", "demographie/esperance-vie-65.csv", res, out, dims)
})

// 9. Ratio de dépendance des personnes âgées
await run("demographie/ratio-dependance", async () => {
  const dims = { indic_de: "OLDDEP1", sinceTimePeriod: "1990" }
  const { url, rows } = await fetchPanel("demo_pjanind", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("demographie", "ratio-dependance", out, meta({
    dataset: "demo_pjanind", url, unit: "personnes de 65 ans ou plus pour 100 personnes de 15 à 64 ans",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Ratio de dépendance des personnes âgées (1re variante) : population de 65 ans ou plus rapportée à la population de 15 à 64 ans au 1er janvier.",
  }))
  record("demographie/ratio-dependance", "demographie/ratio-dependance.csv", res, out, dims)
})

// 10. Dépendance énergétique
await run("defense/dependance-energetique", async () => {
  const dims = { siec: "TOTAL", unit: "PC", sinceTimePeriod: "1990" }
  const { url, rows } = await fetchPanel("nrg_ind_id", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("defense", "dependance-energetique", out, meta({
    dataset: "nrg_ind_id", url, unit: "% (importations nettes / consommation brute)",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Taux de dépendance énergétique : importations nettes rapportées à la consommation intérieure brute d'énergie (tous produits, soutes maritimes internationales incluses).",
  }))
  record("defense/dependance-energetique", "defense/dependance-energetique.csv", res, out, dims)
})

// 11. Indice de Gini
await run("cohesion-sociale/gini", async () => {
  const dims = { age: "TOTAL", statinfo: "GINI_HND", sinceTimePeriod: "2005" }
  const { url, rows } = await fetchPanel("ilc_di12", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("cohesion-sociale", "gini", out, meta({
    dataset: "ilc_di12", url, unit: "indice de Gini (0-100)",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Coefficient de Gini du revenu disponible équivalent (EU-SILC) : 0 = égalité parfaite, 100 = un seul individu détient tout le revenu ; la série diffusée par Eurostat dans ilc_di12 commence en 2014.",
  }))
  record("cohesion-sociale/gini", "cohesion-sociale/gini.csv", res, out, dims)
})

// 12. Écart salarial femmes-hommes
await run("cohesion-sociale/ecart-salarial-fh", async () => {
  const dims = { nace_r2: "B-S_X_O", unit: "PC", sinceTimePeriod: "2007" }
  const { url, rows } = await fetchPanel("earn_gr_gpgr2", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("cohesion-sociale", "ecart-salarial-fh", out, meta({
    dataset: "earn_gr_gpgr2", url, unit: "% (écart non ajusté, salaire horaire brut)",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Écart de rémunération non ajusté : différence entre le salaire horaire brut moyen des hommes et celui des femmes, en pourcentage du salaire masculin, entreprises de 10 salariés ou plus (industrie, construction et services hors administration publique).",
  }))
  record("cohesion-sociale/ecart-salarial-fh", "cohesion-sociale/ecart-salarial-fh.csv", res, out, dims)
})

// 13. Taux d'emploi femmes / hommes 20-64
await run("cohesion-sociale/taux-emploi-femmes-hommes", async () => {
  const dims = { indic_em: "EMP_LFS", unit: "PC_POP", age: "Y20-64", sex: ["F", "M"], sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("lfsi_emp_a", PANEL, dims)
  const out = countryRows(rows, (r) => (r.sex === "F" ? "-femmes" : "-hommes"))
  const res = writeSeries("cohesion-sociale", "taux-emploi-femmes-hommes", out, meta({
    dataset: "lfsi_emp_a", url, unit: "% de la population 20-64 ans",
    seriesLabels: panelLabels(PANEL, [["-femmes", " – femmes"], ["-hommes", " – hommes"]]),
    notes: "Part des femmes et des hommes de 20 à 64 ans en emploi (enquête Forces de travail, concept de population résidente).",
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("cohesion-sociale/taux-emploi-femmes-hommes", "cohesion-sociale/taux-emploi-femmes-hommes.csv", res, out, dims)
})

// 14. NEET 18-24
await run("education/neet", async () => {
  const dims = { age: "Y18-24", sex: "T", unit: "PC", training: "NO_FE_NO_NFE", wstatus: "NEMP", sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("edat_lfse_20", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("education", "neet", out, meta({
    dataset: "edat_lfse_20", url, unit: "% des 18-24 ans",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Jeunes de 18 à 24 ans ni en emploi, ni en études, ni en formation (NEET : non employés et sans éducation formelle ou non formelle au cours des quatre dernières semaines), enquête Forces de travail.",
  }))
  record("education/neet", "education/neet.csv", res, out, dims)
})

// 15. Sorties précoces du système scolaire
await run("education/sorties-precoces", async () => {
  const dims = { sex: "T", unit: "PC", wstatus: "POP", age: "Y18-24", sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("edat_lfse_14", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("education", "sorties-precoces", out, meta({
    dataset: "edat_lfse_14", url, unit: "% des 18-24 ans",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Part des 18-24 ans ayant au plus un diplôme du premier cycle du secondaire (CITE 0-2) et ne suivant ni études ni formation (enquête Forces de travail).",
  }))
  record("education/sorties-precoces", "education/sorties-precoces.csv", res, out, dims)
})

// ---------------------------------------------------------------- report

// 16. Chômage harmonisé annuel, comparaison européenne (même définition BIT que la série Insee)
await run("productivite/chomage-europe", async () => {
  const dims = { age: "Y15-74", sex: "T", unit: "PC_ACT", sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("une_rt_a", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("productivite", "chomage-europe", out, meta({
    dataset: "une_rt_a", url, unit: "% de la population active",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Taux de chômage harmonisé au sens du Bureau international du travail, 15-74 ans, moyenne annuelle : même définition que la série trimestrielle de l'Insee, appliquée à tous les pays.",
  }))
  record("productivite/chomage-europe", "productivite/chomage-europe.csv", res, out, dims)
})

// 17. Charge d'intérêts par habitant : intérêts en euros (gov_10a_main) rapportés à la population moyenne (demo_gind)
await run("finances-publiques/charge-interets-habitant", async () => {
  const dimsInt = { sector: "S13", na_item: "D41PAY", unit: "MIO_EUR", sinceTimePeriod: "1995" }
  const dimsPop = { indic_de: "AVG", sinceTimePeriod: "1995" }
  const { url: urlInt, rows: rowsInt } = await fetchPanel("gov_10a_main", PANEL, dimsInt)
  const { url: urlPop, rows: rowsPop } = await fetchPanel("demo_gind", PANEL, dimsPop)
  const pop = new Map(rowsPop.map((r) => [`${iso(r.geo)}|${r.time}`, r.value]))
  const out = []
  for (const r of rowsInt) {
    const people = pop.get(`${iso(r.geo)}|${r.time}`)
    if (!people) continue
    // millions d'euros -> euros, divisés par la population moyenne de l'année
    out.push({ period: r.time, series: iso(r.geo), value: round((r.value * 1e6) / people, 0) })
  }
  const res = writeSeries("finances-publiques", "charge-interets-habitant", out, meta({
    dataset: "gov_10a_main, demo_gind", url: `${urlInt} ; ${urlPop}`, unit: "euros par habitant",
    viewUrl: browserUrl("gov_10a_main"),
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Intérêts versés par les administrations publiques (SEC 2010, D41) divisés par la population moyenne de l'année. Deux jeux Eurostat, une seule monnaie : la comparaison ne vaut donc que pour l'Union européenne.",
  }))
  record("finances-publiques/charge-interets-habitant", "finances-publiques/charge-interets-habitant.csv", res, out, { ...dimsInt, population: dimsPop })
})

// 18. Délinquance enregistrée, comparaison européenne (classification ICCS)
const ICCS = {
  ICCS0101: ["homicide", " — homicides volontaires"],
  ICCS020111: ["coups", " — coups et blessures graves"],
  ICCS0301: ["sexuel", " — violences sexuelles"],
  ICCS0401: ["vol-violent", " — vols avec violence"],
  ICCS0501: ["cambriolage", " — cambriolages"],
  ICCS0502: ["vol", " — vols"],
  ICCS0601: ["stupefiants", " — infractions à la législation sur les stupéfiants"],
}
await run("securite/delinquance-europe", async () => {
  const dims = { unit: "P_HTHAB", iccs: Object.keys(ICCS), sinceTimePeriod: "2010" }
  const { url, rows } = await fetchPanel("crim_off_cat", PANEL, dims)
  const out = countryRows(rows, (r) => `-${ICCS[r.iccs][0]}`)
  const codes = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("securite", "delinquance-europe", out, meta({
    dataset: "crim_off_cat", url, unit: "faits enregistrés pour 100 000 habitants",
    seriesLabels: prune(panelLabels(PANEL, Object.values(ICCS).map(([c, t]) => [`-${c}`, t])), codes),
    notes: "Infractions ENREGISTRÉES par la police et la justice, pour 100 000 habitants : ce sont des faits portés à la connaissance des institutions et inscrits dans leurs fichiers, pas des faits commis. Le niveau dépend donc autant de la délinquance réelle que de la propension des victimes à porter plainte et des pratiques d'enregistrement de chaque pays. Les définitions pénales sont harmonisées par la classification internationale des infractions à des fins statistiques (ICCS), mais elles restent imparfaitement comparables d'un pays à l'autre : les comparaisons de niveau sont fragiles, les évolutions dans le temps au sein d'un même pays sont plus solides.",
    lastObservation: null,
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("securite/delinquance-europe", "securite/delinquance-europe.csv", res, out, dims)
})

// 19. Homicides selon le lien entre la victime et l'auteur
const HOM_CAT = { IPTN: "partenaire", FAM: "famille" }
const HOM_SEX = { F: "femmes", M: "hommes" }
await run("securite/homicides-couple", async () => {
  const dims = { unit: "P_HTHAB", pers_cat: ["IPTN", "FAM"], sex: ["F", "M"], sinceTimePeriod: "2010" }
  const { url, rows } = await fetchPanel("crim_hom_vrel", PANEL, dims)
  const out = countryRows(rows, (r) => `-${HOM_CAT[r.pers_cat]}-${HOM_SEX[r.sex]}`)
  const codes = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("securite", "homicides-couple", out, meta({
    dataset: "crim_hom_vrel", url, unit: "victimes pour 100 000 habitants",
    seriesLabels: prune(panelLabels(PANEL, [
      ["-partenaire-femmes", " — femmes tuées par leur partenaire"],
      ["-partenaire-hommes", " — hommes tués par leur partenaire"],
      ["-famille-femmes", " — femmes tuées par un membre de leur famille"],
      ["-famille-hommes", " — hommes tués par un membre de leur famille"],
    ]), codes),
    notes: "Victimes d'homicide volontaire classées selon leur lien avec l'auteur : partenaire ou ex-partenaire intime (IPTN), autre membre de la famille (FAM), pour 100 000 habitants. Données de police et de justice transmises à Eurostat, donc dépendantes de la qualification retenue par chaque pays et de la connaissance de l'auteur. « Féminicide » n'est pas une catégorie statistique : l'indicateur officiellement comparable est le nombre de victimes tuées par leur partenaire ou ex-partenaire, décliné par sexe.",
    lastObservation: null,
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("securite/homicides-couple", "securite/homicides-couple.csv", res, out, dims)
})

// 20. Mortalité routière
await run("securite/morts-routes", async () => {
  const dims = { unit: "P_MHAB", sex: "T", age: "TOTAL", pers_cat: "TOTAL", sinceTimePeriod: "1995" }
  const { url, rows } = await fetchPanel("tran_sf_roadus", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("securite", "morts-routes", out, meta({
    dataset: "tran_sf_roadus", url, unit: "tués pour un million d'habitants",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Personnes tuées dans un accident de la route, rapportées à un million d'habitants. Un tué est une personne décédée sur le coup ou dans les trente jours qui suivent l'accident. Les chiffres proviennent des comptages nationaux (ONISR pour la France) transmis à Eurostat.",
  }))
  record("securite/morts-routes", "securite/morts-routes.csv", res, out, dims)
})

// 21. Dépenses de protection sociale par risque (ESSPROS)
const SPFUNC = {
  TOTAL: ["total", " — total des prestations"],
  OLD: ["vieillesse", " — vieillesse"],
  SICK: ["sante", " — maladie et soins de santé"],
  FAM: ["famille", " — famille et enfants"],
  UNE: ["chomage", " — chômage"],
  DIS: ["invalidite", " — invalidité"],
  HOU: ["logement", " — logement"],
  EXCL: ["exclusion", " — exclusion sociale"],
  SRV: ["survivants", " — survivants"],
}
await run("cohesion-sociale/protection-sociale", async () => {
  const dims = { unit: "PC_GDP", spdeps: "SPR", spfunc: Object.keys(SPFUNC), sinceTimePeriod: "2000" }
  const { url, rows } = await fetchPanel("spr_exp_func", PANEL, dims)
  const out = countryRows(rows, (r) => `-${SPFUNC[r.spfunc][0]}`)
  const codes = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("cohesion-sociale", "protection-sociale", out, meta({
    dataset: "spr_exp_func", url, unit: "% du PIB",
    seriesLabels: prune(panelLabels(PANEL, Object.values(SPFUNC).map(([c, t]) => [`-${c}`, t])), codes),
    notes: "Prestations de protection sociale versées, par risque couvert, en pourcentage du PIB (base ESSPROS, système européen de statistiques intégrées de la protection sociale). Ce périmètre est nettement plus large que le budget de l'État : il englobe la sécurité sociale, les régimes complémentaires, les collectivités locales et les régimes d'employeurs. Les prestations sont comptées brutes, avant impôts et cotisations prélevés sur elles.",
    lastObservation: null,
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("cohesion-sociale/protection-sociale", "cohesion-sociale/protection-sociale.csv", res, out, dims)
})

// 22. Mortalité infantile
await run("demographie/mortalite-infantile", async () => {
  const dims = { indic_de: "INFMORRT", sinceTimePeriod: "1990" }
  const { url, rows } = await fetchPanel("demo_minfind", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("demographie", "mortalite-infantile", out, meta({
    dataset: "demo_minfind", url, unit: "décès avant 1 an pour 1 000 naissances vivantes",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Taux de mortalité infantile : nombre d'enfants décédés avant leur premier anniversaire au cours de l'année, rapporté à 1 000 naissances vivantes de la même année.",
  }))
  record("demographie/mortalite-infantile", "demographie/mortalite-infantile.csv", res, out, dims)
})

// 23. Suicide : taux standardisé de décès
await run("demographie/suicide", async () => {
  const dims = { icd10: "X60-X84_Y870", sex: ["T", "M", "F"], age: "TOTAL", unit: "RT", sinceTimePeriod: "2011" }
  const { url, rows } = await fetchPanel("hlth_cd_asdr2", PANEL, dims)
  // Série principale : les deux sexes pour chaque pays ; le détail hommes / femmes seulement pour la France.
  const kept = rows.filter((r) => r.sex === "T" || r.geo === "FR")
  const out = countryRows(kept, (r) => (r.sex === "T" ? "" : r.sex === "M" ? "-hommes" : "-femmes"))
  const codes = [...new Set(out.map((r) => r.series))]
  const res = writeSeries("demographie", "suicide", out, meta({
    dataset: "hlth_cd_asdr2", url, unit: "décès pour 100 000 habitants, taux standardisé",
    seriesLabels: prune({ ...panelLabels(PANEL), "FRA-hommes": "France — hommes", "FRA-femmes": "France — femmes" }, codes),
    notes: "Décès par lésions auto-infligées intentionnelles (libellé de la classification internationale des maladies, CIM-10, codes X60-X84 et Y87.0), pour 100 000 habitants. Le taux est standardisé sur la structure par âge de la population européenne de référence : il neutralise les différences de pyramide des âges et permet donc de comparer les pays entre eux et une même population dans le temps.",
  }))
  record("demographie/suicide", "demographie/suicide.csv", res, out, dims)
})

// 24. Espérance de vie en bonne santé (années de vie sans incapacité)
const HLE = { HLY_Y0: ["naissance", "à la naissance"], HLY_Y65: ["65", "à 65 ans"] }
const HLE_SEX = { F: ["femmes", "femmes"], M: ["hommes", "hommes"] }
await run("demographie/esperance-vie-bonne-sante", async () => {
  const dims = { unit: "YR", hlth_hle: Object.keys(HLE), sex: Object.keys(HLE_SEX), sinceTimePeriod: "2004" }
  const { url, rows } = await fetchPanel("hlth_hlye", PANEL, dims)
  const out = countryRows(rows, (r) => `-${HLE[r.hlth_hle][0]}-${HLE_SEX[r.sex][0]}`)
  const codes = [...new Set(out.map((r) => r.series))]
  const suffixes = []
  for (const [, [hc, ht]] of Object.entries(HLE)) for (const [, [sc, st]] of Object.entries(HLE_SEX)) suffixes.push([`-${hc}-${sc}`, ` — ${ht}, ${st}`])
  const res = writeSeries("demographie", "esperance-vie-bonne-sante", out, meta({
    dataset: "hlth_hlye", url, unit: "années",
    seriesLabels: prune(panelLabels(PANEL, suffixes), codes),
    notes: "Années de vie en bonne santé (healthy life years) : nombre d'années qu'une personne peut espérer vivre sans limitation d'activité dans les gestes de la vie quotidienne, à la naissance et à 65 ans. L'indicateur combine les tables de mortalité et la question sur les limitations d'activité de l'enquête EU-SILC ; c'est un indicateur structurel européen, sensible à la façon dont les personnes déclarent leurs limitations.",
    lastObservation: null,
  }))
  const fra = out.filter((r) => r.series.startsWith("FRA")).map((r) => r.period).sort()
  res.lastObservation = fra[fra.length - 1]
  record("demographie/esperance-vie-bonne-sante", "demographie/esperance-vie-bonne-sante.csv", res, out, dims)
})

// 25. Primo-demandeurs d'asile : effectifs, puis rapportés à la population
await run("demographie/asile", async () => {
  const dims = { citizen: "TOTAL", applicant: "FRST", sex: "T", age: "TOTAL", unit: "PER", sinceTimePeriod: "2008" }
  const { url, rows } = await fetchPanel("migr_asyappctza", PANEL, dims)
  const out = countryRows(rows)
  const notes = "Demandes d'asile déposées pour la première fois au cours de l'année (primo-demandeurs), hors demandes réitérées. Ce n'est ni l'immigration totale, ni le nombre de titres de séjour délivrés, ni le nombre de personnes obtenant une protection : une demande peut être rejetée."
  const res = writeSeries("demographie", "asile", out, meta({
    dataset: "migr_asyappctza", url, unit: "primo-demandeurs d'asile",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes,
  }))
  record("demographie/asile", "demographie/asile.csv", res, out, dims)

  // Même numérateur, rapporté à la population moyenne de l'année (demo_gind, indic_de = AVG).
  const dimsPop = { indic_de: "AVG", sinceTimePeriod: "2008" }
  const { url: urlPop, rows: rowsPop } = await fetchPanel("demo_gind", PANEL, dimsPop)
  const pop = new Map(rowsPop.map((r) => [`${iso(r.geo)}|${r.time}`, r.value]))
  const outRate = []
  for (const r of rows) {
    const people = pop.get(`${iso(r.geo)}|${r.time}`)
    if (!people) continue
    outRate.push({ period: r.time, series: iso(r.geo), value: round((r.value * 1e5) / people, 1) })
  }
  const resRate = writeSeries("demographie", "asile-habitant", outRate, meta({
    dataset: "migr_asyappctza, demo_gind", url: `${url} ; ${urlPop}`, viewUrl: browserUrl("migr_asyappctza"),
    unit: "primo-demandeurs pour 100 000 habitants",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(outRate.map((r) => r.series))]),
    notes: `${notes} Le nombre de demandes est ici divisé par la population moyenne de l'année (Eurostat, demo_gind), ce qui rend les pays comparables malgré leur taille.`,
  }))
  record("demographie/asile-habitant", "demographie/asile-habitant.csv", resRate, outRate, { ...dims, population: dimsPop })
})

// 26. Inflation harmonisée (IPCH), comparaison européenne
await run("cohesion-sociale/inflation-europe", async () => {
  const dims = { unit: "RCH_A_AVG", coicop: "CP00", sinceTimePeriod: "1997" }
  const { url, rows } = await fetchPanel("prc_hicp_aind", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("cohesion-sociale", "inflation-europe", out, meta({
    dataset: "prc_hicp_aind", url, unit: "% de variation annuelle",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Taux de variation annuel moyen de l'indice des prix à la consommation harmonisé (IPCH), ensemble des postes (CP00). L'IPCH est calculé selon une méthode commune à tous les pays de l'Union, ce qui le rend comparable d'un pays à l'autre ; il diffère légèrement de l'indice des prix à la consommation publié par l'Insee, dont le champ et les pondérations ne sont pas identiques.",
  }))
  record("cohesion-sociale/inflation-europe", "cohesion-sociale/inflation-europe.csv", res, out, dims)
})

// Émissions de GES par secteur (remplace l'inventaire Secten du Citepa, qui n'a pas d'API).
// Même inventaire national au fond : la France soumet son inventaire à la CCNUCC, l'AEE le
// compile et Eurostat le publie sous la nomenclature CRF. Ici on s'en tient au premier niveau.
await run("climat/emissions-secteurs", async () => {
  const SECTORS = {
    CRF1A1: ["energie", "Production d'énergie"],
    CRF1A2: ["industrie-combustion", "Industrie manufacturière et construction (combustion)"],
    CRF1A3: ["transports", "Transports"],
    CRF1A4: ["batiments", "Résidentiel, tertiaire et agriculture (combustion)"],
    CRF2: ["procedes-industriels", "Procédés industriels et usage de produits"],
    CRF3: ["agriculture", "Agriculture (hors combustion)"],
    CRF5: ["dechets", "Déchets"],
    CRF4: ["utcatf", "Terres et forêts (UTCATF, puits de carbone)"],
  }
  const dims = { airpol: "GHG", unit: "MIO_T", src_crf: Object.keys(SECTORS), sinceTimePeriod: "1990" }
  const { url, rows } = await fetchSlice("env_air_gge", { geo: "FR", ...dims })
  const out = rows.map((r) => ({ period: r.time, series: SECTORS[r.src_crf][0], value: round(r.value, 1) }))
  const res = writeSeries("climat", "emissions-secteurs", out, meta({
    dataset: "env_air_gge", url, unit: "Mt CO₂e",
    seriesLabels: Object.fromEntries(Object.values(SECTORS)),
    notes: "Inventaire national des gaz à effet de serre soumis par la France à la CCNUCC, compilé par l'Agence européenne pour l'environnement et publié par Eurostat sous la nomenclature CRF. Émissions produites sur le territoire : les émissions importées n'y figurent pas. L'UTCATF est un solde, négatif quand les terres et les forêts absorbent plus qu'elles n'émettent ; il n'est pas compté dans le total des sept autres secteurs.",
  }))
  record("climat/emissions-secteurs", "climat/emissions-secteurs.csv", res, out, dims, { geos: null })
})

// Dépenses de défense au sens des comptes publics (COFOG GF02) : même référentiel que le
// diagramme du budget de l'État, et une alternative officielle au SIPRI pour l'Europe.
await run("defense/depenses-cofog", async () => {
  const dims = { cofog99: "GF02", na_item: "TE", sector: "S13", unit: "PC_GDP", sinceTimePeriod: "1995" }
  const { url, rows } = await fetchPanel("gov_10a_exp", [...PANEL, "PL"], dims)
  const out = countryRows(rows)
  const res = writeSeries("defense", "depenses-cofog", out, meta({
    dataset: "gov_10a_exp", url, unit: "% du PIB",
    seriesLabels: prune(panelLabels([...PANEL, "PL"]), [...new Set(out.map((r) => r.series))]),
    notes: "Dépense totale des administrations publiques en fonction « Défense » (COFOG GF02, SEC 2010). Ce périmètre comptable n'est pas celui de l'OTAN : il exclut une partie des pensions militaires et la gendarmerie, et les deux chiffres ne se comparent pas. Le même référentiel sert au diagramme des dépenses publiques.",
  }))
  record("defense/depenses-cofog", "defense/depenses-cofog.csv", res, out, dims)
})

// Taux d'effort logement (part des dépenses de logement dans le revenu disponible), EU-SILC.
// Remplace le tableau du Compte du logement du SDES, qui ne publie pas ce taux dans ses annexes.
await run("logement/taux-effort", async () => {
  const dims = { hhcomp: "TOTAL", rskpovth: "TOTAL", unit: "PC", sinceTimePeriod: "2003" }
  const { url, rows } = await fetchPanel("ilc_mded01", PANEL, dims)
  const split = await fetchSlice("ilc_mded01", { geo: "FR", hhcomp: "TOTAL", rskpovth: ["B_60", "A_60"], unit: "PC", sinceTimePeriod: "2003" })
  const out = [
    ...countryRows(rows),
    ...split.rows.map((r) => ({ period: r.time, series: r.rskpovth === "B_60" ? "FRA-pauvres" : "FRA-autres", value: r.value })),
  ]
  const res = writeSeries("logement", "taux-effort", out, meta({
    dataset: "ilc_mded01", url: `${url} ; ${split.url}`, unit: "% du revenu disponible",
    seriesLabels: {
      ...prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
      "FRA-pauvres": "France — ménages sous le seuil de pauvreté",
      "FRA-autres": "France — ménages au-dessus du seuil",
    },
    notes: "Part des dépenses de logement dans le revenu disponible des ménages (EU-SILC). Les dépenses de logement comprennent le loyer ou les remboursements d'emprunt, les charges, l'énergie, l'eau et l'entretien courant, nettes des aides au logement. Le seuil de pauvreté est fixé à 60 % du niveau de vie médian.",
  }))
  record("logement/taux-effort", "logement/taux-effort.csv", res, out, dims)
})

// Variante : taux de surcharge (plus de 40 % du revenu) par statut d'occupation. Définition
// différente du taux d'effort — c'est une part de ménages, pas une part de revenu.
await run("logement/surcharge-statut", async () => {
  const TENURES = {
    TOTAL: ["ensemble", "Ensemble des ménages"],
    OWN_L: ["proprietaire-emprunt", "Propriétaire avec emprunt en cours"],
    OWN_NL: ["proprietaire-sans-emprunt", "Propriétaire sans emprunt"],
    RENT_MKT: ["locataire-prive", "Locataire au prix du marché"],
    RENT_FR: ["locataire-social", "Locataire à loyer réduit ou gratuit"],
  }
  const dims = { tenure: Object.keys(TENURES), unit: "PC", sinceTimePeriod: "2003" }
  const { url, rows } = await fetchSlice("ilc_lvho07c", { geo: "FR", ...dims })
  const out = rows.map((r) => ({ period: r.time, series: TENURES[r.tenure][0], value: r.value }))
  const res = writeSeries("logement", "surcharge-statut", out, meta({
    dataset: "ilc_lvho07c", url, unit: "% des ménages",
    seriesLabels: Object.fromEntries(Object.values(TENURES)),
    notes: "Taux de surcharge des coûts du logement : part des personnes vivant dans un ménage dont les dépenses de logement, aides déduites, dépassent 40 % du revenu disponible. C'est une part de ménages, pas une part de revenu : elle ne se lit pas comme le taux d'effort.",
  }))
  record("logement/surcharge-statut", "logement/surcharge-statut.csv", res, out, dims, { geos: null })
})

// Population carcérale et densité, à la place des PDF mensuels du ministère de la Justice :
// Eurostat publie la capacité officielle et le nombre de personnes détenues, donc la densité.
await run("securite/prisons", async () => {
  const GEOS = ["FR", "DE", "IT", "ES", "PL"]
  const dims = { indic_cr: ["PRIS_ACT_CAP", "PRIS_OFF_CAP"], unit: ["P_HTHAB", "NR"], sinceTimePeriod: "2008" }
  const { url, rows } = await fetchPanel("crim_pris_cap", GEOS, dims)

  const held = rows.filter((r) => r.unit === "P_HTHAB" && r.indic_cr === "PRIS_ACT_CAP")
  const out = held.map((r) => ({ period: r.time, series: iso(r.geo), value: round(r.value, 1) }))
  const res = writeSeries("securite", "prisons", out, meta({
    dataset: "crim_pris_cap", url, unit: "personnes détenues pour 100 000 habitants",
    seriesLabels: prune(panelLabels(GEOS), [...new Set(out.map((r) => r.series))]),
    notes: "Nombre de personnes détenues au 1er septembre de chaque année, rapporté à la population. Cela comprend les personnes en détention provisoire, présumées innocentes.",
  }))
  record("securite/prisons", "securite/prisons.csv", res, out, dims)

  // Densité = détenus / capacité officielle, les deux en effectifs bruts.
  const nr = new Map()
  for (const r of rows) if (r.unit === "NR") nr.set(`${r.geo}|${r.time}|${r.indic_cr}`, r.value)
  const dens = []
  for (const [key, people] of nr) {
    const [geo, time, indic] = key.split("|")
    if (indic !== "PRIS_ACT_CAP") continue
    const cap = nr.get(`${geo}|${time}|PRIS_OFF_CAP`)
    if (!cap) continue
    dens.push({ period: time, series: iso(geo), value: round((people / cap) * 100, 1) })
  }
  const resD = writeSeries("securite", "prisons-densite", dens, meta({
    dataset: "crim_pris_cap", url, unit: "détenus pour 100 places",
    seriesLabels: prune(panelLabels(GEOS), [...new Set(dens.map((r) => r.series))]),
    notes: "Densité carcérale : nombre de personnes détenues rapporté à la capacité officielle des établissements. Au-dessus de 100, il y a plus de détenus que de places. Calculée à partir des deux effectifs bruts publiés par Eurostat, sans arrondi intermédiaire.",
  }))
  record("securite/prisons-densite", "securite/prisons-densite.csv", resD, dens, dims)
})

// Effort public d'éducation au sens des comptes publics (COFOG GF09) : série longue et même
// référentiel que le diagramme des dépenses publiques, là où l'OCDE ne remonte qu'à 2005.
await run("education/depense-education-pib", async () => {
  const dims = { cofog99: "GF09", na_item: "TE", sector: "S13", unit: "PC_GDP", sinceTimePeriod: "1995" }
  const { url, rows } = await fetchPanel("gov_10a_exp", PANEL, dims)
  const out = countryRows(rows)
  const res = writeSeries("education", "depense-education-pib", out, meta({
    dataset: "gov_10a_exp", url, unit: "% du PIB",
    seriesLabels: prune(panelLabels(PANEL), [...new Set(out.map((r) => r.series))]),
    notes: "Dépense totale des administrations publiques en fonction « Enseignement » (COFOG GF09, SEC 2010), de la maternelle au supérieur, recherche universitaire comprise. C'est l'argent public seul : la dépense intérieure d'éducation de la DEPP ajoute les familles et les entreprises, et se situe donc plus haut.",
  }))
  record("education/depense-education-pib", "education/depense-education-pib.csv", res, out, dims)
})

const lines = [`# Eurostat – rapport de récupération (${today()})`, "", `Script : \`${SCRIPT}\` — API : ${API}<dataset>?format=JSON&lang=EN&…`, ""]
for (const r of report) {
  lines.push(`## ${r.chart}`)
  if (r.failure) { lines.push(`- **ÉCHEC** : ${r.failure}`, ""); continue }
  lines.push(`- fichier : \`data/series/${r.file}\``)
  lines.push(`- séries : ${r.series.join(", ")}`)
  lines.push(`- années : ${r.first} → ${r.last} ; lastObservation (France) : **${r.lastObservation}**`)
  lines.push(`- dimensions : \`${JSON.stringify(r.dims)}\``)
  if (r.method) lines.push(`- méthode : ${r.method}`)
  if (r.year) lines.push(`- année retenue : ${r.year}`)
  lines.push("")
}
const failures = report.filter((r) => r.failure)
lines.push(`---`, `${report.length - failures.length} fichiers écrits, ${failures.length} échec(s).`, "")
// Un rapport qui n'a rien écrit ne doit pas remplacer celui qui décrit les données du dépôt.
if (report.length > failures.length) {
  writeFileSync(resolve(SERIES_DIR, "EUROSTAT-REPORT.md"), lines.join("\n"))
  console.log(`\nRapport : data/series/EUROSTAT-REPORT.md (${failures.length} échec(s))`)
} else {
  console.error(`\nAucune série écrite : data/series/EUROSTAT-REPORT.md est laissé en l'état.`)
}
if (failures.length) process.exitCode = 1
