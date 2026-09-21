"use client"

import { IconRoute } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const STEPS = [
  {
    title: "Sources primaires",
    text: "Insee, Eurostat, OCDE, FMI, DREES, DEPP, SSMSI, CNAF, Conseil d'orientation des retraites, World Inequality Database. Quelques séries mondiales passent par Our World in Data, qui republie : le producteur d'origine est alors nommé à côté. Jamais un article de presse.",
  },
  {
    title: "Scripts publics",
    text: "Chaque série est téléchargée par un script du dépôt, ou déposée à la main avec sa provenance. La requête exacte est visible sur chaque graphe.",
  },
  {
    title: "Fichiers dans le dépôt",
    text: "Un CSV par graphe, versionné sur GitHub : on voit qui a changé quoi, et quand.",
  },
  {
    title: "Graphes sans commentaire",
    text: "Nous gardons les dates de la source, nous comparons avec les voisins européens et permettons deux jeux de repères au choix. Les textes sur chaque graphe ont vocation à décrire ce que mesure un graphe sans y apporter de jugement de valeur.",
  },
]

const GUARANTEES = [
  "Deux indicateurs quand ils se disputent la vérité (brut / net, territorial / empreinte).",
  "La France toujours dans la même couleur, les voisins à côté, jamais seule.",
  "Repères « mandats » et repères « chocs mondiaux », au choix du lecteur.",
  "Pas de chiffre écrit dans un texte : les valeurs se lisent sur le graphe.",
  "Une licence identifiée pour chaque série, et l'attribution qui va avec.",
]

/** Pipeline drawn inline so it follows the theme: four boxes, three arrows, nothing decorative. */
function Pipeline() {
  const w = 720
  const boxW = 150
  const gap = (w - 4 * boxW) / 3
  return (
    <svg
      viewBox={`0 0 ${w} 96`}
      className="w-full"
      role="img"
      aria-label="Sources primaires → scripts → fichiers versionnés → graphes"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
        </marker>
      </defs>
      {STEPS.map((s, i) => {
        const x = i * (boxW + gap)
        return (
          <g key={s.title}>
            <rect
              x={x}
              y={20}
              width={boxW}
              height={56}
              rx={16}
              fill="var(--card)"
              stroke={i === 0 ? "var(--series-2)" : "var(--border)"}
              strokeWidth={i === 0 ? 2 : 1}
            />
            <text
              x={x + boxW / 2}
              y={44}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              0{i + 1}
            </text>
            <text
              x={x + boxW / 2}
              y={62}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="var(--foreground)"
            >
              {s.title}
            </text>
            {i < 3 ? (
              <line
                x1={x + boxW + 4}
                y1={48}
                x2={x + boxW + gap - 6}
                y2={48}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export function ApproachDialog({ children }: { children?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <IconRoute data-icon="inline-start" />
        {children ?? "Comprendre l'approche"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Comment le site cherche la neutralité
          </DialogTitle>
          <DialogDescription>
            La chaîne qui va du producteur jusqu&apos;au graphe est publique et
            vérifiable de bout en bout. Le choix des sujets reste le nôtre et
            reste ouvert à la discussion.
          </DialogDescription>
        </DialogHeader>
        <Pipeline />
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-muted/50 p-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                0{i + 1}
              </p>
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
        <div>
          <p className="font-medium">Ce que ça garantit</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
            {GUARANTEES.map((g) => (
              <li key={g} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--series-2)]"
                />
                <span className="text-pretty">{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Ce qui n&apos;est pas neutre et qu&apos;on assume : le choix des
          sujets et des indicateurs. Il est écrit, discutable et modifiable par
          pull request. Détail sur la page{" "}
          <a href="/methode" className="underline underline-offset-3">
            Méthode
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  )
}
