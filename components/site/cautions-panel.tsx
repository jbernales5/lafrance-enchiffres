import { IconEyeCheck } from "@tabler/icons-react"

/** "Points d'attention": how to read the charts without fooling yourself. Always visible, never a hidden menu. */
export function CautionsPanel({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <section
      aria-labelledby="cautions-title"
      className="relative isolate overflow-hidden rounded-4xl bg-[color-mix(in_oklch,var(--series-3)_8%,var(--card))] p-6 ring-1 ring-foreground/5 sm:p-8 dark:ring-foreground/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 rounded-full bg-[radial-gradient(closest-side,var(--series-3),transparent)] opacity-20 blur-2xl"
      />
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--series-3)_18%,transparent)] text-[var(--series-3)]">
          <IconEyeCheck className="size-5" />
        </span>
        <div>
          <h2
            id="cautions-title"
            className="font-heading text-lg font-semibold"
          >
            Pour lire ces graphes sans se tromper
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Les pièges classiques de ce sujet, et comment on les évite ici.
          </p>
        </div>
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((c, i) => (
          <li
            key={c}
            className="flex gap-3 rounded-2xl bg-card/70 p-4 text-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--series-3)] font-mono text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-pretty">{c}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
