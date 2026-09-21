"use client"

import * as React from "react"
import {
  IconArrowRight,
  IconCornerDownLeft,
  IconFileText,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { categoryIcon } from "@/lib/category-icons"
import { searchEntries, type SearchEntry } from "@/lib/search-match"
import { GITHUB_URL } from "@/lib/site"

const GROUPS = [
  { kind: "chart", label: "Graphes" },
  { kind: "theme", label: "Thèmes" },
  { kind: "page", label: "Pages" },
] as const

/**
 * The launcher appears twice (hero and header) but the keyboard shortcut must open one dialog,
 * not two. The first instance to mount takes the shortcut and releases it when it unmounts.
 */
let shortcutOwner: symbol | null = null

function useGlobalShortcut(open: () => void) {
  const id = React.useRef<symbol>(undefined)
  if (!id.current) id.current = Symbol("search")
  React.useEffect(() => {
    const me = id.current as symbol
    if (shortcutOwner === null) shortcutOwner = me
    const onKeyDown = (e: KeyboardEvent) => {
      if (shortcutOwner !== me) return
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      open()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      if (shortcutOwner === me) shortcutOwner = null
    }
  }, [open])
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none hidden items-center gap-0.5 rounded-lg bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10 select-none sm:inline-flex">
      {children}
    </kbd>
  )
}

function issueUrl(query: string) {
  const body = `**Sujet ou indicateur recherché** : ${query || "(à préciser)"}

**Pourquoi il manque, selon vous** :

**Source primaire, si vous en connaissez une** (Insee, Eurostat, OCDE, ministère…) :

Règle du site : un graphe n'est publié que si une source officielle publie la donnée. Indiquer la page exacte fait gagner beaucoup de temps.
`
  const p = new URLSearchParams({
    title: query ? `Proposition : ${query}` : "Proposer un graphe",
    body,
    labels: "proposition",
  })
  return `${GITHUB_URL}/issues/new?${p.toString()}`
}

function Row({
  entry,
  active,
  id,
  onHover,
  onPick,
}: {
  entry: SearchEntry
  active: boolean
  id: string
  onHover: () => void
  onPick: () => void
}) {
  const Icon =
    entry.kind === "page" ? IconFileText : categoryIcon(entry.themeSlug ?? "")
  return (
    <a
      id={id}
      role="option"
      aria-selected={active}
      href={entry.href}
      onMouseMove={onHover}
      onClick={onPick}
      className={cn(
        "flex scroll-mt-2 items-center gap-3 rounded-2xl px-3 py-2.5 outline-none",
        active ? "bg-secondary" : "hover:bg-secondary/60"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-medium">{entry.title}</span>
        </span>
        {entry.hint ? (
          <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
            {entry.hint}
          </span>
        ) : null}
      </span>
      {entry.theme ? (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {entry.theme}
        </span>
      ) : null}
      <IconCornerDownLeft
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground",
          active ? "opacity-100" : "opacity-0"
        )}
      />
    </a>
  )
}

export function SearchDialog({
  index,
  variant = "button",
  suggestions,
}: {
  index: SearchEntry[]
  variant?: "button" | "hero"
  /** Hero only: one-click examples, so the empty field is not the only way in. */
  suggestions?: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  const openDialog = React.useCallback(() => setOpen(true), [])
  const openWith = React.useCallback((text: string) => {
    setQuery(text)
    setOpen(true)
  }, [])
  useGlobalShortcut(openDialog)

  const hits = React.useMemo(() => searchEntries(index, query), [index, query])
  // Nothing typed yet: the themes are the most useful thing to offer.
  const shown = React.useMemo(
    () =>
      query.trim()
        ? hits.map((h) => h.entry)
        : index.filter((e) => e.kind === "theme"),
    [hits, index, query]
  )
  const groups = GROUPS.map((g) => ({
    ...g,
    items: shown.filter((e) => e.kind === g.kind),
  })).filter((g) => g.items.length)
  const flat = groups.flatMap((g) => g.items)

  React.useEffect(() => setActive(0), [query])
  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Keep the highlighted row in view when moving with the arrows.
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!flat.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (i + 1) % flat.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === "Home") {
      e.preventDefault()
      setActive(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setActive(flat.length - 1)
    } else if (e.key === "Enter") {
      const target = flat[active]
      if (target) {
        e.preventDefault()
        setOpen(false)
        window.location.assign(target.href)
      }
    }
  }

  /**
   * One trigger, never two: a second hidden instance would also mount the dialog and could end up
   * owning the keyboard shortcut, sending focus back to an invisible button on close.
   */
  const trigger =
    variant === "hero" ? (
      <div className="w-full">
        <button
          type="button"
          onClick={openDialog}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          className="group flex w-full items-center gap-3 rounded-3xl bg-background px-4 py-3.5 text-left ring-1 ring-foreground/10 transition-colors hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring dark:ring-foreground/15"
        >
          <IconSearch className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">
            Chercher un graphe…
          </span>
          <Kbd>⌘ K</Kbd>
        </button>
        {suggestions?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => openWith(s)}
                  aria-haspopup="dialog"
                  className="rounded-2xl bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : (
      <Button
        variant="outline"
        size="sm"
        aria-label="Rechercher"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={openDialog}
        className="gap-2 px-2 md:px-3"
      >
        <IconSearch data-icon="inline-start" />
        <span className="hidden md:inline">Rechercher</span>
        <Kbd>⌘ K</Kbd>
      </Button>
    )

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[8svh] max-h-[84svh] w-[calc(100vw-2rem)] translate-y-0 grid-rows-[auto_1fr_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">Rechercher un graphe</DialogTitle>
          <DialogDescription className="sr-only">
            Tapez un mot pour filtrer les graphes, les thèmes et les pages.
            Flèches haut et bas pour naviguer, Entrée pour ouvrir, Échap pour
            fermer.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b px-4">
            <IconSearch className="size-5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls="search-results"
              aria-autocomplete="list"
              aria-activedescendant={
                flat[active] ? `search-opt-${flat[active].id}` : undefined
              }
              aria-label="Rechercher un graphe, un thème ou une page"
              placeholder="chômage, dette, loyers, CO₂…"
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Échap</Kbd>
          </div>

          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            aria-label="Résultats"
            className="min-h-0 overflow-y-auto p-2"
          >
            {groups.map((g) => (
              <div key={g.kind} role="group" aria-label={g.label}>
                <p
                  aria-hidden
                  className="px-3 pt-3 pb-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
                >
                  {query.trim() ? g.label : "Parcourir par thème"}
                </p>
                {g.items.map((entry) => {
                  const i = flat.indexOf(entry)
                  return (
                    <Row
                      key={entry.id}
                      id={`search-opt-${entry.id}`}
                      entry={entry}
                      active={i === active}
                      onHover={() => setActive(i)}
                      onPick={() => setOpen(false)}
                    />
                  )
                })}
              </div>
            ))}
            {query.trim() && !flat.length ? (
              <p className="px-3 py-10 text-center text-sm text-pretty text-muted-foreground">
                Rien pour « {query.trim()} ». Essayez un mot plus court, ou
                proposez le graphe ci-dessous.
              </p>
            ) : null}
            <p aria-live="polite" className="sr-only">
              {query.trim()
                ? `${flat.length} résultat${flat.length > 1 ? "s" : ""}`
                : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-sm text-pretty sm:min-w-0 sm:flex-1">
              <span className="font-medium">
                Vous ne trouvez pas ce que vous cherchez&#8239;?
              </span>{" "}
              <span className="text-muted-foreground">
                Proposez-le : il sera publié si une source officielle existe.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button
                size="sm"
                nativeButton={false}
                onClick={() => setOpen(false)}
                render={
                  <a
                    href={issueUrl(query.trim())}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <IconSparkles data-icon="inline-start" />
                Proposer un graphe
              </Button>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                onClick={() => setOpen(false)}
                render={<a href="/contribuer" />}
              >
                Contribuer
                <IconArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
