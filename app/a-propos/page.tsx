import type { Metadata } from "next"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { loadCategories } from "@/lib/catalog"
import { GITHUB_URL } from "@/lib/site"
import { collectSources } from "@/lib/sources"

export const metadata: Metadata = {
  title: "À propos",
  description: "Qui porte le projet, pourquoi, et comment il se corrige.",
  alternates: { canonical: "/a-propos" },
}

export default function AProposPage() {
  const categories = loadCategories()
  const nav = categories.map((c) => ({ slug: c.slug, title: c.short }))
  const sources = collectSources(categories)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          À propos
        </h1>

        <div className="mt-6 grid gap-4 text-pretty text-muted-foreground">
          <p>
            Le débat en France et dans le mode est de plus en plus{" "}
            <a
              href="https://en.wikipedia.org/wiki/Political_polarization"
              className="underline underline-offset-3 hover:text-foreground"
            >
              polarisé
            </a>
            . Il est difficile de se faire une idée claire et contextuelle de
            l'état d'un pays sur différentes thématiques clés. Nous avons la
            chance d'avoir des statistiques françaises accessibles publiquement,
            mais celles-ci sont dispersées. Ce site a vocation de les rassembler
            pour une visualisation claire et efficace.
          </p>
          <p>
            Le projet est porté bénévolement et son code comme ses données sont
            publics. Il n&apos;a pas vocation à trancher les débats qu&apos;il
            documente.
          </p>
        </div>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight">
          Ce que le site fait
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-pretty text-muted-foreground">
          <li>
            Il affiche 80+ graphes répartis en {categories.length} thèmes,
            construits à partir de {sources.used.length} producteurs.
          </li>
          <li>
            Il donne, pour chaque graphe, la requête exacte, le script, le
            fichier, la licence et la date de récupération.
          </li>
          <li>
            Il met les définitions concurrentes côte à côte au lieu d&apos;en
            choisir une.
          </li>
          <li>
            Il signale les années qu&apos;une source ne publie pas au lieu de
            tracer par-dessus.
          </li>
        </ul>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight">
          Ce qu&apos;il ne fait pas
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-pretty text-muted-foreground">
          <li>
            Il ne produit aucune donnée : tout vient de producteurs publics ou
            académiques, cités.
          </li>
          <li>Il n&apos;attribue pas une évolution à une décision.</li>
          <li>Il ne recopie aucun chiffre dans un texte.</li>
          <li>
            Il ne prétend pas à l&apos;exhaustivité : le choix des thèmes et des
            indicateurs est un choix, et il est discutable.
          </li>
        </ul>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight">
          Se corriger
        </h2>
        <div className="mt-3 grid gap-3 text-sm text-pretty text-muted-foreground">
          <p>
            Les erreurs sont traitées en public : une issue, une correction, un
            commit daté. La procédure et les délais sont dans{" "}
            <a
              href={`${GITHUB_URL}/blob/main/docs/CORRECTIONS.md`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              docs/CORRECTIONS.md
            </a>
            , et les décisions de périmètre dans{" "}
            <a
              href={`${GITHUB_URL}/blob/main/GOVERNANCE.md`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              GOVERNANCE.md
            </a>
            .
          </p>
          <p>
            Le désaccord sur le choix d&apos;un indicateur ou une valeur est
            légitime et se discute dans une issue.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
