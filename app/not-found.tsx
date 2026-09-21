import type { Metadata } from "next"
import { IconArrowRight } from "@tabler/icons-react"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { Button } from "@/components/ui/button"
import { loadCategories } from "@/lib/catalog"
import { categoryIcon } from "@/lib/category-icons"

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
}

export default function NotFound() {
  const categories = loadCategories()
  const nav = categories.map((c) => ({ slug: c.slug, title: c.short }))

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          Le lien est peut-être ancien, ou le graphe a changé de thème. Les neuf
          thèmes sont ci-dessous, et la recherche de l&apos;en-tête trouve
          n&apos;importe quel graphe par son nom.
        </p>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {categories.map((cat) => {
            const Icon = categoryIcon(cat.slug)
            return (
              <a
                key={cat.slug}
                href={`/${cat.slug}`}
                className="flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/40"
              >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 font-medium">{cat.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {cat.charts.length}
                </span>
              </a>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<a href="/" />}>
            Retour à l&apos;accueil
            <IconArrowRight data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="/methode" />}
          >
            Méthode et sources
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
