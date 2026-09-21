import { BudgetSankeyLazy } from "@/components/charts/budget-sankey-lazy"
import { SourceDialog } from "@/components/charts/source-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { effectiveLicense, type LoadedChart } from "@/lib/catalog"

/**
 * Le diagramme budgétaire, monté depuis le catalogue comme n'importe quel autre graphe : il a
 * donc sa source, son « Vérifier la donnée » et son CSV téléchargeable, sur la page d'accueil
 * comme sur la page du thème.
 */
export function SankeyBlock({
  chart,
  title,
}: {
  chart: LoadedChart
  title?: string
}) {
  if (chart.status !== "ready" || !chart.meta) return null

  const measuredYear = chart.rows
    .map((r) => r.period)
    .sort()
    .at(-1)
  if (!measuredYear) return null

  const datasets = [
    {
      year: measuredYear,
      kind: "fact" as const,
      rows: chart.rows,
      meta: chart.meta,
    },
    ...(chart.loadedForecast?.meta && chart.forecast
      ? [
          {
            year: chart.forecast.year,
            kind: "forecast" as const,
            rows: chart.loadedForecast.rows,
            meta: chart.loadedForecast.meta,
          },
        ]
      : []),
  ]
  const forecastPending =
    chart.forecast && !chart.loadedForecast
      ? { year: chart.forecast.year }
      : undefined

  return (
    <Card id={chart.id} className="scroll-mt-20 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">
          {title ?? chart.title}
        </CardTitle>
        {chart.subtitle ? (
          <CardDescription>{chart.subtitle}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BudgetSankeyLazy
          datasets={datasets}
          forecastPending={forecastPending}
        />
        {chart.note ? (
          <p className="text-sm text-pretty text-muted-foreground">
            {chart.note}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Source : {chart.meta.source.publisher}
              {chart.meta.source.dataset ? (
                <>
                  {" "}
                  ·{" "}
                  <code className="font-mono">{chart.meta.source.dataset}</code>
                </>
              ) : null}
            </span>
            <span>Dernière observation : {measuredYear}</span>
          </div>
          <SourceDialog
            meta={chart.meta}
            file={chart.file}
            title={chart.title}
            license={effectiveLicense(chart.meta.source)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
