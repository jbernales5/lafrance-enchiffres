"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { useElementWidth } from "@/hooks/use-element-width"
import type { ChartType, SeriesRow } from "@/lib/catalog"
import { niceScale } from "@/lib/scale"
import type { MandateMarker } from "@/lib/mandates"
import { formatPeriod, isYearStart, yearOf } from "@/lib/periods"
import { formatValue } from "@/lib/format"
import {
  colorFor,
  countryOf,
  isDashed,
  isProjection,
  onlyProjectionSplit,
  singleCountry,
} from "@/lib/series-colors"

const VARIANT_DASHES = [undefined, "7 4", "2 4", "10 3 2 3"]
/** Aggregates are always dashed; their variants need visibly different patterns, not the same one twice. */
const AGGREGATE_DASHES = ["5 4", "1 3", "9 3 2 3", "3 2"]
/** Projected continuation of an observed series: one pattern, always the same, so it reads as "not measured". */
const PROJECTION_DASH = "6 4"

/** Same entity drawn several times (dépenses/recettes, femmes/hommes): keep its hue, vary the stroke. */
function dashFor(code: string, series: string[]): string | undefined {
  // A projection shares its hue with the observed series: the stroke is what separates them.
  if (isProjection(code)) return PROJECTION_DASH
  // Same-country series already get distinct colors, so varying the stroke on top would add noise.
  if (singleCountry(series) && !onlyProjectionSplit(series))
    return isDashed(code) ? AGGREGATE_DASHES[0] : undefined
  const aggregate = isDashed(code)
  const country = countryOf(code)
  const siblings = country ? series.filter((s) => countryOf(s) === country) : []
  const index = siblings.length > 1 ? siblings.indexOf(code) : 0
  if (aggregate) return AGGREGATE_DASHES[index % AGGREGATE_DASHES.length]
  return siblings.length > 1
    ? VARIANT_DASHES[index % VARIANT_DASHES.length]
    : undefined
}

export interface TimeChartProps {
  rows: SeriesRow[]
  /** Series codes to draw, in legend order. */
  series: string[]
  labels: Record<string, string>
  type?: ChartType
  markers?: MandateMarker[]
  thresholds?: { value: number; label: string }[]
  zeroBased?: boolean
  /** Join the dots across gaps (elections, censuses). */
  connectNulls?: boolean
  unit?: string
  className?: string
}

type Row = { x: string } & Record<string, number | null | string>

function toRows(rows: SeriesRow[], series: string[]): Row[] {
  const periods = [...new Set(rows.map((r) => r.period))].sort()
  const byKey = new Map(rows.map((r) => [`${r.series}|${r.period}`, r.value]))
  return periods.map((p) => {
    const row: Row = { x: p }
    for (const s of series) row[s] = byKey.get(`${s}|${p}`) ?? null
    return row
  })
}

/** The stroke of a series as drawn on the chart: legend and tooltip share it, so dashes read the same everywhere. */
function StrokeSwatch({
  color,
  dash,
  className,
}: {
  color?: string
  dash?: string
  className?: string
}) {
  return (
    <svg
      aria-hidden
      width="18"
      height="6"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      <line
        x1="0"
        y1="3"
        x2="18"
        y2="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  )
}

/** Clickable legend: one click hides a series, another brings it back. Identity never depends on color alone. */
function LegendContent({
  payload,
  labels,
  series,
  hidden,
  onToggle,
}: {
  payload?: ReadonlyArray<{ dataKey?: unknown; color?: string }>
  labels: Record<string, string>
  series: string[]
  hidden: Set<string>
  onToggle: (code: string) => void
}) {
  if (!payload?.length) return null
  return (
    <ul className="mb-2 flex flex-wrap justify-center gap-x-1 gap-y-0.5 px-2 text-xs text-muted-foreground">
      {payload.map((item) => {
        const key = String(item.dataKey ?? "")
        const off = hidden.has(key)
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={!off}
              title={off ? "Afficher la série" : "Masquer la série"}
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors hover:bg-muted ${off ? "line-through opacity-45" : ""}`}
            >
              <StrokeSwatch color={item.color} dash={dashFor(key, series)} />
              {labels[key] ?? key}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function TooltipContent({
  active,
  payload,
  label,
  labels,
  series,
  unit,
}: {
  active?: boolean
  payload?: ReadonlyArray<{
    dataKey?: unknown
    color?: string
    value?: unknown
  }>
  label?: unknown
  labels: Record<string, string>
  series: string[]
  unit?: string
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => typeof p.value === "number")
  return (
    <div className="grid max-w-xs min-w-40 gap-1.5 rounded-xl bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10">
      <div className="font-medium">
        {formatPeriod(String(label ?? ""))}
        {unit ? (
          <span className="ml-1 font-normal text-muted-foreground">
            · {unit}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1">
        {items.map((item) => {
          const key = String(item.dataKey ?? "")
          return (
            <div key={key} className="flex items-start gap-2">
              <StrokeSwatch
                color={item.color}
                dash={dashFor(key, series)}
                className="mt-1"
              />
              <span className="shrink-0 font-mono font-semibold text-foreground tabular-nums">
                {formatValue(item.value as number)}
              </span>
              <span className="min-w-0 text-muted-foreground">
                {labels[key] ?? key}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const LABEL_H = 14
const LABEL_GAP = 3

function labelWidth(text: string) {
  return text.length * 5.6 + 12
}

/**
 * Marker label on a small pill so it stays legible where it crosses a line or a curve.
 * Works for a line (viewBox.x) and for a zone (centered on viewBox.x + width / 2).
 */
function MarkerLabel(props: {
  viewBox?: { x?: number; y?: number; width?: number }
  value?: string
  level?: number
  zone?: boolean
}) {
  const x =
    (props.viewBox?.x ?? 0) + (props.zone ? (props.viewBox?.width ?? 0) / 2 : 0)
  const y = props.viewBox?.y ?? 0
  const text = props.value ?? ""
  const w = labelWidth(text)
  const top = y + 2 + (props.level ?? 0) * (LABEL_H + LABEL_GAP)
  return (
    <g pointerEvents="none">
      <rect
        x={x - w / 2}
        y={top}
        width={w}
        height={LABEL_H}
        rx={LABEL_H / 2}
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={x}
        y={top + LABEL_H / 2 + 3.5}
        textAnchor="middle"
        fontSize={10}
        fill="var(--muted-foreground)"
      >
        {text}
      </text>
    </g>
  )
}

/** Stacks labels on successive rows when two markers would overlap. Zones are measured from their centre. */
function markerLevels(
  markers: MandateMarker[],
  periods: string[],
  plotWidth: number
): number[] {
  const denom = Math.max(1, periods.length - 1)
  const right: number[] = []
  return markers.map((m) => {
    const start = periods.indexOf(m.period)
    const end = m.endPeriod ? periods.indexOf(m.endPeriod) : start
    const pos = ((start + end) / 2 / denom) * plotWidth
    const half = labelWidth(m.label) / 2
    let level = 0
    while (right[level] !== undefined && right[level] + 6 > pos - half) level++
    right[level] = pos + half
    return level
  })
}

export function TimeChart({
  rows,
  series,
  labels,
  type = "line",
  markers = [],
  thresholds = [],
  zeroBased,
  connectNulls = false,
  unit,
  className,
}: TimeChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  React.useEffect(() => setHidden(new Set()), [series])
  const toggle = React.useCallback(
    (code: string) => {
      setHidden((prev) => {
        const next = new Set(prev)
        if (next.has(code)) next.delete(code)
        else if (next.size < series.length - 1) next.add(code)
        return next
      })
    },
    [series.length]
  )

  const data = React.useMemo(() => toRows(rows, series), [rows, series])
  const periods = React.useMemo(() => data.map((d) => d.x), [data])
  const yearTicks = React.useMemo(() => periods.filter(isYearStart), [periods])
  const config = React.useMemo(() => {
    const c: ChartConfig = {}
    series.forEach(
      (s, i) =>
        (c[s] = { label: labels[s] ?? s, color: colorFor(s, i, series) })
    )
    return c
  }, [series, labels])
  const visible = React.useMemo(
    () => series.filter((s) => !hidden.has(s)),
    [series, hidden]
  )
  const yScale = React.useMemo(() => {
    const values = rows
      .filter((r) => visible.includes(r.series))
      .map((r) => r.value)
    if (type === "area") {
      const sums = data.map((d) =>
        visible.reduce(
          (a, s) => a + (typeof d[s] === "number" ? (d[s] as number) : 0),
          0
        )
      )
      return niceScale([0, ...sums])
    }
    const extra = [...thresholds.map((t) => t.value), ...(zeroBased ? [0] : [])]
    return niceScale([...values, ...extra])
  }, [rows, visible, type, thresholds, zeroBased, data])
  // Mémoïsé : sans cela le tableau change d'identité à chaque rendu et le `useMemo` suivant,
  // qui parcourt les périodes pour chaque repère, ne met jamais rien en cache.
  const visibleMarkers = React.useMemo(
    () => markers.filter((m) => periods.includes(m.period)),
    [markers, periods]
  )
  /**
   * Sur une carte étroite, six noms de président se marchent dessus et recouvrent les courbes :
   * il n'y a pas la place, même en plein écran sur un téléphone. On garde les traits, qui situent
   * les investitures, et les noms réapparaissent dès qu'il y a de quoi les écrire.
   */
  const showMarkerLabels = width === 0 || width >= 480
  const levels = React.useMemo(
    () =>
      showMarkerLabels
        ? markerLevels(visibleMarkers, periods, Math.max(0, width - 64))
        : visibleMarkers.map(() => 0),
    [visibleMarkers, periods, width, showMarkerLabels]
  )
  const maxLevel = showMarkerLabels
    ? levels.reduce((m, l) => Math.max(m, l), 0)
    : 0
  const showLegend = series.length > 1
  const Chart = type === "area" ? AreaChart : LineChart

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="x"
        ticks={yearTicks}
        interval="preserveStartEnd"
        minTickGap={28}
        tickFormatter={(v: string) => String(yearOf(v))}
        tickLine={false}
        axisLine={{ stroke: "var(--chart-axis)" }}
        tickMargin={8}
      />
      <YAxis
        width="auto"
        domain={yScale?.domain ?? ["auto", "auto"]}
        ticks={yScale?.ticks}
        tickFormatter={(v: number) => formatValue(v)}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
      />
      <ChartTooltip
        cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
        isAnimationActive={false}
        itemSorter={(item: { dataKey?: unknown }) =>
          series.indexOf(String(item.dataKey))
        }
        content={<TooltipContent labels={labels} series={series} unit={unit} />}
      />
      {showLegend ? (
        <ChartLegend
          verticalAlign="top"
          itemSorter={(item: { dataKey?: unknown }) =>
            series.indexOf(String(item.dataKey))
          }
          content={
            <LegendContent
              labels={labels}
              series={series}
              hidden={hidden}
              onToggle={toggle}
            />
          }
        />
      ) : null}
      {thresholds.map((t) => (
        <ReferenceLine
          // Deux seuils de même valeur mais de libellé différent auraient la même clé.
          key={`t-${t.value}-${t.label}`}
          y={t.value}
          stroke="var(--muted-foreground)"
          strokeDasharray="2 4"
          label={
            // Comme les noms de président : sur une carte étroite, le libellé retombe au milieu
            // des courbes. Le trait pointillé suffit à situer le seuil.
            showMarkerLabels
              ? {
                  value: t.label,
                  position: "insideBottomRight",
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                }
              : undefined
          }
        />
      ))}
      {visibleMarkers.map((m, i) =>
        m.endPeriod ? (
          <ReferenceArea
            key={`${m.period}-${m.endPeriod}`}
            x1={m.period}
            x2={m.endPeriod}
            fill="var(--destructive)"
            fillOpacity={0.09}
            stroke="var(--destructive)"
            strokeOpacity={0.25}
            strokeWidth={1}
            ifOverflow="visible"
            label={
              showMarkerLabels ? (
                <MarkerLabel value={m.label} level={levels[i]} zone />
              ) : undefined
            }
          />
        ) : (
          <ReferenceLine
            key={m.period}
            x={m.period}
            stroke="var(--chart-marker)"
            strokeDasharray="3 3"
            strokeOpacity={0.8}
            label={
              showMarkerLabels ? (
                <MarkerLabel value={m.label} level={levels[i]} />
              ) : undefined
            }
          />
        )
      )}
    </>
  )

  return (
    <div ref={ref} className="h-full w-full">
      <ChartContainer
        config={config}
        className={
          className ?? "aspect-auto h-[300px] w-full sm:h-[360px] lg:h-[420px]"
        }
      >
        {/* stackOffset="sign" : une série négative (un puits de carbone) se dessine sous l'axe
            au lieu d'être retranchée du sommet de la pile, où elle serait invisible. */}
        <Chart
          accessibilityLayer
          data={data}
          stackOffset={type === "area" ? "sign" : undefined}
          margin={{
            top: 8 + maxLevel * (LABEL_H + LABEL_GAP),
            right: 12,
            bottom: 4,
            left: 4,
          }}
        >
          {axes}
          {series.map((s) =>
            type === "area" ? (
              <Area
                key={s}
                dataKey={s}
                name={labels[s] ?? s}
                type="monotone"
                stackId="stack"
                stroke={`var(--color-${s})`}
                fill={`var(--color-${s})`}
                fillOpacity={0.35}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls={connectNulls}
                hide={hidden.has(s)}
              />
            ) : (
              <Line
                key={s}
                dataKey={s}
                name={labels[s] ?? s}
                type="monotone"
                stroke={`var(--color-${s})`}
                strokeWidth={s === "FRA" ? 2.5 : 1.75}
                strokeDasharray={dashFor(s, series)}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "var(--card)",
                  fill: `var(--color-${s})`,
                }}
                connectNulls={connectNulls}
                isAnimationActive={false}
                hide={hidden.has(s)}
              />
            )
          )}
        </Chart>
      </ChartContainer>
    </div>
  )
}
