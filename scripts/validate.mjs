/**
 * Vérifie le contrat de `data/` avant le build. Sans lui, un CSV corrompu se présente au lecteur
 * comme une donnée manquante, et une faute de frappe dans un chemin de fichier passe inaperçue.
 *
 *   npm run validate
 *
 * Sort en 1 et nomme chaque fichier fautif dès qu'une règle n'est pas tenue.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"

import { ROOT } from "./lib/series.mjs"

const DATA = resolve(ROOT, "data")
const SERIES = resolve(DATA, "series")
const CATEGORIES = resolve(DATA, "categories")

const errors = []
const warnings = []
const fail = (file, message) => errors.push({ file, message })
const warn = (file, message) => warnings.push({ file, message })
const rel = (p) => relative(ROOT, p)

const FREQUENCIES = new Set(["annual", "quarterly", "monthly"])
const PERIOD = /^\d{4}(-Q[1-4]|-(0[1-9]|1[0-2]))?$/
const CSV_HEADER = "period,series,value"

// ── 1. Catalogue des licences ─────────────────────────────────────────────────
let licenses = { licenses: {}, publishers: {}, upstream: {} }
try {
  licenses = JSON.parse(readFileSync(resolve(DATA, "licenses.json"), "utf8"))
} catch (e) {
  fail("data/licenses.json", `illisible : ${e.message}`)
}
const licenseIds = new Set(Object.keys(licenses.licenses ?? {}))

// ── 2. Séries : CSV et meta ───────────────────────────────────────────────────
function listSeriesFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.name.endsWith(".csv")) out.push(p)
    }
  }
  walk(SERIES)
  return out.sort()
}

/** Lit un CSV de série en signalant tout ce qui s'écarte du contrat, au lieu de l'ignorer. */
function checkCsv(path) {
  const file = rel(path)
  const text = readFileSync(path, "utf8")
  if (text.charCodeAt(0) === 0xfeff) fail(file, "le fichier commence par un BOM")
  const lines = text.split(/\r?\n/)
  if (lines.at(-1) !== "") fail(file, "pas de saut de ligne final")
  const body = lines.filter((l) => l.length)
  if (!body.length) {
    fail(file, "fichier vide")
    return null
  }
  if (body[0] !== CSV_HEADER) {
    fail(file, `en-tête « ${body[0]} », attendu « ${CSV_HEADER} »`)
    return null
  }
  const rows = []
  const seen = new Set()
  body.slice(1).forEach((line, i) => {
    const n = i + 2
    const cells = line.split(",")
    if (cells.length !== 3) {
      fail(file, `ligne ${n} : ${cells.length} colonnes au lieu de 3 — « ${line} »`)
      return
    }
    const [period, series, value] = cells
    if (!PERIOD.test(period)) fail(file, `ligne ${n} : période « ${period} » hors format (2024, 2024-Q1 ou 2024-03)`)
    if (!series) fail(file, `ligne ${n} : code de série vide`)
    if (value === "" || !Number.isFinite(Number(value))) fail(file, `ligne ${n} : valeur « ${value} » non numérique`)
    const key = `${period}|${series}`
    if (seen.has(key)) fail(file, `ligne ${n} : doublon ${period} / ${series}`)
    seen.add(key)
    rows.push({ period, series, value: Number(value) })
  })
  return rows
}

function checkMeta(csvPath, rows) {
  const metaPath = csvPath.replace(/\.csv$/, ".meta.json")
  const file = rel(metaPath)
  if (!existsSync(metaPath)) {
    fail(rel(csvPath), "aucun .meta.json à côté du CSV")
    return
  }
  let meta
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"))
  } catch (e) {
    fail(file, `JSON illisible : ${e.message}`)
    return
  }

  const s = meta.source
  if (!s || typeof s !== "object") {
    fail(file, "champ `source` absent")
    return
  }
  for (const key of ["publisher", "url"]) if (!s[key]) fail(file, `source.${key} absent`)
  if (s.publisher && !licenses.publishers?.[s.publisher]) fail(file, `source.publisher « ${s.publisher} » absent de data/licenses.json`)
  if (!s.license) fail(file, "source.license absent")
  else if (!licenseIds.has(s.license)) fail(file, `source.license « ${s.license} » inconnue du catalogue`)
  if (s.upstream && !s.upstreamLicense) fail(file, "source.upstream sans source.upstreamLicense")
  if (s.upstreamLicense && !licenseIds.has(s.upstreamLicense)) fail(file, `source.upstreamLicense « ${s.upstreamLicense} » inconnue du catalogue`)
  if (s.license === "a-confirmer" || s.upstreamLicense === "a-confirmer") warn(file, "licence à confirmer (voir DATA-LICENSE.md)")

  if (!Array.isArray(s.downloadUrls) || !s.downloadUrls.length) fail(file, "source.downloadUrls absent ou vide")
  else
    for (const u of s.downloadUrls) {
      if (typeof u !== "string" || !/^https?:\/\/\S+$/.test(u)) fail(file, `source.downloadUrls contient « ${u} », qui n'est pas une URL`)
      else if (/^https?:\/\/[^/]+\/?$/.test(u) && !s.howToObtain)
        fail(file, `source.downloadUrls pointe vers « ${u} », une racine de site : donner la requête exacte, ou expliquer l'obtention dans source.howToObtain`)
    }
  if ("downloadUrl" in s) fail(file, "source.downloadUrl (singulier) n'existe plus : utiliser source.downloadUrls")
  if ("name" in s) fail(file, "source.name n'existe plus : utiliser source.publisher et source.upstream")

  if (!meta.unit) fail(file, "unit absent")
  if (!FREQUENCIES.has(meta.frequency)) fail(file, `frequency « ${meta.frequency} » hors de ${[...FREQUENCIES].join(", ")}`)
  if (!meta.script) fail(file, "script absent")
  if (!meta.fetchedAt || !/^\d{4}-\d{2}-\d{2}$/.test(meta.fetchedAt)) fail(file, `fetchedAt « ${meta.fetchedAt } » absent ou mal formé`)

  if (!rows) return

  const codes = [...new Set(rows.map((r) => r.series))].sort()
  const labels = meta.seriesLabels
  if (!labels || typeof labels !== "object") {
    fail(file, "seriesLabels absent")
  } else {
    for (const c of codes) if (!labels[c]) fail(file, `seriesLabels ne couvre pas le code « ${c} » présent dans le CSV`)
    for (const c of Object.keys(labels)) if (!codes.includes(c)) fail(file, `seriesLabels déclare « ${c} », absent du CSV`)
  }

  const periods = rows.map((r) => r.period).sort()
  if (!meta.lastObservation) fail(file, "lastObservation absent")
  else if (!PERIOD.test(meta.lastObservation)) fail(file, `lastObservation « ${meta.lastObservation} » hors format`)
  else if (meta.lastObservation > periods.at(-1)) fail(file, `lastObservation ${meta.lastObservation} dépasse la dernière période du CSV (${periods.at(-1)})`)

  // La fréquence déclarée doit correspondre à ce que contiennent les périodes.
  const shape = periods.at(-1)?.length === 4 ? "annual" : periods.at(-1)?.includes("-Q") ? "quarterly" : "monthly"
  if (meta.frequency !== shape) fail(file, `frequency « ${meta.frequency} » ne correspond pas aux périodes du CSV (« ${periods.at(-1)} »)`)
}

const csvFiles = listSeriesFiles()
const rowsByFile = new Map()
for (const path of csvFiles) {
  const rows = checkCsv(path)
  rowsByFile.set(rel(path), rows)
  checkMeta(path, rows)
}

// ── 3. Textes éditoriaux : aucune valeur mesurée écrite à la main ────────────
/**
 * Un texte de catégorie décrit ce que mesure le graphe ; il ne rapporte pas le résultat.
 * Une valeur recopiée devient fausse dès que la source révise, sans que rien ne le signale.
 *
 * La règle ne vise pas les chiffres qui définissent l'indicateur — une tranche d'âge, une base
 * d'indice, un seuil conventionnel, un dénominateur, une année de début de série. Elle vise les
 * chiffres qui rapportent une évolution ou un niveau observé : ceux-là se lisent sur le graphe.
 */
const VERBS = [
  "passe", "passé", "passée", "passés", "passées",
  "atteint", "atteignent", "atteignait", "franchi", "franchit",
  "s'élève", "s'établit", "se situe", "culmine", "plafonne", "avoisine", "frôle",
  "bond de", "bondi", "chute de", "chuté", "hausse de", "baisse de", "baissé",
  "recul de", "reculé", "progression de", "progressé", "augmenté", "grimpé",
  "doublé", "triplé", "gagné", "perdu", "pic de", "reste proche de",
  "place les", "place la", "place le",
]

const REPORTED_VALUE = new RegExp(
  // `\b` ne fonctionne pas autour des accents (« é » n'est pas un caractère de mot au sens ASCII) :
  // on borne explicitement sur les lettres Unicode.
  "(?<![\\p{L}\\p{N}])(?:" +
    // un verbe d'évolution, suivi d'un nombre dans la même phrase
    "(?:" + VERBS.join("|") + ")(?![\\p{L}])[^.;!?]{0,60}?\\d" +
    "|" +
    // « de 28,8 % en 1980 à 34,0 % » : la forme même d'une évolution rapportée. L'unité après le
    // premier nombre est exigée, sinon « de 15 à 64 ans » — une tranche d'âge — serait signalé.
    "de\\s+\\d[\\d\\s,.]*\\s*(?:%|points?)\\s+(?:[^.;!?]{0,25}?\\s)?à\\s+\\d" +
    ")",
  "iu",
)

function handWrittenNumber(text) {
  if (typeof text !== "string") return null
  const m = REPORTED_VALUE.exec(text)
  if (!m) return null
  const start = Math.max(0, m.index - 10)
  return `« …${text.slice(start, m.index + m[0].length + 20).trim()}… »`
}

// ── 4. Catégories : cohérence avec les fichiers présents ─────────────────────
const referenced = new Set()
const categoryFiles = readdirSync(CATEGORIES).filter((f) => f.endsWith(".json")).sort()
const slugs = new Set()
const orders = new Map()

for (const name of categoryFiles) {
  const path = resolve(CATEGORIES, name)
  const file = rel(path)
  let cat
  try {
    cat = JSON.parse(readFileSync(path, "utf8"))
  } catch (e) {
    fail(file, `JSON illisible : ${e.message}`)
    continue
  }
  for (const key of ["slug", "title", "short", "lead", "order"]) if (cat[key] === undefined) fail(file, `champ « ${key} » absent`)
  if (slugs.has(cat.slug)) fail(file, `slug « ${cat.slug} » déjà utilisé`)
  slugs.add(cat.slug)
  if (orders.has(cat.order)) fail(file, `order ${cat.order} déjà utilisé par ${orders.get(cat.order)}`)
  orders.set(cat.order, cat.slug)

  for (const [label, text] of [["lead", cat.lead], ...(cat.cautions ?? []).map((c, i) => [`cautions[${i}]`, c])]) {
    const hit = handWrittenNumber(text)
    if (hit) fail(file, `${label} contient un chiffre écrit à la main : ${hit}`)
  }

  const chartIds = new Set()
  for (const chart of cat.charts ?? []) {
    if (!chart.id) fail(file, "un graphe n'a pas d'id")
    if (chartIds.has(chart.id)) fail(file, `id de graphe « ${chart.id} » en double`)
    chartIds.add(chart.id)

    for (const [label, text] of [["title", chart.title], ["subtitle", chart.subtitle], ["note", chart.note]]) {
      const hit = handWrittenNumber(text)
      if (hit) fail(file, `${chart.id}.${label} contient un chiffre écrit à la main : ${hit}`)
    }

    const datasets = [{ file: chart.file, what: chart.id }, ...(chart.variants ?? []).map((v) => ({ file: v.file, what: `${chart.id}/${v.id}`, variant: true, warning: v.warning, note: v.note }))]
    for (const d of datasets) {
      if (!d.file) {
        fail(file, `${d.what} : champ « file » absent`)
        continue
      }
      referenced.add(`data/series/${d.file}.csv`)
      const csv = resolve(SERIES, `${d.file}.csv`)
      if (!existsSync(csv)) {
        // Un graphe déclaré est un graphe dont la donnée est là. Une variante manquante est
        // encore plus grave : elle disparaîtrait de la liste des vues sans que personne le voie.
        fail(file, `${d.what} : ${d.file}.csv est déclaré mais absent`)
      }
      for (const [label, text] of [["warning", d.warning], ["note", d.note]]) {
        const hit = handWrittenNumber(text)
        if (hit) fail(file, `${d.what}.${label} contient un chiffre écrit à la main : ${hit}`)
      }
    }
  }

  if (cat.hero?.chart && !chartIds.has(cat.hero.chart)) fail(file, `hero.chart « ${cat.hero.chart} » ne correspond à aucun graphe`)
  if (cat.keyFigure?.chart && !chartIds.has(cat.keyFigure.chart)) fail(file, `keyFigure.chart « ${cat.keyFigure.chart} » ne correspond à aucun graphe`)
}

// ── 5. Aucun CSV orphelin ─────────────────────────────────────────────────────
for (const path of csvFiles) {
  const key = rel(path)
  if (!referenced.has(key)) fail(key, "CSV présent dans data/series mais référencé par aucune catégorie")
}

// ── Rapport ───────────────────────────────────────────────────────────────────
const byFile = new Map()
for (const e of errors) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e.message])

if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`)
  const seen = new Set()
  for (const w of warnings) {
    const key = `${w.file}|${w.message}`
    if (seen.has(key)) continue
    seen.add(key)
    console.log(`  ${w.file} — ${w.message}`)
  }
}

if (!errors.length) {
  console.log(`\n${csvFiles.length} séries, ${categoryFiles.length} catégories : contrat respecté.`)
  process.exit(0)
}

console.error(`\n${errors.length} erreur(s) dans ${byFile.size} fichier(s) :\n`)
for (const [file, messages] of byFile) {
  console.error(`  ${file}`)
  for (const m of messages) console.error(`    - ${m}`)
}
process.exit(1)
