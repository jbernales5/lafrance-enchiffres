import {
  IconBrandGithub,
  IconDatabasePlus,
  IconExternalLink,
  IconSearch,
} from "@tabler/icons-react"

import { ParticipateDialog } from "@/components/site/participate-dialog"
import { SearchDialog } from "@/components/site/search-dialog"
import { Button } from "@/components/ui/button"
import type { SearchEntry } from "@/lib/search-match"
import { GITHUB_URL } from "@/lib/site"

const SUGGESTIONS = [
  "chômage",
  "dette",
  "loyers",
  "CO₂",
  "retraites",
  "prisons",
  "PISA",
]

/**
 * Right-hand column of the landing hero: the search, then the short version of "this site is
 * corrected in public". On a wide screen the hero would otherwise be half empty; on a phone the
 * two cards simply follow the subtitle.
 */
export function HeroPanel({
  index,
  chartCount,
  themeCount,
}: {
  index: SearchEntry[]
  chartCount: number
  themeCount: number
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-4xl bg-card/80 p-5 ring-1 ring-foreground/10 backdrop-blur dark:ring-foreground/15">
        <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          <IconSearch className="size-3.5" />
          Chercher
        </p>
        <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-balance">
          Recherche globale sur tout l'ensmeble des graphes
        </h2>
        <div className="mt-3">
          <SearchDialog
            index={index}
            variant="hero"
            suggestions={SUGGESTIONS}
          />
        </div>
        <p className="mt-3 text-sm text-pretty text-muted-foreground">
          Tapez un mot, ou appuyez sur{" "}
          <kbd className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-foreground/10">
            ⌘ K
          </kbd>{" "}
          depuis n&apos;importe quelle page.
        </p>
      </div>

      <div className="rounded-4xl border border-dashed p-5">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Open source
        </p>
        <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-balance">
          Ce site est ouvert à tous
        </h2>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          Tout le contenu du site (données code source et commentaires sont sur
          GitHub). Vous pouvez signaler toute erreur ou rajout de données
          librement via notre dépôt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ParticipateDialog size="sm">
            <IconDatabasePlus data-icon="inline-start" />
            Ajouter une donnée
          </ParticipateDialog>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <IconBrandGithub data-icon="inline-start" />
            Voir le dépôt
            <IconExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  )
}
