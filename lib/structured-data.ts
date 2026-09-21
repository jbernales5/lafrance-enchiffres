import "server-only"

import {
  effectiveLicense,
  type LoadedCategory,
  type LoadedChart,
} from "@/lib/catalog"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

/**
 * Données structurées schema.org. Elles disent à un moteur — de recherche ou conversationnel —
 * que chaque graphe est un jeu de données, qui l'a produit, sous quelle licence, sur quelle
 * période, et surtout où télécharger le fichier. Sans elles, un agent ne voit qu'une page de
 * titres : les valeurs sont tracées côté client et n'existent pas dans le HTML.
 *
 * Tout est dérivé du catalogue, donc rien ne peut diverger des graphes réellement publiés.
 */

const PUBLISHER = {
  "@type": "Person",
  name: "Jonathan Bernales",
  url: "https://github.com/jbernales5",
} as const

/** Bornes observées d'un graphe, au format ISO 8601 « début/fin » attendu par schema.org. */
function temporalCoverage(chart: LoadedChart): string | undefined {
  if (!chart.rows.length) return undefined
  const periods = chart.rows.map((r) => r.period).sort()
  const first = periods[0]
  const last = periods[periods.length - 1]
  return first && last ? `${first.slice(0, 4)}/${last.slice(0, 4)}` : undefined
}

export function datasetSchema(cat: LoadedCategory, chart: LoadedChart) {
  if (chart.status !== "ready" || !chart.meta) return null
  const meta = chart.meta
  const { license } = effectiveLicense(meta.source)

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${chart.title} — ${cat.short}`,
    description: [chart.subtitle, meta.notes].filter(Boolean).join(" "),
    url: `${SITE_URL}/${cat.slug}#${chart.id}`,
    identifier: `${cat.slug}/${chart.id}`,
    inLanguage: "fr",
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: meta.source.upstream ?? meta.source.publisher,
      url: meta.source.url,
    },
    publisher: PUBLISHER,
    ...(license?.url ? { license: license.url } : {}),
    ...(meta.source.citation ? { citation: meta.source.citation } : {}),
    temporalCoverage: temporalCoverage(chart),
    spatialCoverage: { "@type": "Place", name: "France" },
    dateModified: meta.fetchedAt,
    measurementTechnique: meta.source.dataset
      ? `${meta.source.publisher} — ${meta.source.dataset}`
      : meta.source.publisher,
    variableMeasured: Object.entries(meta.seriesLabels).map(
      ([code, label]) => ({
        "@type": "PropertyValue",
        name: label,
        identifier: code,
        unitText: meta.unit,
      })
    ),
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_URL}/series/${chart.file}`,
        name: `${chart.title} (CSV)`,
      },
      ...meta.source.downloadUrls.map((u) => ({
        "@type": "DataDownload",
        contentUrl: u,
        name: `Requête d'origine chez ${meta.source.publisher}`,
      })),
    ],
  }
}

/** Le site entier, vu comme un catalogue de jeux de données. */
export function catalogSchema(categories: LoadedCategory[]) {
  const ready = categories.flatMap((c) =>
    c.charts.filter((ch) => ch.status === "ready")
  )
  const producers = [
    ...new Set(ready.map((ch) => ch.meta?.source.publisher).filter(Boolean)),
  ]

  return {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    name: SITE_NAME,
    alternateName: "LaFranceEnChiffres.fr",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "fr",
    isAccessibleForFree: true,
    publisher: PUBLISHER,
    keywords: [
      "statistiques publiques",
      "France",
      "données ouvertes",
      ...categories.map((c) => c.short),
    ],
    about: producers.map((name) => ({ "@type": "Organization", name })),
    dataset: categories.flatMap((c) =>
      c.charts
        .filter((ch) => ch.status === "ready")
        .map((ch) => ({
          "@type": "Dataset",
          name: `${ch.title} — ${c.short}`,
          url: `${SITE_URL}/${c.slug}#${ch.id}`,
        }))
    ),
  }
}

export function breadcrumbSchema(cat: LoadedCategory) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: cat.title,
        item: `${SITE_URL}/${cat.slug}`,
      },
    ],
  }
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
}
