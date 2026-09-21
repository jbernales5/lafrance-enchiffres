/**
 * Conseil d'orientation des retraites — rapport annuel de juin 2026, partie 2
 * (« les évolutions du système de retraite au regard de l'objectif de pérennité financière »).
 *
 * Le COR publie le classeur des données sources de ses figures, mais derrière une page web
 * sans URL de fichier stable : le classeur est donc versionné dans `data/sources-manuelles/`, et ce
 * script en extrait les deux séries utilisées sur le site. Rien n'est saisi à la main.
 *
 *   Figure 2.2  → dépenses du système de retraite en % du PIB (observé 2002-2025, projeté 2025-2070)
 *   Figure 2.3b → rapport entre le nombre de cotisants et le nombre de retraités (observé, projeté)
 *
 * Le scénario projeté est le scénario de référence du rapport : fécondité 1,45 enfant par femme
 * à partir de 2028, solde migratoire net de 150 000 personnes par an, hypothèses centrales de l'Insee.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { ROOT, SOURCES_DIR, writeSeries } from "../lib/series.mjs"
import { readXlsx } from "../lib/xlsx.mjs"

const FILE = resolve(SOURCES_DIR, "cor-rapport-2026-donnees-partie-2.xlsx")
const SOURCE = {
  name: "Conseil d'orientation des retraites (COR), rapport annuel de juin 2026",
  dataset: "Évolutions et perspectives des retraites en France — partie 2, fichiers sources des figures",
  url: "https://www.cor-retraites.fr/rapports-du-cor/rapport-annuel-cor-juin-2026-evolutions-perspectives-retraites-france",
  downloadUrls: ["https://www.cor-retraites.fr/rapports-du-cor/rapport-annuel-cor-juin-2026-evolutions-perspectives-retraites-france"],
  howToObtain:
    "Classeur « Données_RA2026_P2.xlsx » joint au rapport annuel, onglets « Fig 2.2 » et « Fig 2.3 », lignes « Obs » et « Sc. Ref ». Copie versionnée : data/sources-manuelles/cor-rapport-2026-donnees-partie-2.xlsx.",
  citation:
    "Conseil d'orientation des retraites, « Évolutions et perspectives des retraites en France », rapport annuel de juin 2026. Sources du COR : projections COR juin 2026, comptes nationaux de l'Insee base 2020, rapports à la CCSS 2002-2025.",
}

/** Message clair quand le classeur a été retiré : le site, lui, se construit sans lui. */
function requireFile(path, where) {
  if (!existsSync(path)) {
    throw new Error(
      `Fichier absent : ${path}\n` +
        `Ce script reconstruit une série à partir d'un fichier déposé à la main. Le site se construit\n` +
        `sans lui (les CSV sont versionnés) ; pour régénérer la série, retélécharger le fichier depuis :\n` +
        `  ${where}`,
    )
  }
  return path
}

/** Header row 3 carries the years; column 2 carries "Obs" or "Sc. Ref". */
function readFigure(sheetRows, rowObserved, rowProjected, scale = 1) {
  const years = sheetRows[3]
  const out = []
  for (const [row, series] of [
    [rowObserved, "FRA"],
    [rowProjected, "FRA-projection"],
  ]) {
    const line = sheetRows[row] ?? []
    const kind = line[2]
    if (series === "FRA" && kind !== "Obs") throw new Error(`ligne ${row} : attendu "Obs", trouvé "${kind}"`)
    if (series !== "FRA" && kind !== "Sc. Ref") throw new Error(`ligne ${row} : attendu "Sc. Ref", trouvé "${kind}"`)
    for (let col = 3; col < years.length; col++) {
      const year = years[col]
      const value = line[col]
      if (typeof year !== "number" || typeof value !== "number") continue
      out.push({ period: String(year), series, value: Number((value * scale).toFixed(4)) })
    }
  }
  // The projection restates the last observed year with the same value: keep it, that shared
  // point is what makes the dashed curve start exactly where the solid one stops.
  const lastObserved = out.filter((r) => r.series === "FRA").map((r) => r.period).sort().at(-1)
  return { rows: out, lastObserved }
}

const { sheet } = readXlsx(readFileSync(requireFile(FILE, SOURCE.url)))

const depenses = readFigure(sheet("Fig 2.2"), 4, 5, 100)
console.log(
  "demographie/depenses-retraites",
  writeSeries("demographie", "depenses-retraites", depenses.rows, {
    source: { ...SOURCE, dataset: `${SOURCE.dataset} — figure 2.2` },
    unit: "% du PIB",
    frequency: "annual",
    lastObservation: depenses.lastObserved,
    seriesLabels: {
      FRA: "France — observé",
      "FRA-projection": "France — projection COR (scénario de référence)",
    },
    script: "scripts/manual/cor.mjs",
    notes:
      "Ensemble des régimes de retraite français légalement obligatoires, y compris le FSV, hors RAFP. Hors charges financières, hors dotations et reprises sur provisions. La partie en pointillé est une projection, pas une mesure : elle dépend du scénario de référence du COR (fécondité 1,45, solde migratoire +150 000 par an, hypothèses centrales de l'Insee) et change à chaque rapport.",
  }),
)

const ratio = readFigure(sheet("Fig 2.3"), 6, 7)
console.log(
  "demographie/ratio-cotisants",
  writeSeries("demographie", "ratio-cotisants", ratio.rows, {
    source: { ...SOURCE, dataset: `${SOURCE.dataset} — figure 2.3b` },
    unit: "cotisants par retraité",
    frequency: "annual",
    lastObservation: ratio.lastObserved,
    seriesLabels: {
      FRA: "France — observé",
      "FRA-projection": "France — projection COR (scénario de référence)",
    },
    script: "scripts/manual/cor.mjs",
    notes:
      "Rapport entre le nombre de cotisants et le nombre de retraités de droit direct, tous régimes légalement obligatoires. C'est l'un des trois déterminants de la masse des pensions rapportée au PIB, avec la pension relative et le taux de prélèvement. La partie en pointillé est la projection du scénario de référence du COR.",
  }),
)
