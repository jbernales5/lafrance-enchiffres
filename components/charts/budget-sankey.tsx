"use client"

import * as React from "react"
import { IconArrowsMaximize, IconSparkles } from "@tabler/icons-react"
import { Sankey, Tooltip } from "recharts"

import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useElementWidth } from "@/hooks/use-element-width"
import { cn } from "@/lib/utils"
import type { SeriesMeta, SeriesRow } from "@/lib/catalog"
import { formatBillions } from "@/lib/format"

/** Short display names; the full Eurostat wording stays in the meta file and the tooltip. */
const SHORT: Record<string, string> = {
  "rec-D2": "TVA, taxes sur la production",
  "rec-D5": "Impôts sur le revenu et le patrimoine",
  "rec-D61": "Cotisations sociales",
  "rec-D91": "Impôts sur le capital",
  "rec-autres": "Autres recettes",
  "dep-GF01": "Services publics généraux (hors dette)",
  "dep-GF0107": "Intérêts de la dette",
  "dep-GF02": "Défense",
  "dep-GF03": "Ordre et sécurité",
  "dep-GF04": "Affaires économiques",
  "dep-GF05": "Environnement",
  "dep-GF06": "Logement, équipements",
  "dep-GF07": "Santé",
  "dep-GF08": "Loisirs, culture, culte",
  "dep-GF09": "Enseignement",
  "dep-GF10": "Protection sociale",
}

const LEVEL1 = /^dep-GF\d\d$/
const LEVEL2 = /^dep-GF\d{4}$/

type Kind = "rec" | "deficit" | "hub" | "dep" | "interest"

interface Node {
  name: string
  full: string
  kind: Kind
  code?: string
  /** Level-2 breakdown (COFOG sub-functions), largest first. */
  parts?: { name: string; value: number }[]
}

export interface SankeyDataset {
  year: string
  /** "fact" for national accounts outturns, "forecast" for government projections. */
  kind: "fact" | "forecast"
  rows: SeriesRow[]
  meta: SeriesMeta
}

/** L'année projetée proposée dans le sélecteur, tant que son diagramme n'est pas prêt. */
export interface ForecastPending {
  year: string
}

interface Props {
  datasets: SankeyDataset[]
  /** Shown when the forecast file is not in the repo yet. */
  forecastPending?: ForecastPending
}

function build(
  rows: SeriesRow[],
  labels: Record<string, string>,
  year: string
) {
  const v = Object.fromEntries(
    rows.filter((r) => r.period === year).map((r) => [r.series, r.value])
  )
  const gf01 = v["dep-GF01"]
  const interest = v["dep-GF0107"]
  if (interest !== undefined && gf01 !== undefined)
    v["dep-GF01"] = Math.round((gf01 - interest) * 10) / 10
  const revenue = Object.keys(v)
    .filter((k) => k.startsWith("rec-"))
    .sort((a, b) => v[b] - v[a])
  const spending = Object.keys(v)
    .filter((k) => LEVEL1.test(k) || k === "dep-GF0107")
    .sort((a, b) => v[b] - v[a])
  const deficit = Math.abs(v["deficit"] ?? 0)
  const name = (k: string) => SHORT[k] ?? labels[k] ?? k
  /** Sub-items of a node: COFOG level 2 for spending, `rec2-<parent>-` codes for revenue. */
  const partsOf = (k: string) => {
    let keys: string[] = []
    if (LEVEL1.test(k)) {
      const prefix = k.replace("dep-", "")
      keys = Object.keys(v).filter(
        (s) =>
          LEVEL2.test(s) &&
          s.startsWith(`dep-${prefix}`) &&
          s !== "dep-GF0107" &&
          v[s] > 0
      )
    } else if (k.startsWith("rec-")) {
      const prefix = k.replace("rec-", "")
      keys = Object.keys(v).filter(
        (s) => s.startsWith(`rec2-${prefix}-`) && v[s] > 0
      )
    }
    const parts = keys
      .map((s) => ({ name: labels[s] ?? s, value: v[s] }))
      .sort((a, b) => b.value - a.value)
    return parts.length ? parts : undefined
  }
  const nodes: Node[] = [
    ...revenue.map((k) => ({
      name: name(k),
      full: labels[k] ?? k,
      kind: "rec" as Kind,
      code: k,
      parts: partsOf(k),
    })),
    {
      name: "Déficit",
      full: "Déficit public : dépenses non couvertes par les recettes",
      kind: "deficit",
    },
    {
      name: `Dépenses ${year}`,
      full: `Dépenses publiques ${year}`,
      kind: "hub",
    },
    ...spending.map((k) => ({
      name: name(k),
      full: labels[k] ?? k,
      kind: (k === "dep-GF0107" ? "interest" : "dep") as Kind,
      code: k,
      parts: partsOf(k),
    })),
  ]
  const hub = revenue.length + 1
  const links = [
    ...revenue.map((k, i) => ({ source: i, target: hub, value: v[k] })),
    { source: revenue.length, target: hub, value: deficit },
    ...spending.map((k, i) => ({
      source: hub,
      target: hub + 1 + i,
      value: v[k],
    })),
  ].filter((l) => l.value > 0)
  return {
    nodes,
    links,
    totals: { rec: v["recettes-total"], dep: v["depenses-total"], deficit },
  }
}

/**
 * Recettes → budget → dépenses. Le déficit est le flux sombre qui comble l'écart ;
 * les intérêts de la dette (COFOG 01.7) sont sortis des « services publics généraux » ;
 * le survol d'une fonction montre ses sous-fonctions. Every value comes from the data files.
 */
/**
 * Le diagramme seul. Il mesure sa propre largeur, parce qu'il est rendu à deux endroits de
 * tailles différentes : dans la carte, et dans la fenêtre plein écran.
 */
function SankeyDiagram({
  data,
  className,
}: {
  data: NonNullable<ReturnType<typeof build>>
  className: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const compact = width > 0 && width < 440
  // Les libellés vivent dans les marges latérales : elles prennent une part de la largeur,
  // plafonnée pour qu'il reste toujours de la place aux flux.
  const side =
    width > 0 ? Math.round(Math.min(210, Math.max(92, width * 0.27))) : 160

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <ChartContainer config={{}} className="h-full w-full">
        <Sankey
          data={data}
          nodePadding={compact ? 10 : 14}
          nodeWidth={10}
          margin={{ top: 20, right: side, bottom: 8, left: side }}
          link={<SankeyLink />}
          node={<SankeyNodeShape compact={compact} side={side} />}
          iterations={48}
        >
          <Tooltip isAnimationActive={false} content={<SankeyTooltip />} />
        </Sankey>
      </ChartContainer>
    </div>
  )
}

export function BudgetSankey({ datasets, forecastPending }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  /**
   * Sous cette largeur, les libellés mangent plus de place que les flux et le diagramme devient
   * illisible. La carte montre alors les trois totaux, et le diagramme s'ouvre en plein écran.
   */
  const narrow = width > 0 && width < 480
  const [expanded, setExpanded] = React.useState(false)
  const [year, setYear] = React.useState(datasets[0]?.year ?? "")
  const current = datasets.find((d) => d.year === year) ?? datasets[0]
  const options = [
    ...datasets.map((d) => ({ year: d.year, kind: d.kind, available: true })),
    ...(forecastPending
      ? [
          {
            year: forecastPending.year,
            kind: "forecast" as const,
            available: false,
          },
        ]
      : []),
  ]
  const showingPending = forecastPending && year === forecastPending.year

  const data = React.useMemo(
    () =>
      current
        ? build(current.rows, current.meta.seriesLabels, current.year)
        : null,
    [current]
  )
  return (
    <div ref={ref} className="flex flex-col gap-3">
      {options.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <ToggleGroup
            value={[year]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              if (typeof next === "string" && next) setYear(next)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Année"
          >
            {options.map((o) => (
              <ToggleGroupItem key={o.year} value={o.year}>
                {o.year}
                <span className="ml-1 text-[10px] text-muted-foreground uppercase">
                  {o.kind === "fact" ? "constaté" : "prévision"}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="italic">
            {current?.kind === "forecast" || showingPending
              ? "Prévisions du gouvernement : pas une mesure définitive"
              : "Comptes nationaux définitifs"}
          </span>
        </div>
      ) : null}

      {showingPending && forecastPending ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed p-8 text-center sm:min-h-[420px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            <IconSparkles className="size-3.5" />
            Bientôt
          </span>
          <p className="font-heading text-xl font-medium text-balance sm:text-2xl">
            Le budget {forecastPending.year} arrive
          </p>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            Nous récupérons les sources officielles de la prévision du
            gouvernement en matière de dépense et revenus. Cette vue reste vide
            le temps que l'on récupère les infos.
          </p>
        </div>
      ) : data ? (
        <>
          {narrow ? null : (
            <SankeyDiagram
              data={data}
              className="aspect-auto h-[460px] w-full sm:h-[520px]"
            />
          )}
          <dl className="grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { label: "Recettes", value: data.totals.rec ?? 0 },
              { label: "Déficit", value: data.totals.deficit },
              { label: "Dépenses", value: data.totals.dep ?? 0 },
            ].map((t) => (
              <div key={t.label} className="rounded-2xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{t.label}</dt>
                <dd className="font-heading text-lg font-semibold tabular-nums sm:text-xl">
                  {formatBillions(t.value)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    Md€
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {narrow ? (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setExpanded(true)}
              >
                <IconArrowsMaximize data-icon="inline-start" />
                Voir le diagramme complet
              </Button>
              <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogContent className="flex h-[100svh] w-screen max-w-none flex-col gap-3 rounded-none p-4">
                  <DialogHeader className="pr-10">
                    <DialogTitle className="text-lg">
                      Où va l&apos;argent public ? {current?.year}
                    </DialogTitle>
                    <DialogDescription>
                      Recettes à gauche, dépenses à droite, en milliards
                      d&apos;euros. Faites glisser pour parcourir le diagramme.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Même en plein écran, un téléphone reste étroit : le diagramme est tracé à sa
                      largeur minimale et c'est la fenêtre qui défile latéralement. */}
                  <div className="-mx-1 min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-1">
                    {expanded ? (
                      <div className="h-full min-w-[640px]">
                        <SankeyDiagram data={data} className="h-full w-full" />
                      </div>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Survolez un flux ou un libellé pour voir sa décomposition :
              sous-postes de recettes, sous-fonctions de dépenses (nomenclature
              COFOG, niveau 2).
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}

type Part = { name: string; value: number }

type HoveredItem = {
  full?: string
  name?: string
  kind?: Kind
  parts?: Part[]
  source?: HoveredItem
  target?: HoveredItem
}

type SankeyTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>
}

function toneFor(kind?: Kind) {
  if (kind === "interest") return "var(--series-8)"
  if (kind === "dep") return "var(--series-3)"
  if (kind === "deficit") return "var(--foreground)"
  return "var(--series-2)"
}

/**
 * Decomposition of the hovered flow: one row per sub-item, each backed by a bar whose
 * width is the share it represents. The bar is the percentage, so the eye reads the weight
 * before the number.
 */
function Decomposition({
  parts,
  total,
  tone,
}: {
  parts: Part[]
  total: number
  tone: string
}) {
  return (
    <ul className="mt-2 grid gap-px border-t pt-2">
      {parts.map((part) => {
        const share = total ? (part.value / total) * 100 : 0
        return (
          <li
            key={part.name}
            className="relative flex items-center justify-between gap-3 overflow-hidden rounded-sm px-1.5 py-1"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{
                width: `${Math.max(share, 0.6)}%`,
                background: tone,
                opacity: 0.3,
              }}
            />
            <span className="relative min-w-0 truncate">{part.name}</span>
            <span className="relative shrink-0 font-mono tabular-nums">
              {formatBillions(part.value)}
              <span className="ml-1.5 text-muted-foreground">
                {Math.round(share)} %
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Themed tooltip. Hovering a band gives a link, hovering a label gives a node:
 * both resolve to the side that carries a decomposition, so the whole flow is hoverable.
 */
function SankeyTooltip({ active, payload }: SankeyTooltipProps) {
  const item = payload?.[0]
  if (!active || !item) return null
  // Recharts wraps the searched entry once more: item.payload = { payload: node | link, name, value }.
  const raw = item.payload as { payload?: unknown } | undefined
  const hovered = (
    raw && typeof raw === "object" && "payload" in raw && raw.payload
      ? raw.payload
      : raw
  ) as HoveredItem | undefined
  const decomposed = hovered?.parts
    ? hovered
    : hovered?.source?.parts
      ? hovered.source
      : hovered?.target?.parts
        ? hovered.target
        : undefined
  const subject =
    decomposed ??
    (hovered?.source || hovered?.target
      ? hovered?.source?.kind === "hub"
        ? hovered.target
        : hovered?.source
      : hovered)
  const label = subject?.full ?? subject?.name ?? ""
  const total = Number(item.value)
  const parts = decomposed?.parts?.slice(0, 9)
  const tone = toneFor(subject?.kind)

  return (
    <div className="max-w-sm rounded-xl bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatBillions(total)} Md€
        </span>
        <span className="min-w-0 text-pretty text-muted-foreground">
          {label}
        </span>
      </div>
      {parts?.length ? (
        <Decomposition parts={parts} total={total} tone={tone} />
      ) : null}
    </div>
  )
}

type LinkProps = {
  sourceX?: number
  sourceY?: number
  sourceControlX?: number
  targetX?: number
  targetY?: number
  targetControlX?: number
  linkWidth?: number
  payload?: { source?: { kind?: Kind }; target?: { kind?: Kind } }
}

/** The band itself is the hit area: Recharts wraps it in a layer that fires the tooltip. */
function SankeyLink({
  sourceX = 0,
  sourceY = 0,
  sourceControlX = 0,
  targetX = 0,
  targetY = 0,
  targetControlX = 0,
  linkWidth = 0,
  payload,
}: LinkProps) {
  const isDeficit = payload?.source?.kind === "deficit"
  const toInterest = payload?.target?.kind === "interest"
  const toSpending = payload?.target?.kind === "dep" || toInterest
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  const stroke = isDeficit
    ? "var(--foreground)"
    : toInterest
      ? "var(--series-8)"
      : toSpending
        ? "var(--series-3)"
        : "var(--series-2)"
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeOpacity={isDeficit ? 0.55 : toInterest ? 0.5 : 0.28}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  )
}

/** Breaks a label into at most two lines that fit the side margin. */
function wrapLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const cut = text.lastIndexOf(" ", maxChars)
  const first = cut > 0 ? text.slice(0, cut) : text.slice(0, maxChars)
  let rest = text.slice(first.length).trim()
  if (rest.length > maxChars) rest = rest.slice(0, maxChars - 1) + "…"
  return [first, rest]
}

type NodeShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: { name: string; kind: Kind; value?: number; parts?: unknown[] }
  compact: boolean
  side: number
}

function SankeyNodeShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  compact,
  side,
}: NodeShapeProps) {
  const kind = payload?.kind ?? "rec"
  const fill =
    kind === "deficit"
      ? "var(--foreground)"
      : kind === "interest"
        ? "var(--series-8)"
        : kind === "dep"
          ? "var(--series-3)"
          : "var(--series-2)"
  const isLeft = kind === "rec" || kind === "deficit"
  const isHub = kind === "hub"
  const fontSize = compact ? 10 : 11
  const textX = isHub ? x + width / 2 : isLeft ? x - 8 : x + width + 8
  const anchor = isHub ? "middle" : isLeft ? "end" : "start"
  const lines = isHub
    ? [payload?.name ?? ""]
    : wrapLabel(
        payload?.name ?? "",
        Math.max(8, Math.floor((side - 12) / (fontSize * 0.58)))
      )
  const show = isHub || lines.length === 1 || height > fontSize * 2
  const lineHeight = fontSize + 2
  const startY = isHub
    ? y - 8
    : y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4
  return (
    <g className={payload?.parts ? "cursor-help" : undefined}>
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 1)}
        rx={3}
        fill={fill}
        fillOpacity={0.9}
      />
      {show
        ? lines.map((line, i) => (
            <text
              key={i}
              x={textX}
              y={startY + i * lineHeight}
              textAnchor={anchor}
              fontSize={fontSize}
              fill="var(--foreground)"
            >
              {line}
              {!isHub && i === lines.length - 1 && payload?.value ? (
                <tspan fill="var(--muted-foreground)">
                  {" "}
                  {formatBillions(payload.value)}
                </tspan>
              ) : null}
            </text>
          ))
        : null}
    </g>
  )
}
