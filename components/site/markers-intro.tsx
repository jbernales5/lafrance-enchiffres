import { MANDATES, WORLD_EVENTS } from "@/lib/mandates"

/** The two reading keys, shown once on the landing page so the charts need no legend for them. */
export function MarkersIntro() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <div className="rounded-3xl bg-card/70 p-4 ring-1 ring-foreground/5 backdrop-blur dark:ring-foreground/10">
        <div className="flex items-center gap-3">
          <svg aria-hidden width="28" height="28" className="shrink-0">
            <line
              x1="14"
              y1="2"
              x2="14"
              y2="26"
              stroke="var(--chart-marker)"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </svg>
          <p className="font-medium">Repères « mandats »</p>
        </div>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          Une ligne à chaque investiture :{" "}
          {MANDATES.map((m) => m.label).join(", ")}. Pour voir ce qui change de
          mandat en mandat.
        </p>
      </div>
      <div className="rounded-3xl bg-card/70 p-4 ring-1 ring-foreground/5 backdrop-blur dark:ring-foreground/10">
        <div className="flex items-center gap-3">
          <svg aria-hidden width="28" height="28" className="shrink-0">
            <rect
              x="6"
              y="2"
              width="16"
              height="24"
              rx="3"
              fill="var(--destructive)"
              fillOpacity="0.15"
              stroke="var(--destructive)"
              strokeOpacity="0.4"
            />
          </svg>
          <p className="font-medium">Repères « chocs mondiaux »</p>
        </div>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          Des zones qu'on peut considérer comme impactant le monde :{" "}
          {WORLD_EVENTS.map((e) => e.label.toLowerCase()).join(", ")}.
        </p>
      </div>
    </div>
  )
}
