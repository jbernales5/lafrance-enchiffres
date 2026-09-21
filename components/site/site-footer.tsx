import { IconHeartFilled } from "@tabler/icons-react"

import { GITHUB_URL } from "@/lib/site"

const linkClass = "underline underline-offset-3 hover:text-foreground"

export function SiteFooter() {
  return (
    <footer className="border-t py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="flex flex-wrap items-center justify-center gap-x-1">
          Fait avec
          <IconHeartFilled
            className="size-4 text-foreground"
            aria-label="amour"
          />
          par
          <a href="https://github.com/jbernales5" className={linkClass}>
            Jonathan Bernales
          </a>
          et les contributeurs.
        </p>
        <nav
          aria-label="Liens de bas de page"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        >
          <a href="/methode" className={linkClass}>
            Méthode et sources
          </a>
          <a href="/contribuer" className={linkClass}>
            Contribuer
          </a>
          <a href="/a-propos" className={linkClass}>
            À propos
          </a>
          <a href="/mentions-legales" className={linkClass}>
            Mentions légales
          </a>
          <a href={GITHUB_URL} className={linkClass}>
            Code source
          </a>
        </nav>
      </div>
    </footer>
  )
}
