import type { Metadata } from "next"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { loadCategories } from "@/lib/catalog"
import { GITHUB_URL, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur, données personnelles et licences.",
  alternates: { canonical: "/mentions-legales" },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 text-sm text-pretty text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export default function MentionsLegalesPage() {
  const nav = loadCategories().map((c) => ({ slug: c.slug, title: c.short }))

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader categories={nav} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Mentions légales
        </h1>

        <Section title="Éditeur">
          <p>
            Ce site est édité à titre personnel et non commercial. Il n&apos;est
            adossé à aucune organisation, aucun parti, aucune administration.
          </p>
          <p>
            Contact : par une issue sur{" "}
            <a
              href={`${GITHUB_URL}/issues`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              le dépôt GitHub du projet
            </a>
            .
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut,
            CA 91789, États-Unis —{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-3 hover:text-foreground"
            >
              vercel.com
            </a>
            . Les pages sont servies depuis la région de Paris.
          </p>
        </Section>

        <Section title="Données personnelles">
          <p>
            Le site ne dépose aucun cookie, n&apos;utilise aucun outil de mesure
            d&apos;audience et ne comporte aucun formulaire. Il n&apos;y a ni
            compte, ni base de données, ni service tiers appelé depuis votre
            navigateur : les polices de caractères sont servies depuis le site
            lui-même.
          </p>
          <p>
            Le choix du thème clair ou sombre et le jeu de repères sélectionné
            sont conservés dans votre navigateur et ne sont transmis nulle part.
          </p>
          <p>
            L&apos;hébergeur journalise techniquement les requêtes, adresse IP
            comprise, pour assurer le service et sa sécurité. Ces journaux sont
            soumis à la politique de confidentialité de Vercel. Pour exercer vos
            droits d&apos;accès, de rectification ou d&apos;effacement, écrivez
            à l&apos;éditeur par le dépôt GitHub.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            Le code du site est publié sous licence MIT. Les données ne le sont
            pas : chaque série reste soumise aux conditions de son producteur,
            détaillées dans{" "}
            <a
              href={`${GITHUB_URL}/blob/main/DATA-LICENSE.md`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              DATA-LICENSE.md
            </a>{" "}
            et rappelées dans « Vérifier la donnée » sur chaque graphe.
          </p>
          <p>
            Si vous êtes producteur d&apos;une des sources utilisées et que
            cette redistribution vous pose problème, signalez-le : la série sera
            retirée le temps de régler la question.
          </p>
        </Section>

        <Section title="Accessibilité">
          <p>
            Le site n&apos;a pas fait l&apos;objet d&apos;un audit
            d&apos;accessibilité. Les manques connus sont suivis publiquement
            dans le dépôt. Si une page vous est inutilisable, ouvrez une issue :
            c&apos;est traité comme une correction, pas comme une amélioration.
          </p>
        </Section>

        <Section title="Signaler une erreur">
          <p>
            Une valeur qui vous paraît fausse, un lien mort, une source mal
            citée :{" "}
            <a
              href={`${GITHUB_URL}/issues/new`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              ouvrez une issue
            </a>
            . La procédure de correction est décrite dans{" "}
            <a
              href={`${GITHUB_URL}/blob/main/docs/CORRECTIONS.md`}
              className="underline underline-offset-3 hover:text-foreground"
            >
              docs/CORRECTIONS.md
            </a>
            .
          </p>
        </Section>

        <p className="mt-10 text-xs text-muted-foreground">{SITE_URL}</p>
      </main>
      <SiteFooter />
    </div>
  )
}
