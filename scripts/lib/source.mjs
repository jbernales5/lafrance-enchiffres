/**
 * Normalise le bloc `source` d'une série avant écriture.
 *
 * Les scripts décrivent leur source avec ce qu'ils ont sous la main — un nom de producteur, une
 * ou plusieurs URL de requête. Ce module en fait le contrat que lit l'application : producteur et
 * amont dans des champs distincts plutôt qu'une chaîne à découper, requêtes dans un tableau,
 * licence résolue depuis `data/licenses.json`.
 *
 * Il refuse ce qu'il ne sait pas attribuer : un producteur inconnu du catalogue, ou une prose
 * glissée dans un champ typé URL. C'est voulu — une série sans licence identifiée ne doit pas
 * entrer dans le dépôt sans que quelqu'un l'ait décidé.
 */
// ROOT est recalculé ici plutôt qu'importé de series.mjs, qui importe ce module : la boucle
// laisserait la constante dans sa zone morte au moment de lire le catalogue.
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

const catalog = JSON.parse(readFileSync(resolve(ROOT, "data", "licenses.json"), "utf8"))

/** Noms composites historiques : le qualificatif sort du nom du producteur. */
const ALIASES = {
  "SSMSI (ministère de l'Intérieur), via data.gouv.fr": { publisher: "SSMSI (ministère de l'Intérieur)", distributor: "data.gouv.fr" },
  "Ministère de l'Intérieur et CDSP / Sciences Po, via data.gouv.fr": { publisher: "Ministère de l'Intérieur et CDSP / Sciences Po", distributor: "data.gouv.fr" },
  "Insee, comptes nationaux (base 2020), via Eurostat": { publisher: "Eurostat", upstream: "Insee, comptes nationaux (base 2020)" },
  "OCDE, tableau de bord PISA": { publisher: "OCDE", edition: "Tableau de bord « PISA: Education and Skills »" },
}

/** « Ember (2026) » doit retrouver l'entrée « Ember » du catalogue. */
function upstreamLicense(upstream) {
  if (catalog.upstream[upstream]) return catalog.upstream[upstream].license
  const stripped = upstream.replace(/\s*\(\d{4}\)\s*$/, "").trim()
  if (catalog.upstream[stripped]) return catalog.upstream[stripped].license
  for (const [key, val] of Object.entries(catalog.upstream)) {
    const k = key.replace(/\s*\(\d{4}\)\s*$/, "").trim()
    if (stripped === k || stripped.startsWith(k) || k.startsWith(stripped)) return val.license
  }
  return "a-confirmer"
}

export function normalizeSource(raw, id) {
  const where = id ? `${id} : ` : ""
  let { publisher, upstream, distributor, edition } = raw

  if (!publisher) {
    const name = raw.name
    if (!name) throw new Error(`${where}source sans publisher ni name`)
    const via = name.split(", d'après ")
    if (via.length > 1) {
      publisher = via[0]
      upstream = via.slice(1).join(", d'après ")
    } else {
      const alias = ALIASES[name]
      if (alias) ({ publisher, upstream, distributor, edition } = { upstream, distributor, edition, ...alias })
      else publisher = name
    }
  }

  const license = catalog.publishers[publisher]?.license
  if (!license) {
    throw new Error(
      `${where}producteur « ${publisher} » absent de data/licenses.json. ` +
        "Ajouter son régime de réutilisation dans le catalogue et dans DATA-LICENSE.md avant d'écrire la série.",
    )
  }

  const downloadUrls = raw.downloadUrls ?? (raw.downloadUrl ? String(raw.downloadUrl).split(" ; ") : [])
  const urls = downloadUrls.map((u) => String(u).trim()).filter(Boolean)
  if (!urls.length) throw new Error(`${where}aucune requête : renseigner downloadUrls`)
  for (const u of urls) {
    if (!/^https?:\/\/\S+$/.test(u)) {
      throw new Error(`${where}« ${u} » n'est pas une URL. Mettre l'adresse seule dans downloadUrls et l'explication dans howToObtain.`)
    }
  }

  return {
    publisher,
    ...(upstream ? { upstream } : {}),
    ...(distributor ? { distributor } : {}),
    ...(edition ? { edition } : {}),
    url: raw.url,
    downloadUrls: urls,
    ...(raw.howToObtain ? { howToObtain: raw.howToObtain } : {}),
    ...(raw.dataset ? { dataset: raw.dataset } : {}),
    ...(raw.idbanks ? { idbanks: raw.idbanks } : {}),
    ...(raw.codes ? { codes: raw.codes } : {}),
    ...(raw.citation ? { citation: raw.citation } : {}),
    ...(raw.lastUpdated ? { lastUpdated: raw.lastUpdated } : {}),
    ...(raw.title ? { title: raw.title } : {}),
    license,
    ...(upstream ? { upstreamLicense: upstreamLicense(upstream) } : {}),
  }
}
