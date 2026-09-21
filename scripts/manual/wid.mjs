/**
 * World Inequality Database — export pays « France ».
 *
 * WID ne publie pas d'API ouverte : le téléchargement se fait depuis https://wid.world/data/
 * (bouton « Download data », sélection du pays), qui produit un dossier
 * `WID_fulldataset_FR_<date>/`. Le fichier de données brut est trop lourd pour le dépôt :
 * ce script en extrait les seules lignes utilisées et écrit `data/sources-manuelles/wid-france-extrait.csv`,
 * qui, lui, est versionné. Le build fonctionne donc avec ou sans l'export complet.
 *
 * Variables retenues (colonne `variable` de WID) :
 *   sptincj992  part du revenu national avant impôts et transferts monétaires, adultes, égal-split
 *   sdiincj992  part du revenu national après impôts et transferts, adultes, égal-split
 *   shwealj992  part du patrimoine net personnel, adultes, égal-split
 *   lpfghgi999  empreinte carbone moyenne par habitant du groupe, tous âges, en tCO2e/hab
 *
 * Percentiles retenus : p0p50 (50 % du bas), p50p90 (les 40 % du milieu), p90p100 (10 % du haut),
 * p99p100 (1 % du haut). Pour l'empreinte carbone, WID publie p0p50, p50p90, p90p100 et p99p100
 * en moyenne par habitant du groupe : ce sont des niveaux, pas des parts.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { ROOT, SOURCES_DIR, writeSeries } from "../lib/series.mjs"

const EXTRACT = resolve(SOURCES_DIR, "wid-france-extrait.csv")

const VARIABLES = new Set(["sptincj992", "sdiincj992", "shwealj992", "lpfghgi999"])
const PERCENTILES = new Set(["p0p50", "p50p90", "p90p100", "p99p100"])

/**
 * Export brut complet, quand il est disponible localement. Il fait 68 Mo : il n'est pas
 * redistribué, et son chemin est donné à la main par la variable d'environnement WID_FULL_EXPORT.
 */
function findFullExport() {
  const path = process.env.WID_FULL_EXPORT
  return path && existsSync(path) ? path : null
}

function readRows() {
  const full = findFullExport()
  const path = full ?? EXTRACT
  if (!existsSync(path)) {
    throw new Error(
      "L'extrait versionné (data/sources-manuelles/wid-france-extrait.csv) est absent. " +
        "Le régénérer depuis l'export France de https://wid.world/data/ en pointant WID_FULL_EXPORT sur WID_data_FR.csv.",
    )
  }
  const rows = []
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line || line.startsWith("country;")) continue
    const [country, variable, percentile, year, value] = line.split(";")
    if (!VARIABLES.has(variable) || !PERCENTILES.has(percentile)) continue
    if (value === "" || value === undefined || Number.isNaN(Number(value))) continue
    rows.push({ country, variable, percentile, year, value })
  }
  if (full) {
    const csv = ["country;variable;percentile;year;value", ...rows.map((r) => `${r.country};${r.variable};${r.percentile};${r.year};${r.value}`)].join("\n") + "\n"
    writeFileSync(EXTRACT, csv)
    console.log(`extrait réécrit depuis l'export complet : ${rows.length} lignes → data/sources-manuelles/wid-france-extrait.csv`)
  } else {
    console.log(`export complet absent, lecture de l'extrait versionné : ${rows.length} lignes`)
  }
  return rows
}

const all = readRows()
const pick = (variable, percentile, from) =>
  all
    .filter((r) => r.variable === variable && r.percentile === percentile && Number(r.year) >= from)
    .map((r) => ({ period: r.year, value: Number(r.value) }))

const SOURCE = {
  name: "World Inequality Database (WID.world)",
  url: "https://wid.world/country/france/",
  downloadUrls: ["https://wid.world/data/"],
  howToObtain:
    "Export pays « France » (bouton « Download data »). Le fichier brut fait 68 Mo et n'est pas redistribué : seul l'extrait des variables utilisées est versionné, dans data/sources-manuelles/wid-france-extrait.csv.",
  citation:
    "World Inequality Database (WID.world), export France. Séries construites par Thomas Piketty, Emmanuel Saez, Gabriel Zucman et l'équipe du World Inequality Lab à partir des comptes nationaux, des déclarations fiscales et des enquêtes ménages (méthode « distributional national accounts »).",
}

/** Shares are stored as fractions of 1: the site shows percentages. */
const asPercent = (rows, series) => rows.map((r) => ({ period: r.period, series, value: Number((r.value * 100).toFixed(3)) }))

// ── Partage du revenu national ────────────────────────────────────────────────
// sdiinc (après impôts) ne commence qu'en 1980 : on aligne les deux lectures sur cette date
// pour que la comparaison avant/après porte sur la même période.
const REVENU_FROM = 1980
const revenus = [
  ...asPercent(pick("sptincj992", "p0p50", REVENU_FROM), "bottom50-avant"),
  ...asPercent(pick("sptincj992", "p50p90", REVENU_FROM), "middle40-avant"),
  ...asPercent(pick("sptincj992", "p90p100", REVENU_FROM), "top10-avant"),
  ...asPercent(pick("sptincj992", "p99p100", REVENU_FROM), "top1-avant"),
  ...asPercent(pick("sdiincj992", "p0p50", REVENU_FROM), "bottom50-apres"),
  ...asPercent(pick("sdiincj992", "p50p90", REVENU_FROM), "middle40-apres"),
  ...asPercent(pick("sdiincj992", "p90p100", REVENU_FROM), "top10-apres"),
  ...asPercent(pick("sdiincj992", "p99p100", REVENU_FROM), "top1-apres"),
]
console.log(
  "cohesion-sociale/partage-revenus",
  writeSeries("cohesion-sociale", "partage-revenus", revenus, {
    source: { ...SOURCE, dataset: "sptincj992 et sdiincj992, France, percentiles p0p50, p50p90, p90p100, p99p100" },
    unit: "% du revenu national",
    frequency: "annual",
    seriesLabels: {
      "bottom50-avant": "50 % du bas — avant impôts",
      "middle40-avant": "40 % du milieu — avant impôts",
      "top10-avant": "10 % du haut — avant impôts",
      "top1-avant": "1 % du haut — avant impôts",
      "bottom50-apres": "50 % du bas — après impôts",
      "middle40-apres": "40 % du milieu — après impôts",
      "top10-apres": "10 % du haut — après impôts",
      "top1-apres": "1 % du haut — après impôts",
    },
    script: "scripts/manual/wid.mjs",
    notes:
      "Revenu national par adulte, réparti à parts égales au sein du couple. « Avant impôts » est le revenu après retraites et assurance chômage mais avant les autres impôts et transferts ; « après impôts » intègre l'ensemble des impôts et des transferts, monétaires et en nature. Le 1 % du haut est inclus dans le 10 % du haut : les quatre groupes ne s'additionnent pas à 100 %.",
  }),
)

// ── Partage du patrimoine ─────────────────────────────────────────────────────
const PATRIMOINE_FROM = 1980
const patrimoine = [
  ...asPercent(pick("shwealj992", "p0p50", PATRIMOINE_FROM), "bottom50"),
  ...asPercent(pick("shwealj992", "p50p90", PATRIMOINE_FROM), "middle40"),
  ...asPercent(pick("shwealj992", "p90p100", PATRIMOINE_FROM), "top10"),
  ...asPercent(pick("shwealj992", "p99p100", PATRIMOINE_FROM), "top1"),
]
console.log(
  "cohesion-sociale/partage-patrimoine",
  writeSeries("cohesion-sociale", "partage-patrimoine", patrimoine, {
    source: { ...SOURCE, dataset: "shwealj992, France, percentiles p0p50, p50p90, p90p100, p99p100" },
    unit: "% du patrimoine net",
    frequency: "annual",
    seriesLabels: {
      bottom50: "50 % du bas",
      middle40: "40 % du milieu",
      top10: "10 % du haut",
      top1: "1 % du haut",
    },
    script: "scripts/manual/wid.mjs",
    notes:
      "Patrimoine net personnel (actifs financiers et immobiliers, moins les dettes) par adulte, réparti à parts égales au sein du couple. Le 1 % du haut est inclus dans le 10 % du haut. L'export utilisé ne couvre que la France : la comparaison européenne demande de télécharger le même export pour chaque pays.",
  }),
)

// ── Empreinte carbone par groupe de revenu ────────────────────────────────────
const empreinte = [
  ...pick("lpfghgi999", "p0p50", 1990).map((r) => ({ ...r, series: "bottom50" })),
  ...pick("lpfghgi999", "p50p90", 1990).map((r) => ({ ...r, series: "middle40" })),
  ...pick("lpfghgi999", "p90p100", 1990).map((r) => ({ ...r, series: "top10" })),
  ...pick("lpfghgi999", "p99p100", 1990).map((r) => ({ ...r, series: "top1" })),
].map((r) => ({ ...r, value: Number(r.value.toFixed(2)) }))
console.log(
  "climat/empreinte-par-revenu",
  writeSeries("climat", "empreinte-par-revenu", empreinte, {
    source: { ...SOURCE, dataset: "lpfghgi999, France, percentiles p0p50, p50p90, p90p100, p99p100" },
    unit: "tonnes de CO₂e par habitant",
    frequency: "annual",
    seriesLabels: {
      bottom50: "50 % du bas",
      middle40: "40 % du milieu",
      top10: "10 % du haut",
      top1: "1 % du haut",
    },
    script: "scripts/manual/wid.mjs",
    notes:
      "Empreinte carbone individuelle : émissions de la consommation finale et des investissements détenus, imputées aux personnes, tous âges. Elle inclut donc les émissions importées, contrairement à l'inventaire national. La série WID s'arrête en 2019.",
  }),
)
