"use client"

import {
  IconExternalLink,
  IconFileTypeCsv,
  IconSearch,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { License, SeriesMeta } from "@/lib/catalog"
import { formatPeriod } from "@/lib/periods"
import { repoFile } from "@/lib/site"

const INSEE_SERIE = "https://www.insee.fr/fr/statistiques/serie/"

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  )
}

function ExtLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 underline underline-offset-3 hover:text-foreground"
    >
      <span className="truncate">{children}</span>
      <IconExternalLink className="size-3 shrink-0" />
    </a>
  )
}

/**
 * Everything needed to rebuild the figure without trusting the site: the exact API call or CSV URL,
 * the identifiers, the script that produced the file, and the file itself.
 */
export function SourceDialog({
  meta,
  file,
  title,
  license,
}: {
  meta: SeriesMeta
  file: string
  title: string
  /** Licence qui commande la redistribution : celle de l'amont quand le diffuseur republie. */
  license?: { id: string; license: License | undefined }
}) {
  const src = meta.source
  const downloads = src.downloadUrls

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="xs" />}>
        <IconSearch data-icon="inline-start" />
        Vérifier la donnée
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>
            De quoi refaire ce graphe sans nous croire : la requête exacte, les
            identifiants, le script et le fichier.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3">
          <Row label="Producteur">
            {src.upstream ?? src.publisher}
            {src.upstream ? (
              <span className="text-muted-foreground">
                {" "}
                — republié par {src.publisher}
              </span>
            ) : null}
            {src.distributor ? (
              <span className="text-muted-foreground">
                {" "}
                — diffusé via {src.distributor}
              </span>
            ) : null}
            {src.edition ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {src.edition}
              </p>
            ) : null}
            {src.citation ? (
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                {src.citation}
              </p>
            ) : null}
          </Row>
          <Row label="Page de la source">
            <ExtLink href={src.url}>{src.url}</ExtLink>
          </Row>
          {src.dataset ? (
            <Row label="Jeu de données">
              <code className="font-mono text-xs">{src.dataset}</code>
            </Row>
          ) : null}
          {src.idbanks?.length ? (
            <Row label="Séries Insee (idbank)">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {src.idbanks.map((id) => (
                  <li key={id}>
                    <ExtLink href={INSEE_SERIE + id}>
                      <code className="font-mono text-xs">{id}</code>
                    </ExtLink>
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          {src.codes?.length ? (
            <Row label="Codes">
              <code className="font-mono text-xs">{src.codes.join(", ")}</code>
            </Row>
          ) : null}
          {downloads.length ? (
            <Row label={downloads.length > 1 ? "Requêtes" : "Requête exacte"}>
              <ul className="grid gap-1.5">
                {downloads.map((u) => (
                  <li key={u} className="rounded-xl bg-muted/60 px-2.5 py-1.5">
                    <a
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] leading-snug break-all underline-offset-3 hover:underline"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          {src.howToObtain ? (
            <Row label="Obtention">
              <span className="text-pretty text-muted-foreground">
                {src.howToObtain}
              </span>
            </Row>
          ) : null}
          <Row label="Unité">{meta.unit}</Row>
          <Row label="Dernière observation">
            {formatPeriod(meta.lastObservation)}
            {src.lastUpdated ? (
              <span className="text-muted-foreground">
                {" "}
                · mise à jour chez la source le{" "}
                {new Date(src.lastUpdated).toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </Row>
          <Row label="Script">
            <ExtLink href={repoFile(meta.script)}>{meta.script}</ExtLink>
            <span className="text-muted-foreground">
              {" "}
              · exécuté le{" "}
              {new Date(meta.fetchedAt).toLocaleDateString("fr-FR")}
            </span>
            {meta.script.startsWith("scripts/manual/") ? (
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                La source ne publie pas d&apos;API : le fichier est déposé dans{" "}
                <code className="font-mono">data/sources-manuelles/</code> et
                relu par ce script.
              </p>
            ) : null}
          </Row>
          {meta.notes ? (
            <Row label="Note de lecture">
              <span className="text-pretty text-muted-foreground">
                {meta.notes}
              </span>
            </Row>
          ) : null}
          <Row label="Fichier du site">
            <ExtLink href={repoFile(`data/series/${file}.csv`)}>
              data/series/{file}.csv
            </ExtLink>
          </Row>
          {license?.license ? (
            <Row label="Licence">
              {license.license.url ? (
                <ExtLink href={license.license.url}>
                  {license.license.name}
                </ExtLink>
              ) : (
                <span>{license.license.name}</span>
              )}
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                {license.license.summary}
              </p>
              {license.license.attribution ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Attribution demandée : « {license.license.attribution} »
                </p>
              ) : null}
            </Row>
          ) : null}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            nativeButton={false}
            render={<a href={`/series/${file}`} download />}
          >
            <IconFileTypeCsv data-icon="inline-start" />
            Télécharger le CSV
          </Button>
          {downloads[0] ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <a href={downloads[0]} target="_blank" rel="noreferrer" />
              }
            >
              Ouvrir la requête chez {src.publisher}
              <IconExternalLink data-icon="inline-end" />
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
