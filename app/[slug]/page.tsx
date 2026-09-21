import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChartBlock } from "@/components/charts/chart-block"
import { SankeyBlock } from "@/components/charts/sankey-block"
import { JsonLd } from "@/components/site/json-ld"
import { PageBackdrop } from "@/components/site/page-backdrop"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { CautionsPanel } from "@/components/site/cautions-panel"
import { Badge } from "@/components/ui/badge"
import {
  categorySlugs,
  effectiveLicense,
  loadCategories,
  loadCategory,
  type LoadedChart,
} from "@/lib/catalog"
import { accentFor } from "@/lib/category-accent"
import { categoryIcon } from "@/lib/category-icons"
import { breadcrumbSchema, datasetSchema } from "@/lib/structured-data"
import { formatPeriod } from "@/lib/periods"
import { formatFigure } from "@/lib/format"

export function generateStaticParams() {
  return categorySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = loadCategory(slug)
  if (!cat) return {}
  return {
    title: cat.title,
    description: cat.lead,
    alternates: { canonical: `/${cat.slug}` },
  }
}

/** Licence par fichier de données d'un graphe, variantes comprises. */
function licensesOf(chart: LoadedChart) {
  const out: Record<string, ReturnType<typeof effectiveLicense>> = {}
  if (chart.meta) out[chart.file] = effectiveLicense(chart.meta.source)
  for (const v of chart.loadedVariants)
    if (v.meta) out[v.file] = effectiveLicense(v.meta.source)
  return out
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cat = loadCategory(slug)
  if (!cat) notFound()
  const nav = loadCategories().map((c) => ({ slug: c.slug, title: c.short }))
  const index = nav.findIndex((n) => n.slug === slug)
  const prev = nav[index - 1]
  const next = nav[index + 1]
  const Icon = categoryIcon(cat.slug)

  return (
    <div className="relative flex min-h-svh flex-col">
      <PageBackdrop accent={accentFor(cat.order)} />
      <JsonLd data={breadcrumbSchema(cat)} />
      {cat.charts.map((chart) => {
        const data = datasetSchema(cat, chart)
        return data ? <JsonLd key={chart.id} data={data} /> : null
      })}
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="max-w-3xl">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4" />
            Thème {cat.order} sur {nav.length}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {cat.title}
          </h1>
          <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">
            {cat.lead}
          </p>
          {cat.keyFigureValue ? (
            <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
              <span className="font-heading text-4xl font-semibold tabular-nums">
                {formatFigure(cat.keyFigureValue.value)}
                <span className="ml-1 text-xl text-muted-foreground">
                  {cat.keyFigureValue.unit}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {cat.keyFigureValue.label} ·{" "}
                <Badge variant="secondary">
                  {formatPeriod(cat.keyFigureValue.period)}
                </Badge>
              </span>
            </p>
          ) : null}
        </header>

        <div className="mt-10 flex flex-col gap-6">
          {cat.charts.map((chart, i) =>
            chart.type === "sankey" ? (
              <SankeyBlock key={chart.id} chart={chart} />
            ) : (
              <ChartBlock
                key={chart.id}
                chart={chart}
                categorySlug={cat.slug}
                eager={i === 0}
                licenses={licensesOf(chart)}
              />
            )
          )}
        </div>

        <div className="mt-10">
          <CautionsPanel items={cat.cautions} />
        </div>

        <nav
          className="mt-10 flex justify-between gap-4 text-sm"
          aria-label="Thème précédent et suivant"
        >
          {prev ? (
            <a
              href={`/${prev.slug}`}
              className="text-muted-foreground underline-offset-3 hover:text-foreground hover:underline"
            >
              ← {prev.title}
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a
              href={`/${next.slug}`}
              className="text-muted-foreground underline-offset-3 hover:text-foreground hover:underline"
            >
              {next.title} →
            </a>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <SiteFooter />
    </div>
  )
}
