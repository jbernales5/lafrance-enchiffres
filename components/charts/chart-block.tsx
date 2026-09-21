"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconChevronDown,
  IconChartLine,
  IconCheck,
  IconDownload,
  IconExternalLink,
  IconLink,
  IconShare2,
} from "@tabler/icons-react"

import { ChartSkeleton } from "@/components/charts/chart-skeleton"
import { LazyMount } from "@/components/lazy-mount"
import { SourceDialog } from "@/components/charts/source-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type {
  License,
  LoadedChart,
  LoadedVariant,
  Perspective,
  SeriesMeta,
  SeriesRow,
} from "@/lib/catalog"
import type { MarkerSet } from "@/lib/mandates"
import { useMarkerSet } from "@/components/charts/markers-context"
import { formatValue } from "@/lib/format"
import { formatPeriod } from "@/lib/periods"

const TimeChart = dynamic(
  () => import("@/components/charts/time-chart").then((m) => m.TimeChart),
  {
    ssr: false,
    loading: () => (
      <ChartSkeleton className="h-full w-full animate-pulse rounded-2xl bg-muted/60" />
    ),
  }
)

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  france: "France seule",
  europe: "Voisins européens",
  monde: "Monde",
}

/** View id standing for the chart's own file, used when it has variants but no perspective. */
const BASE_VIEW = "principale"

/**
 * Bornes observées de chaque série. C'est ce qui part dans le HTML : les tracés sont rendus côté
 * client, donc sans ce tableau un moteur de recherche ou un agent ne voit aucune valeur. Ce sont
 * des observations brutes, avec leur date — pas une variation calculée sur une période choisie.
 */
function seriesBounds(rows: SeriesRow[], codes: string[]) {
  return codes
    .map((code) => {
      const own = rows
        .filter((r) => r.series === code)
        .sort((a, b) => a.period.localeCompare(b.period))
      const first = own[0]
      const last = own[own.length - 1]
      return first && last ? { code, first, last, count: own.length } : null
    })
    .filter((x) => x !== null)
}

export function ChartBlock({
  chart,
  categorySlug,
  eager = false,
  compact = false,
  defaultView,
  title,
  licenses,
}: {
  chart: LoadedChart
  categorySlug: string
  eager?: boolean
  /** Home-page variant: shorter chart, no note, no share menu. */
  compact?: boolean
  /** Perspective shown first (defaults to the first declared one). */
  defaultView?: Perspective
  /** Overrides the card title (the chart title then becomes the subtitle). */
  title?: string
  /** Licence par fichier de données, calculée côté serveur : clé = `file` du jeu. */
  licenses?: Record<string, { id: string; license: License | undefined }>
}) {
  const perspectives = React.useMemo(
    () =>
      (Object.keys(chart.perspectives ?? {}) as Perspective[]).filter(
        (p) => (chart.perspectives?.[p]?.length ?? 0) > 0
      ),
    [chart.perspectives]
  )
  /**
   * One list for the toggle: the perspectives of the main file, then each alternative dataset.
   * A chart with variants but no perspective still needs an entry for its own file, otherwise
   * the first variant becomes the default and the main dataset is unreachable.
   */
  const views = React.useMemo(() => {
    const base =
      perspectives.length === 0 && chart.loadedVariants.length > 0
        ? [{ id: BASE_VIEW, label: chart.baseLabel ?? "Vue principale" }]
        : []
    return [
      ...base,
      ...perspectives.map((p) => ({
        id: p as string,
        label: chart.perspectiveLabels?.[p] ?? PERSPECTIVE_LABELS[p],
      })),
      ...chart.loadedVariants.map((v) => ({ id: v.id, label: v.label })),
    ]
  }, [
    perspectives,
    chart.perspectiveLabels,
    chart.loadedVariants,
    chart.baseLabel,
  ])
  const [view, setView] = React.useState<string>(
    defaultView && perspectives.includes(defaultView)
      ? defaultView
      : (views[0]?.id ?? "france")
  )
  const [copied, setCopied] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const { set: markerSet, setSet: setMarkerSet } = useMarkerSet()

  React.useEffect(() => {
    if (typeof window === "undefined" || views.length < 2) return
    const wanted = new URLSearchParams(window.location.search).get("vue")
    if (
      wanted &&
      views.some((v) => v.id === wanted) &&
      window.location.hash === `#${chart.id}`
    )
      setView(wanted)
  }, [views, chart.id])

  const variant: LoadedVariant | undefined = chart.loadedVariants.find(
    (v) => v.id === view
  )
  /** The dataset actually drawn: the main file, or an alternative one that keeps its own source. */
  const active: {
    meta: SeriesMeta | null
    rows: SeriesRow[]
    seriesCodes: string[]
    file: string
    gaps: string[]
  } = variant
    ? {
        meta: variant.meta,
        rows: variant.rows,
        seriesCodes: variant.seriesCodes,
        file: variant.file,
        gaps: variant.gaps,
      }
    : {
        meta: chart.meta,
        rows: chart.rows,
        seriesCodes: chart.seriesCodes,
        file: chart.file,
        gaps: chart.gaps,
      }
  const activeMarkers = (variant ? variant.markers : chart.markers)[markerSet]
  const hasEvents =
    (variant ? variant.markers : chart.markers).evenements.length > 0

  const series = React.useMemo(() => {
    if (variant) {
      const wanted = variant.series?.filter((s) =>
        variant.seriesCodes.includes(s)
      )
      return wanted?.length ? wanted : variant.seriesCodes
    }
    const wanted = chart.perspectives?.[view as Perspective]
    const available = wanted
      ? wanted.filter((s) => chart.seriesCodes.includes(s))
      : chart.seriesCodes
    return available.length ? available : chart.seriesCodes
  }, [variant, chart.perspectives, chart.seriesCodes, view])

  const meta = active.meta
  const permalink = () => {
    const url = new URL(`/${categorySlug}`, window.location.origin)
    if (views.length > 1) url.searchParams.set("vue", view)
    url.hash = chart.id
    return url.toString()
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(permalink())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt("Copier le lien", permalink())
    }
  }

  const currentView = views.find((v) => v.id === view)

  const dropdown =
    views.length > 1 ? (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          {currentView?.label ?? "Vue"}
          <IconChevronDown data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={view}
            onValueChange={(v) => setView(String(v))}
          >
            {views.map((v) => (
              <DropdownMenuRadioItem key={v.id} value={v.id}>
                {v.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const pills =
    views.length > 1 ? (
      <ToggleGroup
        value={[view]}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v
          if (typeof next === "string" && next) setView(next)
        }}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Perspective"
      >
        {views.map((v) => (
          <ToggleGroupItem key={v.id} value={v.id}>
            {v.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    ) : null

  /**
   * Sur téléphone la rangée de pastilles déborde de la carte dès deux vues : c'est toujours un
   * menu déroulant. Au-delà de quelques vues, elle déborderait aussi sur grand écran et pousserait
   * le bouton plein écran à la ligne : c'en est un partout. La bande d'accueil est plus étroite,
   * d'où le seuil plus bas.
   */
  const asDropdown = views.length > (compact ? 3 : 4)
  const toggle =
    views.length > 1 ? (
      asDropdown ? (
        dropdown
      ) : (
        <>
          <span className="sm:hidden">{dropdown}</span>
          <span className="hidden sm:inline-flex">{pills}</span>
        </>
      )
    ) : null

  /**
   * Trois choses valent un avertissement avant que le lecteur ne compare : un autre producteur,
   * donc une autre définition ; une rupture déclarée sur le graphe lui-même ; et les années que
   * la source ne publie pas, qui sinon se lisent comme une ligne continue.
   */
  const gapWarning =
    active.gaps.length > 0
      ? active.gaps.length === 1
        ? `La source ne publie pas l'année ${active.gaps[0]} : la courbe la traverse sans mesure.`
        : `La source ne publie pas les années ${active.gaps.join(", ")} : la courbe les traverse sans mesure.`
      : null
  const warnings = [
    variant ? variant.warning : chart.warning,
    gapWarning,
  ].filter(Boolean) as string[]
  const sourceWarning = warnings.length ? (
    <div className="grid gap-1.5">
      {warnings.map((w) => (
        <p
          key={w}
          className="flex gap-2 rounded-2xl bg-[color-mix(in_oklch,var(--series-3)_12%,var(--card))] px-3 py-2 text-xs text-pretty ring-1 ring-foreground/5 dark:ring-foreground/10"
        >
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--series-3)]" />
          <span>{w}</span>
        </p>
      ))}
    </div>
  ) : null

  const markersToggle = hasEvents ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <span>Repères :</span>
      <ToggleGroup
        value={[markerSet]}
        onValueChange={(v) => {
          const next = (Array.isArray(v) ? v[0] : v) as MarkerSet | undefined
          if (next) setMarkerSet(next)
        }}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Type de repères"
      >
        <ToggleGroupItem value="mandats">Mandats</ToggleGroupItem>
        <ToggleGroupItem value="evenements">
          Événements mondiaux
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="italic">
        {markerSet === "mandats"
          ? "Est-ce la responsabilité des présidents ?"
          : "Crises et chocs subis par toute l'Europe."}
      </span>
    </div>
  ) : null

  const renderChart = (className: string) =>
    meta ? (
      <TimeChart
        rows={active.rows}
        series={series}
        labels={meta.seriesLabels}
        type={chart.type ?? "line"}
        markers={activeMarkers}
        thresholds={variant ? variant.thresholds : chart.thresholds}
        zeroBased={chart.zeroBased}
        connectNulls={chart.connectNulls}
        unit={meta.unit}
        className={className}
      />
    ) : null

  const cardHeight = compact
    ? "h-[280px] sm:h-[300px]"
    : "h-[320px] sm:h-[360px] lg:h-[420px]"

  return (
    <Card id={chart.id} className="scroll-mt-20">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg text-balance">
              {title ?? chart.title}
            </CardTitle>
            {title ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {chart.title}
                {chart.subtitle ? ` — ${chart.subtitle}` : ""}
              </p>
            ) : (variant?.subtitle ?? chart.subtitle) ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {variant?.subtitle ?? chart.subtitle}
              </p>
            ) : null}
          </div>
          {chart.status === "ready" ? (
            <div className="flex shrink-0 items-center gap-2">
              {toggle}
              <Button
                variant="outline"
                size="icon-sm"
                className="hidden sm:inline-flex"
                aria-label="Agrandir le graphe"
                onClick={() => setExpanded(true)}
              >
                <IconArrowsMaximize />
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {chart.status === "ready" && meta ? (
          <>
            {/* Le graphe est monté sur tous les formats. Sur téléphone, plusieurs courbes se
                chevauchent vite : le plein écran reste proposé juste en dessous. */}
            <LazyMount
              eager={eager}
              className={`aspect-auto w-full ${cardHeight}`}
            >
              {renderChart(`aspect-auto w-full ${cardHeight}`)}
            </LazyMount>
            <Button
              variant="outline"
              className="w-full sm:hidden"
              onClick={() => setExpanded(true)}
            >
              <IconChartLine data-icon="inline-start" />
              Voir en plein écran
            </Button>
            {sourceWarning}
            {markersToggle}
            {(variant?.note ?? chart.note) && !compact ? (
              <p className="text-sm text-pretty text-muted-foreground">
                {variant?.note ?? chart.note}
              </p>
            ) : null}
            {compact ? null : (
              <details className="group text-sm">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground underline-offset-3 hover:text-foreground hover:underline">
                  Voir les valeurs en clair
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">
                      {chart.title} — première et dernière observation de chaque
                      série, en {meta.unit}
                    </caption>
                    <thead className="text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-1 pr-3 font-normal">
                          Série
                        </th>
                        <th scope="col" className="py-1 pr-3 font-normal">
                          Première observation
                        </th>
                        <th scope="col" className="py-1 pr-3 font-normal">
                          Dernière observation
                        </th>
                        <th scope="col" className="py-1 font-normal">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {seriesBounds(active.rows, series).map((b) => (
                        <tr key={b.code} className="border-t">
                          <th
                            scope="row"
                            className="py-1 pr-3 font-normal text-foreground"
                          >
                            {meta.seriesLabels[b.code] ?? b.code}
                          </th>
                          <td className="py-1 pr-3 tabular-nums">
                            {formatPeriod(b.first.period)} :{" "}
                            {formatValue(b.first.value)} {meta.unit}
                          </td>
                          <td className="py-1 pr-3 tabular-nums">
                            {formatPeriod(b.last.period)} :{" "}
                            {formatValue(b.last.value)} {meta.unit}
                          </td>
                          <td className="py-1 text-muted-foreground tabular-nums">
                            {b.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Toutes les valeurs sont dans le fichier CSV, téléchargeable
                    depuis « Vérifier la donnée ».
                  </p>
                </div>
              </details>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Source : {meta.source.publisher}
                  {meta.source.dataset ? (
                    <>
                      {" · "}
                      <code className="font-mono">{meta.source.dataset}</code>
                    </>
                  ) : null}
                </span>
                <span>
                  Dernière observation : {formatPeriod(meta.lastObservation)}
                </span>
                {meta.fetchedAt ? (
                  <span>
                    Récupéré le{" "}
                    {new Date(meta.fetchedAt).toLocaleDateString("fr-FR")}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <SourceDialog
                  meta={meta}
                  file={active.file}
                  title={
                    variant ? `${chart.title} — ${variant.label}` : chart.title
                  }
                  license={licenses?.[active.file]}
                />
                {compact ? null : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="xs" />}
                    >
                      <IconShare2 data-icon="inline-start" />
                      Partager
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={copyLink}>
                        {copied ? <IconCheck /> : <IconLink />}
                        {copied ? "Lien copié" : "Copier le lien du graphe"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<a href={`/series/${active.file}`} download />}
                      >
                        <IconDownload />
                        Télécharger les données (CSV)
                      </DropdownMenuItem>
                      {meta.source.downloadUrls[0] ? (
                        <DropdownMenuItem
                          render={
                            <a
                              href={meta.source.downloadUrls[0]}
                              target="_blank"
                              rel="noreferrer"
                            />
                          }
                        >
                          <IconExternalLink />
                          Données brutes chez la source
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <Dialog open={expanded} onOpenChange={setExpanded}>
              <DialogContent className="flex h-[100svh] w-screen max-w-none flex-col gap-4 rounded-none p-4 sm:h-[calc(100svh-2rem)] sm:max-w-[calc(100vw-2rem)] sm:rounded-4xl sm:p-6">
                <DialogHeader className="pr-10">
                  <DialogTitle className="text-lg sm:text-xl">
                    {chart.title}
                  </DialogTitle>
                  {(variant?.subtitle ?? chart.subtitle) ? (
                    <DialogDescription>
                      {variant?.subtitle ?? chart.subtitle}
                    </DialogDescription>
                  ) : null}
                </DialogHeader>
                {toggle ? (
                  <div className="-mx-1 overflow-x-auto px-1">{toggle}</div>
                ) : null}
                {sourceWarning}
                <div className="min-h-0 flex-1">
                  {expanded ? renderChart("aspect-auto h-full w-full") : null}
                </div>
                {markersToggle}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    Source : {meta.source.publisher} · dernière observation{" "}
                    {formatPeriod(meta.lastObservation)}
                  </span>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          // Inatteignable dans un build validé : `npm run validate` refuse un fichier de série
          // absent ou vide. Le repli existe pour que le rendu ne casse jamais en développement.
          <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
            <p>
              Ce graphe n&apos;a pas pu être lu depuis les fichiers du dépôt.
            </p>
            {meta?.source?.url ? (
              <a
                href={meta.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground"
              >
                {meta.source.publisher}
                <IconExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
