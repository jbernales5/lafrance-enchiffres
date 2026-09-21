import type { Metadata } from "next"
import { IconBrandGithub, IconExternalLink } from "@tabler/icons-react"

import { SiteFooter } from "@/components/site/site-footer"
import { PageBackdrop } from "@/components/site/page-backdrop"
import { SiteHeader } from "@/components/site/site-header"
import { Button } from "@/components/ui/button"
import { loadCategories } from "@/lib/catalog"
import { GITHUB_URL, repoFile } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contribuer",
  description:
    "Signaler une erreur, proposer un indicateur, apporter une série.",
  alternates: { canonical: "/contribuer" },
}

export default function ContribuerPage() {
  const categories = loadCategories()
  const nav = categories.map((c) => ({ slug: c.slug, title: c.short }))
  return (
    <div className="relative flex min-h-svh flex-col">
      <PageBackdrop />
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Contribuer
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          Un graphe, c&apos;est un fichier CSV, un fichier de métadonnées et une
          ligne dans la catégorie. Le site se reconstruit tout seul.
        </p>

        <ol className="mt-10 grid gap-4">
          {[
            {
              t: "Choisir une source primaire",
              d: "Insee, Eurostat, OCDE, FMI, DREES, SSMSI… Si elle a une API ou un fichier direct, on écrit la récupération dans scripts/fetch/. Sinon, le fichier est versionné dans data/sources-manuelles/ et un script de scripts/manual/ le relit. Sa licence doit figurer dans data/licenses.json.",
            },
            {
              t: "Écrire la série au format long",
              d: "data/series/<thème>/<graphe>.csv avec trois colonnes : period, series, value. Les codes pays canoniques sont FRA, DEU, ITA, ESP, GBR, USA, CHN, IND, JPN, KOR, POL, RUS, EU27 et WLD.",
            },
            {
              t: "Décrire la série",
              d: "Un .meta.json à côté : source et lien, unité, fréquence, libellés des séries, date de récupération, une phrase de note.",
            },
            {
              t: "Déclarer le graphe",
              d: "Dans data/categories/<slug>.json : identifiant, titre, fichier, et les codes de séries visibles pour chaque perspective (France, Europe, Monde).",
            },
            {
              t: "Ouvrir une pull request",
              d: "Branche data/<nom> pour une donnée, feat/<nom> pour le code. La relecture vérifie la source, pas l'opinion.",
            },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-4 rounded-3xl border p-5">
              <span className="font-mono text-sm text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-heading font-medium">{s.t}</h2>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  {s.d}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <IconBrandGithub data-icon="inline-start" />
            Ouvrir le dépôt
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={repoFile("CONTRIBUTING.md")}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Guide détaillé
            <IconExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
