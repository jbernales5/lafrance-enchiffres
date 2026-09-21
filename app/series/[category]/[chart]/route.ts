import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import {
  effectiveLicense,
  licenses,
  loadCategories,
  type SeriesMeta,
} from "@/lib/catalog"

export const dynamic = "force-static"

/** Serves a chart's raw CSV so every figure on the site can be downloaded as data. */
export function generateStaticParams() {
  return loadCategories().flatMap((c) =>
    c.charts
      .flatMap((ch) => [
        ...(ch.status === "ready" ? [ch.file] : []),
        ...ch.loadedVariants.map((v) => v.file),
        ...(ch.loadedForecast && ch.forecast ? [ch.forecast.file] : []),
      ])
      .map((file) => {
        const [category, chart] = file.split("/")
        return { category, chart }
      })
  )
}

/**
 * Le fichier part avec sa provenance. Un CSV téléchargé circule ensuite seul : sans ces lignes,
 * personne ne sait plus d'où il vient ni sous quelle licence il a été obtenu.
 */
function header(meta: SeriesMeta | undefined, file: string): string {
  if (!meta) return ""
  const { license } = effectiveLicense(meta.source)
  const src = meta.source
  const lines = [
    `# ${src.upstream ?? src.publisher}${src.upstream ? ` — republié par ${src.publisher}` : ""}`,
    src.edition ? `# ${src.edition}` : null,
    `# Page de la source : ${src.url}`,
    ...src.downloadUrls.map((u) => `# Requête : ${u}`),
    src.howToObtain ? `# Obtention : ${src.howToObtain}` : null,
    `# Unité : ${meta.unit}`,
    `# Dernière observation : ${meta.lastObservation}`,
    `# Récupéré le : ${meta.fetchedAt}`,
    license
      ? `# Licence : ${license.name}${license.url ? ` (${license.url})` : ""}`
      : null,
    license?.attribution ? `# Attribution : ${license.attribution}` : null,
    src.citation ? `# Citation : ${src.citation}` : null,
    `# Fichier : data/series/${file}.csv — https://lafrance.enchiffres.fr`,
    "#",
  ]
  return lines.filter((l) => l !== null).join("\n") + "\n"
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ category: string; chart: string }> }
) {
  const { category, chart } = await ctx.params
  if (!/^[a-z0-9-]+$/.test(category) || !/^[a-z0-9-]+$/.test(chart)) {
    return new Response("Not found", { status: 404 })
  }
  const file = `${category}/${chart}`
  const path = join(process.cwd(), "data", "series", `${file}.csv`)
  const metaPath = join(process.cwd(), "data", "series", `${file}.meta.json`)
  if (!existsSync(path)) return new Response("Not found", { status: 404 })

  // `licenses()` est mis en cache comme le catalogue : la lecture est faite une fois par build.
  licenses()
  const meta = existsSync(metaPath)
    ? (JSON.parse(readFileSync(metaPath, "utf8")) as SeriesMeta)
    : undefined

  return new Response(header(meta, file) + readFileSync(path, "utf8"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${category}-${chart}.csv"`,
      // Les fichiers sont immuables entre deux déploiements : c'est le déploiement qui les change.
      "cache-control": "public, max-age=0, must-revalidate",
    },
  })
}
