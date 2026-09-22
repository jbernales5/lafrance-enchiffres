import type { Metadata } from "next"
import { IconChevronDown, IconExternalLink } from "@tabler/icons-react"

import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/site/json-ld"
import { PageBackdrop } from "@/components/site/page-backdrop"
import { SiteHeader } from "@/components/site/site-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { licenses, loadCategories } from "@/lib/catalog"
import { MANDATES, WORLD_EVENTS } from "@/lib/mandates"
import { formatPeriod } from "@/lib/periods"
import { GITHUB_URL } from "@/lib/site"
import { collectSources } from "@/lib/sources"
import { faqSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "Méthode",
  description:
    "Comment les séries sont choisies, récupérées, vérifiées et mises en perspective.",
  alternates: { canonical: "/methode" },
}

const PRINCIPLES = [
  {
    title: "Sources primaires, et le relais est nommé",
    text: "Insee, Eurostat, OCDE, FMI, DREES, DEPP, SSMSI, CNAF, Conseil d'orientation des retraites, World Inequality Database. Quelques séries mondiales passent par Our World in Data, qui republie le Global Carbon Budget, le SIPRI, les Nations unies ou la Banque mondiale : dans ce cas le producteur d'origine est nommé à côté du relais, et c'est sa licence qui s'applique. Jamais un article de presse.",
  },
  {
    title: "Deux indicateurs plutôt qu'un",
    text: "Quand le choix de l'indicateur change la lecture — dette brute ou nette, émissions territoriales ou empreinte, salaire moyen ou médian — les deux sont proposés sur le même graphe, chacun avec sa source et son avertissement. Deux définitions ne sont jamais raccordées dans une même courbe.",
  },
  {
    title: "La France, puis les voisins",
    text: "Les graphes comparatifs proposent trois vues : France seule, voisins européens (Allemagne, Italie, Espagne, moyenne de l'Union à vingt-sept, parfois Royaume-Uni), et monde quand une série mondiale existe. Le panier de comparaison est un choix, pas une donnée : il est le même partout pour que les graphes se lisent entre eux.",
  },
  {
    title: "Les débuts de mandat, depuis 1995",
    text: "Une ligne verticale pointillée à chaque investiture présidentielle depuis 1995, sans couleur politique. Sur une série observée tous les trois ou quatre ans, le repère se cale sur la période tracée la plus proche. Un second jeu de repères, au choix du lecteur, marque les chocs subis par toute l'Europe en même temps.",
  },
  {
    title: "Annuel pour le structurel",
    text: "Le trimestriel et le mensuel sont réservés à la conjoncture : chômage, prix des logements, inflation. Le reste est annuel. La profondeur dépend de ce que publie la source : certaines séries remontent aux années 1990, d'autres commencent bien plus tard, et chaque graphe affiche la sienne.",
  },
  {
    title: "Rien n'est recopié",
    text: "Chaque valeur affichée vient d'un fichier CSV du dépôt, téléchargeable depuis le graphe, produit par un script qui interroge la source. Quand la source ne publie ni API ni fichier stable, le script relit un fichier déposé dans le dépôt, dont la provenance exacte est notée. Les fichiers bruts trop volumineux ne sont pas redistribués : leur adresse et la façon de les obtenir figurent dans la série.",
  },
  {
    title: "Aucun chiffre écrit à la main",
    text: "Les textes de présentation décrivent ce que mesure un graphe — la définition, le champ, les limites — et ne rapportent jamais un résultat. Un chiffre recopié dans une phrase devient faux dès que la source révise, sans que rien ne le signale. La vérification est automatisée : le build échoue si une valeur mesurée apparaît dans un texte.",
  },
  {
    title: "Les avertissements sont affichés, pas cachés",
    text: "Quand une source ne publie pas une année, le graphe le dit au lieu de tracer un trait continu par-dessus le trou. Quand une variante vient d'un autre producteur, une bannière l'annonce. Les précautions de lecture propres à un thème sont rassemblées en bas de sa page.",
  },
]

/**
 * Les questions qu'on nous pose vraiment. Elles disent ce que le site assume : des choix, pris
 * par une personne, avec une méthode publique — et pas une autorité statistique de plus.
 */
const FAQ = [
  {
    q: "Le site est-il neutre ?",
    a: "Il cherche à l'être autant que possible, mais il faut être honnête : c'est très difficile. Choisir un thème, un indicateur, une période ou un pays de comparaison, c'est déjà orienter le regard. Ce qui est neutre, c'est la chaîne qui va du producteur à la courbe : elle est publique, automatisée, vérifiable ligne à ligne. Le reste est un choix assumé, discutable, et contestable publiquement.",
  },
  {
    q: "Est-ce une démarche scientifique ?",
    a: "Non. Il n'y a ni protocole, ni comité de lecture, ni revue par les pairs. C'est un travail de mise en forme : reprendre des séries publiées par des institutions, les afficher sur une durée longue, à côté d'autres pays, avec leur définition et leurs limites. Les analyses, elles, sont chez les producteurs.",
  },
  {
    q: "Qui choisit les indicateurs ?",
    a: "Une personne, aujourd'hui. C'est la principale limite du projet, et c'est pour cela qu'il est libre : le code, les données et la méthode sont ouverts, et n'importe qui peut proposer un indicateur, en contester un, ou reprendre l'ensemble. Plus il y aura de regards, moins ce choix sera celui d'un seul.",
  },
  {
    q: "Pourquoi des repères de mandats présidentiels ?",
    a: "Parce que c'est la question que les gens se posent en regardant une courbe française. Le repère situe, il n'explique pas : une courbe bouge pour mille raisons, dont beaucoup n'ont rien à voir avec celui qui est à l'Élysée. C'est précisément pour cela qu'un second jeu de repères existe, celui des chocs subis par toute l'Europe en même temps — et qu'on peut basculer de l'un à l'autre sur chaque graphe.",
  },
  {
    q: "Pourquoi ce chiffre n'est pas le même que celui que j'ai vu ailleurs ?",
    a: "Presque toujours à cause d'une définition. Dette brute ou nette, France entière ou métropolitaine, émissions produites ou importées, chômage au sens du Bureau international du travail ou inscrits à France Travail : deux chiffres différents peuvent être tous les deux justes. Le bouton « Vérifier la donnée » donne la définition exacte, la requête et le fichier — de quoi trancher soi-même.",
  },
  {
    q: "Pourquoi certains graphes commencent plus tard que d'autres ?",
    a: "Parce que la source ne publie pas plus loin. On n'allonge pas une série en la raccordant à une autre : deux producteurs ne mesurent pas la même chose, et un raccord invisible est le meilleur moyen de faire dire à une courbe ce qu'elle ne dit pas.",
  },
  {
    q: "Puis-je réutiliser ces données ?",
    a: "Oui, dans les conditions fixées par chaque producteur. Elles sont détaillées source par source dans DATA-LICENSE.md, rappelées dans « Vérifier la donnée », et jointes en tête de chaque CSV téléchargé, avec l'attribution demandée. Le code du site, lui, est sous licence MIT.",
  },
  {
    q: "J'ai repéré une erreur. Que se passe-t-il ?",
    a: "Elle est vérifiée à la source, corrigée dans le script qui produit la série — jamais à la main dans le fichier — et le commit cite l'issue. Tout se passe en public. La procédure est écrite dans docs/CORRECTIONS.md.",
  },
]

export default function MethodePage() {
  const categories = loadCategories()
  const nav = categories.map((c) => ({ slug: c.slug, title: c.short }))
  const sources = collectSources(categories)
  const catalogue = licenses()

  return (
    <div className="relative flex min-h-svh flex-col">
      <PageBackdrop />
      <JsonLd data={faqSchema(FAQ)} />
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Méthode
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          Comment les séries sont choisies, récupérées, vérifiées et mises en
          perspective — et ce que le site s&apos;interdit de faire à leur place.
        </p>

        <div className="mt-8 max-w-2xl rounded-3xl border bg-card/60 p-5">
          <p className="text-pretty">
            <strong className="font-medium">
              Ce site cherche la neutralité, et s&apos;en donne les moyens.
            </strong>{" "}
            Les chiffres viennent d&apos;institutions publiques, la chaîne qui
            les amène jusqu&apos;au graphe est automatisée et vérifiable de bout
            en bout, aucune valeur n&apos;est saisie à la main.
          </p>
          <p className="mt-3 text-pretty text-muted-foreground">
            Important de noter : le choix des thèmes, des indicateurs, des pays
            en regard et des périodes reste arbitraire. Ces décisions orientent
            la lecture et aucune n&apos;est dictée par les données. Ce
            n&apos;est pas non plus une démarche scientifique — ni protocole, ni
            revue par les pairs. C&apos;est un travail de mise en forme avec la
            garantie d&apos;être entièrement ouvert : le code, les données, les
            scripts et cette méthode sont publics, pour que chacun puisse
            vérifier, contester, corriger — et pour qu&apos;à plusieurs, on
            finisse par obtenir quelque chose de vraiment utile.
          </p>
        </div>

        <h2
          id="fonctionnement"
          className="mt-14 scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
        >
          Comment ça fonctionne
        </h2>

        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title} className="rounded-3xl border p-5">
              <p className="font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-heading font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                {p.text}
              </p>
            </li>
          ))}
        </ol>

        <h2
          id="faq"
          className="mt-14 scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
        >
          Questions fréquentes
        </h2>
        <dl className="mt-6 grid gap-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-3xl border p-5">
              <dt className="font-heading font-medium text-balance">
                {item.q}
              </dt>
              <dd className="mt-2 text-sm text-pretty text-muted-foreground">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 font-heading text-2xl font-semibold tracking-tight">
          Repères de mandat
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Date d&apos;investiture. Le repère est posé sur l&apos;année, le
          trimestre ou le mois qui la contient, ou sur la période tracée la plus
          proche quand la série n&apos;est pas annuelle.
        </p>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Président</TableHead>
              <TableHead>Investiture</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MANDATES.map((m) => (
              <TableRow key={m.start}>
                <TableCell>{m.label}</TableCell>
                <TableCell className="tabular-nums">
                  {new Date(m.start).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2 className="mt-14 font-heading text-2xl font-semibold tracking-tight">
          Repères « événements mondiaux »
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Un second jeu de repères, au choix du lecteur sur chaque graphe : les
          chocs qui ont touché toute l&apos;Europe en même temps, dessinés comme
          des zones. Les bornes sont conventionnelles et l&apos;autorité qui
          date chaque épisode est nommée.
        </p>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Événement</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Bornes retenues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WORLD_EVENTS.map((e) => (
              <TableRow key={e.start}>
                <TableCell className="font-medium">{e.label}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {new Date(e.start).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  →{" "}
                  {new Date(e.end).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="max-w-md text-pretty text-muted-foreground">
                  {e.why}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h2
          id="sources"
          className="mt-14 scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
        >
          Sources utilisées
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Un producteur par ligne, avec la licence sous laquelle ses données
          sont redistribuées ici. Le détail série par série est dans{" "}
          <a
            href={`${GITHUB_URL}/blob/main/DATA-LICENSE.md`}
            className="underline underline-offset-3 hover:text-foreground"
          >
            DATA-LICENSE.md
          </a>
          .
        </p>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Producteur</TableHead>
              <TableHead>Licence</TableHead>
              <TableHead className="text-right">Graphes</TableHead>
              <TableHead className="text-right">Dernière observation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.used.map((s) => {
              const last = s.charts
                .map((c) => c.lastObservation)
                .sort()
                .at(-1)
              return (
                <TableRow key={s.publisher}>
                  <TableCell className="whitespace-normal">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-3 hover:underline"
                    >
                      {s.publisher}
                      <IconExternalLink className="size-3" />
                    </a>
                    {s.upstream.length > 2 ? (
                      <details className="group/up text-xs text-muted-foreground">
                        <summary className="w-fit cursor-pointer list-none underline-offset-3 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
                          d&apos;après {s.upstream.length} producteurs
                          <span className="ml-1 inline-block transition-transform group-open/up:rotate-90">
                            ›
                          </span>
                        </summary>
                        <ul className="mt-1 grid max-w-md gap-0.5 text-pretty">
                          {s.upstream.map((u) => (
                            <li key={u}>{u}</li>
                          ))}
                        </ul>
                      </details>
                    ) : s.upstream.length ? (
                      <span className="block max-w-md text-xs text-pretty text-muted-foreground">
                        d&apos;après {s.upstream.join(" · ")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.licenses
                      .map((id) => catalogue[id]?.name ?? id)
                      .join(" · ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.charts.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {last ? formatPeriod(last) : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <h2
          id="requetes"
          className="mt-14 scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
        >
          Toutes les requêtes
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          L&apos;adresse exacte interrogée pour chaque série, groupée par
          producteur. Une série calculée comme un ratio en compte plusieurs : le
          numérateur et le dénominateur y figurent tous les deux.
        </p>
        <div className="mt-4 grid gap-2">
          {sources.used.map((s) => (
            <details
              key={s.publisher}
              className="group min-w-0 rounded-3xl border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="font-heading text-sm font-medium">
                    {s.publisher}
                  </span>
                  {s.upstream.length ? (
                    // Our World in Data republie quatorze producteurs : la liste entière ferait
                    // six lignes dans un en-tête censé tenir sur une.
                    <span className="ml-2 text-xs text-muted-foreground">
                      d&apos;après {s.upstream.slice(0, 2).join(" · ")}
                      {s.upstream.length > 2
                        ? ` et ${s.upstream.length - 2} autres`
                        : ""}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {s.charts.length} série{s.charts.length > 1 ? "s" : ""}
                  <IconChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              {s.upstream.length > 2 ? (
                <p className="border-t px-4 pt-3 text-xs text-pretty text-muted-foreground">
                  Producteurs d&apos;origine : {s.upstream.join(" · ")}
                </p>
              ) : null}
              <ul
                className={`grid min-w-0 gap-2 px-4 py-3 ${s.upstream.length > 2 ? "" : "border-t"}`}
              >
                {s.charts.map((c) => (
                  <li
                    key={c.href + c.title}
                    className="min-w-0 border-t pt-2 first:border-t-0 first:pt-0"
                  >
                    <a
                      href={c.href}
                      className="text-sm underline-offset-3 hover:underline"
                    >
                      {c.title}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {c.category}
                      </span>
                    </a>
                    <ul className="mt-1 grid min-w-0 gap-1">
                      {c.downloadUrls.map((u) => (
                        <li key={u} className="min-w-0">
                          {/* Une requête Eurostat fait trois lignes en toutes lettres : sur
                              trente-cinq séries, l'adresse écrasait le nom du graphe. Elle tient
                              désormais sur une ligne, entière au survol et au clic. */}
                          <a
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            title={u}
                            className="block truncate rounded-lg bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            {u}
                          </a>
                        </li>
                      ))}
                    </ul>
                    {c.howToObtain ? (
                      <p className="mt-1 text-xs text-pretty text-muted-foreground">
                        {c.howToObtain}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Les scripts de récupération, les fichiers de données et
          l&apos;historique des changements sont dans le{" "}
          <a
            href={GITHUB_URL}
            className="underline underline-offset-3 hover:text-foreground"
          >
            dépôt GitHub
          </a>
          . Chaque série y est accompagnée de sa requête, de son unité, de sa
          licence et de sa date de récupération.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
