// Socle partagé des scripts de récupération. Node >= 22, aucune dépendance.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { normalizeSource } from "./source.mjs"

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
export const SERIES_DIR = resolve(ROOT, "data", "series")
/** Fichiers déposés à la main, versionnés, que les scripts de `scripts/manual/` relisent. */
export const SOURCES_DIR = resolve(ROOT, "data", "sources-manuelles")

/** Codes pays canoniques utilisés partout dans l'application. */
export const COUNTRY_LABELS = {
  FRA: "France",
  DEU: "Allemagne",
  ITA: "Italie",
  ESP: "Espagne",
  GBR: "Royaume-Uni",
  USA: "États-Unis",
  CHN: "Chine",
  IND: "Inde",
  JPN: "Japon",
  KOR: "Corée du Sud",
  POL: "Pologne",
  RUS: "Russie",
  EU27: "Union européenne (27)",
  WLD: "Monde",
  OCDE: "Moyenne OCDE",
}

/** Codes géographiques Eurostat vers codes canoniques. */
export const EUROSTAT_GEO = {
  FR: "FRA", DE: "DEU", IT: "ITA", ES: "ESP", UK: "GBR", US: "USA", CN: "CHN", IN: "IND", JP: "JPN",
  KR: "KOR", PL: "POL", RU: "RUS", EU27_2020: "EU27", EA20: "EA20",
}

/** Codes d'entité OWID vers codes canoniques (OWID utilise déjà l'ISO3 pour les pays). */
export const OWID_CODE = { OWID_WRL: "WLD", OWID_EU27: "EU27" }

export function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Arrondi à `d` décimales. Une seule sémantique pour tous les scripts : sans `d`, la valeur
 * est rendue telle quelle (certaines sources publient déjà la précision qu'elles assument).
 */
export function round(value, d) {
  if (d === undefined || d === null) return Number(value)
  const f = 10 ** d
  return Math.round(Number(value) * f) / f
}

/** Écriture atomique : on passe par un fichier temporaire pour ne jamais laisser un fichier à moitié écrit. */
function writeAtomic(path, content) {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null
}

/**
 * Écrit `<category>/<chart>.csv` (period,series,value, trié) et `<category>/<chart>.meta.json`.
 * rows : [{ period: "2024", series: "FRA", value: 115.6 }]
 *
 * Trois garanties :
 *  - `fetchedAt` n'est réécrit que si les valeurs ont changé, pour qu'une exécution sans
 *    nouveauté chez la source ne produise pas de diff ;
 *  - un effondrement du volume (plus de 40 % de lignes perdues) interrompt le script plutôt
 *    que de remplacer une série complète par une série tronquée ;
 *  - les deux fichiers sont écrits de façon atomique.
 */
export function writeSeries(category, chart, rows, meta) {
  const dir = resolve(SERIES_DIR, category)
  mkdirSync(dir, { recursive: true })
  const csvPath = resolve(dir, `${chart}.csv`)
  const metaPath = resolve(dir, `${chart}.meta.json`)

  const clean = rows
    .filter((r) => r.value !== null && r.value !== undefined && r.value !== "" && !Number.isNaN(Number(r.value)))
    .map((r) => ({ period: String(r.period), series: String(r.series), value: Number(r.value) }))
    .sort((a, b) => (a.series === b.series ? a.period.localeCompare(b.period) : a.series.localeCompare(b.series)))

  if (!clean.length) throw new Error(`${category}/${chart} : aucune ligne à écrire`)

  const csv = ["period,series,value", ...clean.map((r) => `${r.period},${r.series},${r.value}`)].join("\n") + "\n"

  const previousCsv = readIfExists(csvPath)
  if (previousCsv) {
    const before = previousCsv.trimEnd().split("\n").length - 1
    if (before > 20 && clean.length < before * 0.6) {
      throw new Error(
        `${category}/${chart} : la série passerait de ${before} à ${clean.length} lignes. ` +
          "Refus d'écrire : vérifier la réponse de la source avant de relancer.",
      )
    }
  }

  // La France peut porter un code suffixé (FRA-depenses, FRA-15-64…) : on prend tous ses codes.
  const fra = clean.filter((r) => r.series === "FRA" || r.series.startsWith("FRA-")).map((r) => r.period).sort()
  const all = clean.map((r) => r.period).sort()
  const lastObservation = meta.lastObservation ?? (fra.length ? fra[fra.length - 1] : all[all.length - 1])

  // Une exécution qui ne change rien ne doit pas dater la série d'aujourd'hui.
  let fetchedAt = meta.fetchedAt ?? today()
  if (previousCsv === csv) {
    const previousMeta = readIfExists(metaPath)
    if (previousMeta) {
      try {
        const parsed = JSON.parse(previousMeta)
        if (parsed.fetchedAt) fetchedAt = parsed.fetchedAt
      } catch {
        // meta illisible : on repart sur la date du jour
      }
    }
  }

  // Le bloc source est normalisé ici, une seule fois : un script ne peut pas écrire une série
  // sans producteur connu, sans requête rejouable ni sans licence identifiée.
  const source = normalizeSource(meta.source, `${category}/${chart}`)
  const fullMeta = { ...meta, source, lastObservation, fetchedAt }
  writeAtomic(csvPath, csv)
  writeAtomic(metaPath, JSON.stringify(fullMeta, null, 2) + "\n")
  return {
    rows: clean.length,
    series: [...new Set(clean.map((r) => r.series))],
    lastObservation,
    unchanged: previousCsv === csv,
    publisher: source.publisher,
    downloadUrls: source.downloadUrls,
  }
}

const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version
  } catch {
    return "0"
  }
})()
const UA = { "user-agent": `lafrance-enchiffres/${VERSION} (+https://github.com/jbernales5/lafrance-enchiffres)` }

const TIMEOUT_MS = 60_000
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * `fetch` avec délai maximal et reprise. Sans cela, un point d'entrée qui ne répond pas bloque
 * `npm run refresh` indéfiniment, et un 429 fait perdre une série pour rien.
 */
async function request(url, { attempts = 4, baseDelay = 2000 } = {}) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.ok) return res
      last = new Error(`${res.status} ${res.statusText} for ${url}`)
      if (!RETRY_STATUS.has(res.status) || i === attempts) throw last
      const retryAfter = Number(res.headers.get("retry-after"))
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : baseDelay * i)
    } catch (e) {
      last = e
      if (i === attempts) throw last
      if (e?.name !== "TimeoutError" && !RETRY_STATUS.has(Number(String(e.message).slice(0, 3)))) throw last
      await wait(baseDelay * i)
    }
  }
  throw last
}

/** Octets bruts — pour les .xlsx que certaines sources françaises publient au lieu d'une API. */
export async function fetchBuffer(url, options) {
  const res = await request(url, options)
  return Buffer.from(await res.arrayBuffer())
}

/** `encoding` sert aux fichiers du ministère de l'Intérieur, publiés en windows-1252 (latin1). */
export async function fetchText(url, encoding = "utf-8", options) {
  if (encoding !== "utf-8") return new TextDecoder(encoding).decode(await fetchBuffer(url, options))
  const res = await request(url, options)
  return res.text()
}

export async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, "utf-8", options))
}

/**
 * Parseur CSV minimal : champs entre guillemets et guillemets échappés `""` (RFC 4180).
 * Renvoie un tableau d'objets indexés par l'en-tête.
 */
export function parseCsv(text, sep = ",") {
  const lines = text.replace(/^﻿/, "").replace(/\r/g, "").split("\n").filter((l) => l.length)
  if (!lines.length) return []
  const header = splitCsvLine(lines[0], sep)
  return lines.slice(1).map((l) => Object.fromEntries(splitCsvLine(l, sep).map((v, i) => [header[i], v])))
}

/** Une ligne CSV découpée en champs. Exporté parce que les exports OCDE ont leur propre en-tête. */
export function splitCsvLine(line, sep = ",") {
  const out = []
  let cur = ""
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
    } else if (ch === sep && !q) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Rapport de récupération, au même format pour les six scripts.
 * `entries` : [{ chart, rows, series, lastObservation, unchanged }] ; `failures` : [{ chart, error }].
 */
export function writeReport(file, { title, script, api, entries, failures }) {
  const lines = [
    `# ${title} — rapport de récupération (${today()})`,
    "",
    `Script : \`${script}\``,
    api ? `API : ${api}` : null,
    "",
    "| Série | Lignes | Séries | Dernière observation | État |",
    "| --- | ---: | ---: | --- | --- |",
    ...entries.map(
      (e) =>
        `| \`${e.chart}\` | ${e.rows} | ${e.series?.length ?? ""} | ${e.lastObservation ?? ""} | ${e.unchanged ? "inchangée" : "mise à jour"} |`,
    ),
    "",
  ]
  if (failures.length) {
    lines.push("## Échecs", "")
    for (const f of failures) lines.push(`- \`${f.chart}\` : ${f.error}`)
    lines.push("")
  }
  lines.push(
    "---",
    "",
    `${entries.length} série(s) écrite(s), ${failures.length} échec(s).`,
    "",
  )
  writeAtomic(resolve(SERIES_DIR, file), lines.filter((l) => l !== null).join("\n"))
}

/** Eurostat JSON-stat 2.0 vers lignes [{ dims..., value }]. */
export function jsonStatToRows(ds) {
  const ids = ds.id
  const sizes = ds.size
  const cats = ids.map((id) => {
    const idx = ds.dimension[id].category.index
    return Array.isArray(idx) ? idx : Object.entries(idx).sort((a, b) => a[1] - b[1]).map((e) => e[0])
  })
  const rows = []
  for (const [k, v] of Object.entries(ds.value)) {
    let rem = Number(k)
    const coords = new Array(ids.length)
    for (let i = ids.length - 1; i >= 0; i--) {
      coords[i] = rem % sizes[i]
      rem = Math.floor(rem / sizes[i])
    }
    const row = { value: v }
    ids.forEach((id, i) => (row[id] = cats[i][coords[i]]))
    rows.push(row)
  }
  return rows
}
