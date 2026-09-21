"use client"

import {
  IconAlertTriangle,
  IconBrandGithub,
  IconDatabasePlus,
  IconExternalLink,
  IconMessageQuestion,
} from "@tabler/icons-react"

import { ParticipateDialog } from "@/components/site/participate-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GITHUB_URL } from "@/lib/site"

function issueUrl(title: string, body: string, label: string) {
  const p = new URLSearchParams({ title, body, labels: label })
  return `${GITHUB_URL}/issues/new?${p.toString()}`
}

const ERROR_BODY = `**Graphe concerné** (lien ou titre) :

**Ce qui est faux** :

**Ce que dit la source** (lien vers la page ou la requête, via « Vérifier la donnée ») :

**Comment vous l'avez constaté** :
`

const DISAGREE_BODY = `**Graphe concerné** :

**Ce que le graphe laisse penser, selon vous** :

**L'indicateur ou la comparaison qui manque** (avec sa source primaire si vous la connaissez) :

Règle du site : quand deux indicateurs se disputent la vérité, on les met côte à côte plutôt que d'en choisir un.
`

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 font-mono text-[11px] font-semibold">
        {n}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  )
}

function DisagreeDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <IconMessageQuestion data-icon="inline-start" />
        Je ne suis pas d&apos;accord
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Vous n&apos;êtes pas d&apos;accord ? C&apos;est prévu.
          </DialogTitle>
          <DialogDescription>
            Le site ne défend pas une thèse. Si un graphe vous semble orienté,
            voici comment le corriger, sans coder.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-4">
          <Step n={1} title="Vérifiez d'abord la donnée">
            Sous chaque graphe, « Vérifier la donnée » montre la requête exacte
            envoyée à la source. Si le chiffre est faux, c&apos;est une erreur :
            signalez-la.
          </Step>
          <Step n={2} title="Si c'est l'indicateur qui pose problème">
            Dites lequel vous semblerait plus juste, et d&apos;où il vient
            (Insee, Eurostat, OCDE…). On ne remplace pas un indicateur par un
            autre : on met les deux côte à côte.
          </Step>
          <Step n={3} title="Si c'est le choix des sujets">
            Proposez un sujet ou un graphe manquant. Les propositions sont
            publiques, discutées en commentaires, et tranchées sur un seul
            critère : existe-t-il une source primaire ?
          </Step>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={
              <a
                href={issueUrl(
                  "Désaccord sur un graphe",
                  DISAGREE_BODY,
                  "désaccord"
                )}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <IconBrandGithub data-icon="inline-start" />
            Ouvrir la discussion
            <IconExternalLink data-icon="inline-end" />
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<a href="/methode" />}
          >
            Lire la méthode
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Il faut un compte GitHub (gratuit). Le formulaire est prérempli :
          trois lignes suffisent.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function ReportDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <IconAlertTriangle data-icon="inline-start" />
        Signaler une erreur
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Signaler une erreur</DialogTitle>
          <DialogDescription>
            Un chiffre faux, un lien mort, une unité douteuse : deux minutes,
            pas besoin de coder.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-4">
          <Step n={1} title="Repérez le graphe">
            Copiez son lien avec « Partager », ou notez son titre et son thème.
          </Step>
          <Step n={2} title="Comparez avec la source">
            « Vérifier la donnée » ouvre la requête exacte chez le producteur.
            Si les valeurs diffèrent, c&apos;est notre erreur.
          </Step>
          <Step n={3} title="Envoyez">
            Le formulaire prérempli demande juste le graphe, ce qui est faux et
            ce que dit la source. Nous corrigeons et le graphe se met à jour.
          </Step>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={
              <a
                href={issueUrl("Erreur sur un graphe", ERROR_BODY, "erreur")}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <IconBrandGithub data-icon="inline-start" />
            Signaler sur GitHub
            <IconExternalLink data-icon="inline-end" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Il faut un compte GitHub (gratuit). Si vous savez coder, une pull
          request corrigeant le fichier est encore mieux.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** Landing block: the three ways in, for people who code and people who don't. */
export function ContributeCta() {
  return (
    <section
      aria-labelledby="contribuer-title"
      className="relative isolate overflow-hidden rounded-4xl bg-card/80 p-6 ring-1 ring-foreground/5 backdrop-blur sm:p-10 dark:ring-foreground/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,var(--series-5),transparent)] opacity-15 blur-2xl"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Ouvert à tous
          </p>
          <h2
            id="contribuer-title"
            className="mt-2 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            La contribution est ouverte
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Code, données et discussions sont sur GitHub. Vous pouvez contribuer
            et apporter des corrections et modifications librement via le dépôt
            de code GitHub.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="flex flex-col gap-2 rounded-3xl border p-4">
            <p className="text-sm text-muted-foreground">
              Un chiffre vous semble faux ?
            </p>
            <ReportDialog />
          </div>
          <div className="flex flex-col gap-2 rounded-3xl border p-4">
            <p className="text-sm text-muted-foreground">
              Le graphe vous semble orienté ?
            </p>
            <DisagreeDialog />
          </div>
          <div className="flex flex-col gap-2 rounded-3xl border p-4">
            <p className="text-sm text-muted-foreground">
              Vous avez une donnée ou du temps ?
            </p>
            <ParticipateDialog size="lg">
              <IconDatabasePlus data-icon="inline-start" />
              Ajouter une donnée
            </ParticipateDialog>
          </div>
        </div>
      </div>
    </section>
  )
}
