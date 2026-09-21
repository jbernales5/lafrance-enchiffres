/**
 * PISA — deux producteurs, deux fichiers, jamais mélangés dans une même série.
 *
 * 1. OCDE, tableau de bord « PISA: Education and Skills » (performance-trends). Il n'est pas
 *    diffusé sur l'API SDMX de l'OCDE : chaque vue s'exporte en CSV depuis le tableau de bord.
 *    Les exports sont versionnés dans `data/sources-manuelles/pisa-ocde/`. Ce script les relit tous, reconnaît chaque
 *    fichier à son titre et à sa ligne d'en-têtes, et refuse ce qu'il ne reconnaît pas.
 *      → education/pisa                 scores moyens, 3 domaines, France et panel, 2006-2025
 *      → education/pisa-origine-sociale écart entre quart favorisé et quart défavorisé, sciences
 *
 * 2. DEPP, Note d'Information n° 26.40, fichier de données joint. La DEPP republie les résultats
 *    PISA de l'OCDE avec une série plus longue (depuis 2000) et une moyenne OCDE calculée sur les
 *    24 pays présents à tous les cycles, ce qui la rend comparable d'un cycle à l'autre.
 *      → education/pisa-niveaux         élèves en difficulté et plus performants, 2 domaines
 *
 * Aucun nombre n'est saisi à la main.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { ROOT, SOURCES_DIR, splitCsvLine, writeSeries } from "../lib/series.mjs"
import { readXlsx } from "../lib/xlsx.mjs"

const DASHBOARD = resolve(SOURCES_DIR, "pisa-ocde")
const DEPP_FILE = resolve(SOURCES_DIR, "depp-ni-2026-40-pisa.xlsx")

const ISO = {
  France: "FRA",
  Germany: "DEU",
  Italy: "ITA",
  Spain: "ESP",
  "United Kingdom": "GBR",
  "United States": "USA",
  Japan: "JPN",
}
const LABELS = { FRA: "France", DEU: "Allemagne", ITA: "Italie", ESP: "Espagne", GBR: "Royaume-Uni", USA: "États-Unis", JPN: "Japon", OCDE: "Moyenne OCDE" }
const DOMAIN = { mathematics: "maths", reading: "ecrit", science: "sciences" }
const DOMAIN_LABEL = { maths: "culture mathématique", ecrit: "compréhension de l'écrit", sciences: "culture scientifique" }

const OECD_SOURCE = {
  name: "OCDE, tableau de bord PISA",
  url: "https://www.oecd.org/en/data/dashboards/pisa-education-and-skills/performance-trends.html",
  downloadUrls: ["https://www.oecd.org/en/data/dashboards/pisa-education-and-skills/performance-trends.html"],
  howToObtain:
    "Le tableau de bord n'est pas diffusé sur l'API SDMX de l'OCDE : chaque vue s'exporte en CSV, une par pays de comparaison. Copies versionnées : data/sources-manuelles/pisa-ocde/.",
  citation: "OCDE, Programme international pour le suivi des acquis des élèves (PISA), tableau de bord « Education and Skills ».",
}

/** Un export du tableau de bord : titre, unité, en-têtes de colonnes, lignes { annee, valeurs }. */
function readExport(path) {
  const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
  const split = (line) => splitCsvLine(line)
  const title = split(lines[0])[0]
  const unit = split(lines[1])[0]
  const header = split(lines[2]).slice(1)
  const data = lines.slice(3).map(split).map((cells) => ({ year: cells[0], values: cells.slice(1) }))
  return { title, unit, header, data, file: path.split("/").pop() }
}

/**
 * Une cellule vide vaut « pas de résultat publié » — l'Espagne en 2018, par exemple, dont l'OCDE
 * n'a pas diffusé les scores. Number("") vaut 0 : sans ce garde-fou, la courbe tomberait à zéro.
 */
function value(cell) {
  if (cell === undefined || String(cell).trim() === "") return null
  const v = Number(cell)
  return Number.isFinite(v) ? v : null
}

/** Le tableau de bord répète parfois la même colonne : on garde la première occurrence de chaque nom. */
function firstColumns(header) {
  const at = new Map()
  header.forEach((name, i) => {
    if (name && !at.has(name)) at.set(name, i)
  })
  return at
}

if (!existsSync(DASHBOARD)) {
  throw new Error(
    `Dossier absent : ${DASHBOARD}\n` +
      `Ce script reconstruit les séries PISA à partir des exports déposés à la main. Le site se construit\n` +
      `sans eux (les CSV sont versionnés) ; pour les régénérer, réexporter depuis :\n` +
      `  ${OECD_SOURCE.url}`,
  )
}
const exports = readdirSync(DASHBOARD)
  .filter((f) => f.endsWith(".csv"))
  .sort() // l'ordre du système de fichiers ne doit pas décider quelle valeur est retenue
  .map((f) => readExport(resolve(DASHBOARD, f)))
console.log(`${exports.length} exports lus dans data/sources-manuelles/pisa-ocde/`)

// ── 1. Scores moyens, 3 domaines, France et panel ─────────────────────────────
const scores = []
const scoreSeries = new Set()
for (const ex of exports) {
  const m = /^Mean performance in (mathematics|reading|science)$/.exec(ex.title)
  if (!m) continue
  const domain = DOMAIN[m[1]]
  for (const [name, col] of firstColumns(ex.header)) {
    const iso = ISO[name]
    if (!iso) throw new Error(`${ex.file} : pays inconnu « ${name} »`)
    for (const row of ex.data) {
      const v = value(row.values[col])
      if (v === null) continue
      const code = `${iso}-${domain}`
      scores.push({ period: row.year, series: code, value: v })
      scoreSeries.add(code)
    }
  }
}
// La moyenne OCDE ne figure que dans l'export « Trends », qui porte les trois domaines à la fois.
const trends = exports.find((e) => e.title === "Trends in science, reading and mathematics performance")
if (!trends) throw new Error("export « Trends in science, reading and mathematics performance » absent")
if (!/OECD Average/i.test(trends.unit)) throw new Error(`export Trends : unité inattendue « ${trends.unit} »`)
for (const [name, col] of firstColumns(trends.header)) {
  const domain = DOMAIN[name.toLowerCase()]
  if (!domain) throw new Error(`export Trends : colonne inconnue « ${name} »`)
  for (const row of trends.data) {
    const v = value(row.values[col])
    if (v === null) continue
    const code = `OCDE-${domain}`
    scores.push({ period: row.year, series: code, value: v })
    scoreSeries.add(code)
  }
}
// Un même point peut arriver par deux exports (France est dans chaque comparaison) : on déduplique.
const uniqueScores = [...new Map(scores.map((r) => [`${r.period}|${r.series}`, r])).values()]
console.log(
  "education/pisa",
  writeSeries("education", "pisa", uniqueScores, {
    source: { ...OECD_SOURCE, dataset: "Mean performance in mathematics / reading / science ; Trends in science, reading and mathematics performance" },
    unit: "score PISA",
    frequency: "annual",
    seriesLabels: Object.fromEntries(
      [...scoreSeries].sort().map((code) => {
        const [iso, domain] = code.split("-")
        return [code, `${LABELS[iso]} — ${DOMAIN_LABEL[domain]}`]
      }),
    ),
    script: "scripts/manual/pisa.mjs",
    notes:
      "Score moyen des élèves de 15 ans à chaque cycle PISA. L'échelle est calibrée pour que la moyenne OCDE valait 500 points au premier cycle de chaque domaine ; un écart de 20 points correspond environ à une demi-année de scolarité. Les cycles ne sont pas annuels : ils ont lieu tous les trois ans, avec un décalage en 2022 après la pandémie.",
  }),
)

// ── 2. Écart selon l'origine sociale, sciences, France ────────────────────────
const quarters = exports.find((e) => /^Mean performance in science in France, by national quarter/.test(e.title))
const gap = exports.find((e) => /^Socio-economic gaps in science performance in France$/.test(e.title))
if (!quarters || !gap) throw new Error("exports « origine sociale » absents de data/sources-manuelles/pisa-ocde/")
const social = []
for (const [name, col] of firstColumns(quarters.header)) {
  const code = name === "Disadvantaged" ? "defavorises" : name === "Advantaged" ? "favorises" : null
  if (!code) throw new Error(`export quartiles : colonne inconnue « ${name} »`)
  for (const row of quarters.data) {
    const v = value(row.values[col])
    if (v !== null) social.push({ period: row.year, series: code, value: v })
  }
}
// L'écart est publié à part, dans deux colonnes selon sa significativité statistique : on les recolle.
for (const row of gap.data) {
  const v = row.values.map(value).find((x) => x !== null)
  if (v !== undefined) social.push({ period: row.year, series: "ecart", value: v })
}
console.log(
  "education/pisa-origine-sociale",
  writeSeries("education", "pisa-origine-sociale", social, {
    source: { ...OECD_SOURCE, dataset: "Mean performance in science in France, by national quarter of socio-economic status ; Socio-economic gaps in science performance in France" },
    unit: "score PISA",
    frequency: "annual",
    seriesLabels: {
      defavorises: "Quart le plus défavorisé",
      favorises: "Quart le plus favorisé",
      ecart: "Écart entre les deux",
    },
    script: "scripts/manual/pisa.mjs",
    notes:
      "Score moyen en culture scientifique des élèves du quart le plus favorisé et du quart le plus défavorisé, selon l'indice OCDE de statut économique, social et culturel. L'écart entre les deux est l'indicateur le plus souvent cité pour situer la France : il reste parmi les plus élevés des pays de l'OCDE.",
  }),
)

// ── 3. Élèves en difficulté et plus performants (DEPP, série longue) ──────────
if (!existsSync(DEPP_FILE)) throw new Error(`Fichier absent : ${DEPP_FILE} — à retélécharger sur education.gouv.fr (Note d'Information n° 26.40).`)
const { sheet } = readXlsx(readFileSync(DEPP_FILE))

/**
 * Les feuilles 8 et 13 posent deux blocs côte à côte, « Élèves en difficulté » puis
 * « Élèves les plus performants », séparés par une colonne vide. On lit la ligne des années
 * pour retrouver les deux blocs au lieu de coder des positions en dur.
 */
function readDeppBlocks(sheetName, domain) {
  const rows = sheet(sheetName)
  const headerRow = rows.findIndex((r) => (r ?? []).filter((c) => typeof c === "number" && c > 1990 && c < 2100).length >= 5)
  if (headerRow < 0) throw new Error(`${sheetName} : ligne des années introuvable`)
  const years = rows[headerRow]
  const titleRow = rows[headerRow - 1] ?? []
  const blocks = []
  titleRow.forEach((cell, i) => {
    if (typeof cell === "string" && /difficult|performant/i.test(cell)) {
      blocks.push({ from: i, kind: /difficult/i.test(cell) ? "difficulte" : "performants" })
    }
  })
  if (blocks.length !== 2) throw new Error(`${sheetName} : ${blocks.length} blocs trouvés, 2 attendus`)
  blocks.forEach((b, i) => (b.to = i + 1 < blocks.length ? blocks[i + 1].from : years.length))

  const out = []
  for (const row of rows.slice(headerRow + 1)) {
    const name = String(row?.[0] ?? "").trim()
    // Seules la France et la moyenne OCDE à 24 pays sont comparables sur toute la période :
    // « OCDE - 38 » n'est renseignée que sur quelques cycles.
    const iso = name === "France" ? "FRA" : /^OCDE\s*-?\s*24$/.test(name) ? "OCDE" : null
    if (!iso) continue
    for (const b of blocks) {
      for (let c = b.from; c < b.to; c++) {
        const year = years[c]
        const v = row[c]
        if (typeof year !== "number" || typeof v !== "number") continue
        out.push({ period: String(year), series: `${iso}-${domain}-${b.kind}`, value: Number(v.toFixed(1)) })
      }
    }
  }
  if (!out.length) throw new Error(`${sheetName} : aucune valeur lue`)
  return out
}

const niveaux = [...readDeppBlocks("Figure 8 web", "ecrit"), ...readDeppBlocks("Figure 13 web", "maths")]
console.log(
  "education/pisa-niveaux",
  writeSeries("education", "pisa-niveaux", niveaux, {
    source: {
      name: "DEPP (ministère de l'Éducation nationale), Note d'Information n° 26.40",
      dataset: "Fichier de données joint — figures 8 et 13 : proportion d'élèves en difficulté et les plus performants",
      url: "https://www.education.gouv.fr/depp/pisa-2025-les-acquis-des-eleves-de-15-ans-en-comprehension-de-l-ecrit-et-en-culture-mathematique-en-505645",
      downloadUrl:
        ["https://www.education.gouv.fr/depp/pisa-2025-les-acquis-des-eleves-de-15-ans-en-comprehension-de-l-ecrit-et-en-culture-mathematique-en-505645"],
      howToObtain:
        "Fichier de données joint à la Note d'Information, feuilles « Figure 8 web » et « Figure 13 web ». Copie versionnée : data/sources-manuelles/depp-ni-2026-40-pisa.xlsx.",
      citation: "DEPP, « PISA 2025 : les acquis des élèves de 15 ans en compréhension de l'écrit et en culture mathématique », Note d'Information n° 26.40. Données OCDE-PISA.",
    },
    unit: "% des élèves",
    frequency: "annual",
    seriesLabels: {
      "FRA-ecrit-difficulte": "France — en difficulté, écrit",
      "OCDE-ecrit-difficulte": "Moyenne OCDE — en difficulté, écrit",
      "FRA-ecrit-performants": "France — très performants, écrit",
      "OCDE-ecrit-performants": "Moyenne OCDE — très performants, écrit",
      "FRA-maths-difficulte": "France — en difficulté, mathématiques",
      "OCDE-maths-difficulte": "Moyenne OCDE — en difficulté, mathématiques",
      "FRA-maths-performants": "France — très performants, mathématiques",
      "OCDE-maths-performants": "Moyenne OCDE — très performants, mathématiques",
    },
    script: "scripts/manual/pisa.mjs",
    notes:
      "Élèves « en difficulté » : ceux qui n'atteignent pas le niveau 2 de l'échelle PISA, le seuil que l'OCDE considère nécessaire pour participer pleinement à la vie sociale et économique. Élèves « très performants » : niveau 5 ou 6. La moyenne OCDE est calculée par la DEPP sur les 24 pays présents à tous les cycles depuis 2000, ce qui la rend comparable d'un cycle à l'autre.",
  }),
)
