/** Placeholder held while a chart's code and data are still loading. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={
        className ??
        "aspect-auto h-[320px] w-full animate-pulse rounded-2xl bg-muted/60 sm:h-[400px] lg:h-[480px]"
      }
    />
  )
}
