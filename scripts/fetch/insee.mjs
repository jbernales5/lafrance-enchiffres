// INSEE time series -> data/series/<category>/<chart>.{csv,meta.json}
// Sources (no API key needed):
//   - BDM SDMX:  https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/<idbank>[+<idbank>…]
//   - Melodi:    https://api.insee.fr/melodi/data/<DATASET>?<dim>=<code>&…
//   - insee.fr:  fichier .xlsx d'une figure, quand la série longue n'existe ni dans la BDM ni dans Melodi
// Every idbank is verified against an expected title before being used: a wrong idbank
// makes the chart fail loudly instead of silently producing the wrong series.
// Run: node scripts/fetch/insee.mjs      (from webapp-v2)
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { SERIES_DIR, fetchBuffer, fetchJson, fetchText, round, today, writeSeries } from "../lib/series.mjs"
import { readXlsx } from "../lib/xlsx.mjs"

const BDM = "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/"
const MELODI = "https://api.insee.fr/melodi/data/"
const SCRIPT = "scripts/fetch/insee.mjs"
const seriePage = (idbank) => `https://www.insee.fr/fr/statistiques/serie/${idbank}`

const report = []
const failures = []

// ---------------------------------------------------------------------------------------------
// BDM helpers

/** "2024-T1" -> "2024-Q1"; other formats (2024, 2024-Q1, 2024-03) are already contract-compliant. */
function normPeriod(p) {
  return p.replace(/^(\d{4})-T([1-4])$/, "$1-Q$2")
}

/**
 * Fetches one or several idbanks, returns Map<idbank, { title, freq, lastUpdate, obs: [[period, value]] }>.
 * Parsed with regexes: <Series IDBANK=… TITLE_FR=…> … <Obs TIME_PERIOD=… OBS_VALUE=…/> … </Series>
 */
async function fetchBdm(idbanks) {
  const url = BDM + idbanks.join("+")
  const xml = await fetchText(url)
  const out = new Map()
  const attr = (s, k) => (new RegExp(`\\b${k}="([^"]*)"`).exec(s) || [])[1]
  const seriesRe = /<Series ([^>]*)>([\s\S]*?)<\/Series>/g
  let m
  while ((m = seriesRe.exec(xml))) {
    const head = m[1]
    const obs = []
    const obsRe = /<Obs ([^>]*)\/>/g
    let o
    while ((o = obsRe.exec(m[2]))) {
      const p = attr(o[1], "TIME_PERIOD")
      const v = attr(o[1], "OBS_VALUE")
      if (p && v !== undefined && v !== "") obs.push([normPeriod(p), Number(v)])
    }
    obs.sort((a, b) => a[0].localeCompare(b[0]))
    out.set(attr(head, "IDBANK"), {
      title: decodeXml(attr(head, "TITLE_FR") ?? ""),
      freq: attr(head, "FREQ"),
      lastUpdate: attr(head, "LAST_UPDATE"),
      obs,
    })
  }
  return { url, series: out }
}

function decodeXml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

/**
 * spec: { code: { idbank, title: RegExp, label } }. Fetches all idbanks at once, checks each title
 * against its RegExp (throws if any mismatch/missing), logs titles, returns { url, data: {code -> serie}, verified }.
 */
async function loadBdm(spec) {
  const idbanks = Object.values(spec).map((s) => s.idbank)
  const { url, series } = await fetchBdm(idbanks)
  const data = {}
  const verified = []
  for (const [code, s] of Object.entries(spec)) {
    const got = series.get(s.idbank)
    if (!got) throw new Error(`idbank ${s.idbank} (${code}) absent from BDM response`)
    if (!s.title.test(got.title)) throw new Error(`idbank ${s.idbank} (${code}) title mismatch: "${got.title}" !~ ${s.title}`)
    if (!got.obs.length) throw new Error(`idbank ${s.idbank} (${code}) has no observations`)
    console.log(`    ${s.idbank} ${code.padEnd(24)} ${got.obs[0][0]} → ${got.obs.at(-1)[0]}  ${got.title}`)
    data[code] = got
    verified.push({ idbank: s.idbank, code, title: got.title, first: got.obs[0][0], last: got.obs.at(-1)[0] })
  }
  return { url, idbanks, data, verified }
}

const rows = (code, obs, fn = (v) => v) => obs.map(([period, value]) => ({ period, series: code, value: fn(value) }))

/** Sums a monthly (12) or quarterly (4) series into complete calendar years. */
function annualSums(obs, perYear) {
  const byYear = {}
  for (const [p, v] of obs) (byYear[p.slice(0, 4)] ??= []).push(v)
  return Object.entries(byYear)
    .filter(([, vals]) => vals.length === perYear)
    .map(([year, vals]) => [year, vals.reduce((a, b) => a + b, 0)])
}

/** Compounds year-on-year growth rates (%) into an index, rebased so that index[baseYear] = 100. */
function compound(obs, baseYear) {
  const idx = []
  let level = 100
  idx.push([String(Number(obs[0][0]) - 1), level])
  for (const [p, g] of obs) {
    level *= 1 + g / 100
    idx.push([p, level])
  }
  const base = idx.find(([p]) => p === baseYear)?.[1]
  if (!base) throw new Error(`base year ${baseYear} missing`)
  return idx.map(([p, v]) => [p, round((v / base) * 100, 2)])
}

// ---------------------------------------------------------------------------------------------
// Melodi helpers

/** GET /melodi/data/<ds>?<params>; returns observations as [{ dims, value, unit }]. */
async function fetchMelodi(dataset, params) {
  const qs = Object.entries(params)
    .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((x) => `${k}=${encodeURIComponent(x)}`))
    .join("&")
  const url = `${MELODI}${dataset}?${qs}&maxResult=5000`
  const json = await fetchJson(url)
  const obs = (json.observations ?? []).map((o) => ({
    dims: o.dimensions,
    value: o.measures?.OBS_VALUE_NIVEAU?.value,
    unit: o.attributes?.UNIT_MEASURE,
  }))
  return { url, obs }
}

// ---------------------------------------------------------------------------------------------
// Charts

async function chart(category, name, fn) {
  console.log(`\n▶ ${category}/${name}`)
  try {
    const r = await fn()
    report.push({ category, name, ...r })
    console.log(`  ✔ ${r.result.rows} rows, series ${r.result.series.join(", ")}, last ${r.result.lastObservation}`)
  } catch (e) {
    console.error(`  ✖ ${e.message}`)
    failures.push({ category, name, error: e.message })
  }
}

function finish(category, name, allRows, meta, mainSeries, verified, extra = {}) {
  const main = allRows.filter((r) => r.series === mainSeries && r.value !== null && r.value !== undefined).map((r) => r.period).sort()
  if (!main.length) throw new Error(`la série principale « ${mainSeries} » est vide`)
  const result = writeSeries(category, name, allRows, { ...meta, lastObservation: main.at(-1), script: SCRIPT })
  const first = allRows.map((r) => r.period).sort()[0]
  return { result, verified, first, last: result.lastObservation, meta, ...extra }
}

// 1. Taux de chômage BIT, France hors Mayotte, CVS
await chart("productivite", "chomage", async () => {
  const geo = "France hors Mayotte - Données CVS$"
  const { url, idbanks, data, verified } = await loadBdm({
    ensemble: { idbank: "001688527", title: new RegExp(`^Taux de chômage au sens du BIT - Ensemble - ${geo}`) },
    femmes: { idbank: "001688533", title: new RegExp(`^Taux de chômage au sens du BIT - Femmes - ${geo}`) },
    hommes: { idbank: "001688535", title: new RegExp(`^Taux de chômage au sens du BIT - Hommes - ${geo}`) },
    "15-24": { idbank: "001688537", title: new RegExp(`^Taux de chômage au sens du BIT - Ensemble des moins de 25 ans - ${geo}`) },
    "25-49": { idbank: "001688529", title: new RegExp(`^Taux de chômage au sens du BIT - Ensemble des 25 à 49 ans - ${geo}`) },
    "50-plus": { idbank: "001688531", title: new RegExp(`^Taux de chômage au sens du BIT - Ensemble des 50 ans ou plus - ${geo}`) },
  })
  const all = Object.entries(data).flatMap(([code, s]) => rows(code, s.obs))
  return finish("productivite", "chomage", all, {
    source: { name: "Insee", idbanks, url: seriePage("001688527"), downloadUrl: url },
    unit: "% de la population active",
    frequency: "quarterly",
    seriesLabels: { ensemble: "Ensemble", femmes: "Femmes", hommes: "Hommes", "15-24": "15-24 ans", "25-49": "25-49 ans", "50-plus": "50 ans ou plus" },
    notes: "Taux de chômage au sens du BIT (enquête Emploi), France hors Mayotte, données trimestrielles corrigées des variations saisonnières ; la série « 15-24 ans » correspond aux moins de 25 ans.",
  }, "ensemble", verified)
})

// 2. Halo autour du chômage (milliers), France entière, CVS
await chart("productivite", "halo-chomage", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    halo: { idbank: "011818564", title: /^Personnes dans le halo autour du chômage - Ensemble \(en milliers\) - France entière - Données CVS$/ },
  })
  return finish("productivite", "halo-chomage", rows("halo", data.halo.obs), {
    source: { name: "Insee", idbanks, url: seriePage("011818564"), downloadUrl: url },
    unit: "milliers de personnes",
    frequency: "quarterly",
    seriesLabels: { halo: "Halo autour du chômage" },
    notes: "Personnes inactives souhaitant travailler mais non classées au chômage au sens du BIT (non disponibles ou sans recherche active), France entière, données CVS de l'enquête Emploi.",
  }, "halo", verified)
})

// 3. Naissances, décès, solde naturel — France métropolitaine, 1946→
await chart("demographie", "naissances-deces", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    naissances: { idbank: "000067677", title: /^Démographie - Naissances vivantes - France métropolitaine$/ },
    deces: { idbank: "000067679", title: /^Démographie - Décès de tous âges - France métropolitaine$/ },
  })
  const since = (obs) => obs.filter(([p]) => Number(p) >= 1946)
  const n = since(data.naissances.obs)
  const d = new Map(since(data.deces.obs))
  const all = [
    ...rows("naissances", n, (v) => round(v / 1000, 1)),
    ...rows("deces", since(data.deces.obs), (v) => round(v / 1000, 1)),
    ...n.filter(([p]) => d.has(p)).map(([p, v]) => ({ period: p, series: "solde-naturel", value: round((v - d.get(p)) / 1000, 1) })),
  ]
  return finish("demographie", "naissances-deces", all, {
    source: { name: "Insee", idbanks, url: seriePage("000067677"), downloadUrl: url },
    unit: "milliers",
    frequency: "annual",
    seriesLabels: { naissances: "Naissances vivantes", deces: "Décès", "solde-naturel": "Solde naturel" },
    notes: "Bilan démographique (état civil), champ France métropolitaine pour disposer d'une série homogène depuis 1946 ; la dernière année est provisoire et le solde naturel est calculé comme naissances moins décès.",
  }, "naissances", verified)
})

// 4. Indice Notaires-Insee des prix des logements anciens, base 100 en 2015, CVS
await chart("logement", "prix-logements-anciens", async () => {
  const t = (geo, type) => new RegExp(`^Indice des prix des logements anciens - ${geo} ${type} - Base 100 en moyenne annuelle 2015 - [Ss]érie CVS$`)
  const { url, idbanks, data, verified } = await loadBdm({
    FRA: { idbank: "010567059", title: t("France métropolitaine -", "Ensemble") },
    idf: { idbank: "010567079", title: t("Île-de-France :", "Ensemble") },
    province: { idbank: "010567073", title: t("Province -", "Ensemble") },
    appartements: { idbank: "010567057", title: t("France métropolitaine -", "Appartements") },
    maisons: { idbank: "010567061", title: t("France métropolitaine -", "Maisons") },
  })
  const all = Object.entries(data).flatMap(([code, s]) => rows(code, s.obs))
  return finish("logement", "prix-logements-anciens", all, {
    source: { name: "Insee", idbanks, url: seriePage("010567059"), downloadUrl: url },
    unit: "indice, base 100 en moyenne annuelle 2015",
    frequency: "quarterly",
    seriesLabels: { FRA: "France métropolitaine", idf: "Île-de-France", province: "Province", appartements: "Appartements (France métro.)", maisons: "Maisons (France métro.)" },
    notes: "Indices Notaires-Insee des prix des logements anciens, séries corrigées des variations saisonnières, France métropolitaine ; l'indice Province démarre fin 1994.",
  }, "FRA", verified)
})

// 5. Indice des loyers (base 100 janvier 2019) + IRL rebasé
await chart("logement", "indice-loyers", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    FRA: { idbank: "010600365", title: /^Indice des loyers – Tous secteurs – France métropolitaine – Base 100 en janvier 2019$/ },
    irl: { idbank: "001515333", title: /^Indice de référence des loyers \(IRL\)$/ },
  })
  const irlBase = data.irl.obs.find(([p]) => p === "2019-Q1")?.[1]
  if (!irlBase) throw new Error("IRL 2019-Q1 missing, cannot rebase")
  const all = [...rows("FRA", data.FRA.obs), ...rows("irl", data.irl.obs, (v) => round((v / irlBase) * 100, 2))]
  return finish("logement", "indice-loyers", all, {
    source: { name: "Insee", idbanks, url: seriePage("010600365"), downloadUrl: url },
    unit: "indice, base 100 en janvier 2019",
    frequency: "quarterly",
    seriesLabels: { FRA: "Indice des loyers (tous secteurs, France métro.)", irl: "IRL (rebasé T1 2019 = 100)" },
    notes: "Indice des loyers d'habitation tous secteurs (libre et social), France métropolitaine, base 100 en janvier 2019 ; l'indice de référence des loyers (IRL, base 100 au T4 1998 à la source) est rebasé ici sur le T1 2019 pour être comparable.",
  }, "FRA", verified)
})

// 6. Construction : logements autorisés et commencés, cumul 12 mois, France hors Mayotte
await chart("logement", "construction", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    autorises: { idbank: "001718158", title: /^Nombre de logements autorisés - Cumul sur douze mois - Total - France hors Mayotte - Estimations en date réelle$/ },
    commences: { idbank: "001718270", title: /^Nombre de logements commencés - Cumul sur douze mois - Total - France hors Mayotte - Estimations en date réelle$/ },
  })
  const all = Object.entries(data).flatMap(([code, s]) => rows(code, s.obs, (v) => round(v / 1000, 1)))
  return finish("logement", "construction", all, {
    source: { name: "Insee", idbanks, url: seriePage("001718158"), downloadUrl: url },
    unit: "milliers de logements (cumul sur 12 mois)",
    frequency: "monthly",
    seriesLabels: { autorises: "Logements autorisés", commences: "Logements commencés" },
    notes: "Statistiques Sit@del2 du SDES diffusées par l'Insee, estimations en date réelle, cumul glissant sur douze mois, France hors Mayotte.",
  }, "autorises", verified)
})

// 7. Pouvoir d'achat du RDB par unité de consommation — Melodi DD_CNA_AGREGATS (base 2020), growth -> index
await chart("cohesion-sociale", "pouvoir-achat", async () => {
  const { url, obs } = await fetchMelodi("DD_CNA_AGREGATS", { STO: ["_PAM_UC", "_PAA_UC"] })
  const pick = (sto) =>
    obs
      .filter((o) => o.dims.STO === sto && o.dims.REF_SECTOR === "S14" && o.dims.TRANSFORMATION === "GY" && o.dims.UNIT_MEASURE === "PT" && typeof o.value === "number")
      .map((o) => [o.dims.TIME_PERIOD, o.value])
      .sort((a, b) => a[0].localeCompare(b[0]))
  const pam = pick("_PAM_UC")
  const paa = pick("_PAA_UC")
  if (pam.length < 30) throw new Error(`_PAM_UC: only ${pam.length} observations`)
  if (paa.length < 30) throw new Error(`_PAA_UC: only ${paa.length} observations`)
  const geo = [...new Set(obs.map((o) => o.dims.GEO))].join(",")
  console.log(`    Melodi DD_CNA_AGREGATS S14 GY: _PAM_UC ${pam[0][0]}→${pam.at(-1)[0]} (${pam.length}), _PAA_UC ${paa[0][0]}→${paa.at(-1)[0]} (${paa.length}), GEO ${geo}`)
  const all = [...rows("FRA", compound(pam, "2015")), ...rows("arbitrable", compound(paa, "2015"))]
  const verified = [
    { idbank: "DD_CNA_AGREGATS STO=_PAM_UC (S14, GY, PT)", code: "FRA", title: "Pouvoir d'achat du revenu disponible brut des ménages par unité de consommation, évolution annuelle en %", first: pam[0][0], last: pam.at(-1)[0] },
    { idbank: "DD_CNA_AGREGATS STO=_PAA_UC (S14, GY, PT)", code: "arbitrable", title: "Pouvoir d'achat arbitrable par unité de consommation, évolution annuelle en %", first: paa[0][0], last: paa.at(-1)[0] },
  ]
  return finish("cohesion-sociale", "pouvoir-achat", all, {
    source: { name: "Insee", dataset: "DD_CNA_AGREGATS", codes: ["_PAM_UC", "_PAA_UC"], url: "https://www.insee.fr/fr/statistiques/8988934", downloadUrl: url },
    unit: "indice, base 100 en 2015",
    frequency: "annual",
    seriesLabels: { FRA: "Pouvoir d'achat du RDB par unité de consommation", arbitrable: "Pouvoir d'achat arbitrable par unité de consommation" },
    notes: "Comptes nationaux annuels base 2020 (Melodi, jeu DD_CNA_AGREGATS) : l'Insee ne diffuse que les évolutions annuelles en %, cumulées ici en indice base 100 en 2015 ; le pouvoir d'achat arbitrable exclut les dépenses pré-engagées (loyers, assurances, abonnements…).",
  }, "FRA", verified, { melodi: true })
})

// 8. SMIC mensuel brut / net pour 35 h
await chart("cohesion-sociale", "smic", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    brut: { idbank: "000879877", title: /^Montant mensuel brut du Smic .* pour 35 heures de travail par semaine/ },
    net: { idbank: "000879878", title: /^Montant mensuel net du Smic .* pour 35 heures de travail par semaine/ },
  })
  const all = Object.entries(data).flatMap(([code, s]) => rows(code, s.obs))
  return finish("cohesion-sociale", "smic", all, {
    source: { name: "Insee", idbanks, url: seriePage("000879877"), downloadUrl: url },
    unit: "euros par mois",
    frequency: "monthly",
    seriesLabels: { brut: "SMIC mensuel brut (35 h)", net: "SMIC mensuel net (35 h)" },
    notes: "Montant mensuel du Smic pour 35 heures hebdomadaires (151,67 h par mois), France entière ; le net est calculé après CSG et CRDS ; la série mensuelle 35 h de la BDM débute en juillet 2005.",
  }, "brut", verified)
})

// 9. Taux de pauvreté monétaire (Melodi DS_ERFS_RETROPOLE, 1996→) — et niveau de vie médian dans un fichier séparé (unité différente)
const erfsTotal = (o) => ["EMPSTA_ENQ", "AGE", "TPH", "MUN_DENSITY_LEVEL"].every((k) => o.dims[k] === "_T") && typeof o.value === "number"
await chart("cohesion-sociale", "pauvrete", async () => {
  const { url, obs } = await fetchMelodi("DS_ERFS_RETROPOLE", { ERFS_MEASURE: ["PR_MD60", "PR_MD50"] })
  const pick = (m) => obs.filter((o) => erfsTotal(o) && o.dims.ERFS_MEASURE === m).map((o) => [o.dims.TIME_PERIOD, o.value]).sort((a, b) => a[0].localeCompare(b[0]))
  const t60 = pick("PR_MD60")
  const t50 = pick("PR_MD50")
  if (t60.length < 20) throw new Error(`PR_MD60: only ${t60.length} observations`)
  const units = [...new Set(obs.map((o) => o.unit))].join(",")
  console.log(`    Melodi DS_ERFS_RETROPOLE PR_MD60 ${t60[0][0]}→${t60.at(-1)[0]} (${t60.length}), PR_MD50 ${t50.length}, unit ${units}, GEO ${[...new Set(obs.map((o) => o.dims.GEO))]}`)
  const all = [...rows("taux-60", t60), ...rows("taux-50", t50)]
  const verified = [
    { idbank: "DS_ERFS_RETROPOLE ERFS_MEASURE=PR_MD60", code: "taux-60", title: "Taux de pauvreté monétaire au seuil de 60 % du niveau de vie médian (ensemble, données rétropolées)", first: t60[0][0], last: t60.at(-1)[0] },
    { idbank: "DS_ERFS_RETROPOLE ERFS_MEASURE=PR_MD50", code: "taux-50", title: "Taux de pauvreté monétaire au seuil de 50 % du niveau de vie médian (ensemble, données rétropolées)", first: t50[0]?.[0], last: t50.at(-1)?.[0] },
  ]
  return finish("cohesion-sociale", "pauvrete", all, {
    source: { name: "Insee", dataset: "DS_ERFS_RETROPOLE", codes: ["PR_MD60", "PR_MD50"], url: "https://www.insee.fr/fr/statistiques/9019316", downloadUrl: url },
    unit: "% de la population",
    frequency: "annual",
    seriesLabels: { "taux-60": "Seuil à 60 % du niveau de vie médian", "taux-50": "Seuil à 50 % du niveau de vie médian" },
    notes: "Enquête Revenus fiscaux et sociaux (ERFS), France métropolitaine, personnes vivant dans un ménage ordinaire, séries rétropolées pour tenir compte des ruptures méthodologiques ; la dernière année est provisoire.",
  }, "taux-60", verified, { melodi: true })
})

await chart("cohesion-sociale", "niveau-vie", async () => {
  const { url, obs } = await fetchMelodi("DS_ERFS_RETROPOLE", { ERFS_MEASURE: ["MED_SL"] })
  const med = obs.filter((o) => erfsTotal(o) && o.dims.ERFS_MEASURE === "MED_SL").map((o) => [o.dims.TIME_PERIOD, o.value]).sort((a, b) => a[0].localeCompare(b[0]))
  if (med.length < 20) throw new Error(`MED_SL: only ${med.length} observations`)
  const unit = [...new Set(obs.map((o) => o.unit))].join(",")
  if (unit !== "EUR_ANNUEL") throw new Error(`MED_SL unexpected unit ${unit}`)
  const lastYear = med.at(-1)[0]
  console.log(`    Melodi DS_ERFS_RETROPOLE MED_SL ${med[0][0]}→${lastYear} (${med.length}), unit ${unit}`)
  const verified = [{ idbank: "DS_ERFS_RETROPOLE ERFS_MEASURE=MED_SL", code: "median", title: `Niveau de vie médian annuel, en euros constants ${lastYear} (ensemble, données rétropolées)`, first: med[0][0], last: lastYear }]
  return finish("cohesion-sociale", "niveau-vie", rows("median", med), {
    source: { name: "Insee", dataset: "DS_ERFS_RETROPOLE", codes: ["MED_SL"], url: "https://www.insee.fr/fr/statistiques/9019316", downloadUrl: url },
    unit: `euros constants ${lastYear} par an`,
    frequency: "annual",
    seriesLabels: { median: "Niveau de vie médian" },
    notes: `Niveau de vie médian des personnes (revenu disponible par unité de consommation), ERFS, France métropolitaine, exprimé en euros constants de ${lastYear}, séries rétropolées.`,
  }, "median", verified, { melodi: true })
})

// 10. Créations d'entreprises — sommes annuelles de données mensuelles brutes
await chart("entreprises", "creations", async () => {
  const t = (what) => new RegExp(`^Nombre de créations d'entreprises [-–] ${what} [-–] France [-–] Données mensuelles brutes$`)
  const { url, idbanks, data, verified } = await loadBdm({
    ensemble: { idbank: "010755537", title: t("Ensemble") },
    "hors-micro": { idbank: "011811818", title: t("Entreprises classiques [-–] Ensemble") },
    industrie: { idbank: "010755565", title: t("Industrie manufacturière, industries extractives et autres [-–] Ensemble") },
    construction: { idbank: "010755434", title: t("Construction [-–] Ensemble") },
    commerce: { idbank: "010755432", title: t("Commerce [-–] Ensemble") },
    "hebergement-restauration": { idbank: "010755559", title: t("Hébergement et restauration [-–] Ensemble") },
    "enseignement-sante": { idbank: "010755541", title: t("Administration publique, enseignement, santé humaine et action sociale [-–] Ensemble") },
  })
  const all = Object.entries(data).flatMap(([code, s]) => rows(code, annualSums(s.obs, 12), (v) => round(v / 1000, 1)))
  return finish("entreprises", "creations", all, {
    source: { name: "Insee", idbanks, url: seriePage("010755537"), downloadUrl: url },
    unit: "milliers",
    frequency: "annual",
    seriesLabels: {
      ensemble: "Ensemble",
      "hors-micro": "Hors micro-entrepreneurs (entreprises classiques)",
      industrie: "Industrie",
      construction: "Construction",
      commerce: "Commerce",
      "hebergement-restauration": "Hébergement et restauration",
      "enseignement-sante": "Administration, enseignement, santé, action sociale",
    },
    notes: "Répertoire Sirene, méthode 2022, France entière : totaux annuels calculés en sommant les douze mois de données brutes ; « entreprises classiques » désigne les sociétés et entrepreneurs individuels hors micro-entrepreneurs.",
  }, "ensemble", verified)
})

// 11. Défaillances d'entreprises par date de jugement — sommes annuelles de données trimestrielles brutes
await chart("entreprises", "defaillances", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    ensemble: { idbank: "001656164", title: /^Nombre de défaillances d'entreprises par date de jugement - Données brutes - France - Tous secteurs d'activité$/ },
  })
  const all = rows("ensemble", annualSums(data.ensemble.obs, 4), (v) => round(v / 1000, 1))
  return finish("entreprises", "defaillances", all, {
    source: { name: "Insee", idbanks, url: seriePage("001656164"), downloadUrl: url },
    unit: "milliers",
    frequency: "annual",
    seriesLabels: { ensemble: "Défaillances d'entreprises" },
    notes: "Ouvertures de procédures de redressement ou de liquidation judiciaire (Bodacc, via la Banque de France), datées du jugement, France entière : totaux annuels calculés en sommant les quatre trimestres bruts.",
  }, "ensemble", verified)
})

// 13. Inflation : glissement annuel de l'indice des prix à la consommation
await chart("cohesion-sociale", "inflation", async () => {
  const { url, idbanks, data, verified } = await loadBdm({
    glissement: {
      idbank: "011814632",
      title: /^Indice des prix à la consommation - Base 2025 - Glissement annuel - Ensemble des ménages - France - Nomenclature Coicop : 00 - Ensemble$/,
    },
  })
  return finish("cohesion-sociale", "inflation", rows("glissement", data.glissement.obs), {
    source: { name: "Insee", idbanks, url: seriePage("011814632"), downloadUrl: url },
    unit: "% de variation sur un an",
    frequency: "monthly",
    seriesLabels: { glissement: "Inflation (glissement annuel de l'IPC)" },
    notes:
      "Indice des prix à la consommation, base 2025, champ France (métropole et DOM hors Mayotte), ensemble des ménages, ensemble des postes de la nomenclature Coicop (« 00 - Ensemble », donc TABAC COMPRIS et hors loyers imputés) : variation de l'indice par rapport au même mois de l'année précédente, en données brutes. L'IPC diffère légèrement de l'indice des prix à la consommation harmonisé (IPCH) utilisé pour les comparaisons européennes et par la BCE, dont le champ et les pondérations ne sont pas identiques.",
  }, "glissement", verified)
})

// 14. Part des immigrés dans la population — figure « Population immigrée et étrangère en France »
// (l'Insee ne diffuse cette série longue ni dans la BDM ni dans Melodi, seulement en .xlsx sur insee.fr)
await chart("demographie", "immigres", async () => {
  const url = "https://www.insee.fr/fr/statistiques/fichier/2381757/demo-etran-part-pop-etran-immig.xlsx"
  const sheet = readXlsx(await fetchBuffer(url)).sheet("Figure 1")
  const title = String(sheet[0]?.find((c) => c) ?? "")
  if (!/^Population immigrée en France/.test(title)) throw new Error(`titre inattendu : "${title}"`)
  const head = sheet.findIndex((r) => String(r[0] ?? "").trim() === "Année")
  if (head < 0) throw new Error("ligne d'en-tête « Année » introuvable")
  if (!/Immigr/.test(String(sheet[head][1] ?? ""))) throw new Error(`colonne 2 inattendue : "${sheet[head][1]}"`)
  if (!/Part.*%/s.test(String(sheet[head + 1][2] ?? ""))) throw new Error(`colonne « Part (en %) » inattendue : "${sheet[head + 1][2]}"`)

  const obs = []
  for (const r of sheet.slice(head + 2)) {
    const y = /^((?:18|19|20)\d{2})/.exec(String(r[0] ?? "").trim())
    const v = typeof r[2] === "number" ? r[2] : null
    if (y && v !== null) obs.push([y[1], v])
  }
  obs.sort((a, b) => a[0].localeCompare(b[0]))
  if (obs.length < 20) throw new Error(`seulement ${obs.length} années lues`)
  const note = sheet.find((r) => /^Champ :/.test(String(r[0] ?? "")))?.[0] ?? ""
  console.log(`    Figure 1 « ${title} » — ${obs[0][0]} → ${obs.at(-1)[0]} (${obs.length} points)`)

  const verified = [{
    idbank: "insee.fr/fr/statistiques/2381757 — Figure 1, colonne « Part (en %) »",
    code: "part-immigres",
    title: `${title} — part des immigrés rapportée à la population totale`,
    first: obs[0][0],
    last: obs.at(-1)[0],
  }]
  return finish("demographie", "immigres", rows("part-immigres", obs), {
    source: {
      name: "Insee",
      dataset: "Population immigrée et étrangère en France — Figure 1",
      url: "https://www.insee.fr/fr/statistiques/2381757",
      downloadUrl: url,
    },
    unit: "% de la population",
    frequency: "annual",
    seriesLabels: { "part-immigres": "Part des immigrés dans la population" },
    notes:
      `Un immigré est une personne née étrangère à l'étranger et résidant en France ; certains ont depuis acquis la nationalité française, et les personnes nées françaises à l'étranger n'en font pas partie. Recensements de la population puis estimations annuelles : les points sont espacés jusqu'en 1999 (années de recensement), annuels ensuite à partir de 2006. ${note} L'amélioration du protocole de collecte du recensement rend les années 2024 et 2025 non directement comparables aux précédentes, et les deux dernières sont provisoires.`,
  }, "part-immigres", verified, { keyLabel: "Fichier Insee" })
})

// ---------------------------------------------------------------------------------------------
// Report

const md = []
md.push(`# Séries INSEE — rapport de récupération`, ``, `Généré par \`${SCRIPT}\` le ${today()}.`, ``)
md.push(`Endpoints utilisés sans clé : BDM SDMX (\`${BDM}<idbank>\`) et Melodi (\`${MELODI}<dataset>?…\`).`, ``)
md.push(`| Graphe | Fichier | Séries | Période | Dernière obs. |`, `|---|---|---|---|---|`)
for (const r of report) {
  md.push(`| ${r.category}/${r.name} | \`data/series/${r.category}/${r.name}.csv\` | ${r.result.series.join(", ")} | ${r.first} → ${r.last} | ${r.result.lastObservation} |`)
}
md.push(``)
for (const r of report) {
  md.push(`## ${r.category}/${r.name}`, ``)
  md.push(`- Fichier : \`data/series/${r.category}/${r.name}.csv\` (${r.result.rows} lignes), unité « ${r.meta.unit} », fréquence ${r.meta.frequency}, dernière observation **${r.result.lastObservation}**.`)
  md.push(`- Source : ${r.meta.source.url}`)
  for (const u of r.result.downloadUrls) md.push(`- Requête : ${u}`)
  md.push(`- ${r.meta.notes}`)
  md.push(``, `| ${r.keyLabel ?? (r.melodi ? "Jeu / code Melodi" : "Idbank")} | Code série | Titre vérifié | Période |`, `|---|---|---|---|`)
  for (const v of r.verified) md.push(`| ${v.idbank} | \`${v.code}\` | ${v.title} | ${v.first} → ${v.last} |`)
  md.push(``)
}
md.push(`## Échecs`, ``)
if (!failures.length) md.push(`Aucun.`)
for (const f of failures) md.push(`- **${f.category}/${f.name}** : ${f.error}`)
md.push(``)
writeFileSync(resolve(SERIES_DIR, "INSEE-REPORT.md"), md.join("\n"))

console.log(`\n${report.length} charts written, ${failures.length} failed. Report: data/series/INSEE-REPORT.md`)
if (failures.length) process.exitCode = 1
