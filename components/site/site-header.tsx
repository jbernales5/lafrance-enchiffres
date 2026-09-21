import {
  IconBooks,
  IconBrandGithub,
  IconChevronDown,
} from "@tabler/icons-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchDialog } from "@/components/site/search-dialog"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { GITHUB_URL } from "@/lib/site"
import { buildSearchIndex } from "@/lib/search"
import { categoryIcon } from "@/lib/category-icons"

const PAGES = [
  { href: "/methode", title: "Méthode" },
  { href: "/contribuer", title: "Contribuer" },
]

export function SiteHeader({
  categories,
}: {
  categories: { slug: string; title: string }[]
}) {
  const search = buildSearchIndex()
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <a
          href="/"
          className="flex min-w-0 items-center"
          aria-label="La France en chiffres, accueil"
        >
          <Image
            src="/images/logo.png"
            alt="La France en chiffres"
            width={1983}
            height={793}
            priority
            className="h-9 w-auto sm:h-10 dark:hidden"
          />
          {/* Un seul des deux logos est préchargé : les deux `priority` injectaient deux
              `preload` concurrents pour une image dont une seule est visible. */}
          <Image
            src="/images/logo-white.png"
            alt=""
            aria-hidden
            width={1983}
            height={793}
            className="hidden h-9 w-auto sm:h-10 dark:block"
          />
        </a>
        <nav
          aria-label="Navigation principale"
          className="ml-auto flex items-center gap-1"
        >
          <SearchDialog index={search} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              Thèmes
              <IconChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {categories.map((c) => {
                const Icon = categoryIcon(c.slug)
                return (
                  <DropdownMenuItem
                    key={c.slug}
                    render={<a href={`/${c.slug}`} />}
                  >
                    <Icon className="text-muted-foreground" />
                    {c.title}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator className="sm:hidden" />
              {PAGES.map((p) => (
                <DropdownMenuItem
                  key={p.href}
                  className="sm:hidden"
                  render={<a href={p.href} />}
                >
                  {p.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {PAGES.map((p) => (
            <Button
              key={p.href}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              nativeButton={false}
              render={<a href={p.href} />}
            >
              {p.title}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<a href="/methode#sources" />}
          >
            <IconBooks data-icon="inline-start" />
            Sources
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Sources et licences"
            nativeButton={false}
            render={<a href="/methode#sources" />}
          >
            <IconBooks />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Code source sur GitHub"
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <IconBrandGithub />
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
