"use client"

import * as React from "react"
import {
  IconBrandGithub,
  IconCode,
  IconDatabase,
  IconExternalLink,
  IconGitPullRequest,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GITHUB_URL, repoFile } from "@/lib/site"

const DATASETS_URL = repoFile("DATASETS.md")
const CONTRACT_URL = repoFile("data/README.md")
const ISSUES_URL = `${GITHUB_URL}/issues/new`

function Path({
  icon,
  title,
  branch,
  steps,
  link,
  linkLabel,
}: {
  icon: React.ReactNode
  title: string
  branch: string
  steps: React.ReactNode[]
  link: string
  linkLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-muted/60 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary [&>svg]:size-4">
          {icon}
        </span>
        <div>
          <div className="font-medium">{title}</div>
          <code className="font-mono text-[11px] text-muted-foreground">
            {branch}
          </code>
        </div>
      </div>
      <ol className="grid gap-1.5 text-xs text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground/10 font-mono text-[10px] text-foreground">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="xs"
        className="self-start"
        nativeButton={false}
        render={<a href={link} target="_blank" rel="noreferrer" />}
      >
        {linkLabel}
        <IconExternalLink data-icon="inline-end" />
      </Button>
    </div>
  )
}

/** "Je participe !" button that opens the contribution guide. */
export function ParticipateDialog({
  children,
  ...trigger
}: React.ComponentProps<typeof Button>) {
  return (
    <Dialog>
      <DialogTrigger render={<Button {...trigger} />}>
        {children ?? "Je participe !"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Participer au projet</DialogTitle>
          <DialogDescription>
            Ce site est open source et neutre : chaque graphe vient d&apos;une
            source officielle citée. Plus nous sommes nombreux à proposer des
            données, plus le tableau de bord est complet, quel que soit son
            horizon politique.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Path
            icon={<IconDatabase />}
            title="Apporter des données"
            branch="data/<nom_du_jeu>"
            steps={[
              "Trouvez la donnée chez un producteur officiel et notez la requête exacte qui la sert.",
              <>
                Ajoutez sa récupération dans{" "}
                <code className="font-mono">scripts/fetch/</code> si la source a
                une API, sinon déposez le fichier dans{" "}
                <code className="font-mono">manual/</code> avec un script qui le
                relit.
              </>,
              <>
                Déclarez le graphe dans{" "}
                <code className="font-mono">data/categories/</code>, puis ouvrez
                une Pull Request : elle est relue puis intégrée.
              </>,
            ]}
            link={DATASETS_URL}
            linkLabel="Voir la provenance de chaque série"
          />
          <Path
            icon={<IconCode />}
            title="Améliorer le site"
            branch="feat/<nom_de_la_fonctionnalité>"
            steps={[
              <>
                Clonez le dépôt, puis{" "}
                <code className="font-mono">npm install</code> et{" "}
                <code className="font-mono">npm run dev</code>.
              </>,
              "Corrigez, améliorez ou proposez une nouvelle visualisation.",
              <>
                Vérifiez avec{" "}
                <code className="font-mono">npm run typecheck</code> et{" "}
                <code className="font-mono">npm run build</code>, puis ouvrez
                une Pull Request.
              </>,
            ]}
            link={CONTRACT_URL}
            linkLabel="Voir le contrat de données"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Pas le temps de coder ? Proposez simplement une source ou signalez une
          erreur en{" "}
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-3 hover:text-foreground"
          >
            ouvrant une issue
          </a>
          .
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Fermer</DialogClose>
          <Button
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <IconBrandGithub data-icon="inline-start" />
            Ouvrir le dépôt GitHub
            <IconGitPullRequest data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
