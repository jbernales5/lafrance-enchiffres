import { IconArrowDown } from "@tabler/icons-react"

import { SankeyBlock } from "@/components/charts/sankey-block"
import { JsonLd } from "@/components/site/json-ld"
import { ApproachDialog } from "@/components/site/approach-dialog"
import { ContributeCta } from "@/components/site/contribute-cta"
import { LandingBackdrop } from "@/components/site/landing-backdrop"
import { MarkersIntro } from "@/components/site/markers-intro"
import { HeroPanel } from "@/components/site/hero-panel"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { ThemeBand } from "@/components/site/theme-band"
import { Button } from "@/components/ui/button"
import { findChart, loadCategories } from "@/lib/catalog"
import { buildSearchIndex } from "@/lib/search"
import { catalogSchema } from "@/lib/structured-data"
import { GITHUB_URL, spellOut } from "@/lib/site"

export default function Page() {
  const categories = loadCategories()
  const search = buildSearchIndex(categories)
  const nav = categories.map((c) => ({ slug: c.slug, title: c.short }))
  const themeCount = categories.length
  const budget = findChart("finances-publiques", "budget")
  const chartCount = categories.reduce((n, c) => n + c.charts.length, 0)
  /**
   * La première année d'un seul graphe ne dit rien de l'ensemble : une série remonte aux
   * recensements d'avant-guerre, la plupart commencent bien plus tard. On annonce donc le recul
   * médian, calculé sur les graphes réellement affichés.
   */
  const thisYear = new Date().getFullYear()
  const depths = categories
    .flatMap((c) => c.charts)
    .filter((ch) => ch.status === "ready" && ch.rows.length)
    .map((ch) => {
      let first = Number.POSITIVE_INFINITY
      for (const r of ch.rows) {
        const y = Number(r.period.slice(0, 4))
        if (y < first) first = y
      }
      return thisYear - first
    })
    .sort((a, b) => a - b)
  const medianDepth = depths.length ? depths[Math.floor(depths.length / 2)] : 0

  return (
    <div className="relative flex min-h-svh flex-col">
      <JsonLd data={catalogSchema(categories)} />
      <LandingBackdrop />
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <section className="pt-6 sm:pt-12">
          {/* Deux colonnes sur grand écran, sinon la moitié droite reste vide. L'ordre du DOM place
              la recherche juste après le sous-titre, y compris sur téléphone. */}
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,25rem)] lg:items-start">
            <div className="max-w-3xl lg:col-start-1 lg:row-start-1">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                Données officielles · {medianDepth} ans de recul en médiane
              </p>
              <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
                « Le pire président de l&apos;histoire » depuis 30 ans.
                <span className="block text-muted-foreground">
                  Et si on regardait les chiffres ?
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
                Construisons ensemble des graphiques basés sur des données{" "}
                <a
                  href="/methode"
                  className="font-semibold text-foreground underline underline-offset-3"
                >
                  officielles
                </a>{" "}
                et contextualisées, pour avoir un débat argumenté et éclairé.{" "}
                {themeCount} macro-catégories sont proposées pour avoir une
                vision d'ensemble. Ce site est{" "}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-foreground underline underline-offset-3"
                >
                  open-source
                </a>
                , donc tout le monde peut contribuer.
              </p>
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <HeroPanel
                index={search}
                chartCount={chartCount}
                themeCount={themeCount}
              />
            </div>

            <div className="flex flex-wrap gap-3 lg:col-start-1 lg:row-start-2">
              <Button
                size="lg"
                nativeButton={false}
                render={<a href="#themes" />}
              >
                Explorer les {spellOut(themeCount)} thèmes
                <IconArrowDown data-icon="inline-end" />
              </Button>
              <ApproachDialog />
            </div>
          </div>
          <MarkersIntro />
        </section>

        {budget ? (
          <div className="mt-16">
            <SankeyBlock chart={budget.chart} />
            <p className="mt-3 text-xs text-muted-foreground">
              <a
                href="/finances-publiques"
                className="underline-offset-3 hover:underline"
              >
                Voir les finances publiques sur la durée →
              </a>
            </p>
          </div>
        ) : null}

        <section
          id="themes"
          className="mt-20 scroll-mt-20"
          aria-labelledby="themes-title"
        >
          <div className="max-w-2xl">
            <h2
              id="themes-title"
              className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {spellOut(themeCount).replace(/^./, (c) => c.toUpperCase())}{" "}
              macro-sujets
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Ces sujets ont vocation à regrouper l'ensemble des problématiques
              inhérentes à la France, couvrant ainsi l'ensemble des débats du
              moment.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-6">
            {categories.map((cat, i) => (
              <ThemeBand
                key={cat.slug}
                cat={cat}
                index={i}
                total={themeCount}
                eager={i === 0}
              />
            ))}
          </div>
        </section>

        <div className="mt-20">
          <ContributeCta />
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              href: "/methode",
              title: "Méthode",
              text: "Sources primaires seulement, indicateurs concurrents côte à côte, voisins européens en regard.",
            },
            {
              href: "/methode#sources",
              title: "Sources et licences",
              text: "Qui produit chaque série, sous quelle licence elle est redistribuée, et la requête pour la refaire.",
            },
            {
              href: "/contribuer",
              title: "Contribuer",
              text: "Un CSV, un fichier de métadonnées, une pull request. Le reste est automatique.",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-3xl border bg-card/60 p-5 transition-colors hover:bg-muted/40"
            >
              <h3 className="font-heading font-medium">{item.title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {item.text}
              </p>
            </a>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
