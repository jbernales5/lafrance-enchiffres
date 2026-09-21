import type { MetadataRoute } from "next"

import { loadCategories } from "@/lib/catalog"
import { SITE_URL } from "@/lib/site"

/**
 * Plan du site, dérivé du catalogue : ajouter un thème suffit à l'y faire figurer.
 * `lastModified` vient de la donnée elle-même — la dernière récupération d'une série du thème —
 * plutôt que de la date du build, qui changerait à chaque déploiement sans rien dire.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const categories = loadCategories()

  const lastOf = (dates: (string | undefined)[]) => {
    const latest = dates.filter(Boolean).sort().at(-1)
    return latest ? new Date(latest) : undefined
  }

  const allFetchedAt = categories.flatMap((c) =>
    c.charts.flatMap((ch) => [
      ch.meta?.fetchedAt,
      ...ch.loadedVariants.map((v) => v.meta?.fetchedAt),
    ])
  )

  return [
    {
      url: SITE_URL,
      lastModified: lastOf(allFetchedAt),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...categories.map((c) => ({
      url: `${SITE_URL}/${c.slug}`,
      lastModified: lastOf(
        c.charts.flatMap((ch) => [
          ch.meta?.fetchedAt,
          ...ch.loadedVariants.map((v) => v.meta?.fetchedAt),
        ])
      ),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/methode`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contribuer`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/a-propos`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
  ]
}
