// Sources françaises hors Insee -> data/series/<category>/<chart>.{csv,meta.json}
// Sources (aucune clé d'API) :
//   - data.gouv.fr    API /api/1/datasets/<slug>/ pour résoudre l'URL exacte de la ressource, puis CSV/TXT/XLSX
//   - DREES           Opendatasoft https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/… (pièces jointes .xlsx)
//   - CNAF            Opendatasoft https://data.caf.fr/api/explore/v2.1/catalog/datasets/<id>/records
// Chaque fichier est vérifié (en-têtes, libellés de lignes, titres de feuilles) avant d'être utilisé :
// une source qui change de structure fait échouer le graphe au lieu de produire une série fausse.
// Run: node scripts/fetch/france.mjs      (from webapp-v2)
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { SERIES_DIR, fetchBuffer, fetchJson, fetchText, round, splitCsvLine, today, writeSeries } from "../lib/series.mjs"
import { readXlsx } from "../lib/xlsx.mjs"

const SCRIPT = "scripts/fetch/france.mjs"
const DATAGOUV = "https://www.data.gouv.fr/api/1/datasets/"
const DREES = "https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/"
const CAF = "https://data.caf.fr/api/explore/v2.1/catalog/datasets/"

const report = []
const failures = []

// ---------------------------------------------------------------------------------------------
// Helpers

const rows = (code, pairs, fn = (v) => v) => pairs.map(([period, value]) => ({ period: String(period), series: code, value: fn(value) }))

/** "1 234,5" / "12,3" -> number ; "" / "-" / "nd" -> null. */
function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (v === null || v === undefined) return null
  const s = String(v).replace(/[\s ]/g, "").replace(",", ".")
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

/** Lecture d'un fichier séparé, en réutilisant le découpage de `scripts/lib/series.mjs`. */
function parseDsv(text, sep) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((l) => l.length)
  const header = splitCsvLine(lines[0], sep)
  return { header, rows: lines.slice(1).map((l) => Object.fromEntries(splitCsvLine(l, sep).map((v, i) => [header[i], v]))) }
}

/** data.gouv: dataset metadata, and the single resource whose url/title matches `re` (throws otherwise). */
async function datagouv(slug) {
  const ds = await fetchJson(`${DATAGOUV}${slug}/`)
  const pick = (re, where = "url") => {
    // data.gouv laisse parfois deux entrées pointer vers le même fichier : on dédoublonne par URL.
    const hits = [...new Map(ds.resources.filter((r) => re.test(String(r[where] ?? ""))).map((r) => [r.url, r])).values()]
    if (hits.length !== 1) throw new Error(`data.gouv ${slug}: ${hits.length} resources match ${re} on ${where}`)
    return hits[0]
  }
  const all = (re, where = "url") => ds.resources.filter((r) => re.test(String(r[where] ?? "")))
  /** Même fichier republié plusieurs fois (2024) : on prend la version la plus récente. */
  const latest = (re, where = "url") => {
    const hits = all(re, where).sort((a, b) => String(a.last_modified ?? a.created_at ?? "").localeCompare(String(b.last_modified ?? b.created_at ?? "")))
    if (!hits.length) throw new Error(`data.gouv ${slug}: no resource matches ${re} on ${where}`)
    return hits.at(-1)
  }
  return { ds, page: `https://www.data.gouv.fr/datasets/${slug}`, pick, all, latest }
}

/** DREES / CNAF Opendatasoft attachment (.xlsx), read into a workbook. */
async function odsAttachment(base, dataset, attachmentId) {
  const url = `${base}${dataset}/attachments/${attachmentId}`
  return { url, wb: readXlsx(await fetchBuffer(url)) }
}

/** Checks a sheet's title cell, so a reshuffled workbook fails loudly. */
function checkTitle(sheet, re, what) {
  const got = String(sheet[0]?.find((c) => c) ?? "")
  if (!re.test(got)) throw new Error(`${what}: unexpected title "${got}" !~ ${re}`)
  return got.trim()
}

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
  if (!main.length) throw new Error(`series "${mainSeries}" is empty`)
  const result = writeSeries(category, name, allRows, { ...meta, lastObservation: main.at(-1), script: SCRIPT })
  const first = allRows.map((r) => r.period).sort()[0]
  return { result, verified, first, last: result.lastObservation, meta, ...extra }
}

// ---------------------------------------------------------------------------------------------
// A. Délinquance enregistrée par la police et la gendarmerie (SSMSI)

const DELINQUANCE_SLUG =
  "bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales"

// code de série -> libellé exact de l'indicateur dans la base SSMSI (aucun libellé approché : si
// l'intitulé change, la série est signalée absente au lieu d'être silencieusement remplacée).
const DELINQUANCE_INDICATEURS = {
  homicides: "Homicides",
  "coups-blessures": "Violences physiques hors cadre familial",
  "coups-blessures-intrafamiliaux": "Violences physiques intrafamiliales",
  "violences-sexuelles": "Violences sexuelles",
  "vols-violents": "Vols violents sans arme",
  "vols-sans-violence": "Vols sans violence contre des personnes",
  cambriolages: "Cambriolages de logement",
  "vols-vehicules": "Vols de véhicule",
  degradations: "Destructions et dégradations volontaires",
  "stupefiants-usage": "Usage de stupéfiants",
  "stupefiants-trafic": "Trafic de stupéfiants",
  escroqueries: "Escroqueries et fraudes aux moyens de paiement",
}

await chart("securite", "delinquance", async () => {
  const { page, pick } = await datagouv(DELINQUANCE_SLUG)
  // Base régionale (~350 Ko) : la plus petite qui porte à la fois les faits et la population Insee.
  const res = pick(/^REG - Base statistique régionale/, "title")
  const { header, rows: raw } = parseDsv(await fetchText(res.url), ";")
  for (const col of ["Code_region", "annee", "indicateur", "unite_de_compte", "nombre", "insee_pop"]) {
    if (!header.includes(col)) throw new Error(`colonne "${col}" absente de ${res.url} (${header.join(", ")})`)
  }

  // Population France = somme des populations régionales de l'année (une seule valeur par région/année).
  const pop = {}
  for (const r of raw) ((pop[r.annee] ??= {})[r.Code_region] = num(r.insee_pop))
  const popFrance = Object.fromEntries(
    Object.entries(pop).map(([y, byReg]) => [y, Object.values(byReg).reduce((a, b) => a + b, 0)]),
  )
  const years = Object.keys(popFrance).sort()
  const nbRegions = new Set(Object.values(pop).map((p) => Object.keys(p).length))
  if (nbRegions.size !== 1) throw new Error(`nombre de régions variable selon l'année : ${[...nbRegions].join(", ")}`)
  console.log(`    ${res.url.split("/").pop()} — ${years[0]}→${years.at(-1)}, ${[...nbRegions][0]} régions, pop ${years.at(-1)} = ${popFrance[years.at(-1)]}`)

  const present = new Set(raw.map((r) => r.indicateur))
  const allRows = []
  const verified = []
  const seriesLabels = {}
  for (const [code, indicateur] of Object.entries(DELINQUANCE_INDICATEURS)) {
    if (!present.has(indicateur)) {
      console.log(`    – ${code.padEnd(30)} absent (« ${indicateur} »)`)
      continue
    }
    const sub = raw.filter((r) => r.indicateur === indicateur)
    const unites = [...new Set(sub.map((r) => r.unite_de_compte))]
    if (unites.length !== 1) throw new Error(`${indicateur} : unités de compte multiples (${unites.join(", ")})`)
    const byYear = {}
    for (const r of sub) byYear[r.annee] = (byYear[r.annee] ?? 0) + (num(r.nombre) ?? 0)
    const pairs = Object.entries(byYear).sort().map(([y, n]) => [y, round((n / popFrance[y]) * 1000, 3)])
    allRows.push(...rows(code, pairs))
    seriesLabels[code] = `${indicateur} (${unites[0].toLowerCase()})`
    verified.push({ idbank: `indicateur = « ${indicateur} »`, code, title: `${indicateur} — unité de compte : ${unites[0]}`, first: pairs[0][0], last: pairs.at(-1)[0] })
    console.log(`    ${code.padEnd(30)} ${pairs[0][0]}→${pairs.at(-1)[0]}  ${indicateur} (${unites[0]})`)
  }
  if (verified.length < 8) throw new Error(`seulement ${verified.length} indicateurs retrouvés`)

  return finish("securite", "delinquance", allRows, {
    source: { name: "SSMSI (ministère de l'Intérieur), via data.gouv.fr", dataset: res.title, url: page, downloadUrl: res.url },
    unit: "faits enregistrés pour 1 000 habitants",
    frequency: "annual",
    seriesLabels,
    notes:
      "Ces chiffres sont des FAITS ENREGISTRÉS par la police et la gendarmerie nationales : ils dépendent de la propension des victimes à porter plainte et des pratiques d'enregistrement des services, et ne mesurent donc pas les faits réellement commis. La hausse des violences sexuelles enregistrées reflète ainsi largement la hausse des plaintes, pas seulement celle des faits. Taux calculés en agrégeant les bases régionales du SSMSI (France entière, DOM compris) et en rapportant les faits à la population Insee ; l'unité de compte varie selon l'indicateur (victime, infraction, véhicule, mis en cause) et les niveaux ne sont pas comparables d'un indicateur à l'autre.",
  }, "cambriolages", verified)
})

// ---------------------------------------------------------------------------------------------
// B. Minima sociaux : nombre d'allocataires par dispositif (DREES)

const MINIMA_DATASET = "336_minima-sociaux-rsa-et-prime-d-activite"
const MINIMA_DISPOSITIFS = {
  rsa: /^Revenu de solidarité active \(RSA\)/,
  aah: /^Allocation aux adultes handicapés \(AAH\)/,
  ass: /^Allocation de solidarité spécifique \(ASS\)/,
  aspa: /^Allocation supplémentaire vieillesse \(ASV\) et allocation de solidarité aux personnes âgées \(ASPA\)/,
}

await chart("cohesion-sociale", "minima-sociaux", async () => {
  const { url, wb } = await odsAttachment(DREES, MINIMA_DATASET, "minima_sociaux_donnees_nationales_par_dispositif_xlsx")
  const sheet = wb.sheet("Tableau 2")
  checkTitle(sheet, /^Tableau 2 Nombre d'allocataires au 31 décembre de chaque année par dispositif - France/, "DREES minima sociaux")

  // Ligne d'en-tête : la première dont au moins cinq cellules sont des années.
  const isYear = (v) => /^\d{4}/.test(String(v ?? ""))
  const head = sheet.find((r) => r.filter(isYear).length >= 5)
  if (!head) throw new Error("ligne des années introuvable")
  // Colonnes dupliquées ("2009 (8)", "2016 (12)", 2017) = changement de méthode : on garde la dernière.
  const yearOfCol = head.map((v) => (isYear(v) ? String(v).slice(0, 4) : null))

  const allRows = []
  const verified = []
  for (const [code, re] of Object.entries(MINIMA_DISPOSITIFS)) {
    const row = sheet.find((r) => re.test(String(r[1] ?? "")))
    if (!row) throw new Error(`dispositif ${code} introuvable (${re})`)
    const byYear = {}
    yearOfCol.forEach((y, i) => {
      const v = num(row[i])
      if (y && v !== null) byYear[y] = v
    })
    const pairs = Object.entries(byYear).sort()
    if (pairs.length < 10) throw new Error(`${code} : seulement ${pairs.length} années`)
    allRows.push(...rows(code, pairs, (v) => round(v / 1000, 1)))
    verified.push({ idbank: `${MINIMA_DATASET} — Tableau 2`, code, title: String(row[1]).trim(), first: pairs[0][0], last: pairs.at(-1)[0] })
    console.log(`    ${code.padEnd(6)} ${pairs[0][0]}→${pairs.at(-1)[0]} (${pairs.length})  ${String(row[1]).trim()}`)
  }

  return finish("cohesion-sociale", "minima-sociaux", allRows, {
    source: {
      name: "DREES",
      dataset: "Minima sociaux, RSA et prime d'activité — Tableau 2 (données nationales par dispositif)",
      url: `https://data.drees.solidarites-sante.gouv.fr/explore/dataset/${MINIMA_DATASET}/information/`,
      downloadUrl: url,
    },
    unit: "milliers d'allocataires",
    frequency: "annual",
    seriesLabels: {
      rsa: "RSA (socle)",
      aah: "Allocation aux adultes handicapés (AAH)",
      ass: "Allocation de solidarité spécifique (ASS)",
      aspa: "Minimum vieillesse (ASV puis ASPA)",
    },
    notes:
      "Nombre d'allocataires au 31 décembre, France entière (sources CNAF, MSA, France Travail, CNAV, FSV, caisses des DOM, compilées par la DREES). Il s'agit d'allocataires, pas de personnes couvertes : conjoints et enfants à charge ne sont pas comptés. Plusieurs ruptures : le RSA socle remplace le RMI et l'API en 2009 (2011 dans les DOM), la CNAF a changé de système statistique en 2016, et le minimum vieillesse est compté en date d'entrée en jouissance depuis 2021 ; quand deux valeurs coexistent pour une même année, la plus récente méthode est retenue.",
  }, "aah", verified)
})

// ---------------------------------------------------------------------------------------------
// C. Pauvreté avant et après redistribution (DREES)

const REDIST_DATASET = "4230_indicateurs-de-pauvrete-avant-et-apres-redistribution-de-niveau-de-vie-et-d"

await chart("cohesion-sociale", "redistribution", async () => {
  const { url, wb } = await odsAttachment(DREES, REDIST_DATASET, "pauvrete_redistribution_decomposition_revenu_2012_2023_vf_xlsx")

  /** Tableaux 2a/2b : ligne « Taux de pauvreté (en %) » / « à 60 % », colonnes = années. */
  const taux = (sheetName, titleRe) => {
    const sheet = wb.sheet(sheetName)
    const title = checkTitle(sheet, titleRe, `DREES ${sheetName}`)
    const head = sheet.find((r) => r.filter((v) => /^(19|20)\d{2}$/.test(String(v ?? ""))).length >= 5)
    if (!head) throw new Error(`${sheetName} : ligne des années introuvable`)
    const row = sheet.find((r) => /^Taux de pauvreté \(en %\)/.test(String(r[0] ?? "")))
    if (!row) throw new Error(`${sheetName} : ligne « Taux de pauvreté (en %) » introuvable`)
    if (!/^à 60 ?%/.test(String(row[1] ?? "").trim())) throw new Error(`${sheetName} : le premier seuil n'est pas « à 60 % » mais « ${row[1]} »`)
    const pairs = []
    head.forEach((y, i) => {
      const v = num(row[i])
      if (/^(19|20)\d{2}$/.test(String(y ?? "")) && v !== null) pairs.push([String(y), round(v, 2)])
    })
    if (pairs.length < 8) throw new Error(`${sheetName} : seulement ${pairs.length} années`)
    return { title, pairs }
  }

  const avant = taux("Tableau 2a", /^Tableau 2a - Indicateurs de pauvreté et d'inégalités avant redistribution/)
  const apres = taux("Tableau 2b", /^Tableau 2b - Indicateurs de pauvreté et d'inégalités après redistribution/)
  for (const [code, t] of [["avant", avant], ["apres", apres]]) {
    console.log(`    ${code.padEnd(6)} ${t.pairs[0][0]}→${t.pairs.at(-1)[0]} (${t.pairs.length})  ${t.title}`)
  }

  const allRows = [...rows("avant", avant.pairs), ...rows("apres", apres.pairs)]
  const verified = [
    { idbank: `${REDIST_DATASET} — Tableau 2a`, code: "avant", title: `${avant.title} — ligne « Taux de pauvreté (en %) », seuil à 60 %`, first: avant.pairs[0][0], last: avant.pairs.at(-1)[0] },
    { idbank: `${REDIST_DATASET} — Tableau 2b`, code: "apres", title: `${apres.title} — ligne « Taux de pauvreté (en %) », seuil à 60 %`, first: apres.pairs[0][0], last: apres.pairs.at(-1)[0] },
  ]

  return finish("cohesion-sociale", "redistribution", allRows, {
    source: {
      name: "DREES",
      dataset: "Pauvreté avant et après redistribution, niveau de vie et décomposition du revenu — Tableaux 2a et 2b",
      url: `https://data.drees.solidarites-sante.gouv.fr/explore/dataset/${REDIST_DATASET}/information/`,
      downloadUrl: url,
    },
    unit: "% de la population",
    frequency: "annual",
    seriesLabels: {
      avant: "Taux de pauvreté avant redistribution",
      apres: "Taux de pauvreté après redistribution",
    },
    notes:
      "Part de la population vivant sous le seuil de 60 % du niveau de vie médian, mesurée avant puis après redistribution : l'écart entre les deux courbes est précisément ce que corrigent les impôts directs et les prestations sociales (prestations familiales, aides au logement, minima sociaux, prime d'activité, moins l'impôt sur le revenu, la CSG-CRDS et la taxe d'habitation). Enquête Revenus fiscaux et sociaux (Insee-DGFiP-CNAF-CNAV-CCMSA), traitements DREES, France métropolitaine ; 2020 est absente (enquête fragilisée) et la refonte de l'ERFS en 2021 crée une rupture avec les années antérieures.",
  }, "apres", verified)
})

// ---------------------------------------------------------------------------------------------
// D. Allocataires CNAF : RSA, prime d'activité, aides au logement

const CAF_DATASET = "s_ben_nat"
const CAF_CHAMPS = { rsa: "indfoy_rsa", "prime-activite": "indfoy_ppa", apl: "indfoy_ndural" }

await chart("cohesion-sociale", "allocataires-cnaf", async () => {
  const meta = await fetchJson(`${CAF}${CAF_DATASET}`)
  const title = meta.metas?.default?.title ?? ""
  if (!/Répartition des allocataires selon la prestation \[National\]/.test(title)) {
    throw new Error(`jeu CNAF ${CAF_DATASET} : titre inattendu « ${title} »`)
  }
  const fields = new Set((meta.fields ?? []).map((f) => f.name))
  for (const f of Object.values(CAF_CHAMPS)) if (!fields.has(f)) throw new Error(`champ CNAF ${f} absent`)

  const select = ["dtreffre", ...Object.values(CAF_CHAMPS)].join(",")
  const url = `${CAF}${CAF_DATASET}/records?select=${select}&order_by=dtreffre%20asc&limit=100`
  const records = []
  for (let offset = 0; ; offset += 100) {
    const page = await fetchJson(`${url}&offset=${offset}`)
    records.push(...page.results)
    if (records.length >= page.total_count || !page.results.length) break
  }
  const dec = records.filter((r) => String(r.dtreffre).endsWith("-12"))
  if (dec.length < 5) throw new Error(`seulement ${dec.length} mois de décembre dans ${records.length} enregistrements`)
  console.log(`    ${CAF_DATASET} — ${records.length} mois (${records[0].dtreffre}→${records.at(-1).dtreffre}), ${dec.length} décembres retenus`)

  const allRows = []
  const verified = []
  for (const [code, field] of Object.entries(CAF_CHAMPS)) {
    const pairs = dec.map((r) => [String(r.dtreffre).slice(0, 4), num(r[field])]).filter(([, v]) => v !== null)
    if (pairs.length !== dec.length) throw new Error(`${code} : valeurs manquantes`)
    allRows.push(...rows(code, pairs, (v) => round(v / 1000, 1)))
    verified.push({ idbank: `${CAF_DATASET}.${field} (décembre)`, code, title: (meta.fields.find((f) => f.name === field)?.label ?? field), first: pairs[0][0], last: pairs.at(-1)[0] })
    console.log(`    ${code.padEnd(15)} ${pairs[0][0]}→${pairs.at(-1)[0]} (${pairs.length})  ${field}`)
  }

  return finish("cohesion-sociale", "allocataires-cnaf", allRows, {
    source: {
      name: "CNAF",
      dataset: `${CAF_DATASET} — ${title}`,
      url: `https://data.caf.fr/explore/dataset/${CAF_DATASET}/information/`,
      downloadUrls: [`${url}&offset=0`],
      howToObtain:
        "L'API limite chaque réponse à 100 enregistrements : le script parcourt les pages successives en incrémentant le paramètre `offset` jusqu'à épuisement du jeu.",
    },
    unit: "milliers d'allocataires",
    frequency: "annual",
    seriesLabels: {
      rsa: "RSA",
      "prime-activite": "Prime d'activité",
      apl: "Aides au logement (APL, ALF, ALS)",
    },
    notes:
      "Foyers allocataires des caisses d'allocations familiales en décembre de chaque année, France entière ; les allocataires du régime agricole (MSA) ne sont pas comptés. « Aides au logement » agrège l'APL, l'ALF et l'ALS. Un foyer peut percevoir plusieurs prestations : les trois séries ne s'additionnent pas. La série mensuelle CNAF ne commence qu'en juin 2016.",
  }, "rsa", verified)
})

// ---------------------------------------------------------------------------------------------
// G. Abstention au premier tour des présidentielles et des législatives

/** Fichiers CDSP (Sciences Po) diffusés sur data.gouv : résultats par circonscription, colonnes Inscrits/Votants. */
async function cdspAbstention(slug, re) {
  const { page, all } = await datagouv(slug)
  const res = all(re)
  if (res.length < 8) throw new Error(`${slug} : ${res.length} fichiers de 1er tour trouvés`)
  const out = []
  for (const r of res) {
    const year = re.exec(r.url)[1]
    const { header, rows: circ } = parseDsv(await fetchText(r.url), ",")
    const ki = header.find((h) => /^Inscrits$/i.test(h.trim()))
    const kv = header.find((h) => /^Votants$/i.test(h.trim()))
    if (!ki || !kv) throw new Error(`${r.url} : colonnes Inscrits/Votants absentes (${header.slice(0, 8).join(", ")})`)
    const inscrits = circ.reduce((a, x) => a + (num(x[ki]) ?? 0), 0)
    const votants = circ.reduce((a, x) => a + (num(x[kv]) ?? 0), 0)
    if (inscrits < 20e6) throw new Error(`${r.url} : ${inscrits} inscrits, fichier suspect`)
    out.push([year, round(100 * (1 - votants / inscrits), 2), `${circ.length} circonscriptions, ${inscrits} inscrits`])
  }
  return { page, rows: out.sort() }
}

/** Fichier « France entière » du ministère de l'Intérieur (txt latin1, une ligne FE avec % Abs/Ins). */
async function mifeAbstention(slug, reResource) {
  const { page, pick } = await datagouv(slug)
  const res = pick(reResource)
  const { header, rows: lines } = parseDsv(await fetchText(res.url, "windows-1252"), ";")
  if (!header.includes("% Abs/Ins")) throw new Error(`${res.url} : colonne « % Abs/Ins » absente`)
  const fe = lines.find((l) => l["Code du niveau"] === "FE")
  if (!fe) throw new Error(`${res.url} : ligne « FE » absente`)
  const v = num(fe["% Abs/Ins"])
  if (v === null) throw new Error(`${res.url} : % Abs/Ins illisible`)
  return { page, url: res.url, value: round(v, 2), detail: `${fe["Inscrits"]} inscrits` }
}

await chart("finances-publiques", "abstention", async () => {
  const sources = []
  const verified = []
  const push = (code, year, value, provenance, detail) => {
    verified.push({ idbank: provenance, code, title: `Abstention au 1er tour, ${year}`, first: year, last: `${value} % — ${detail}` })
    return { period: year, series: code, value }
  }

  const allRows = []

  // 1965-2012 (présidentielles) et 1958-2012 (législatives) : fichiers CDSP par circonscription.
  const presi = await cdspAbstention("elections-presidentielles-1965-2012-1", /cdsp_presi(\d{4})t1_circ\.csv$/)
  sources.push({ name: "CDSP / Sciences Po (data.gouv.fr)", url: presi.page })
  for (const [year, value, detail] of presi.rows) allRows.push(push("presidentielle", year, value, "CDSP cdsp_presiYYYYt1_circ.csv", detail))

  const legi = await cdspAbstention("elections-legislatives-1958-2012", /cdsp_legi(\d{4})(?:t1)?_circ\.csv$/)
  sources.push({ name: "CDSP / Sciences Po (data.gouv.fr)", url: legi.page })
  for (const [year, value, detail] of legi.rows) allRows.push(push("legislative", year, value, "CDSP cdsp_legiYYYYt1_circ.csv", detail))

  // 2017 présidentielle : seul fichier machine-lisible du ministère, résultats par bureau de vote (34 Mo).
  {
    const { page, pick } = await datagouv("election-presidentielle-des-23-avril-et-7-mai-2017-resultats-definitifs-du-1er-tour-par-bureaux-de-vote")
    const res = pick(/\.txt$/)
    const { header, rows: bv } = parseDsv(await fetchText(res.url, "windows-1252"), ";")
    if (!header.includes("Inscrits") || !header.includes("Votants")) throw new Error(`${res.url} : colonnes Inscrits/Votants absentes`)
    const inscrits = bv.reduce((a, x) => a + (num(x["Inscrits"]) ?? 0), 0)
    const votants = bv.reduce((a, x) => a + (num(x["Votants"]) ?? 0), 0)
    allRows.push(push("presidentielle", "2017", round(100 * (1 - votants / inscrits), 2), "Ministère de l'Intérieur, PR17_BVot_T1_FE.txt", `${bv.length} bureaux, ${inscrits} inscrits`))
    sources.push({ name: "Ministère de l'Intérieur (data.gouv.fr)", url: page })
  }

  // 2022 présidentielle et 2022 législatives : fichiers « France entière » du ministère.
  for (const [code, year, slug] of [
    ["presidentielle", "2022", "election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour"],
    ["legislative", "2022", "elections-legislatives-des-12-et-19-juin-2022-resultats-definitifs-du-premier-tour"],
  ]) {
    const r = await mifeAbstention(slug, /resultats-par-niveau-fe-t1-france-entiere\.txt$/)
    allRows.push(push(code, year, r.value, `Ministère de l'Intérieur, ${r.url.split("/").pop()}`, r.detail))
    sources.push({ name: "Ministère de l'Intérieur (data.gouv.fr)", url: r.page })
  }

  // 2017 et 2024 législatives : classeurs « France entière » du ministère.
  {
    const { page, pick } = await datagouv("elections-legislatives-des-11-et-18-juin-2017-resultats-du-1er-tour")
    const res = pick(/\.xlsx$/)
    const sheet = readXlsx(await fetchBuffer(res.url)).sheet("FE - Metro - OM - T1")
    const cell = (label) => {
      const row = sheet.find((r) => String(r[0] ?? "").trim() === label)
      if (!row) throw new Error(`législatives 2017 : ligne « ${label} » absente`)
      return num(row[1])
    }
    const inscrits = cell("Inscrits")
    const votants = cell("Votants")
    allRows.push(push("legislative", "2017", round(100 * (1 - votants / inscrits), 2), `Ministère de l'Intérieur, ${res.url.split("/").pop()} (feuille « FE - Metro - OM - T1 »)`, `${inscrits} inscrits`))
    sources.push({ name: "Ministère de l'Intérieur (data.gouv.fr)", url: page })
  }
  {
    const { page, latest } = await datagouv("elections-legislatives-des-30-juin-et-7-juillet-2024-resultats-definitifs-du-1er-tour")
    const res = latest(/resultats-definitifs-france-entiere\.xlsx$/)
    const wb = readXlsx(await fetchBuffer(res.url))
    const sheet = wb.sheet(wb.sheetNames[0])
    const head = sheet[0].map((c) => String(c ?? "").trim())
    const fe = sheet.find((r) => String(r[0] ?? "").trim() === "FE")
    if (!fe) throw new Error("législatives 2024 : ligne « FE » absente")
    const inscrits = num(fe[head.indexOf("Inscrits")])
    const votants = num(fe[head.indexOf("Votants")])
    if (!inscrits || !votants) throw new Error("législatives 2024 : Inscrits/Votants illisibles")
    allRows.push(push("legislative", "2024", round(100 * (1 - votants / inscrits), 2), `Ministère de l'Intérieur, ${res.url.split("/").pop()}`, `${inscrits} inscrits`))
    sources.push({ name: "Ministère de l'Intérieur (data.gouv.fr)", url: page })
  }

  for (const v of verified.sort((a, b) => (a.code === b.code ? a.first.localeCompare(b.first) : a.code.localeCompare(b.code)))) {
    console.log(`    ${v.code.padEnd(15)} ${v.first}  ${String(v.last).padEnd(28)} ${v.idbank}`)
  }

  const pages = [...new Set(sources.map((s) => s.url))]
  return finish("finances-publiques", "abstention", allRows, {
    source: {
      name: "Ministère de l'Intérieur et CDSP / Sciences Po, via data.gouv.fr",
      dataset: "Résultats des élections présidentielles et législatives, premier tour",
      url: "https://www.data.gouv.fr/datasets/elections-presidentielles-1965-2012-1",
      downloadUrls: pages,
      howToObtain:
        "Les adresses ci-dessus sont les pages des jeux de données : le fichier exact est résolu à la récupération, la ressource la plus récemment modifiée étant retenue pour chaque scrutin. Les adresses effectivement téléchargées sont listées dans data/series/FRANCE-REPORT.md.",
    },
    unit: "% des inscrits",
    frequency: "annual",
    seriesLabels: { presidentielle: "Présidentielle (1er tour)", legislative: "Législatives (1er tour)" },
    notes:
      "Abstention au premier tour, calculée comme 1 − votants / inscrits. Jusqu'en 2012, les valeurs sont agrégées à partir des fichiers de résultats par circonscription publiés par le Centre de données socio-politiques (Sciences Po) sur data.gouv.fr ; à partir de 2017, elles proviennent des fichiers de résultats définitifs du ministère de l'Intérieur (France entière, outre-mer et Français de l'étranger compris pour les législatives). Le champ n'est donc pas strictement identique sur toute la période et les valeurs antérieures à 2017 peuvent différer de quelques dixièmes des chiffres France entière du ministère. Les législatives de 1986 se sont tenues à la proportionnelle à un seul tour.",
  }, "legislative", verified)
})

// ---------------------------------------------------------------------------------------------
// F. Infractions enregistrées, série mensuelle France (SSMSI, base des séries chronologiques)
//    Même contenu que le fichier joint aux « Interstats Conjoncture », mais diffusé sur data.gouv
//    et donc rafraîchissable automatiquement.

const SERIESCHRONO_SLUG = "service-statistique-ministeriel-de-la-securite-interieure-base-des-series-chronologiques"

/** code de série -> clé exacte (Indicateur, Sous_indicateur, Detail_complementaire) dans la base. */
const MENSUEL = {
  homicides: ["Homicides et tentatives d'homicide", "Homicides", "Non Renseigné"],
  "violences-intrafamiliales": ["Violences physiques", "Ensemble", "Violences physiques intrafamiliales"],
  "violences-hors-famille": ["Violences physiques", "Ensemble", "Violences physiques hors du cadre familial"],
  "violences-sexuelles": ["Violences sexuelles", "Ensemble", "Série CVS-CJO"],
  "vols-avec-arme": ["Vols et tentatives de vols avec violence", "Vols avec armes", "Série CVS-CJO"],
  "vols-violents": ["Vols et tentatives de vols avec violence", "Vols violents sans arme", "Série CVS-CJO"],
  "vols-sans-violence": ["Vols et tentatives de vols sans violence", "Non Renseigné", "Série CVS-CJO"],
  cambriolages: ["Cambriolages et tentatives", "Logements (résidences principales et secondaires)", "Série CVS-CJO"],
  "vols-vehicules": ["Vols et tentatives de vols liés aux véhicules", "Vols de véhicule", "Série CVS-CJO"],
  "vols-dans-vehicules": ["Vols et tentatives de vols liés aux véhicules", "Vols dans les véhicules", "Série CVS-CJO"],
  "vols-accessoires": ["Vols et tentatives de vols liés aux véhicules", "Vols d'accessoires sur véhicules", "Série CVS-CJO"],
  degradations: ["Destructions et dégradations volontaires", "Non Renseigné", "Série CVS-CJO"],
  "stupefiants-usage": ["Infractions à la législation sur les stupéfiants", "Usage de stupéfiants", "Série CVS-CJO"],
  "stupefiants-trafic": ["Infractions à la législation sur les stupéfiants", "Trafic de stupéfiants", "Série CVS-CJO"],
  escroqueries: ["Escroqueries et les fraudes aux moyens de paiements", "Ensemble des lieux", "Série CVS-CJO"],
}

const MENSUEL_LABELS = {
  homicides: "Homicides",
  "violences-intrafamiliales": "Violences physiques intrafamiliales",
  "violences-hors-famille": "Violences physiques hors du cadre familial",
  "violences-sexuelles": "Violences sexuelles",
  "vols-avec-arme": "Vols avec arme",
  "vols-violents": "Vols violents sans arme",
  "vols-sans-violence": "Vols sans violence",
  cambriolages: "Cambriolages de logement",
  "vols-vehicules": "Vols de véhicule",
  "vols-dans-vehicules": "Vols dans les véhicules",
  "vols-accessoires": "Vols d'accessoires sur véhicules",
  degradations: "Destructions et dégradations volontaires",
  "stupefiants-usage": "Usage de stupéfiants",
  "stupefiants-trafic": "Trafic de stupéfiants",
  escroqueries: "Escroqueries et fraudes aux moyens de paiement",
}

await chart("securite", "infractions-mensuelles", async () => {
  const { page, pick } = await datagouv(SERIESCHRONO_SLUG)
  const res = pick(/serieschrono-datagouv\.csv$/)
  // Fichier en latin-1, séparateur « ; », ~25 Mo : toutes zones, toutes périodicités confondues.
  const { header, rows: raw } = parseDsv(await fetchText(res.url, "latin1"), ";")
  for (const col of ["Valeurs", "Unite_temps", "Indicateur", "Sous_indicateur", "Detail_complementaire", "Zone_geographique", "Periodicite", "Statistique", "Unite_de_compte"]) {
    if (!header.includes(col)) throw new Error(`colonne "${col}" absente de ${res.url}`)
  }
  const national = raw.filter((r) => r.Zone_geographique === "France" && r.Periodicite === "Mensuelle" && r.Statistique === "Nombre")
  if (!national.length) throw new Error("aucune ligne France / mensuelle / nombre")

  const allRows = []
  const verified = []
  const seriesLabels = {}
  for (const [code, [ind, sous, detail]] of Object.entries(MENSUEL)) {
    const sub = national.filter((r) => r.Indicateur === ind && r.Sous_indicateur === sous && r.Detail_complementaire === detail)
    if (!sub.length) throw new Error(`série absente : ${code} (« ${ind} » / « ${sous} » / « ${detail} »)`)
    const unites = [...new Set(sub.map((r) => r.Unite_de_compte))]
    if (unites.length !== 1) throw new Error(`${code} : unités de compte multiples (${unites.join(", ")})`)
    const pairs = sub
      // "2016M01" -> "2016-01" : le format de période du site.
      .map((r) => [String(r.Unite_temps).replace(/^(\d{4})M(\d{2})$/, "$1-$2"), num(r.Valeurs)])
      .filter(([p, v]) => /^\d{4}-\d{2}$/.test(p) && v !== null)
      .sort((a, b) => a[0].localeCompare(b[0]))
    allRows.push(...rows(code, pairs))
    seriesLabels[code] = `${MENSUEL_LABELS[code]} (${unites[0].toLowerCase()})`
    verified.push({ idbank: `${ind} / ${sous}`, code, title: `${MENSUEL_LABELS[code]} — unité de compte : ${unites[0]}`, first: pairs[0][0], last: pairs.at(-1)[0] })
    console.log(`    ${code.padEnd(28)} ${pairs[0][0]}→${pairs.at(-1)[0]}  ${unites[0]}`)
  }

  return finish("securite", "infractions-mensuelles", allRows, {
    source: {
      name: "SSMSI (ministère de l'Intérieur), via data.gouv.fr",
      dataset: res.title,
      url: page,
      downloadUrl: res.url,
      citation: "SSMSI, base des séries chronologiques. Mêmes séries que celles jointes aux publications « Interstats Conjoncture ».",
    },
    unit: "faits enregistrés par mois",
    frequency: "monthly",
    seriesLabels,
    notes:
      "Faits enregistrés par la police et la gendarmerie chaque mois, France entière, corrigés des variations saisonnières et des jours ouvrables (sauf les homicides, publiés bruts). Ce sont des faits enregistrés, pas des faits commis : une variation peut venir d'un changement de comportement de plainte ou d'activité des services autant que de la délinquance elle-même. L'unité de compte diffère selon l'indicateur (infraction, victime, véhicule, mis en cause) et figure dans la légende.",
  }, "violences-intrafamiliales", verified)
})

// ---------------------------------------------------------------------------------------------
// G. Victimes et mis en cause, par sexe (SSMSI)
//    Les deux bases nationales partagent la colonne « sexe » mais pas les tranches d'âge
//    (17 côté victimes, 6 côté mis en cause) : le graphe croise donc les deux par le sexe.

const CARACT_SLUG =
  "principales-caracteristiques-des-victimes-enregistrees-et-des-mis-en-cause-pour-des-infractions-elucidees-par-la-police-et-la-gendarmerie-nationales"

/** slug de perspective -> libellé exact de l'indicateur, présent dans les deux bases. */
const CARACT_INDICATEURS = {
  "violences-intrafamiliales": "Violences physiques dans le cadre intra-familial",
  "violences-hors-famille": "Violences physiques hors cadre intra-familial",
  "violences-sexuelles": "Violences sexuelles",
  viols: "Viols et tentatives de viols",
  homicides: "Homicides",
  "tentatives-homicide": "Tentatives d'homicide",
  "vols-avec-arme": "Vols avec arme",
  "vols-violents": "Vols violents sans arme",
  "vols-sans-violence": "Vols sans violence contre des personnes",
  cambriolages: "Cambriolages de logement",
  "vols-vehicules": "Vols de véhicule",
  "vols-dans-vehicules": "Vols dans les véhicules",
  "vols-accessoires": "Vols d'accessoires sur les véhicules",
  degradations: "Destructions et dégradations volontaires",
  escroqueries: "Escroqueries et fraudes aux moyens de paiement",
}

await chart("securite", "auteurs-victimes", async () => {
  const { page, all } = await datagouv(CARACT_SLUG)
  const files = [
    ["victimes", /caract-victimes/, "Victimes enregistrées"],
    ["mis-en-cause", /caract-mec/, "Mis en cause"],
  ]
  const allRows = []
  const verified = []
  const seriesLabels = {}
  const sources = []
  for (const [role, re, roleLabel] of files) {
    const hits = all(re).filter((r) => r.format === "xlsx")
    if (hits.length !== 1) throw new Error(`data.gouv ${CARACT_SLUG} : ${hits.length} fichiers pour ${role}`)
    const res = hits[0]
    sources.push(res.url)
    const { sheetNames, sheet } = readXlsx(await fetchBuffer(res.url))
    const table = sheet(sheetNames[0])
    const head = (table[0] ?? []).map((c) => String(c ?? ""))
    for (const col of ["indicateur", "annee", "sexe", "age", "majorite", "nationalite", "nombre"]) {
      if (!head.includes(col)) throw new Error(`${res.title} : colonne "${col}" absente (${head.join(", ")})`)
    }
    const at = Object.fromEntries(head.map((c, i) => [c, i]))
    // On ne garde que les totaux : le sexe est la seule dimension croisée ici.
    const totals = table
      .slice(1)
      .filter((r) => r[at.age] === "Ensemble" && r[at.majorite] === "Ensemble" && r[at.nationalite] === "Ensemble")
    if (!totals.length) throw new Error(`${res.title} : aucune ligne « Ensemble »`)
    const present = new Set(totals.map((r) => r[at.indicateur]))
    for (const [slug, indicateur] of Object.entries(CARACT_INDICATEURS)) {
      if (!present.has(indicateur)) throw new Error(`${res.title} : indicateur « ${indicateur} » absent`)
      for (const [sexe, sexLabel] of [["F", "femmes"], ["H", "hommes"]]) {
        const code = `${slug}-${role}-${sexLabel}`
        const pairs = totals
          .filter((r) => r[at.indicateur] === indicateur && r[at.sexe] === sexe)
          .map((r) => [String(r[at.annee]), num(r[at.nombre])])
          .filter(([, v]) => v !== null)
          .sort((a, b) => a[0].localeCompare(b[0]))
        if (!pairs.length) continue
        allRows.push(...rows(code, pairs))
        seriesLabels[code] = `${roleLabel} — ${sexLabel}`
        if (slug === "violences-intrafamiliales") {
          verified.push({ idbank: `${indicateur} / sexe = ${sexe}`, code, title: `${roleLabel}, ${sexLabel}`, first: pairs[0][0], last: pairs.at(-1)[0] })
        }
      }
    }
    console.log(`    ${role.padEnd(13)} ${res.title.slice(0, 60)}`)
  }

  return finish("securite", "auteurs-victimes", allRows, {
    source: {
      name: "SSMSI (ministère de l'Intérieur), via data.gouv.fr",
      dataset: "Principales caractéristiques des victimes enregistrées et des mis en cause pour des infractions élucidées",
      url: page,
      downloadUrls: sources,
    },
    unit: "personnes enregistrées",
    frequency: "annual",
    seriesLabels,
    notes:
      "Victimes enregistrées et personnes mises en cause pour des infractions élucidées, par sexe. Les deux bases ne découpent pas l'âge de la même façon — dix-sept tranches côté victimes, six côté mis en cause — donc seul le sexe permet de les lire ensemble. « Mis en cause » ne veut pas dire condamné : c'est une personne contre laquelle les services réunissent des indices, avant toute décision de justice.",
  }, "violences-intrafamiliales-victimes-femmes", verified)
})

// ---------------------------------------------------------------------------------------------
// Rapport

const md = []
md.push(`# Séries françaises (data.gouv, DREES, CNAF, ministère de l'Intérieur) — rapport de récupération`, ``)
md.push(`Généré par \`${SCRIPT}\` le ${today()}.`, ``)
md.push(`Endpoints utilisés sans clé : data.gouv.fr (\`${DATAGOUV}<slug>/\`), DREES (\`${DREES}<dataset>/attachments/<id>\`), CNAF (\`${CAF}<dataset>/records\`).`, ``)
md.push(`Les classeurs \`.xlsx\` sont lus par \`scripts/lib/xlsx.mjs\` (lecteur ZIP + SpreadsheetML minimal, sans dépendance).`, ``)
md.push(`| Graphe | Fichier | Séries | Période | Dernière obs. |`, `|---|---|---|---|---|`)
for (const r of report) {
  md.push(`| ${r.category}/${r.name} | \`data/series/${r.category}/${r.name}.csv\` | ${r.result.series.join(", ")} | ${r.first} → ${r.last} | ${r.result.lastObservation} |`)
}
md.push(``, `## Choix de méthode`, ``)
md.push(`- **Délinquance** : la base nationale n'existe pas, seules les bases communale, départementale et régionale sont diffusées. On agrège la base régionale (la plus petite qui porte à la fois les faits et la population Insee) : faits France = somme des régions, taux = faits / population × 1 000. Les données ne commencent qu'en 2016, l'antériorité n'étant pas diffusée dans ce jeu.`)
md.push(`- **Minima sociaux** : la DREES ne diffuse pas ce jeu par API (\`has_records: false\`), seulement en pièce jointe \`.xlsx\` ; l'unité est « milliers d'allocataires » et non de bénéficiaires, car le tableau compte des allocataires (hors conjoints et enfants à charge).`)
md.push(`- **Pauvreté avant / après redistribution** : le classeur ne contient pas d'indice de Gini, mais des rapports D9/D1 et S80/S20 ; les séries \`gini-avant\` / \`gini-apres\` n'ont donc pas été produites.`)
md.push(`- **Abstention** : avant 2017, aucun fichier « France entière » du ministère de l'Intérieur n'est lisible par machine (les résultats de 1958 à 2012 ne sont publiés qu'en \`.xls\` ancien format) ; les valeurs sont donc agrégées depuis les fichiers par circonscription du CDSP (Sciences Po) diffusés sur data.gouv, et peuvent différer de quelques dixièmes des chiffres France entière du ministère. Pour la présidentielle 2017, le seul fichier exploitable est celui par bureau de vote (34 Mo), agrégé ici.`)
md.push(``)
for (const r of report) {
  md.push(`## ${r.category}/${r.name}`, ``)
  md.push(`- Fichier : \`data/series/${r.category}/${r.name}.csv\` (${r.result.rows} lignes), unité « ${r.meta.unit} », fréquence ${r.meta.frequency}, dernière observation **${r.result.lastObservation}**.`)
  md.push(`- Source : ${r.result.publisher} — ${r.meta.source.url}`)
  for (const u of r.result.downloadUrls) md.push(`- Requête : ${u}`)
  md.push(`- ${r.meta.notes}`)
  md.push(``, `| Repère dans la source | Code série | Libellé vérifié | Période |`, `|---|---|---|---|`)
  for (const v of r.verified) md.push(`| ${v.idbank} | \`${v.code}\` | ${v.title} | ${v.first} → ${v.last} |`)
  md.push(``)
}
md.push(`## Échecs`, ``)
if (!failures.length) md.push(`Aucun.`)
for (const f of failures) md.push(`- **${f.category}/${f.name}** : ${f.error}`)
md.push(``)
writeFileSync(resolve(SERIES_DIR, "FRANCE-REPORT.md"), md.join("\n"))

console.log(`\n${report.length} charts written, ${failures.length} failed. Report: data/series/FRANCE-REPORT.md`)
if (failures.length) process.exitCode = 1
