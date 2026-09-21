import { IconArrowRight } from "@tabler/icons-react"

import { ChartBlock } from "@/components/charts/chart-block"
import { effectiveLicense, type LoadedChart } from "@/lib/catalog"
import { Button } from "@/components/ui/button"
import type { LoadedCategory } from "@/lib/catalog"
import { accentFor } from "@/lib/category-accent"
import { categoryIcon } from "@/lib/category-icons"
import { formatPeriod } from "@/lib/periods"
import { formatFigure } from "@/lib/format"

/** Licence par fichier de données d'un graphe, variantes comprises. */
function licensesOf(chart: LoadedChart) {
  const out: Record<string, ReturnType<typeof effectiveLicense>> = {}
  if (chart.meta) out[chart.file] = effectiveLicense(chart.meta.source)
  for (const v of chart.loadedVariants)
    if (v.meta) out[v.file] = effectiveLicense(v.meta.source)
  return out
}

export function ThemeBand({
  cat,
  index,
  total,
  eager = false,
}: {
  cat: LoadedCategory
  index: number
  total: number
  eager?: boolean
}) {
  // Le diagramme budgétaire a son propre rendu : il ne peut pas servir de graphe « héros ».
  const hero =
    cat.charts.find((c) => c.id === cat.hero?.chart && c.type !== "sankey") ??
    cat.charts.find((c) => c.status === "ready" && c.type !== "sankey")
  if (!hero) return null
  const accent = accentFor(cat.order)
  const flip = index % 2 === 1
  const firstSentence = cat.lead.split(/(?<=\.)\s/)[0]
  const Icon = categoryIcon(cat.slug)

  return (
    <section
      aria-labelledby={`band-${cat.slug}`}
      className="relative isolate overflow-hidden rounded-4xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
      style={{ ["--accent" as string]: `var(${accent})` }}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_var(--gx)_0%,color-mix(in_oklch,var(--accent)_14%,transparent),transparent_60%)] ${flip ? "[--gx:100%]" : "[--gx:0%]"}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-4xl ring-1 ring-foreground/5 dark:ring-foreground/10"
      />
      <div
        className={`grid gap-8 lg:items-center ${flip ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:[&>*:first-child]:order-2" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-8 items-center justify-center rounded-xl"
              style={{
                background:
                  "color-mix(in oklch, var(--accent) 16%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Icon className="size-4" />
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {String(cat.order).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>
          <h3
            id={`band-${cat.slug}`}
            className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            {cat.title}
          </h3>
          <p className="text-pretty text-muted-foreground">{firstSentence}</p>
          {cat.keyFigureValue ? (
            <p className="mt-2">
              <span className="font-heading text-5xl font-semibold tabular-nums sm:text-6xl">
                {formatFigure(cat.keyFigureValue.value)}
              </span>
              <span className="ml-2 text-lg text-muted-foreground">
                {cat.keyFigureValue.unit}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {cat.keyFigureValue.label} ·{" "}
                {formatPeriod(cat.keyFigureValue.period)}
              </span>
            </p>
          ) : null}
          <div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/${cat.slug}`} />}
            >
              Plus de statistiques
              <span className="text-muted-foreground">
                · {cat.readyCount} graphes
              </span>
              <IconArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
        <ChartBlock
          chart={hero}
          categorySlug={cat.slug}
          eager={eager}
          compact
          defaultView={cat.hero?.perspective}
          licenses={licensesOf(hero)}
        />
      </div>
    </section>
  )
}
