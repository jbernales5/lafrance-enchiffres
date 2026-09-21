/**
 * "Nice" y scale: a round step taken from {1, 2, 2.5, 5} × 10^k, with the domain snapped outward
 * to that step. Returns null when there is nothing to plot.
 */
export function niceScale(
  values: number[],
  maxTicks = 7
): { domain: [number, number]; ticks: number[] } | null {
  if (!values.length) return null
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const rawStep = (max - min) / Math.max(1, maxTicks - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  const factor =
    residual <= 1
      ? 1
      : residual <= 2
        ? 2
        : residual <= 2.5
          ? 2.5
          : residual <= 5
            ? 5
            : 10
  const step = factor * magnitude
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step)
    ticks.push(Number(v.toFixed(10)))
  return { domain: [lo, hi], ticks }
}
